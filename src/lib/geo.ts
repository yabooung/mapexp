import { booleanPointInPolygon, point as turfPoint, rewind } from '@turf/turf'
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson'
import { REGION_ID_MAP, KOREA_PROV_CODE_BY_ID } from '@/constants/regions'
import { getRegionMetadata } from '@/data/regions'

/**
 * GPS 위치 → 지역 감지 유틸리티 (일본/한국)
 * 광역(도도부현/시도)과 기초(시정촌/시군구) GeoJSON을 국가별로 캐싱하고
 * point-in-polygon으로 현재 지역을 찾는다.
 */

export type Country = 'japan' | 'korea'

export interface DetectedRegion {
  id: string
  name: string
}

/** 지역 ID → 현지어 광역 이름 역매핑 (예: tokyo → 東京都, seoul → 서울특별시) */
export const PREF_KANJI_BY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_ID_MAP['japan']).map(([kanji, id]) => [id, kanji]),
)

/**
 * 시정촌 표시 이름 (일본: 정령지정시 구는 시 이름을 붙여 충돌 방지: 札幌市中央区)
 * 데이터 출처: 국토수치정보 N03 (가공: smartnews-smri/japan-topography, 1/1000 간소화)
 */
export function municipalityName(props: Record<string, string | null> | null): string | null {
  if (!props) return null
  const muni = props.N03_004
  if (!muni) return null
  const city = props.N03_003
  if (city && city.endsWith('市')) return `${city}${muni}`
  return muni
}

/** 국가별 데이터 URL */
const PREFECTURE_URLS: Record<Country, string> = {
  japan: '/geojson/japan-prefectures.json',
  korea: '/geojson/korea-provinces.json',
}
const MUNICIPALITY_URLS: Record<Country, string> = {
  japan: '/geojson/japan-municipalities.json',
  // 출처: 통계청 2018 행정구역 (southkorea/southkorea-maps, mapshaper 간소화)
  korea: '/geojson/korea-municipalities.json',
}

const fcCache: Partial<Record<string, FeatureCollection>> = {}
const fcLoading: Partial<Record<string, Promise<FeatureCollection | null>>> = {}

async function loadFc(
  key: string,
  url: string,
  postprocess?: (fc: FeatureCollection) => void,
): Promise<FeatureCollection | null> {
  if (fcCache[key]) return fcCache[key]!
  if (fcLoading[key]) return fcLoading[key]!

  fcLoading[key] = (async () => {
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      const json = (await response.json()) as FeatureCollection
      if (json.type !== 'FeatureCollection') return null
      // 감김 방향을 d3 규약(외곽 시계방향)으로 통일
      // (mapshaper 산출물은 RFC7946 방향이라 d3 geoPath/geoCentroid가 오동작함.
      //  turf는 방향 무관하므로 감지 로직에는 영향 없음)
      rewind(json, { reverse: true, mutate: true })
      postprocess?.(json)
      fcCache[key] = json
      return json
    } catch (error) {
      console.error(`Failed to load ${url}:`, error)
      return null
    } finally {
      delete fcLoading[key]
    }
  })()

  return fcLoading[key]!
}

/**
 * 광역 GeoJSON 로드 (ID 주입 포함, 국가별 1회만 fetch)
 */
export async function loadPrefectures(country: Country = 'japan'): Promise<FeatureCollection | null> {
  return loadFc(`pref-${country}`, PREFECTURE_URLS[country], (fc) => {
    fc.features.forEach((feat) => {
      const props = feat.properties as Record<string, string> | null
      // 일본: nam_ja/name_ja, 한국: name(한글)
      const localName = country === 'japan' ? props?.nam_ja || props?.name_ja : props?.name
      const mappedId = localName ? REGION_ID_MAP[country][localName] : undefined
      if (mappedId) {
        feat.properties = { ...props, id: mappedId, name: localName }
      }
    })
  })
}

/**
 * point-in-polygon 판정 (turf: 평면 ray-casting)
 * d3-geo의 geoContains는 폴리곤 감김 방향(winding order)이 반대인 데이터에서
 * 오판정하므로 사용하지 않는다.
 */
export function featureContainsPoint(feature: Feature, lng: number, lat: number): boolean {
  return containsPoint(feature, lng, lat)
}

function containsPoint(feature: Feature, lng: number, lat: number): boolean {
  const geomType = feature.geometry?.type
  if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') return false
  try {
    return booleanPointInPolygon(turfPoint([lng, lat]), feature as Feature<Polygon | MultiPolygon>)
  } catch {
    return false // 일부 지오메트리 오류는 무시
  }
}

/**
 * 위/경도가 속한 광역 지역 찾기
 */
export function findRegionAt(lat: number, lng: number, fc: FeatureCollection): DetectedRegion | null {
  for (const feature of fc.features) {
    const id = (feature.properties as Record<string, string> | null)?.id
    if (!id) continue
    if (containsPoint(feature as Feature, lng, lat)) {
      const meta = getRegionMetadata(id)
      return { id, name: meta?.name || (feature.properties as Record<string, string>).name || id }
    }
  }
  return null
}

/**
 * 비동기 편의 함수: 데이터 로드 후 광역 지역 감지
 */
export async function detectRegionAt(
  lat: number,
  lng: number,
  country: Country = 'japan',
): Promise<DetectedRegion | null> {
  const fc = await loadPrefectures(country)
  if (!fc) return null
  return findRegionAt(lat, lng, fc)
}

/**
 * 기초(시정촌/시군구) GeoJSON 로드 (국가별 1회만 fetch — 서비스 워커가 cache-first로 캐싱)
 */
export async function loadMunicipalities(country: Country = 'japan'): Promise<FeatureCollection | null> {
  return loadFc(`muni-${country}`, MUNICIPALITY_URLS[country])
}

/**
 * 위/경도가 속한 기초 지역(시정촌/시군구) 찾기 (광역 ID로 후보를 좁혀 검색)
 * 반환 ID는 스토어 규약과 동일한 `${prefId}_${muniName}` 형태
 */
export async function detectMunicipalityAt(
  lat: number,
  lng: number,
  prefId: string,
  country: Country = 'japan',
): Promise<DetectedRegion | null> {
  const fc = await loadMunicipalities(country)
  if (!fc) return null

  if (country === 'japan') {
    const prefKanji = PREF_KANJI_BY_ID[prefId]
    if (!prefKanji) return null

    for (const feature of fc.features) {
      const props = feature.properties as Record<string, string | null> | null
      if (props?.N03_001 !== prefKanji) continue
      if (containsPoint(feature as Feature, lng, lat)) {
        const name = municipalityName(props)
        if (!name) return null
        return { id: `${prefId}_${name}`, name }
      }
    }
    return null
  }

  // 한국: 통계청 코드 앞 2자리로 시도 필터
  const provCode = KOREA_PROV_CODE_BY_ID[prefId]
  if (!provCode) return null

  for (const feature of fc.features) {
    const props = feature.properties as Record<string, string | null> | null
    if (!props?.code?.startsWith(provCode)) continue
    if (containsPoint(feature as Feature, lng, lat)) {
      const name = props.name
      if (!name) return null
      return { id: `${prefId}_${name}`, name }
    }
  }
  return null
}

/**
 * 두 좌표 간 거리 (미터, Haversine)
 */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * 트랙 포인트 배열의 총 이동 거리 (미터)
 */
export function trackDistanceMeters(points: Array<{ lat: number; lng: number }>): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
  }
  return total
}

/**
 * 거리 표시용 포맷 (m / km)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(meters < 10000 ? 2 : 1)}km`
}
