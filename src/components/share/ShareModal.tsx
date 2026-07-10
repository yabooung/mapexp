'use client'

import { useState, useEffect, useRef } from 'react'
import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import { generateShareUrl } from '@/lib/share'
import { TOTAL_REGIONS, EXP_COLORS } from '@/constants'
import { ExperienceGrade, RegionExp } from '@/types'
import { countryStats, countryGradeCounts, levelFromScore, muniStats } from '@/lib/stats'
import { computeBadges } from '@/lib/badges'
import { trackDistanceMeters, type Country } from '@/lib/geo'
import { renderRegionMapImage, renderMunicipalityMapImage } from '@/lib/mapSnapshot'
import { useT, useLang, levelLabel, I18nKey } from '@/lib/i18n'
import { ev } from '@/lib/analytics'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import toast from 'react-hot-toast'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
}

/** 카드에 담을 지도 범위 */
type CardScope = 'japan' | 'korea' | 'both'
/** 지도 상세도: 광역(현/시도) / 기초(시정촌/시군구) / 둘다 */
type CardDetail = 'pref' | 'muni' | 'bothDetail'

const levelOfFor = (regions: RegionExp[]) => (regionId: string): ExperienceGrade => {
  const r = regions.find((x) => x.regionId === regionId)
  return (r?.gyeonghyeonchi ?? r?.level ?? 0) as ExperienceGrade
}

