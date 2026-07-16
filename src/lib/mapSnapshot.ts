import { geoMercator, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection } from 'geojson'
import { EXP_COLORS } from '@/constants'
import { REGION_ID_MAP, KOREA_PROV_CODE_BY_ID } from '@/constants/regions'
import { ExperienceGrade } from '@/types'
import { loadPrefectures, loadMunicipalities, municipalityName, type Country } from '@/lib/geo'

/**
 * 공유 이미지용 지도 스냅샷 렌더러
 * 배경 타일 없이 광역 지역을 등급색으로 칠한 클래식 経県値 스타일 지도를
 * 캔버스에 그려 dataURL로 반환한다. (타일 CORS/taint 문제와 무관)
 *
 * 일본은 오키나와·이즈/오가사와라 낙도가 지도를 절반 크기로 축소시키므로,
 * 본토 고정 범위로 확대하고 오키나와는 좌상단 인셋 박스에 따로 그린다.
 * (도쿄 낙도는 본토 범위 밖으로 크롭 - 색은 본토 도쿄에서 이미 보인다)
 */

/** 일본 본토 범위 (규슈 고토열도~홋카이도, 야쿠시마 포함 / 오키나와·오가사와라 제외)
 *  주의: d3-geo는 구면 폴리곤이라 감김 방향이 틀리면 '지구 전체'로 해석됨
 *  → 방향 무관한 MultiPoint(대각 모서리)로 fit */
const JAPAN_MAINLAND_BBOX = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'MultiPoint',
    coordinates: [[128.3, 30.0], [147.0, 45.8]],
  },
} as unknown as Feature

/** 오키나와 인셋 박스를 그리고 그 안에 features를 렌더할 projection/extent를 반환 */
function drawOkinawaInsetBox(ctx: CanvasRenderingContext2D, width: number) {
  const pad = Math.round(width * 0.03)
  const w = Math.round(width * 0.3)
  const h = Math.round(width * 0.24)
  const x = pad
  const y = pad
  ctx.fillStyle = '#f5f3ec'
  ctx.strokeStyle = '#d8d4c8'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.fill()
  ctx.stroke()
  const inner = Math.round(width * 0.015)
  return geoMercator().fitExtent(
    [
      [x + inner, y + inner],
      [x + w - inner, y + h - inner],
    ],
    // 오키나와 본섬~사키시마 제도 범위 (MultiPoint - 감김 방향 무관)
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiPoint',
        coordinates: [[122.9, 24.0], [131.4, 27.95]],
      },
    } as unknown as Parameters<ReturnType<typeof geoMercator>['fitExtent']>[1],
  )
}
export async function renderRegionMapImage(
  country: Country,
  getLevel: (regionId: string) => ExperienceGrade,
  width = 840,
  height = 840,
): Promise<string | null> {
  const fc = await loadPrefectures(country)
  if (!fc) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const pad = Math.round(width * 0.03)
  const isJapan = country === 'japan'
  const projection = geoMercator().fitExtent(
    [
      [pad, pad],
      [width - pad, height - pad],
    ],
    (isJapan ? JAPAN_MAINLAND_BBOX : fc) as unknown as Parameters<ReturnType<typeof geoMercator>['fitExtent']>[1],
  )
  const path = geoPath(projection, ctx)

  // 미방문(흰색) 지역을 먼저, 방문 지역을 나중에 그려 색칠 경계가 위로 오게
  const features = [...(fc as FeatureCollection).features].sort((a, b) => {
    const la = getLevel((a.properties as { id?: string })?.id ?? '')
    const lb = getLevel((b.properties as { id?: string })?.id ?? '')
    return (la > 0 ? 1 : 0) - (lb > 0 ? 1 : 0)
  })

  const drawFeature = (feature: Feature, p: ReturnType<typeof geoPath>) => {
    const id = (feature.properties as { id?: string })?.id
    const level = id ? getLevel(id) : (0 as ExperienceGrade)

    ctx.beginPath()
    p(feature)

    if (level > 0) {
      ctx.fillStyle = EXP_COLORS[level]
      ctx.fill()
      ctx.strokeStyle = 'rgba(38, 35, 28, 0.25)'
      ctx.lineWidth = level === 5 ? 1.6 : 1
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#d8d4c8'
      ctx.lineWidth = 0.8
    }
    ctx.stroke()
  }

  for (const feature of features) {
    if (isJapan && (feature.properties as { id?: string })?.id === 'okinawa') continue // 인셋에서 그림
    drawFeature(feature as Feature, path)
  }

  // 오키나와 인셋 (좌상단 - 본토가 커지도록 따로 그린다)
  if (isJapan) {
    const okinawa = features.find((f) => (f.properties as { id?: string })?.id === 'okinawa')
    if (okinawa) {
      const insetProjection = drawOkinawaInsetBox(ctx, width)
      drawFeature(okinawa as Feature, geoPath(insetProjection, ctx))
    }
  }

  return canvas.toDataURL('image/png')
}

