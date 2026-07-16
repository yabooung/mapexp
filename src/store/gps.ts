import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { haversineMeters } from '@/lib/geo'

/**
 * GPS 위치/트랙 상태 스토어
 */

export interface GpsPosition {
  lat: number
  lng: number
  accuracy: number // 미터
  heading: number | null
  timestamp: number
}

export interface TrackPoint {
  lat: number
  lng: number
  t: number // timestamp (ms)
}

export type GpsStatus = 'idle' | 'locating' | 'active' | 'denied' | 'error'

/** 트랙 포인트 최소 이동 거리 (미터) - 노이즈 필터 */
const MIN_TRACK_DISTANCE_M = 15
/** 트랙 포인트 최대 저장 개수 (localStorage 보호) */
const MAX_TRACK_POINTS = 20000
/** 정확도가 이보다 나쁘면 트랙에 기록하지 않음 (미터) */
const MAX_ACCURACY_M = 100

interface GpsStore {
  // 실시간 상태 (비영속)
  status: GpsStatus
  position: GpsPosition | null
  errorMessage: string | null
  /** 사용자가 위치 사용을 켰는지 (비영속 - 세션 단위) */
  watchEnabled: boolean
  /** 현재 감지된 지역(현) ID/이름 */
  currentRegionId: string | null
  currentRegionName: string | null
  /** 현재 감지된 시정촌 ID/이름 (예: tokyo_千代田区) */
  currentMuniId: string | null
  currentMuniName: string | null
  /** 감지된 시정촌의 GeoJSON 속성 (표시명 다국어화용) */
  currentMuniProps: Record<string, unknown> | null

  // 영속 상태
  isTracking: boolean // 트랙 로그 기록 중 여부
  trackPoints: TrackPoint[]
  autoDetectVisit: boolean // 새 지역 진입 시 자동 기록
  followMode: boolean // 지도가 현재 위치를 따라감

  // 액션
  setWatchEnabled: (enabled: boolean) => void
  setStatus: (status: GpsStatus, errorMessage?: string | null) => void
  setPosition: (position: GpsPosition) => void
  setCurrentRegion: (id: string | null, name: string | null) => void
  setCurrentMuni: (id: string | null, name: string | null, props?: Record<string, unknown> | null) => void
  startTracking: () => void
  stopTracking: () => void
  clearTrack: () => void
  setAutoDetectVisit: (enabled: boolean) => void
  setFollowMode: (enabled: boolean) => void
}

export const useGpsStore = create<GpsStore>()(
  persist(
    (set, get) => ({
      status: 'idle',
      position: null,
      errorMessage: null,
      watchEnabled: false,
      currentRegionId: null,
      currentRegionName: null,
      currentMuniId: null,
      currentMuniName: null,
      currentMuniProps: null,

      isTracking: false,
      trackPoints: [],
      autoDetectVisit: false,
      followMode: false,

      setWatchEnabled: (enabled) =>
        set(enabled ? { watchEnabled: true } : { watchEnabled: false, status: 'idle', position: null }),
      setStatus: (status, errorMessage = null) => set({ status, errorMessage }),

      setPosition: (position) => {
        const state = get()
        const updates: Partial<GpsStore> = { position, status: 'active' }

        // 트랙 기록 중이면 포인트 추가 (노이즈/중복 필터링)
        if (state.isTracking && position.accuracy <= MAX_ACCURACY_M) {
          const points = state.trackPoints
          const last = points[points.length - 1]
          const farEnough =
            !last || haversineMeters(last.lat, last.lng, position.lat, position.lng) >= MIN_TRACK_DISTANCE_M

          if (farEnough) {
            const next = [...points, { lat: position.lat, lng: position.lng, t: position.timestamp }]
            // 상한 초과 시 오래된 포인트 제거
            updates.trackPoints = next.length > MAX_TRACK_POINTS ? next.slice(next.length - MAX_TRACK_POINTS) : next
          }
        }

        set(updates)
      },

      setCurrentRegion: (id, name) => set({ currentRegionId: id, currentRegionName: name }),
      setCurrentMuni: (id, name, props = null) => set({ currentMuniId: id, currentMuniName: name, currentMuniProps: props }),

      startTracking: () => set({ isTracking: true }),
      stopTracking: () => set({ isTracking: false }),
      clearTrack: () => set({ trackPoints: [] }),
      setAutoDetectVisit: (enabled) => set({ autoDetectVisit: enabled }),
      setFollowMode: (enabled) => set({ followMode: enabled }),
    }),
    {
      name: 'mapexp_gps',
      partialize: (state) => ({
        isTracking: state.isTracking,
        trackPoints: state.trackPoints,
        autoDetectVisit: state.autoDetectVisit,
        followMode: state.followMode,
      }),
    },
  ),
)
