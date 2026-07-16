'use client'

import toast from 'react-hot-toast'
import { useGpsStore } from '@/store/gps'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { trackDistanceMeters, formatDistance } from '@/lib/geo'
import Icon from '@/components/common/Icon'
import { useT, useLang, levelLabel, regionDisplayName, muniTerm } from '@/lib/i18n'
import { ev } from '@/lib/analytics'
import { getRegionMetadata } from '@/data/regions'
import { muniDisplayName } from '@/lib/muniNames'
import type { Country } from '@/lib/geo'

interface GpsControlsProps {
  onRegionClick: (regionId: string) => void
  /** 기초 지역(시정촌/시군구) 도장 모달 - 지도 위 버튼으로 바로 진입 */
  onOpenMuniManager?: () => void
}

/**
 * 지도 위 GPS 컨트롤 오버레이
 * - 내 위치 버튼 (위치 추적 켜기/팔로우)
 * - 트랙 로그 기록 시작/정지 + 거리 표시 + 삭제
 * - 현재 지역 배너 (현 · 시정촌) + 빠른 방문 기록
 */
export default function GpsControls({ onRegionClick, onOpenMuniManager }: GpsControlsProps) {
  const status = useGpsStore((s) => s.status)
  const watchEnabled = useGpsStore((s) => s.watchEnabled)
  const followMode = useGpsStore((s) => s.followMode)
  const isTracking = useGpsStore((s) => s.isTracking)
  const trackPoints = useGpsStore((s) => s.trackPoints)
  const currentRegionId = useGpsStore((s) => s.currentRegionId)
  const currentRegionName = useGpsStore((s) => s.currentRegionName)
  const currentMuniId = useGpsStore((s) => s.currentMuniId)
  const currentMuniName = useGpsStore((s) => s.currentMuniName)
  const currentMuniProps = useGpsStore((s) => s.currentMuniProps)
  const autoDetectVisit = useGpsStore((s) => s.autoDetectVisit)
  const { setWatchEnabled, setFollowMode, startTracking, stopTracking, clearTrack } = useGpsStore()

  const { getRegionById, addGpsRecord, country } = useMapExpStore()
  const t = useT()
  const lang = useLang()

  const gpsActive = watchEnabled || isTracking || autoDetectVisit
  const distance = trackDistanceMeters(trackPoints)

  // 기록 대상: 시정촌이 감지되면 시정촌, 아니면 현
  const targetId = currentMuniId ?? currentRegionId
  const regionMeta = currentRegionId ? getRegionMetadata(currentRegionId) : undefined
  const prefDisplay = regionMeta ? regionDisplayName(regionMeta, lang) : currentRegionName
  const muniDisplay = currentMuniName
    ? muniDisplayName(country as Country, currentMuniProps, currentMuniName, lang)
    : null
  const targetLabel = muniDisplay ? `${prefDisplay} · ${muniDisplay}` : prefDisplay

  const currentLevel: ExperienceGrade = (() => {
    if (!targetId) return GyeongHyeonChi.UNVISITED
    const exp = getRegionById(targetId)
    return exp?.gyeonghyeonchi ?? (exp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
  })()

  const handleLocateClick = () => {
    if (!watchEnabled) {
      setWatchEnabled(true)
      setFollowMode(true)
      ev('gps_on')
      toast(t('gps.locating'), { duration: 2000 })
    } else if (!followMode) {
      setFollowMode(true)
    } else {
      // 이미 팔로우 중이면 위치 추적 끄기
      setFollowMode(false)
      setWatchEnabled(false)
    }
  }

  const handleTrackToggle = () => {
    if (isTracking) {
      stopTracking()
      toast(t('gps.trackStop'))
    } else {
      startTracking()
      if (!watchEnabled) setWatchEnabled(true)
      toast(t('gps.trackStart'))
    }
  }

  const handleClearTrack = () => {
    if (confirm(t('gps.trackClearConfirm'))) {
      clearTrack()
      toast.success(t('gps.trackCleared'))
    }
  }

  // 빠른 기록: 현재 위치(시정촌 우선)를 최소 '접지(2)'로 올림 - GPS 인증 기록
  const handleQuickRecord = () => {
    if (!targetId || !targetLabel) return
    if (currentLevel >= GyeongHyeonChi.LANDED) {
      onRegionClick(targetId)
      return
    }
    addGpsRecord(targetId, GyeongHyeonChi.LANDED)
    toast.success(t('gps.quickToast', { label: targetLabel }))
  }

  const circleBtn =
    'w-11 h-11 rounded-full border flex items-center justify-center transition-all active:scale-90 shadow-[0_2px_8px_rgba(38,35,28,0.14)]'

  return (
    <>
      {/* 현재 지역 배너 (상단 중앙) - 현 · 시정촌 표시 */}
      {gpsActive && targetId && targetLabel && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2.5 bg-card border border-line rounded-full shadow-[0_2px_10px_rgba(38,35,28,0.12)] pl-3.5 pr-1.5 py-1.5 text-sm max-w-[calc(100%-190px)] lg:max-w-[calc(100%-24px)]">
          <span className="flex items-center gap-1.5 font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
            <Icon name="pin" size={14} className="text-seal shrink-0" />
            {targetLabel}
          </span>
          <span className="text-xs text-muted whitespace-nowrap hidden sm:inline">
            {levelLabel(currentLevel, lang)}
          </span>
          {currentLevel < GyeongHyeonChi.LANDED ? (
            <button
              onClick={handleQuickRecord}
              title={t('level.hint.2')}
              className="px-3 py-1.5 bg-seal text-white rounded-full text-xs font-semibold hover:bg-seal-hover active:scale-95 transition-all whitespace-nowrap"
            >
              {t('gps.quickRecord')}
            </button>
          ) : (
            <button
              onClick={() => onRegionClick(targetId)}
              className="flex items-center gap-1 px-3 py-1.5 bg-paper text-ink rounded-full text-xs font-semibold hover:bg-line/60 active:scale-95 transition-all whitespace-nowrap"
            >
              <Icon name="pen" size={12} />
              {t('gps.detail')}
            </button>
          )}
        </div>
      )}

      {/* GPS 버튼 그룹 (좌측 하단, 모바일에서는 하단 탭 위로) */}
      <div className="absolute bottom-20 lg:bottom-4 left-4 z-[1000] flex flex-col gap-2">
        {/* 시정촌/시군구 도장 (핵심 기능 - 지도에서 바로 진입) */}
        {onOpenMuniManager && (
          <button
            onClick={onOpenMuniManager}
            className={`${circleBtn} bg-seal border-seal text-white hover:bg-seal-hover`}
            aria-label={t('page.manageMunisLong', { term: muniTerm(country, lang) })}
            title={t('page.manageMunisLong', { term: muniTerm(country, lang) })}
          >
            <Icon name="building" size={18} />
          </button>
        )}

        {/* 트랙 거리/삭제 (기록이 있을 때) */}
        {trackPoints.length >= 2 && (
          <div className="flex items-center gap-1.5 bg-card border border-line rounded-full shadow-[0_2px_8px_rgba(38,35,28,0.12)] px-3 py-1.5 text-xs font-semibold text-ink tabular-nums">
            <Icon name="route" size={13} className="text-seal" />
            {formatDistance(distance)}
            <button
              onClick={handleClearTrack}
              className="ml-0.5 text-faint hover:text-seal transition-colors"
              aria-label={t('gps.trackClear')}
              title={t('gps.trackClear')}
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        )}

        {/* 트랙 기록 버튼 */}
        <button
          onClick={handleTrackToggle}
          className={`${circleBtn} ${
            isTracking
              ? 'bg-seal border-seal text-white'
              : 'bg-card border-line text-muted hover:text-ink'
          }`}
          aria-label={t('gps.trackAria')}
          title={t('gps.trackAria')}
        >
          {isTracking ? <Icon name="pause" size={16} /> : <Icon name="route" size={18} />}
        </button>

        {/* 내 위치 버튼 */}
        <button
          onClick={handleLocateClick}
          className={`${circleBtn} ${
            followMode && gpsActive
              ? 'bg-ink border-ink text-paper'
              : gpsActive
                ? 'bg-card border-ink text-ink'
                : 'bg-card border-line text-muted hover:text-ink'
          }`}
          aria-label={t('gps.locateAria')}
          title={t('gps.locateAria')}
        >
          {status === 'locating' ? (
            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <Icon name="locate" size={18} />
          )}
        </button>
      </div>
    </>
  )
}
