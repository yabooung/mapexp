import type { RegionMetadata } from '@/types'
import type { Feature } from 'geojson'

/**
 * 선택적 보너스 지역 오버레이.
 *
 * 데이터는 이 저장소에 포함되지 않는다. 배포 환경변수
 * `NEXT_PUBLIC_HIDDEN_OVERLAY`(JSON)로만 주입되며, 미설정이면 빈 배열이라
 * 관련 기능 자체가 존재하지 않는다(빌드/실행에는 아무 영향 없음).
 *
 * 형식: `[{ id, name, nameLocal, nameJa?, country, bbox:[minLng,minLat,maxLng,maxLat] }]`
 */

interface OverlayInput {
  id: string
  name: string
  nameLocal: string
  nameJa?: string
  country: 'japan' | 'korea'
  bbox: [number, number, number, number]
}

export interface HiddenRegion {
  id: string
  country: 'japan' | 'korea'
  /** GeoJSON name → id 매핑 키 */
  nameKey: string
  meta: RegionMetadata
  feature: Feature
}

function parseOverlay(): HiddenRegion[] {
  const raw = process.env.NEXT_PUBLIC_HIDDEN_OVERLAY
  if (!raw) return []
  let items: OverlayInput[]
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    items = parsed
  } catch {
    return []
  }
  return items
    .filter((it) => it && it.id && Array.isArray(it.bbox) && it.bbox.length === 4)
    .map((it) => {
      const [x0, y0, x1, y1] = it.bbox
      const feature: Feature = {
        type: 'Feature',
        properties: { id: it.id, name: it.name },
        geometry: {
          type: 'Polygon',
          coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]],
        },
      }
      return {
        id: it.id,
        country: it.country,
        nameKey: it.name,
        meta: {
          id: it.id,
          name: it.name,
          nameEn: it.id,
          nameLocal: it.nameLocal,
          nameJa: it.nameJa,
          country: it.country,
          type: 'province',
          hidden: true,
        },
        feature,
      }
    })
}

export const HIDDEN_REGIONS: HiddenRegion[] = parseOverlay()
