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

/** 오키나와 인셋 박스를 그리고 그 안에 features를 렌더할 projection/extent를 반환
 *  박스 비율을 열도 범위(약 2:1)에 맞춰 섬들이 박스를 가득 채우게 한다 */
function drawOkinawaInsetBox(ctx: CanvasRenderingContext2D, width: number) {
  const pad = Math.round(width * 0.03)
  const w = Math.round(width * 0.4)
  const h = Math.round(width * 0.205)
  const x = pad
  const y = pad
  ctx.fillStyle = '#f5f3ec'
  ctx.strokeStyle = '#d8d4c8'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.fill()
  ctx.stroke()
  const inner = Math.round(width * 0.013)
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

interface LabelItem {
  x: number
  y: number
  area: number
  text: string
}

/** 라벨 위치 계산: 가장 큰 폴리곤 중심 (화면 밖·극소 지역은 null) */
function labelSpot(
  path: ReturnType<typeof geoPath>,
  feature: Feature,
  text: string,
  bounds: { w: number; h: number },
  minArea = 0,
): LabelItem | null {
  // MultiPolygon은 낙도가 중심을 바다로 끌어당기므로 최대 폴리곤만으로 판정
  let target: Feature = feature
  if (feature.geometry.type === 'MultiPolygon') {
    let bestArea = -1
    for (const coords of feature.geometry.coordinates) {
      const f = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: coords } } as Feature
      const a = path.area(f)
      if (a > bestArea) {
        bestArea = a
        target = f
      }
    }
  }
  const area = path.area(target)
  if (minArea > 0 && area < minArea) return null
  const [x, y] = path.centroid(target)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (x < 0 || x > bounds.w || y < 0 || y > bounds.h) return null
  return { x, y, area, text }
}

