'use client'

import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useGpsStore } from '@/store/gps'
import { useMapExpStore } from '@/store'
import { detectRegionAt, detectMunicipalityAt } from '@/lib/geo'
import { loadJpMuniNames } from '@/lib/muniNames'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { tNow } from '@/lib/i18n'

/**
 * 헤드리스 GPS 매니저
 * - watchEnabled / isTracking / autoDetectVisit 중 하나라도 켜지면 위치 추적 시작
 * - 위치 변경 시 현재 지역 감지 (point-in-polygon)
 * - autoDetectVisit가 켜져 있으면 새 지역 진입 시 자동으로 '통과(1)' 기록
 *
 * 페이지 레벨에 마운트되어 지도 화면이 아니어도 추적이 유지된다.
 */
export default function GpsManager() {
  const watchEnabled = useGpsStore((s) => s.watchEnabled)
  const isTracking = useGpsStore((s) => s.isTracking)
  const autoDetectVisit = useGpsStore((s) => s.autoDetectVisit)

  const watchIdRef = useRef<number | null>(null)
  const detectingRef = useRef(false)
  const lastDetectRef = useRef(0)
  const lastAutoRecordRegionRef = useRef<string | null>(null)

  const shouldWatch = watchEnabled || isTracking || autoDetectVisit

  // 트랙 기록 중에는 화면이 꺼지지 않도록 Wake Lock 유지
  // (웹은 화면이 꺼지면 GPS 추적이 멈추므로, 내비처럼 켜둔 채 쓰는 시나리오 지원)
  useEffect(() => {
    if (!isTracking || !('wakeLock' in navigator)) return

    let lock: { release: () => Promise<void>; addEventListener?: unknown } | null = null
    let released = false

    const acquire = async () => {
      try {
        lock = await (navigator as Navigator & { wakeLock: { request: (t: 'screen') => Promise<never> } })
          .wakeLock.request('screen')
      } catch {
        // 배터리 절약 모드 등으로 거부될 수 있음 - 무시
      }
    }

    // 탭 복귀 시 재획득 (화면 전환하면 브라우저가 락을 자동 해제함)
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !released) acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisibility)
      lock?.release().catch(() => {})
    }
  }, [isTracking])

  useEffect(() => {
    if (!shouldWatch) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!('geolocation' in navigator)) {
      useGpsStore.getState().setStatus('error', tNow('gps.notSupported'))
      toast.error(tNow('gps.notSupported'))
      return
    }

    useGpsStore.getState().setStatus('locating')

    const handlePosition = (pos: GeolocationPosition) => {
      const gps = useGpsStore.getState()
      gps.setPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading,
        timestamp: pos.timestamp,
      })

      // 지역 감지 (5초 스로틀, 동시 실행 방지)
      const now = Date.now()
      if (!detectingRef.current && now - lastDetectRef.current > 5000) {
        detectingRef.current = true
        lastDetectRef.current = now

        const country = useMapExpStore.getState().country
        if (country === 'japan') loadJpMuniNames() // 배너 표시명 다국어화 사전 (1회 캐시)
        detectRegionAt(pos.coords.latitude, pos.coords.longitude, country)
          .then(async (region) => {
            const state = useGpsStore.getState()
            state.setCurrentRegion(region?.id ?? null, region?.name ?? null)

            // 기초 지역(시정촌/시군구) 감지 (광역이 확인된 경우에만)
            let muni = null
            if (region) {
              muni = await detectMunicipalityAt(pos.coords.latitude, pos.coords.longitude, region.id, country)
            }
            const prevMuniId = state.currentMuniId
            useGpsStore.getState().setCurrentMuni(muni?.id ?? null, muni?.name ?? null, muni?.props ?? null)

            // 자동 방문 감지: 새 지역 진입 시 GPS 인증 '통과(1)' 기록
            // 시정촌이 감지되면 시정촌 단위로 기록 (부모 현은 자동 롤업)
            // 공유 지도 열람 중에는 기록하지 않음
            if (region && state.autoDetectVisit && !useMapExpStore.getState().isViewer) {
              const targetId = muni?.id ?? region.id
              const targetName = muni ? `${region.name} ${muni.name}` : region.name
              const changed = muni ? muni.id !== prevMuniId : region.id !== state.currentRegionId

              if (changed && lastAutoRecordRegionRef.current !== targetId) {
                const mapStore = useMapExpStore.getState()
                const existing = mapStore.getRegionById(targetId)
                const level =
                  existing?.gyeonghyeonchi ?? (existing?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED

                if (level === GyeongHyeonChi.UNVISITED) {
                  mapStore.addGpsRecord(targetId, GyeongHyeonChi.PASSED)
                  lastAutoRecordRegionRef.current = targetId
                  toast(tNow('gps.passToast', { label: targetName }))
                }
              }
            }
          })
          .finally(() => {
            detectingRef.current = false
          })
      }
    }

    const handleError = (err: GeolocationPositionError) => {
      const gps = useGpsStore.getState()
      if (err.code === err.PERMISSION_DENIED) {
        gps.setStatus('denied', tNow('gps.denied'))
        toast.error(tNow('gps.denied'))
        // 권한 거부 시 관련 기능 모두 끄기
        gps.setWatchEnabled(false)
        gps.stopTracking()
        gps.setAutoDetectVisit(false)
      } else {
        gps.setStatus('error', '위치를 가져올 수 없습니다.')
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    })

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [shouldWatch])

  return null
}
