'use client'

import { useEffect, useRef } from 'react'
import { Marker, Circle, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useGpsStore } from '@/store/gps'

/**
 * MapContainer 내부에서 렌더링되는 GPS 레이어
 * - 현재 위치 마커 (펄스 애니메이션) + 정확도 원
 * - 트랙 로그 폴리라인
 * - 팔로우 모드 (지도가 현재 위치를 따라감)
 */

const locationIcon = () =>
  L.divIcon({
    className: 'gps-location-marker',
    html: `
      <div class="gps-pulse-wrapper">
        <div class="gps-pulse"></div>
        <div class="gps-dot"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

/** 팔로우 모드: 위치가 갱신되면 지도를 이동 */
function FollowHandler() {
  const map = useMap()
  const position = useGpsStore((s) => s.position)
  const followMode = useGpsStore((s) => s.followMode)
  const firstFixRef = useRef(true)

  useEffect(() => {
    if (!position) return

    if (firstFixRef.current) {
      // 첫 위치 수신 시 줌인하며 이동
      firstFixRef.current = false
      map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 10), { duration: 1 })
      return
    }

    if (followMode) {
      map.panTo([position.lat, position.lng], { animate: true })
    }
  }, [map, position, followMode])

  // 사용자가 지도를 직접 드래그하면 팔로우 해제
  useEffect(() => {
    const onDragStart = () => {
      if (useGpsStore.getState().followMode) {
        useGpsStore.getState().setFollowMode(false)
      }
    }
    map.on('dragstart', onDragStart)
    return () => {
      map.off('dragstart', onDragStart)
    }
  }, [map])

  return null
}

export default function GpsLayer() {
  const position = useGpsStore((s) => s.position)
  const trackPoints = useGpsStore((s) => s.trackPoints)

  return (
    <>
      {/* 트랙 로그 폴리라인 */}
      {trackPoints.length >= 2 && (
        <Polyline
          positions={trackPoints.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: '#4F46E5', weight: 4, opacity: 0.75, lineJoin: 'round', lineCap: 'round' }}
        />
      )}

      {/* 현재 위치 */}
      {position && (
        <>
          {position.accuracy > 30 && (
            <Circle
              center={[position.lat, position.lng]}
              radius={position.accuracy}
              pathOptions={{ color: '#3B82F6', weight: 1, opacity: 0.4, fillColor: '#3B82F6', fillOpacity: 0.1 }}
            />
          )}
          <Marker position={[position.lat, position.lng]} icon={locationIcon()} zIndexOffset={1000} />
        </>
      )}

      <FollowHandler />
    </>
  )
}
