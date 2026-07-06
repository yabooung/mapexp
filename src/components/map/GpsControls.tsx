'use client'

import toast from 'react-hot-toast'
import { useGpsStore } from '@/store/gps'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade, EXP_LEVEL_LABELS } from '@/types'
import { trackDistanceMeters, formatDistance } from '@/lib/geo'

interface GpsControlsProps {
  onRegionClick: (regionId: string) => void
}

/**
 * 지도 위 GPS 컨트롤 오버레이
 * - 내 위치 버튼 (위치 추적 켜기/팔로우)
 * - 트랙 로그 기록 시작/정지 + 거리 표시 + 삭제
 * - 현재 지역 배너 + 빠른 방문 기록
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
      toast('내 위치를 찾는 중...', { icon: '📡', duration: 2000 })
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
      toast('이동 경로 기록을 정지했습니다.', { icon: '⏸️' })
    } else {
      startTracking()
      if (!watchEnabled) setWatchEnabled(true)
      toast('이동 경로 기록을 시작합니다!', { icon: '🛰️' })
    }
  }

  const handleClearTrack = () => {
    if (confirm('기록된 이동 경로를 모두 삭제하시겠습니까?')) {
      clearTrack()
      toast.success('이동 경로가 삭제되었습니다.')
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
    toast.success(`👣 ${targetLabel} 접지 기록! (GPS 인증)`)
  }

  return (
    <>
      {/* 현재 지역 배너 (상단 중앙) - 현 · 시정촌 표시 */}
      {gpsActive && targetId && targetLabel && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-white/95 backdrop-blur rounded-full shadow-lg pl-4 pr-2 py-2 text-sm max-w-[calc(100%-24px)]">
          <span className="flex items-center gap-1.5 font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
            📍 {targetLabel}
          </span>
          <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">
            {EXP_LEVEL_LABELS[currentLevel]}
          </span>
          {currentLevel < GyeongHyeonChi.LANDED ? (
            <button
              onClick={handleQuickRecord}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
            >
              👣 접지 기록
            </button>
          ) : (
            <button
              onClick={() => onRegionClick(targetId)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold hover:bg-gray-200 active:scale-95 transition-all whitespace-nowrap"
            >
              ✏️ 상세
            </button>
          )}
        </div>
      )}

      {/* GPS 버튼 그룹 (좌측 하단, 모바일에서는 하단 탭 위로) */}
      <div className="absolute bottom-20 lg:bottom-4 left-4 z-[1000] flex flex-col gap-2">
        {/* 트랙 거리/삭제 (기록이 있을 때) */}
        {trackPoints.length >= 2 && (
          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-full shadow-lg px-3 py-1.5 text-xs font-semibold text-indigo-700">
            🛤️ {formatDistance(distance)}
            <button
              onClick={handleClearTrack}
              className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="경로 삭제"
              title="경로 삭제"
            >
              ✕
            </button>
          </div>
        )}

        {/* 트랙 기록 버튼 */}
        <button
          onClick={handleTrackToggle}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-lg transition-all active:scale-90 ${
            isTracking
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-white/95 backdrop-blur text-gray-700 hover:bg-gray-50'
          }`}
          aria-label={isTracking ? '경로 기록 정지' : '경로 기록 시작'}
          title={isTracking ? '경로 기록 정지' : '경로 기록 시작'}
        >
          {isTracking ? '⏸' : '🛰️'}
        </button>

        {/* 내 위치 버튼 */}
        <button
          onClick={handleLocateClick}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-lg transition-all active:scale-90 ${
            followMode && gpsActive
              ? 'bg-blue-600 text-white'
              : gpsActive
                ? 'bg-blue-50 text-blue-600'
                : 'bg-white/95 backdrop-blur text-gray-700 hover:bg-gray-50'
          }`}
          aria-label="내 위치"
          title={!watchEnabled ? '내 위치 켜기' : followMode ? '위치 추적 끄기' : '내 위치로 이동'}
        >
          {status === 'locating' ? (
            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            '🎯'
          )}
        </button>
      </div>
    </>
  )
}