// 한국 시군구 코드 접두사 → 광역 ID (역방향 조회용)
const KOREA_ID_BY_PROV_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(KOREA_PROV_CODE_BY_ID).map(([id, code]) => [code, id]),
)

/**
 * 기초 지역(시정촌/시군구) 단위 지도 스냅샷
 * 각 기초 지역을 자기 기록 등급색으로 칠하고(부모 상속 없음),
 * 광역 경계선을 위에 그려 맥락을 준다. ID 규약은 스토어와 동일.
 */
export async function renderMunicipalityMapImage(
  country: Country,
  getLevel: (regionId: string) => ExperienceGrade,
  width = 840,
  height = 840,
): Promise<string | null> {
  const [muniFc, prefFc] = await Promise.all([loadMunicipalities(country), loadPrefectures(country)])
  if (!muniFc || !prefFc) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const pad = Math.round(width * 0.03)
  const isJapan = country === 'japan'
  const projection = geoMercator().fitExtent(
    [
      [pad, pad],
      [width - pad, height - pad],
    ],
    (isJapan ? JAPAN_MAINLAND_BBOX : prefFc) as unknown as Parameters<ReturnType<typeof geoMercator>['fitExtent']>[1],
  )
  const path = geoPath(projection, ctx)
  const isOkinawaMuni = (f: Feature) => (f.properties as { N03_001?: string } | null)?.N03_001 === '沖縄県'

  // 기초 지역 ID 계산 (MapView/관리 모달과 동일한 규약)
  const muniId = (props: Record<string, string | null> | null): string | null => {
    if (!props) return null
    if (country === 'japan') {
      const name = municipalityName(props)
      const parentId = props.N03_001 ? REGION_ID_MAP['japan'][props.N03_001] : null
      return name && parentId ? `${parentId}_${name}` : null
    }
    const name = props.name
    const parentId = props.code ? KOREA_ID_BY_PROV_CODE[props.code.slice(0, 2)] : null
    return name && parentId ? `${parentId}_${name}` : null
  }

  // 미방문을 먼저, 방문을 나중에 (색칠 경계가 위로)
  const features = [...muniFc.features].sort((a, b) => {
    const la = getLevel(muniId(a.properties as Record<string, string | null>) ?? '')
    const lb = getLevel(muniId(b.properties as Record<string, string | null>) ?? '')
    return (la > 0 ? 1 : 0) - (lb > 0 ? 1 : 0)
  })

  const drawMuni = (feature: Feature, p: ReturnType<typeof geoPath>) => {
    const id = muniId(feature.properties as Record<string, string | null>)
    const level = id ? getLevel(id) : (0 as ExperienceGrade)

    ctx.beginPath()
    p(feature)

    if (level > 0) {
      ctx.fillStyle = EXP_COLORS[level]
      ctx.fill()
      ctx.strokeStyle = 'rgba(38, 35, 28, 0.3)'
      ctx.lineWidth = 0.5
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#e2ded2'
      ctx.lineWidth = 0.3
    }
    ctx.stroke()
  }

  for (const feature of features) {
    if (isJapan && isOkinawaMuni(feature as Feature)) continue // 인셋에서 그림
    drawMuni(feature as Feature, path)
  }

  // 광역 경계선 (맥락)
  for (const feature of (prefFc as FeatureCollection).features) {
    if (isJapan && (feature.properties as { id?: string })?.id === 'okinawa') continue
    ctx.beginPath()
    path(feature as Feature)
    ctx.strokeStyle = 'rgba(38, 35, 28, 0.35)'
    ctx.lineWidth = 0.9
    ctx.stroke()
  }

  // 오키나와 인셋 (시정촌 + 광역 경계)
  if (isJapan) {
    const insetProjection = drawOkinawaInsetBox(ctx, width)
    const insetPath = geoPath(insetProjection, ctx)
    for (const feature of features) {
      if (isOkinawaMuni(feature as Feature)) drawMuni(feature as Feature, insetPath)
    }
    const okinawaPref = (prefFc as FeatureCollection).features.find(
      (f) => (f.properties as { id?: string })?.id === 'okinawa',
    )
    if (okinawaPref) {
      ctx.beginPath()
      insetPath(okinawaPref as Feature)
      ctx.strokeStyle = 'rgba(38, 35, 28, 0.35)'
      ctx.lineWidth = 0.9
      ctx.stroke()
    }
  }

  return canvas.toDataURL('image/png')
}
