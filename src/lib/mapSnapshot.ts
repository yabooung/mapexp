import { geoMercator, geoPath, geoBounds } from 'd3-geo'
import type { Feature, FeatureCollection } from 'geojson'
import { EXP_COLORS } from '@/constants'
import { REGION_ID_MAP, KOREA_PROV_CODE_BY_ID } from '@/constants/regions'
import { ExperienceGrade } from '@/types'
import { loadPrefectures, loadMunicipalities, municipalityName, PREF_KANJI_BY_ID, type Country } from '@/lib/geo'

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

const CARD_FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Yu Gothic', sans-serif"

/**
 * 광역 한 곳의 시정촌/시군구 색칠 지도를 담은 지역 카드 (전부 캔버스 - 배치 깨짐 없음)
 * 먼 섬 이상치는 미니맵과 같은 중앙값 컷으로 제외해 본체를 크게 그린다.
 */
export async function renderPrefectureCardImage(
  country: Country,
  prefectureId: string,
  getLevel: (regionId: string) => ExperienceGrade,
  regionName: string,
  caption: string,
  siteUrl = 'mapexp.vercel.app',
): Promise<string | null> {
  const muniFc = await loadMunicipalities(country)
  if (!muniFc) return null

  // 해당 광역의 기초 지역 feature + 스토어 규약 ID
  const prefKanji = PREF_KANJI_BY_ID[prefectureId]
  const feats: Array<{ feature: Feature; id: string | null }> = []
  for (const f of muniFc.features) {
    const props = f.properties as Record<string, string | null> | null
    if (country === 'japan') {
      if (props?.N03_001 !== prefKanji) continue
      const name = municipalityName(props)
      feats.push({ feature: f as Feature, id: name ? `${prefectureId}_${name}` : null })
    } else {
      const provCode = KOREA_PROV_CODE_BY_ID[prefectureId]
      if (!provCode || !props?.code?.startsWith(provCode)) continue
      feats.push({ feature: f as Feature, id: props.name ? `${prefectureId}_${props.name}` : null })
    }
  }
  if (feats.length === 0) return null

  const width = 840
  const height = 940
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 배경 (와시 페이퍼)
  ctx.fillStyle = '#f5f3ec'
  ctx.fillRect(0, 0, width, height)

  const pad = 56

  // ── 헤더: 経 인장 + MAPEXP + 지역명 ──
  ctx.save()
  ctx.translate(pad + 26, pad + 26)
  ctx.rotate((-3 * Math.PI) / 180)
  ctx.fillStyle = '#be3a2b'
  ctx.beginPath()
  ctx.roundRect(-26, -26, 52, 52, 12)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 30px ${CARD_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('経', 0, 2)
  ctx.restore()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#26231c'
  ctx.font = `700 26px ${CARD_FONT}`
  ctx.fillText('MAPEXP', pad + 68, pad + 22)
  ctx.fillStyle = '#7c766a'
  ctx.font = `500 15px ${CARD_FONT}`
  ctx.fillText(siteUrl, pad + 68, pad + 45)

  // 지역명 (크게)
  ctx.fillStyle = '#26231c'
  ctx.font = `700 40px ${CARD_FONT}`
  ctx.fillText(regionName, pad, pad + 116)

  // ── 지도: 먼 섬 이상치 컷 후 본체 확대 ──
  const boxes = feats.map(({ feature }) => {
    try {
      return geoBounds(feature) // [[minLng,minLat],[maxLng,maxLat]]
    } catch {
      return null
    }
  })
  const centers = boxes.map((b) => (b ? [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2] : null))
  const valid = centers.filter((c): c is [number, number] => !!c)
  const median = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b)
    return s[Math.floor(s.length / 2)]
  }
  const medLng = median(valid.map((c) => c[0]))
  const medLat = median(valid.map((c) => c[1]))
  const dists = valid.map((c) => Math.hypot(c[0] - medLng, c[1] - medLat))
  const cut = Math.max(0.35, median(dists) * 2.5)

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  boxes.forEach((b, i) => {
    const c = centers[i]
    if (!b || !c || Math.hypot(c[0] - medLng, c[1] - medLat) > cut) return
    minLng = Math.min(minLng, b[0][0]); minLat = Math.min(minLat, b[0][1])
    maxLng = Math.max(maxLng, b[1][0]); maxLat = Math.max(maxLat, b[1][1])
  })
  if (!Number.isFinite(minLng)) return null

  const mapTop = pad + 150
  const mapH = 560
  const projection = geoMercator().fitExtent(
    [
      [pad, mapTop],
      [width - pad, mapTop + mapH],
    ],
    {
      type: 'Feature',
      properties: {},
      geometry: { type: 'MultiPoint', coordinates: [[minLng, minLat], [maxLng, maxLat]] },
    } as unknown as Parameters<ReturnType<typeof geoMercator>['fitExtent']>[1],
  )
  const path = geoPath(projection, ctx)

  // 지도 영역 클리핑 (이상치 섬이 텍스트 위로 튀지 않게)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, mapTop - 24, width, mapH + 48)
  ctx.clip()

  const sorted = [...feats].sort((a, b) => ((getLevel(a.id ?? '') > 0 ? 1 : 0) - (getLevel(b.id ?? '') > 0 ? 1 : 0)))
  for (const { feature, id } of sorted) {
    const level = id ? getLevel(id) : (0 as ExperienceGrade)
    ctx.beginPath()
    path(feature)
    if (level > 0) {
      ctx.fillStyle = EXP_COLORS[level]
      ctx.fill()
      ctx.strokeStyle = 'rgba(38, 35, 28, 0.35)'
      ctx.lineWidth = 1
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#d8d4c8'
      ctx.lineWidth = 0.8
    }
    ctx.stroke()
  }
  ctx.restore()

  // ── 캡션 (점수·진행) ──
  ctx.fillStyle = '#26231c'
  ctx.font = `600 22px ${CARD_FONT}`
  ctx.fillText(caption, pad, mapTop + mapH + 64)

  // 구분선 + 푸터
  ctx.strokeStyle = '#e3dfd3'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad, height - 78)
  ctx.lineTo(width - pad, height - 78)
  ctx.stroke()
  ctx.fillStyle = '#a8a294'
  ctx.font = `500 16px ${CARD_FONT}`
  ctx.fillText(siteUrl, pad, height - 44)

  return canvas.toDataURL('image/png')
}

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
