'use client'

import { useState, useEffect, useRef } from 'react'
import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import { generateShareUrl } from '@/lib/share'
import { TOTAL_REGIONS } from '@/constants'
import { isHiddenRegion } from '@/constants/regions'
import { getRegionsByCountry } from '@/data/regions'
import { ExperienceGrade, RegionExp } from '@/types'
import { countryStats, countryGradeCounts, levelFromScore, muniStats } from '@/lib/stats'
import { computeBadges } from '@/lib/badges'
import { trackDistanceMeters, type Country } from '@/lib/geo'
import { renderRegionMapImage, renderMunicipalityMapImage, renderShareCardImage } from '@/lib/mapSnapshot'
import { useT, useLang, levelLabel, regionDisplayName, tNow, I18nKey } from '@/lib/i18n'
import { ev } from '@/lib/analytics'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import toast from '@/lib/appToast'
import QRCode from 'qrcode'
import { parseImportFile, shareDataFile } from '@/lib/dataFile'

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
  const { exportData, country, regions, enterViewerMode } = useMapExpStore()
  const trackPoints = useGpsStore((s) => s.trackPoints)
  const [shareUrl, setShareUrl] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mapImgs, setMapImgs] = useState<{ japan: string | null; korea: string | null }>({ japan: null, korea: null })
  const [muniImgs, setMuniImgs] = useState<{ japan: string | null; korea: string | null }>({ japan: null, korea: null })
  const [scope, setScope] = useState<CardScope>('japan')
  const [detail, setDetail] = useState<CardDetail>('pref')
  const [rendering, setRendering] = useState(false)
  // 카드 옵션: 지명 라벨(기본 켬) / 도장첩 표시(기본 끔)
  const [optLabels, setOptLabels] = useState(true)
  const [optBadges, setOptBadges] = useState(false)
  // 완성 카드 이미지 (캔버스 직접 렌더 - html2canvas의 CJK 메트릭 문제 회피)
  const [cardImg, setCardImg] = useState<string | null>(null)
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

      // 기본 스코프 = 지금 보고 있는 국가 (양국 기록이 있어도 현재 국가 우선)
      setScope(country as Country)
      setDetail('pref')
      ev('share_open', { country })
    }
  }, [isOpen, exportData, country])

  // 지명 라벨 함수 (옵션 켬일 때만) - 히든 지역은 라벨 없음
  const labelFor = (c: Country) => {
    if (!optLabels) return undefined
    const metas = getRegionsByCountry(c)
    return (id: string) => {
      if (isHiddenRegion(id)) return null
      const meta = metas.find((r) => r.id === id)
      return meta ? regionDisplayName(meta, lang) : null
    }
  }

  // 색칠된 지도 스냅샷 렌더링: 활성 국가 + (기록이 있으면) 반대 국가
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const levelOf = levelOfFor(regions)
    setMapImgs({ japan: null, korea: null })
    setMuniImgs({ japan: null, korea: null }) // 라벨 옵션 변경 시 기초 지도도 다시
    const wantJapan = country === 'japan' || countryStats(regions, 'japan').visited > 0
    const wantKorea = country === 'korea' || countryStats(regions, 'korea').visited > 0
    if (wantJapan)
      renderRegionMapImage('japan', levelOf, { getLabel: labelFor('japan') }).then((img) => {
        if (!cancelled) setMapImgs((m) => ({ ...m, japan: img }))
      })
    if (wantKorea)
      renderRegionMapImage('korea', levelOf, { getLabel: labelFor('korea') }).then((img) => {
        if (!cancelled) setMapImgs((m) => ({ ...m, korea: img }))
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, country, regions, optLabels, lang])

  // 기초 지도 이미지는 무겁기 때문에(전국 시정촌 GeoJSON) 필요할 때만 렌더
  useEffect(() => {
    if (!isOpen || detail === 'pref') return
    let cancelled = false
    const levelOf = levelOfFor(regions)
    const need: Country[] = scope === 'both' ? ['japan', 'korea'] : [scope]
    need.forEach((c) => {
      if (muniImgs[c]) return
      renderMunicipalityMapImage(c, levelOf, { getLabel: labelFor(c) }).then((img) => {
        if (!cancelled) setMuniImgs((m) => (m[c] ? m : { ...m, [c]: img }))
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, detail, scope, optLabels, lang, muniImgs])

  // QR 코드: 링크와 동일한 내용 - 오프라인에서 폰 카메라로 바로 열 수 있다
  useEffect(() => {
    if (!isOpen || !showQr || !shareUrl) return
    QRCode.toDataURL(shareUrl, { width: 220, margin: 1, color: { dark: '#26231c', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [isOpen, showQr, shareUrl])

  useEffect(() => {
    if (!isOpen) setShowQr(false)
  }, [isOpen])

  // 파일 교환: 모바일은 Web Share로 메신저에 바로, 미지원이면 다운로드 폴백.
  // 이름(선택)을 넣으면 파일명에 들어가 여러 친구의 파일을 구분할 수 있다.
  const handleFileExport = async () => {
    try {
      const name = window.prompt(t('share.fileNamePrompt')) // 취소(null)·빈값이면 생략
      const result = await shareDataFile(exportData(), name)
      ev('share_file_export', { via: result })
    } catch {
      toast.error(t('settings.exportFail'))
    }
  }

  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      // 신뢰 불가 입력: 스키마/타입 검증 통과분만 뷰어 모드로 (내 기록은 백업됨)
      const data = parseImportFile(String(reader.result ?? ''))
      if (!data) {
        toast.error(tNow('share.fileInvalid'))
        return
      }
      enterViewerMode(data)
      ev('share_file_open')
      onClose()
      toast.success(tNow('viewer.loaded'))
    }
    reader.readAsText(file)
  }

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

  // 모바일 네이티브 공유 시트 — 이미지 파일을 실어 X/인스타에 카드가 그대로 올라가게.
  // 파일 공유 미지원(구형 브라우저 등)이면 링크 공유로 폴백.
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator
  const handleNativeShare = async () => {
    if (rendering) return
    setRendering(true)
    try {
      const blob = cardImg ? await (await fetch(cardImg)).blob() : null
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

  // 이미지 카드 저장 (캔버스 렌더 결과 그대로)
  const handleSaveImage = () => {
    if (!cardImg) return
    try {
      const a = document.createElement('a')
      a.href = cardImg
      a.download = `mapexp-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
      ev('image_card_save', { country, scope })
      toast.success(t('share.imageDone'))
    } catch (err) {
      console.error(err)
      toast.error(t('share.imageFail'))
    }
  }

  // ── 스코프별 카드 통계 ──
  const trackKm = trackDistanceMeters(trackPoints) / 1000
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
      return computeBadges(regions, TOTAL_REGIONS[scope], trackKm, scope, lang).filter((b) => b.achieved)
    }
    const jp = computeBadges(regions, TOTAL_REGIONS.japan, trackKm, 'japan', lang).filter((b) => b.achieved)
    const kr = computeBadges(regions, TOTAL_REGIONS.korea, trackKm, 'korea', lang).filter((b) => b.achieved)
    const seen = new Set<string>()
    return [...jp, ...kr].filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)))
  })()

  const countryLabel = (c: Country) => t(c === 'japan' ? 'common.japan' : 'common.korea')
  const headerLabel = scope === 'both' ? `${countryLabel('japan')} × ${countryLabel('korea')}` : countryLabel(scope)

  // 달성률 구간별 칭호 (카드에 순위 티어로 표시)
  const tierIdx = cardCompletion >= 90 ? 4 : cardCompletion >= 60 ? 3 : cardCompletion >= 30 ? 2 : cardCompletion >= 10 ? 1 : 0
  const tierLabel = t(`tier.${tierIdx}` as I18nKey)

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

  // 지도가 준비되면 완성 카드를 캔버스로 렌더 (미리보기 = 저장본, WYSIWYG)
  useEffect(() => {
    if (!isOpen || mapSlots.length === 0 || mapSlots.some((s) => !s.img)) {
      setCardImg(null)
      return
    }
    let cancelled = false
    renderShareCardImage({
      headerLabel,
      subtitle: t('page.title'),
      maps: mapSlots.map((s) => ({ src: s.img!, caption: s.caption })),
      level: cardLevel,
      score: cardScore,
      nextLevelScore: cardLevel * 10,
      tierLabel,
      toNextLabel: t('stats.toNext', { n: 10 - (cardScore % 10) }).replace(/^\/\s*/, ''),
      stats: [
        { label: t('stats.visited'), value: String(cardVisited), sub: `/ ${cardTotal}` },
        { label: t('stats.completion'), value: `${cardCompletion}%` },
        { label: t('badges.title'), value: String(achievedBadges.length) },
      ],
      counts,
      total: cardTotal,
      gradeLabels: Object.fromEntries(
        ([0, 1, 2, 3, 4, 5] as ExperienceGrade[]).map((l) => [l, levelLabel(l, lang)]),
      ) as Record<ExperienceGrade, string>,
      badges: optBadges ? achievedBadges.map((b) => ({ icon: b.icon, region: b.kind === 'region' })) : [],
      siteUrl: 'mapexp.app',
    }).then((url) => {
      if (!cancelled) setCardImg(url)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scope, detail, mapImgs, muniImgs, lang, regions, optBadges])

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
          {/* 네이티브 공유가 있으면(모바일) 그쪽이 주 CTA - 링크 복사는 보조로 */}
          <Button variant={canNativeShare ? 'secondary' : 'primary'} onClick={handleCopy}>
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

          {/* 카드 옵션: 지명 라벨 / 도장첩 표시 */}
          {(
            [
              [optLabels, setOptLabels, t('share.optLabels')],
              [optBadges, setOptBadges, t('share.optBadges')],
            ] as Array<[boolean, (fn: (v: boolean) => boolean) => void, string]>
          ).map(([on, set, label]) => (
            <button
              key={label}
              onClick={() => set((v) => !v)}
              className={`px-3 py-1 rounded-full text-[13px] font-medium border transition-colors ${
                on ? 'bg-ink text-paper border-ink' : 'bg-card text-muted border-line hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 카드 미리보기 - 저장/공유되는 이미지 그대로 (캔버스 렌더) */}
        <div className="rounded-lg border border-line overflow-hidden">
          {cardImg ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={cardImg} alt="" className="w-full h-auto max-h-[440px] object-contain bg-[#f5f3ec]" />
          ) : (
            <div className="h-40 flex items-center justify-center bg-[#f5f3ec]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-seal" />
            </div>
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
          <button
            onClick={() => setShowQr((v) => !v)}
            className={`shrink-0 px-3 py-2 rounded-md border text-xs font-bold transition-colors ${
              showQr ? 'bg-ink text-paper border-ink' : 'border-line text-muted hover:text-ink bg-card'
            }`}
          >
            {t('share.qr')}
          </button>
        </div>

        {/* QR 코드 - 오프라인/대면 공유용 */}
        {showQr && qrDataUrl && (
          <div className="flex flex-col items-center gap-2 py-3 bg-card border border-line rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={t('share.qr')} className="w-44 h-44 rounded-md" />
            <p className="text-xs text-muted">{t('share.qrHint')}</p>
          </div>
        )}

        {/* 공유 액션 */}
        <div className="grid grid-cols-2 gap-2">
          {canNativeShare && (
            <Button variant="primary" onClick={handleNativeShare} className="gap-1.5">
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

        {/* 파일 교환 - 메신저로 JSON을 주고받아 서로의 지도를 열어본다 */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={handleFileExport} className="gap-1.5">
            <Icon name="download" size={15} />
            {t('share.fileExport')}
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
            <Icon name="upload" size={15} />
            {t('share.fileOpen')}
          </Button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileOpen} />
        </div>
        <p className="text-xs text-faint -mt-2">{t('share.fileOpenHint')}</p>

        <div className="bg-paper border border-line p-3 rounded-lg text-sm text-muted">
          {t('share.info')}
        </div>
      </div>
    </Modal>
  )
}
