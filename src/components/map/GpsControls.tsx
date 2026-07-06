'use client'

import toast from 'react-hot-toast'
import { useGpsStore } from '@/store/gps'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade, EXP_LEVEL_LABELS } from '@/types'
import { trackDistanceMeters, formatDistance } from '@/lib/geo'
import Icon from '@/components/common/Icon'

interface GpsControlsProps {
  onRegionClick: (regionId: string) => void
}

/**
 * 지도 위 GPS 컨트롤 오버레이
 * - 내 위치 버튼 (위치 추적 켜기/팔로우)
 * - 트랙 로그 기록 시작/정지 + 거리 표시 + 삭제
 * - 현재 지역 배너 (현 · 시정촌) + 빠른 방문 기록
 */
export default function GpsControls({ onRegionClick }: GpsControlsProps) {
  const status = useGpsStore((s) => s.status)
  const watchEnabled = useGpsStore((s) => s.watchEnabled)
  const followMode = useGpsStore((s) => s.followMode)
  const isTracking = useGpsStore((s) => s.isTracking)
  const trackPoints = useGpsStore((s) => s.trackPoints)
  const currentRegionId = useGpsStore((s) => s.currentRegionId)
  const currentRegionName = useGpsStore((s) => s.currentRegionName)
  const currentMuniId = useGpsStore((s) => s.currentMuniId)
  const currentMuniName = useGpsStore((s) => s.currentMuniName)
  const autoDetectVisit = useGpsStore((s) => s.autoDetectVisit)
  const { setWatchEnabled, setFollowMode, startTracking, stopTracking, clearTrack } = useGpsStore()

  const { getRegionById, addGpsRecord } = useMapExpStore()

  const gpsActive = watchEnabled || isTracking || autoDetectVisit
  const distance = trackDistanceMeters(trackPoints)

  // 기록 대상: 시정촌이 감지되면 시정촌, 아니면 현
  const targetId = currentMuniId ?? currentRegionId
  const targetLabel = currentMuniName ? `${currentRegionName} · ${currentMuniName}` : currentRegionName

  const currentLevel: ExperienceGrade = (() => {
    if (!targetId) return GyeongHyeonChi.UNVISITED
    const exp = getRegionById(targetId)
    return exp?.gyeonghyeonchi ?? (exp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
  })()

  const handleLocateClick = () => {
    if (!watchEnabled) {
      setWatchEnabled(true)
      setFollowMode(true)
      toast('내 위치를 찾는 중입니다', { duration: 2000 })
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
      toast('이동 경로 기록을 정지했습니다')
    } else {
      startTracking()
      if (!watchEnabled) setWatchEnabled(true)
      toast('이동 경로 기록을 시작합니다')
    }
  }

  const handleClearTrack = () => {
    if (confirm('기록된 이동 경로를 모두 삭제하시겠습니까?')) {
      clearTrack()
      toast.success('이동 경로가 삭제되었습니다')
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
    toast.success(`${targetLabel} — 접지 도장을 찍었습니다`)
  }

  const circleBtn =
    'w-11 h-11 rounded-full border flex items-center justify-center transition-all active:scale-90 shadow-[0_2px_8px_rgba(38,35,28,0.14)]'

  return (
    <>
      {/* 현재 지역 배너 (상단 중앙) - 현 · 시정촌 표시 */}
      {gpsActive && targetId && targetLabel && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2.5 bg-card border border-line rounded-full shadow-[0_2px_10px_rgba(38,35,28,0.12)] pl-3.5 pr-1.5 py-1.5 text-sm max-w-[calc(100%-24px)]">
          <span className="flex items-center gap-1.5 font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
            <Icon name="pin" size={14} className="text-seal shrink-0" />
            {targetLabel}
          </span>
          <span className="text-xs text-muted whitespace-nowrap hidden sm:inline">
            {EXP_LEVEL_LABELS[currentLevel]}
          </span>
          {currentLevel < GyeongHyeonChi.LANDED ? (
            <button
              onClick={handleQuickRecord}
              className="px-3 py-1.5 bg-seal text-white rounded-full text-xs font-semibold hover:bg-seal-hover active:scale-95 transition-all whitespace-nowrap"
            >
              접지 기록
            </button>
          ) : (
            <button
              onClick={() => onRegionClick(targetId)}
              className="flex items-center gap-1 px-3 py-1.5 bg-paper text-ink rounded-full text-xs font-semibold hover:bg-line/60 active:scale-95 transition-all whitespace-nowrap"
            >
              <Icon name="pen" size={12} />
              상세
            </button>
          )}
        </div>
      )}

      {/* GPS 버튼 그룹 (좌측 하단, 모바일에서는 하단 탭 위로) */}
      <div className="absolute bottom-20 lg:bottom-4 left-4 z-[1000] flex flex-col gap-2">
        {/* 트랙 거리/삭제 (기록이 있을 때) */}
        {trackPoints.length >= 2 && (
          <div className="flex items-center gap-1.5 bg-card border border-line rounded-full shadow-[0_2px_8px_rgba(38,35,28,0.12)] px-3 py-1.5 text-xs font-semibold text-ink tabular-nums">
            <Icon name="route" size={13} className="text-seal" />
            {formatDistance(distance)}
            <button
              onClick={handleClearTrack}
              className="ml-0.5 text-faint hover:text-seal transition-colors"
              aria-label="경로 삭제"
              title="경로 삭제"
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
          aria-label={isTracking ? '경로 기록 정지' : '경로 기록 시작'}
          title={isTracking ? '경로 기록 정지' : '경로 기록 시작'}
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
          aria-label="내 위치"
          title={!watchEnabled ? '내 위치 켜기' : followMode ? '위치 추적 끄기' : '내 위치로 이동'}
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
