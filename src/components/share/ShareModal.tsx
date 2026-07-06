'use client'

import { useState, useEffect, useRef } from 'react'
import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import { generateShareUrl } from '@/lib/share'
import { TOTAL_REGIONS, EXP_COLORS } from '@/constants'
import { ExperienceGrade } from '@/types'
import { computeBadges } from '@/lib/badges'
import { trackDistanceMeters, type Country } from '@/lib/geo'
import { renderRegionMapImage } from '@/lib/mapSnapshot'
import { useT, useLang, levelLabel, I18nKey } from '@/lib/i18n'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import toast from 'react-hot-toast'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const { exportData, country, regions, getTotalGyeonghyeonchi, getSystemLevel, getVisitedCount, getCompletionRate, getGyeonghyeonchiCounts } =
    useMapExpStore()
  const trackPoints = useGpsStore((s) => s.trackPoints)
  const [shareUrl, setShareUrl] = useState('')
  const [mapImg, setMapImg] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const t = useT()
  const lang = useLang()

  useEffect(() => {
    if (isOpen) {
      const data = exportData()
      const url = generateShareUrl(data)
      setShareUrl(url)

      // 색칠된 지도 스냅샷 렌더링 (광역 레벨)
      const levelOf = (regionId: string): ExperienceGrade => {
        const r = regions.find((x) => x.regionId === regionId)
        return (r?.gyeonghyeonchi ?? r?.level ?? 0) as ExperienceGrade
      }
      setMapImg(null)
      renderRegionMapImage(country as Country, levelOf).then(setMapImg)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exportData, country, regions])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success(t('share.copied'))
    } catch (err) {
      toast.error(t('share.copyFail'))
      console.error(err)
    }
  }

  // 모바일 네이티브 공유 시트
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator
  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: 'MAPEXP', text: t('share.shareText'), url: shareUrl })
    } catch {
      // 사용자가 취소한 경우 등 - 무시
    }
  }

  // SNS용 이미지 카드 저장 (html2canvas로 카드 DOM 캡처)
  const handleSaveImage = async () => {
    if (!cardRef.current || rendering) return
    setRendering(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false,
      })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `mapexp-${new Date().toISOString().slice(0, 10)}.png`
      a.click()
      toast.success(t('share.imageDone'))
    } catch (err) {
      console.error(err)
      toast.error(t('share.imageFail'))
    } finally {
      setRendering(false)
    }
  }

  // 카드용 통계
  const systemLevel = getSystemLevel()
  const totalExp = getTotalGyeonghyeonchi()
  const visitedCount = getVisitedCount()
  const completionRate = getCompletionRate()
  const counts = getGyeonghyeonchiCounts()
  const totalRegions = TOTAL_REGIONS[country]
  const trackKm = trackDistanceMeters(trackPoints) / 1000
  const achievedBadges = computeBadges(regions, totalRegions, trackKm, country).filter((b) => b.achieved)

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

        {/* 지도 미리보기 (이미지 카드에 들어가는 색칠 지도) */}
        {mapImg && (
          <div className="rounded-lg border border-line bg-[#f5f3ec] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mapImg} alt="" className="w-full h-auto max-h-56 object-contain" />
          </div>
        )}

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
              {t(country === 'japan' ? 'common.japan' : 'common.korea')}
            </div>
          </div>

          {/* 색칠된 지도 (비교의 핵심) */}
          {mapImg && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={mapImg}
              alt=""
              style={{ width: '100%', height: 'auto', display: 'block', marginBottom: 18 }}
            />
          )}

          {/* 레벨 */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>{systemLevel}</span>
            <span style={{ fontSize: 14, color: '#7c766a' }}>{t('stats.travelerLevel')}</span>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#7c766a' }}>{t('stats.exp', { n: totalExp })}</span>
          </div>

          {/* 방문/달성률 */}
          <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 16, borderTop: '1px solid #e3dfd3' }}>
            <div>
              <div style={{ fontSize: 11, color: '#7c766a' }}>{t('stats.visited')}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {visitedCount}<span style={{ fontSize: 13, color: '#a8a294' }}> / {totalRegions}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#7c766a' }}>{t('stats.completion')}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{completionRate}%</div>
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
                    width: `${(count / totalRegions) * 100}%`,
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