export default function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const { exportData, country, regions } = useMapExpStore()
  const trackPoints = useGpsStore((s) => s.trackPoints)
  const [shareUrl, setShareUrl] = useState('')
  const [mapImgs, setMapImgs] = useState<{ japan: string | null; korea: string | null }>({ japan: null, korea: null })
  const [muniImgs, setMuniImgs] = useState<{ japan: string | null; korea: string | null }>({ japan: null, korea: null })
  const [scope, setScope] = useState<CardScope>('japan')
  const [detail, setDetail] = useState<CardDetail>('pref')
  const [rendering, setRendering] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const t = useT()
  const lang = useLang()

  const jpStats = countryStats(regions, 'japan')
  const krStats = countryStats(regions, 'korea')
  const hasBoth = jpStats.visited > 0 && krStats.visited > 0

  // 스코프별 선택 가능 여부: 기록 있는 나라 + 현재 보고 있는 나라
  const scopeEnabled: Record<CardScope, boolean> = {
    japan: jpStats.visited > 0 || country === 'japan',
    korea: krStats.visited > 0 || country === 'korea',
    both: hasBoth,
  }

  useEffect(() => {
    if (isOpen) {
      const data = exportData()
      setShareUrl(generateShareUrl(data))

      // 색칠된 지도 스냅샷 렌더링: 활성 국가 + (기록이 있으면) 반대 국가
      const levelOf = levelOfFor(regions)
      setMapImgs({ japan: null, korea: null })
      setMuniImgs({ japan: null, korea: null })
      const wantJapan = country === 'japan' || countryStats(regions, 'japan').visited > 0
      const wantKorea = country === 'korea' || countryStats(regions, 'korea').visited > 0
      if (wantJapan) renderRegionMapImage('japan', levelOf).then((img) => setMapImgs((m) => ({ ...m, japan: img })))
      if (wantKorea) renderRegionMapImage('korea', levelOf).then((img) => setMapImgs((m) => ({ ...m, korea: img })))

      // 기본 스코프: 양국 기록이 있으면 양국, 아니면 현재 국가
      const j = countryStats(regions, 'japan')
      const k = countryStats(regions, 'korea')
      setScope(j.visited > 0 && k.visited > 0 ? 'both' : (country as Country))
      setDetail('pref')
      ev('share_open', { country })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exportData, country, regions])

  // 기초 지도 이미지는 무겁기 때문에(전국 시정촌 GeoJSON) 필요할 때만 렌더
  useEffect(() => {
    if (!isOpen || detail === 'pref') return
    const levelOf = levelOfFor(regions)
    const need: Country[] = scope === 'both' ? ['japan', 'korea'] : [scope]
    need.forEach((c) => {
      if (muniImgs[c]) return
      renderMunicipalityMapImage(c, levelOf).then((img) => setMuniImgs((m) => (m[c] ? m : { ...m, [c]: img })))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, detail, scope])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      ev('share_copy')
      toast.success(t('share.copied'))
    } catch (err) {
      toast.error(t('share.copyFail'))
      console.error(err)
    }
  }

  // 카드 DOM → 캔버스 (저장/공유 공용)
  const renderCardCanvas = async () => {
    if (!cardRef.current) return null
    const html2canvas = (await import('html2canvas')).default
    return html2canvas(cardRef.current, { scale: 2, backgroundColor: null, logging: false })
  }

  // 모바일 네이티브 공유 시트 — 이미지 파일을 실어 X/인스타에 카드가 그대로 올라가게.
  // 파일 공유 미지원(구형 브라우저 등)이면 링크 공유로 폴백.
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator
  const handleNativeShare = async () => {
    if (rendering) return
    setRendering(true)
    try {
      const canvas = await renderCardCanvas()
      const blob = canvas
        ? await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
        : null
      const files = blob ? [new File([blob], 'mapexp.png', { type: 'image/png' })] : []
      const withImage = files.length > 0 && !!navigator.canShare?.({ files })

      await navigator.share(
        withImage
          ? { title: 'MAPEXP', text: `${t('share.shareText')} ${shareUrl}`, files }
          : { title: 'MAPEXP', text: t('share.shareText'), url: shareUrl },
      )
      ev('share_native', { country, image: withImage })
    } catch {
      // 사용자가 취소한 경우 등 - 무시
    } finally {
      setRendering(false)
    }
  }

  // SNS용 이미지 카드 저장 (html2canvas로 카드 DOM 캡처)
  const handleSaveImage = async () => {
    if (rendering) return
    setRendering(true)
    try {
      const canvas = await renderCardCanvas()
      if (!canvas) return
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `mapexp-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
      ev('image_card_save', { country, scope })
      toast.success(t('share.imageDone'))
    } catch (err) {
      console.error(err)
      toast.error(t('share.imageFail'))
    } finally {
      setRendering(false)
    }
  }

  // ── 스코프별 카드 통계 ──
  const trackKm = trackDistanceMeters(trackPoints) / 1000
  const singleCountry: Country = scope === 'both' ? (country as Country) : scope
  const singleStats = scope === 'japan' ? jpStats : scope === 'korea' ? krStats : null

  const cardScore = scope === 'both' ? jpStats.score + krStats.score : singleStats!.score
  const cardLevel = levelFromScore(cardScore)
  const cardVisited = scope === 'both' ? jpStats.visited + krStats.visited : singleStats!.visited
  const cardTotal = scope === 'both' ? jpStats.total + krStats.total : singleStats!.total
  const cardCompletion = cardTotal > 0 ? Math.round((cardVisited / cardTotal) * 100) : 0

  const counts: Record<ExperienceGrade, number> = (() => {
    if (scope !== 'both') return countryGradeCounts(regions, scope)
    const a = countryGradeCounts(regions, 'japan')
    const b = countryGradeCounts(regions, 'korea')
    const merged = { ...a }
    ;([0, 1, 2, 3, 4, 5] as ExperienceGrade[]).forEach((l) => { merged[l] = a[l] + b[l] })
    return merged
  })()

  const achievedBadges = (() => {
    if (scope !== 'both') {
      return computeBadges(regions, TOTAL_REGIONS[scope], trackKm, scope).filter((b) => b.achieved)
    }
    const jp = computeBadges(regions, TOTAL_REGIONS.japan, trackKm, 'japan').filter((b) => b.achieved)
    const kr = computeBadges(regions, TOTAL_REGIONS.korea, trackKm, 'korea').filter((b) => b.achieved)
    const seen = new Set<string>()
    return [...jp, ...kr].filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)))
  })()

  const countryLabel = (c: Country) => t(c === 'japan' ? 'common.japan' : 'common.korea')
  const headerLabel = scope === 'both' ? `${countryLabel('japan')} × ${countryLabel('korea')}` : countryLabel(scope)

  // 카드 지도 슬롯: 스코프 × 상세도 조합
  // - 양국: 국가별 지도 2장 (광역 or 기초) + 국가 캡션
  // - 단일 + 둘다: 광역/기초 2장 + 상세도 캡션
  // - 단일: 1장
  // 국가별 기초(시정촌/시군구) 점수: 기초 지도 캡션용
  const muniStatsOf = (c: Country) => muniStats(regions, c)

  interface MapSlot { key: string; img: string | null; caption?: string }
  const mapSlots: MapSlot[] = (() => {
    const imgsOf = (d: 'pref' | 'muni') => (d === 'pref' ? mapImgs : muniImgs)
    if (scope === 'both') {
      const d = detail === 'muni' ? 'muni' : 'pref'
      return (['japan', 'korea'] as Country[]).map((c) => {
        const s = c === 'japan' ? jpStats : krStats
        const cap =
          d === 'muni'
            ? `${countryLabel(c)}  ${t('stats.muniRow', { n: muniStatsOf(c).score, m: muniStatsOf(c).count })}`
            : `${countryLabel(c)}  ${t('stats.exp', { n: s.score })} · ${s.visited}/${s.total}`
        return { key: `${c}-${d}`, img: imgsOf(d)[c], caption: cap }
      })
    }
    if (detail === 'bothDetail') {
      const ms = muniStatsOf(scope)
      return [
        { key: `${scope}-pref`, img: mapImgs[scope], caption: `${t('share.detailPref')}  ${t('stats.exp', { n: scope === 'japan' ? jpStats.score : krStats.score })}` },
        { key: `${scope}-muni`, img: muniImgs[scope], caption: `${t('share.detailMuni')}  ${t('stats.muniRow', { n: ms.score, m: ms.count })}` },
      ]
    }
    if (detail === 'muni') {
      const ms = muniStatsOf(scope)
      return [{ key: `${scope}-muni`, img: muniImgs[scope], caption: t('stats.muniRow', { n: ms.score, m: ms.count }) }]
    }
    return [{ key: `${scope}-pref`, img: mapImgs[scope] }]
  })()
  const multiMap = mapSlots.length > 1

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('share.title')}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button variant="primary" onClick={handleCopy}>
            {t('share.copy')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-muted text-sm">{t('share.desc')}</p>

        {/* 지도 범위 선택: 일본 / 한국 / 양국 + 상세도: 광역 / 기초 / 둘다 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-0.5 rounded-full border border-line bg-paper w-fit">
            {(['japan', 'korea', 'both'] as CardScope[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  if (!scopeEnabled[s]) return
                  setScope(s)
                  if (s === 'both' && detail === 'bothDetail') setDetail('pref')
                }}
                disabled={!scopeEnabled[s]}
                className={`px-3 py-1 rounded-full text-[13px] font-medium transition-colors ${
                  scope === s
                    ? 'bg-ink text-paper'
                    : scopeEnabled[s]
                      ? 'text-muted hover:text-ink'
                      : 'text-faint cursor-not-allowed'
                }`}
              >
                {s === 'both' ? t('share.scopeBoth') : countryLabel(s)}
              </button>
            ))}
          </div>

          <div className="flex items-center p-0.5 rounded-full border border-line bg-paper w-fit">
            {(['pref', 'muni', 'bothDetail'] as CardDetail[]).map((d) => {
              const enabled = d !== 'bothDetail' || scope !== 'both' // 양국+둘다(4장)는 비활성
              return (
                <button
                  key={d}
                  onClick={() => enabled && setDetail(d)}
                  disabled={!enabled}
                  className={`px-3 py-1 rounded-full text-[13px] font-medium transition-colors ${
                    detail === d
                      ? 'bg-ink text-paper'
                      : enabled
                        ? 'text-muted hover:text-ink'
                        : 'text-faint cursor-not-allowed'
                  }`}
                >
                  {t(d === 'pref' ? 'share.detailPref' : d === 'muni' ? 'share.detailMuni' : 'share.detailBoth')}
                </button>
              )
            })}
          </div>
        </div>

        {/* 지도 미리보기 (이미지 카드에 들어가는 색칠 지도) */}
        <div className={`rounded-lg border border-line bg-[#f5f3ec] p-2 ${multiMap ? 'grid grid-cols-2 gap-1' : ''}`}>
          {mapSlots.map(({ key, img }) =>
            img ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={key} src={img} alt="" className="w-full h-auto max-h-56 object-contain" />
            ) : (
              <div key={key} className="h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-seal" />
              </div>
            ),
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="w-full px-3 py-2 bg-paper border border-line rounded-md text-sm text-muted focus:outline-none"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>

        {/* 공유 액션 */}
        <div className="grid grid-cols-2 gap-2">
          {canNativeShare && (
            <Button variant="secondary" onClick={handleNativeShare} className="gap-1.5">
              <Icon name="share" size={15} />
              {t('share.native')}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={handleSaveImage}
            disabled={rendering}
            className={`gap-1.5 ${canNativeShare ? '' : 'col-span-2'}`}
          >
            <Icon name="download" size={15} />
            {rendering ? '…' : t('share.image')}
          </Button>
        </div>

        <div className="bg-paper border border-line p-3 rounded-lg text-sm text-muted">
          {t('share.info')}
        </div>
      </div>

      {/* ── SNS용 이미지 카드 (화면 밖 렌더링, html2canvas 캡처용) ── */}
      <div className="fixed -left-[9999px] top-0" aria-hidden="true">
        <div
          ref={cardRef}
          style={{
            width: 420,
            padding: '32px 34px',
            backgroundColor: '#f5f3ec',
            fontFamily: 'var(--font-sans-kr), sans-serif',
            color: '#26231c',
          }}
        >
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <span
              style={{
                width: 36, height: 36, borderRadius: 8, backgroundColor: '#be3a2b', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, transform: 'rotate(-3deg)',
              }}
            >
              経
            </span>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.3 }}>MAPEXP</div>
              <div style={{ fontSize: 11, color: '#7c766a' }}>{t('page.title')}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#7c766a' }}>
              {headerLabel}
            </div>
          </div>

          {/* 색칠된 지도 (비교의 핵심) — 2장이면 나란히 + 캡션, 1장이면 전폭 */}
          {multiMap ? (
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              {mapSlots.map(({ key, img, caption }) => (
                <div key={key} style={{ flex: 1, minWidth: 0 }}>
                  {img && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={img} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
                  )}
                  {caption && (
                    <div style={{ fontSize: 11, color: '#7c766a', marginTop: 6, textAlign: 'center', fontWeight: 600 }}>
                      {caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            mapSlots[0]?.img && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={mapSlots[0].img!}
                alt=""
                style={{ width: '100%', height: 'auto', display: 'block', marginBottom: 18 }}
              />
            )
          )}

          {/* 레벨 */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>{cardLevel}</span>
            <span style={{ fontSize: 14, color: '#7c766a' }}>{t('stats.travelerLevel')}</span>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#7c766a' }}>{t('stats.exp', { n: cardScore })}</span>
          </div>

          {/* 방문/달성률 */}
          <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 16, borderTop: '1px solid #e3dfd3' }}>
            <div>
              <div style={{ fontSize: 11, color: '#7c766a' }}>{t('stats.visited')}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {cardVisited}<span style={{ fontSize: 13, color: '#a8a294' }}> / {cardTotal}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#7c766a' }}>{t('stats.completion')}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{cardCompletion}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#7c766a' }}>{t('badges.title')}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{achievedBadges.length}</div>
            </div>
          </div>

          {/* 등급 분포 스택 바 */}
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 18, border: '1px solid rgba(0,0,0,0.06)' }}>
            {([5, 4, 3, 2, 1, 0] as ExperienceGrade[]).map((lvl) => {
              const count = counts[lvl]
              if (!count) return null
              return (
                <span
                  key={lvl}
                  style={{
                    width: `${(count / cardTotal) * 100}%`,
                    backgroundColor: lvl === 0 ? '#e3dfd3' : EXP_COLORS[lvl],
                  }}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {([5, 4, 3, 2, 1] as ExperienceGrade[]).map((lvl) => (
              <span key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#7c766a' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: EXP_COLORS[lvl], border: '1px solid rgba(0,0,0,0.08)' }} />
                {levelLabel(lvl, lang)} {counts[lvl]}
              </span>
            ))}
          </div>

          {/* 달성 도장 */}
          {achievedBadges.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              {achievedBadges.slice(0, 7).map((b, i) => (
                <span
                  key={b.id}
                  title={t(`badge.${b.id}.name` as I18nKey)}
                  style={{
                    width: 34, height: 34, borderRadius: 17, backgroundColor: '#be3a2b', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: b.icon.length > 1 ? 10 : 15, fontWeight: 700,
                    transform: `rotate(${((i % 5) - 2) * 4}deg)`,
                  }}
                >
                  {b.icon}
                </span>
              ))}
            </div>
          )}

          {/* 푸터 */}
          <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid #e3dfd3', fontSize: 11, color: '#a8a294' }}>
            mapexp.vercel.app
          </div>
        </div>
      </div>
    </Modal>
  )
}