/** 지명 라벨 일괄 배치: 넓은 지역 우선, 이미 놓인 라벨과 겹치면 생략 (밀집 지대 뭉개짐 방지) */
function drawLabels(ctx: CanvasRenderingContext2D, items: LabelItem[], fontSize: number) {
  ctx.save()
  ctx.font = `700 ${fontSize}px ${CARD_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'

  const placed: Array<[number, number, number, number]> = []
  const sorted = [...items].sort((a, b) => b.area - a.area)
  for (const it of sorted) {
    const w = ctx.measureText(it.text).width + 8
    const h = fontSize + 6
    const rect: [number, number, number, number] = [it.x - w / 2, it.y - h / 2, it.x + w / 2, it.y + h / 2]
    if (placed.some((r) => !(rect[2] < r[0] || rect[0] > r[2] || rect[3] < r[1] || rect[1] > r[3]))) continue
    placed.push(rect)

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)'
    ctx.lineWidth = Math.max(3, fontSize * 0.22)
    ctx.strokeText(it.text, it.x, it.y)
    ctx.fillStyle = '#3f3b30'
    ctx.fillText(it.text, it.x, it.y)
  }
  ctx.restore()
}

export interface SnapshotOpts {
  width?: number
  height?: number
  /** 지명 라벨 (regionId → 표시명, null이면 생략) */
  getLabel?: (regionId: string) => string | null
}

export async function renderRegionMapImage(
  country: Country,
  getLevel: (regionId: string) => ExperienceGrade,
  opts: SnapshotOpts = {},
): Promise<string | null> {
  const { width = 1200, height = 1200, getLabel } = opts
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

  // 오키나와: 좌상단 사각 인셋 (기초 지도와 동일한 형식)
  let okinawaInsetPath: ReturnType<typeof geoPath> | null = null
  let okinawaFeature: Feature | null = null
  if (isJapan) {
    const okinawa = features.find((f) => (f.properties as { id?: string })?.id === 'okinawa')
    if (okinawa) {
      okinawaInsetPath = geoPath(drawOkinawaInsetBox(ctx, width), ctx)
      okinawaFeature = okinawa as Feature
      drawFeature(okinawaFeature, okinawaInsetPath)
    }
  }

  // 지명 라벨 (선택)
  if (getLabel) {
    const fontSize = Math.round(width * 0.0165)
    const bounds = { w: width, h: height }
    const items: LabelItem[] = []
    for (const feature of features) {
      const id = (feature.properties as { id?: string })?.id
      if (!id || (isJapan && id === 'okinawa')) continue
      const text = getLabel(id)
      if (!text) continue
      const spot = labelSpot(path, feature as Feature, text, bounds)
      if (spot) items.push(spot)
    }
    if (okinawaInsetPath && okinawaFeature) {
      const text = getLabel('okinawa')
      const spot = text ? labelSpot(okinawaInsetPath, okinawaFeature, text, bounds) : null
      if (spot) items.push(spot)
    }
    drawLabels(ctx, items, fontSize)
  }

  return canvas.toDataURL('image/png')
}

// 한국 시군구 코드 접두사 → 광역 ID (역방향 조회용)
const KOREA_ID_BY_PROV_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(KOREA_PROV_CODE_BY_ID).map(([id, code]) => [code, id]),
)

/** dataURL → 이미지 로드 */
const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

export interface ShareCardData {
  /** 우측 상단 국가 라벨 (일본 / 한국 / 일본 × 한국) */
  headerLabel: string
  /** 브랜드 부제 (나의 여행 도장) */
  subtitle: string
  /** 지도 이미지 (1장 = 전폭, 2장 = 좌우 배치 + 캡션) */
  maps: Array<{ src: string; caption?: string }>
  level: number
  score: number
  /** 다음 레벨 도달 점수 (progress 바용) */
  nextLevelScore: number
  tierLabel: string
  /** '/ 다음 레벨까지 n점' 형식의 번역 문자열 */
  toNextLabel: string
  /** [방문 지역, 달성률, 도장첩] 라벨·값 3쌍 */
  stats: Array<{ label: string; value: string; sub?: string }>
  counts: Record<ExperienceGrade, number>
  total: number
  gradeLabels: Record<ExperienceGrade, string>
  /** 달성 도장 (region=지역 완주 도장은 藍 파랑, 그 외 인주 레드) */
  badges: Array<{ icon: string; region?: boolean }>
  siteUrl: string
}

/**
 * 공유 카드 전체를 캔버스로 직접 그린다.
 * html2canvas는 CJK 가변 폰트의 세로 메트릭·자간을 계속 오측정해
 * (글자가 아래로 붙고 일본어 자간이 벌어짐) DOM 캡처를 버리고 직접 렌더.
 */
export async function renderShareCardImage(data: ShareCardData): Promise<string | null> {
  const W = 840
  const pad = 64
  const inner = W - pad * 2

  // 지도 블록 높이 선계산 (캔버스 높이 확정용)
  const twoMaps = data.maps.length > 1
  const mapW = twoMaps ? Math.floor((inner - 20) / 2) : inner
  const mapH = mapW // 지도 스냅샷은 정사각
  const mapBlockH = mapH + (data.maps.some((m) => m.caption) ? 44 : 0)

  const hasBadges = data.badges.length > 0
  const H = pad + 96 + 24 + mapBlockH + 30 + 150 + 24 + 108 + 26 + 78 + (hasBadges ? 104 : 0) + 70 + pad - 40

  // 2배 해상도 렌더 (SNS 확대·좁은 기초 지역 시인성)
  const S = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * S
  canvas.height = H * S
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(S, S)

  ctx.fillStyle = '#f5f3ec'
  ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  let y = pad

  // ── 헤더 ──
  ctx.save()
  ctx.translate(pad + 30, y + 30)
  ctx.rotate((-3 * Math.PI) / 180)
  ctx.fillStyle = '#be3a2b'
  ctx.beginPath()
  ctx.roundRect(-30, -30, 60, 60, 14)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 34px ${CARD_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('経', 0, 2)
  ctx.restore()
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = '#26231c'
  ctx.font = `700 34px ${CARD_FONT}`
  ctx.fillText('MAPEXP', pad + 78, y + 26)
  ctx.fillStyle = '#7c766a'
  ctx.font = `500 20px ${CARD_FONT}`
  ctx.fillText(data.subtitle, pad + 78, y + 56)

  ctx.textAlign = 'right'
  ctx.font = `600 22px ${CARD_FONT}`
  ctx.fillText(data.headerLabel, W - pad, y + 32)
  ctx.textAlign = 'left'
  y += 96 + 24

  // ── 지도 ──
  try {
    if (twoMaps) {
      for (let i = 0; i < 2; i++) {
        const slot = data.maps[i]
        const x = pad + i * (mapW + 20)
        const img = await loadImage(slot.src)
        ctx.drawImage(img, x, y, mapW, mapH)
        if (slot.caption) {
          ctx.fillStyle = '#7c766a'
          ctx.font = `600 19px ${CARD_FONT}`
          ctx.textAlign = 'center'
          ctx.fillText(slot.caption, x + mapW / 2, y + mapH + 30)
        }
      }
      ctx.textAlign = 'left'
    } else {
      const img = await loadImage(data.maps[0].src)
      ctx.drawImage(img, pad, y, mapW, mapH)
    }
  } catch {
    return null
  }
  y += mapBlockH + 30

  // ── Lv / EXP (게임식 표기) ──
  ctx.fillStyle = '#26231c'
  ctx.font = `700 72px ${CARD_FONT}`
  ctx.fillText(`Lv.${data.level}`, pad, y + 64)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#be3a2b'
  ctx.font = `700 46px ${CARD_FONT}`
  ctx.fillText(`${data.score} EXP`, W - pad, y + 62)
  ctx.textAlign = 'left'

  // 다음 레벨 진행 바 + 티어
  const barY = y + 92
  ctx.fillStyle = '#e3dfd3'
  ctx.beginPath()
  ctx.roundRect(pad, barY, inner, 12, 6)
  ctx.fill()
  const frac = Math.max(0.02, (data.score % 10) / 10)
  ctx.fillStyle = '#be3a2b'
  ctx.beginPath()
  ctx.roundRect(pad, barY, Math.round(inner * frac), 12, 6)
  ctx.fill()

  ctx.fillStyle = '#be3a2b'
  ctx.font = `700 21px ${CARD_FONT}`
  ctx.fillText(data.tierLabel, pad, barY + 44)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#a8a294'
  ctx.font = `500 19px ${CARD_FONT}`
  ctx.fillText(data.toNextLabel, W - pad, barY + 44)
  ctx.textAlign = 'left'
  y += 150 + 24

  // ── 방문/달성률/도장첩 ──
  ctx.strokeStyle = '#e3dfd3'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(pad, y - 14)
  ctx.lineTo(W - pad, y - 14)
  ctx.stroke()

  const colW = inner / 3
  data.stats.forEach((s, i) => {
    const x = pad + i * colW
    ctx.fillStyle = '#7c766a'
    ctx.font = `500 20px ${CARD_FONT}`
    ctx.fillText(s.label, x, y + 26)
    ctx.fillStyle = '#26231c'
    ctx.font = `700 42px ${CARD_FONT}`
    ctx.fillText(s.value, x, y + 76)
    if (s.sub) {
      const w = ctx.measureText(s.value).width
      ctx.fillStyle = '#a8a294'
      ctx.font = `600 22px ${CARD_FONT}`
      ctx.fillText(` ${s.sub}`, x + w, y + 76)
    }
  })
  y += 108 + 26

  // ── 등급 분포: 하나의 막대에 쌓이는 스택 바 (기존 형식) + 인라인 범례 ──
  const order: ExperienceGrade[] = [5, 4, 3, 2, 1, 0] as ExperienceGrade[]
  let sx = pad
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(pad, y, inner, 20, 10)
  ctx.clip()
  for (const lvl of order) {
    const cnt = data.counts[lvl]
    if (!cnt) continue
    const w = (cnt / data.total) * inner
    ctx.fillStyle = lvl === 0 ? '#e3dfd3' : EXP_COLORS[lvl]
    ctx.fillRect(sx, y, w + 1, 20)
    sx += w
  }
  ctx.restore()

  // 범례 (색점 + 이름 + 개수, 한 줄 중앙)
  const legendY = y + 52
  ctx.font = `600 19px ${CARD_FONT}`
  const parts = ([1, 2, 3, 4, 5] as ExperienceGrade[]).map((lvl) => ({
    lvl,
    text: `${data.gradeLabels[lvl]} ${data.counts[lvl]}`,
  }))
  const gapDot = 26
  const totalW = parts.reduce((s, p) => s + 14 + 8 + ctx.measureText(p.text).width, 0) + gapDot * (parts.length - 1)
  let lx = pad + Math.max(0, (inner - totalW) / 2)
  for (const p of parts) {
    ctx.fillStyle = EXP_COLORS[p.lvl]
    ctx.beginPath()
    ctx.roundRect(lx, legendY - 13, 14, 14, 4)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#7c766a'
    ctx.fillText(p.text, lx + 22, legendY)
    lx += 14 + 8 + ctx.measureText(p.text).width + gapDot
  }
  y += 78

  // ── 달성 도장 (8개 초과면 7개 + '+N' 표기) ──
  if (hasBadges) {
    const maxShow = data.badges.length > 8 ? 7 : 8
    let bx = pad + 34
    data.badges.slice(0, maxShow).forEach(({ icon, region }, i) => {
      ctx.save()
      ctx.translate(bx, y + 40)
      ctx.rotate((((i % 5) - 2) * 4 * Math.PI) / 180)
      ctx.fillStyle = region ? '#2f5b93' : '#be3a2b' // 지역 완주 = 藍 파랑
      ctx.beginPath()
      ctx.arc(0, 0, 34, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = `700 ${icon.length > 1 ? 20 : 30}px ${CARD_FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(icon, 0, 2)
      ctx.restore()
      bx += 84
    })
    if (data.badges.length > maxShow) {
      ctx.fillStyle = '#7c766a'
      ctx.font = `700 26px ${CARD_FONT}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`+${data.badges.length - maxShow}`, bx - 16, y + 40)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    y += 104
  }

  // ── 푸터 ──
  ctx.strokeStyle = '#e3dfd3'
  ctx.beginPath()
  ctx.moveTo(pad, y + 6)
  ctx.lineTo(W - pad, y + 6)
  ctx.stroke()
  ctx.fillStyle = '#a8a294'
  ctx.font = `500 20px ${CARD_FONT}`
  ctx.fillText(data.siteUrl, pad, y + 44)

  return canvas.toDataURL('image/png')
}

const CARD_FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Yu Gothic', sans-serif"

export interface PrefectureCardOpts {
  regionName: string
  /** 브랜드 부제 (나의 여행 도장) - 국가 카드와 동일 헤더 */
  subtitle: string
  /** [방문, 달성률, EXP] 라벨·값 3쌍 - 국가 카드와 동일 형식 */
  stats: Array<{ label: string; value: string; sub?: string }>
  /** 기초 지명 라벨 (props·원어명 → 표시명, 미지정 시 라벨 없음) */
  getLabel?: (props: Record<string, string | null> | null, name: string) => string | null
  siteUrl?: string
}

/**
 * 광역 한 곳의 시정촌/시군구 색칠 지도를 담은 지역 카드 (전부 캔버스 - 배치 깨짐 없음)
 * 먼 섬 이상치는 미니맵과 같은 중앙값 컷으로 제외해 본체를 크게 그린다.
 * 헤더·통계·푸터는 국가 공유 카드와 동일한 형식.
 */
export async function renderPrefectureCardImage(
  country: Country,
  prefectureId: string,
  getLevel: (regionId: string) => ExperienceGrade,
  opts: PrefectureCardOpts,
): Promise<string | null> {
  const { regionName, subtitle, stats, getLabel, siteUrl = 'mapexp.vercel.app' } = opts
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
  const mapH = 600
  const pad = 64
  // 헤더(96+20) + 지역명(64) + 지도 + 간격(44) + 통계(108+26) + 푸터(84)
  const height = pad + 180 + mapH + 44 + 108 + 26 + 84

  // 2배 해상도 렌더 (좁은 기초 지역 시인성)
  const S = 2
  const canvas = document.createElement('canvas')
  canvas.width = width * S
  canvas.height = height * S
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(S, S)

  // 배경 (와시 페이퍼)
  ctx.fillStyle = '#f5f3ec'
  ctx.fillRect(0, 0, width, height)

  // ── 헤더: 국가 카드와 동일 (経 인장 + MAPEXP + 부제, 우측 지역명) ──
  ctx.save()
  ctx.translate(pad + 30, pad + 30)
  ctx.rotate((-3 * Math.PI) / 180)
  ctx.fillStyle = '#be3a2b'
  ctx.beginPath()
  ctx.roundRect(-30, -30, 60, 60, 14)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 34px ${CARD_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('経', 0, 2)
  ctx.restore()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#26231c'
  ctx.font = `700 34px ${CARD_FONT}`
  ctx.fillText('MAPEXP', pad + 78, pad + 26)
  ctx.fillStyle = '#7c766a'
  ctx.font = `500 20px ${CARD_FONT}`
  ctx.fillText(subtitle, pad + 78, pad + 56)

  // 지역명 (크게)
  ctx.fillStyle = '#26231c'
  ctx.font = `700 48px ${CARD_FONT}`
  ctx.fillText(regionName, pad, pad + 96 + 20 + 48)

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

  const mapTop = pad + 180
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

  // 기초 지명 라벨 (선택) - 좁은 지역·겹침은 생략
  if (getLabel) {
    const items: LabelItem[] = []
    for (const { feature, id } of feats) {
      if (!id) continue
      const props = feature.properties as Record<string, string | null> | null
      const name = id.slice(id.indexOf('_') + 1)
      const text = getLabel(props, name)
      if (!text) continue
      const spot = labelSpot(path, feature, text, { w: width, h: height }, 380)
      if (spot) items.push(spot)
    }
    drawLabels(ctx, items, 16)
  }
  ctx.restore()

  // ── 방문/달성률/EXP (국가 카드와 동일 형식) ──
  const statsY = mapTop + mapH + 44
  const inner = width - pad * 2
  ctx.strokeStyle = '#e3dfd3'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(pad, statsY - 14)
  ctx.lineTo(width - pad, statsY - 14)
  ctx.stroke()

  const colW = inner / 3
  stats.forEach((s, i) => {
    const x = pad + i * colW
    ctx.fillStyle = '#7c766a'
    ctx.font = `500 20px ${CARD_FONT}`
    ctx.fillText(s.label, x, statsY + 26)
    ctx.fillStyle = '#26231c'
    ctx.font = `700 42px ${CARD_FONT}`
    ctx.fillText(s.value, x, statsY + 76)
    if (s.sub) {
      const w = ctx.measureText(s.value).width
      ctx.fillStyle = '#a8a294'
      ctx.font = `600 22px ${CARD_FONT}`
      ctx.fillText(` ${s.sub}`, x + w, statsY + 76)
    }
  })

  // ── 푸터 (국가 카드와 동일) ──
  const fy = statsY + 108 + 26
  ctx.strokeStyle = '#e3dfd3'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad, fy + 6)
  ctx.lineTo(width - pad, fy + 6)
  ctx.stroke()
  ctx.fillStyle = '#a8a294'
  ctx.font = `500 20px ${CARD_FONT}`
  ctx.fillText(siteUrl, pad, fy + 44)

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
  opts: SnapshotOpts = {},
): Promise<string | null> {
  const { width = 1200, height = 1200, getLabel } = opts
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
  let okinawaInsetPath: ReturnType<typeof geoPath> | null = null
  let okinawaPref: Feature | null = null
  if (isJapan) {
    const insetProjection = drawOkinawaInsetBox(ctx, width)
    okinawaInsetPath = geoPath(insetProjection, ctx)
    for (const feature of features) {
      if (isOkinawaMuni(feature as Feature)) drawMuni(feature as Feature, okinawaInsetPath)
    }
    okinawaPref = ((prefFc as FeatureCollection).features.find(
      (f) => (f.properties as { id?: string })?.id === 'okinawa',
    ) ?? null) as Feature | null
    if (okinawaPref) {
      ctx.beginPath()
      okinawaInsetPath(okinawaPref)
      ctx.strokeStyle = 'rgba(38, 35, 28, 0.35)'
      ctx.lineWidth = 0.9
      ctx.stroke()
    }
  }

  // 지명 라벨 (선택) - 기초 지도에서는 광역명만 (기초명은 전국 축척에서 읽을 수 없음)
  if (getLabel) {
    const fontSize = Math.round(width * 0.0165)
    const bounds = { w: width, h: height }
    const items: LabelItem[] = []
    for (const feature of (prefFc as FeatureCollection).features) {
      const id = (feature.properties as { id?: string })?.id
      if (!id || (isJapan && id === 'okinawa')) continue
      const text = getLabel(id)
      if (!text) continue
      const spot = labelSpot(path, feature as Feature, text, bounds)
      if (spot) items.push(spot)
    }
    if (okinawaInsetPath && okinawaPref) {
      const text = getLabel('okinawa')
      const spot = text ? labelSpot(okinawaInsetPath, okinawaPref, text, bounds) : null
      if (spot) items.push(spot)
    }
    drawLabels(ctx, items, fontSize)
  }

  return canvas.toDataURL('image/png')
}
