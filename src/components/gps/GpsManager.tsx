'use client'

import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useGpsStore } from '@/store/gps'
import { useMapExpStore } from '@/store'
import { detectRegionAt } from '@/lib/geo'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'

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

  useEffect(() => {
    if (!shouldWatch) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!('geolocation' in navigator)) {
      useGpsStore.getState().setStatus('error', '이 브라우저는 위치 서비스를 지원하지 않습니다.')
      toast.error('이 브라우저는 위치 서비스를 지원하지 않습니다.')
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

        detectRegionAt(pos.coords.latitude, pos.coords.longitude)
          .then((region) => {
            const state = useGpsStore.getState()
            const prevRegionId = state.currentRegionId
            state.setCurrentRegion(region?.id ?? null, region?.name ?? null)

            // 자동 방문 감지: 새 지역 진입 & 미답(0) 지역이면 '통과(1)' 기록
            if (
              region &&
              state.autoDetectVisit &&
              region.id !== prevRegionId &&
              lastAutoRecordRegionRef.current !== region.id
            ) {
              const mapStore = useMapExpStore.getState()
              const existing = mapStore.getRegionById(region.id)
              const level = existing?.gyeonghyeonchi ?? (existing?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED

              if (level === GyeongHyeonChi.UNVISITED) {
                if (existing) {
                  mapStore.updateRegion(region.id, { gyeonghyeonchi: GyeongHyeonChi.PASSED })
                } else {
                  mapStore.addRegion({
                    regionId: region.id,
                    gyeonghyeonchi: GyeongHyeonChi.PASSED,
                    updatedAt: new Date().toISOString(),
                  })
                }
                lastAutoRecordRegionRef.current = region.id
                toast(`🚗 ${region.name} 통과 기록! (+1 경현치)`, { icon: '📍' })
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
        gps.setStatus('denied', '위치 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.')
        toast.error('위치 권한이 거부되었습니다.')
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
