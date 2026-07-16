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

  // 오키나와: 우하단 대각선 컷 인셋 (일본 지도 관례 - 좌측은 범례에 양보)
  if (isJapan) {
    const okinawa = features.find((f) => (f.properties as { id?: string })?.id === 'okinawa')
    if (okinawa) {
      // 대각선 구분선 (우하단 모서리 삼각 영역)
      const cornerW = Math.round(width * 0.34)
      const cornerH = Math.round(height * 0.26)
      ctx.strokeStyle = '#aaa496'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(width - cornerW, height)
      ctx.lineTo(width, height - cornerH)
      ctx.stroke()

      const insetProjection = geoMercator().fitExtent(
        [
          [width - cornerW + 46, height - cornerH + 62],
          [width - 18, height - 22],
        ],
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'MultiPoint', coordinates: [[122.9, 24.0], [131.4, 27.95]] },
        } as unknown as Parameters<ReturnType<typeof geoMercator>['fitExtent']>[1],
      )
      drawFeature(okinawa as Feature, geoPath(insetProjection, ctx))
    }
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
  badgeIcons: string[]
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

  const hasBadges = data.badgeIcons.length > 0
  const H = pad + 96 + 24 + mapBlockH + 30 + 150 + 24 + 108 + 26 + 78 + (hasBadges ? 104 : 0) + 70 + pad - 40

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

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

  // ── 달성 도장 ──
  if (hasBadges) {
    let bx = pad + 34
    data.badgeIcons.slice(0, 8).forEach((icon, i) => {
      ctx.save()
      ctx.translate(bx, y + 40)
      ctx.rotate((((i % 5) - 2) * 4 * Math.PI) / 180)
      ctx.fillStyle = '#be3a2b'
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
