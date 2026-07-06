import { geoContains } from 'd3-geo'
import type { Feature, FeatureCollection } from 'geojson'
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

let prefectureCache: FeatureCollection | null = null
let loadingPromise: Promise<FeatureCollection | null> | null = null

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
 * 위/경도가 속한 도도부현 찾기
 */
export function findRegionAt(lat: number, lng: number, fc: FeatureCollection): DetectedRegion | null {
  const point: [number, number] = [lng, lat] // GeoJSON은 [lng, lat]

  for (const feature of fc.features) {
    const id = (feature.properties as Record<string, string> | null)?.id
    if (!id) continue
    try {
      if (geoContains(feature as Feature, point)) {
        const meta = getRegionMetadata(id)
        return { id, name: meta?.name || (feature.properties as Record<string, string>).name || id }
      }
    } catch {
      // 일부 지오메트리 오류는 무시
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
