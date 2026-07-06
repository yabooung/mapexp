import { booleanPointInPolygon, point as turfPoint } from '@turf/turf'
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson'
import { REGION_ID_MAP } from '@/constants/regions'
import { getRegionMetadata } from '@/data/regions'

/**
 * GPS 위치 → 지역 감지 유틸리티
 * 도도부현 GeoJSON을 모듈 레벨에 캐싱하고 point-in-polygon으로 현재 지역을 찾는다.
 */

export interface DetectedRegion {
  id: string
  name: string
}

/** 지역 ID → 한자 현 이름 역매핑 (예: tokyo → 東京都) */
export const PREF_KANJI_BY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_ID_MAP['japan']).map(([kanji, id]) => [id, kanji]),
)

/**
 * 시정촌 표시 이름 (정령지정시 구는 시 이름을 붙여 충돌 방지: 札幌市中央区)
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

let prefectureCache: FeatureCollection | null = null
let loadingPromise: Promise<FeatureCollection | null> | null = null

let municipalityCache: FeatureCollection | null = null
let muniLoadingPromise: Promise<FeatureCollection | null> | null = null

/**
 * 도도부현 GeoJSON 로드 (ID 주입 포함, 1회만 fetch)
 */
export async function loadPrefectures(): Promise<FeatureCollection | null> {
  if (prefectureCache) return prefectureCache
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      const response = await fetch('/geojson/japan-prefectures.json')
      if (!response.ok) return null
      const json = (await response.json()) as FeatureCollection

      if (json.type === 'FeatureCollection') {
        json.features.forEach((feat) => {
          const props = feat.properties as Record<string, string> | null
          const nameJa = props?.nam_ja || props?.name_ja
          const mappedId = nameJa ? REGION_ID_MAP['japan'][nameJa] : undefined
          if (mappedId) {
            feat.properties = { ...props, id: mappedId, name: nameJa }
          }
        })
        prefectureCache = json
      }
      return prefectureCache
    } catch (error) {
      console.error('Failed to load prefectures for GPS detection:', error)
      return null
    } finally {
      loadingPromise = null
    }
  })()

  return loadingPromise
}

/**
 * point-in-polygon 판정 (turf: 평면 ray-casting)
 * d3-geo의 geoContains는 폴리곤 감김 방향(winding order)이 반대인 데이터에서
 * 오판정하므로 사용하지 않는다.
 */
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
 * 위/경도가 속한 도도부현 찾기
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
 * 비동기 편의 함수: 데이터 로드 후 지역 감지
 */
export async function detectRegionAt(lat: number, lng: number): Promise<DetectedRegion | null> {
  const fc = await loadPrefectures()
  if (!fc) return null
  return findRegionAt(lat, lng, fc)
}

/**
 * 전국 시정촌 GeoJSON 로드 (1.6MB, 1회만 fetch — 서비스 워커가 cache-first로 캐싱)
 */
export async function loadMunicipalities(): Promise<FeatureCollection | null> {
  if (municipalityCache) return municipalityCache
  if (muniLoadingPromise) return muniLoadingPromise

  muniLoadingPromise = (async () => {
    try {
      const response = await fetch('/geojson/japan-municipalities.json')
      if (!response.ok) return null
      const json = (await response.json()) as FeatureCollection
      if (json.type === 'FeatureCollection') {
        municipalityCache = json
      }
      return municipalityCache
    } catch (error) {
      console.error('Failed to load municipalities for GPS detection:', error)
      return null
    } finally {
      muniLoadingPromise = null
    }
  })()

  return muniLoadingPromise
}

/**
 * 위/경도가 속한 시정촌 찾기 (현 ID로 후보를 좁혀 검색)
 * 반환 ID는 스토어 규약과 동일한 `${prefId}_${muniName}` 형태
 */
export async function detectMunicipalityAt(
  lat: number,
  lng: number,
  prefId: string,
): Promise<DetectedRegion | null> {
  const fc = await loadMunicipalities()
  if (!fc) return null

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
