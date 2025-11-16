'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { useMapExpStore } from '@/store'
import { ExpLevel } from '@/types'
import { EXP_COLORS } from '@/constants'
import type { GeoJsonObject, Feature } from 'geojson'
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet'

interface MapViewProps {
  onRegionClick: (regionId: string) => void
}

/**
 * Leaflet 지도 뷰 컴포넌트
 */
export default function MapView({ onRegionClick }: MapViewProps) {
  const { country, getRegionById } = useMapExpStore()
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // GeoJSON 데이터 로드
  useEffect(() => {
    const loadGeoData = async () => {
      setIsLoading(true)
      try {
        const fileName =
          country === 'japan'
            ? 'japan-prefectures-sample.json'
            : 'korea-provinces-sample.json'

        const response = await fetch(`/geojson/${fileName}`)
        if (!response.ok) throw new Error('Failed to load GeoJSON')

        const data = await response.json()
        setGeoData(data)
      } catch (error) {
        console.error('Error loading GeoJSON:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadGeoData()
  }, [country])

  // 지역 스타일 결정
  const getRegionStyle = (feature?: Feature): PathOptions => {
    if (!feature?.properties?.id) {
      return {
        fillColor: EXP_COLORS[ExpLevel.UNVISITED],
        fillOpacity: 0.7,
        color: '#666',
        weight: 1,
      }
    }

    const regionId = feature.properties.id as string
    const regionExp = getRegionById(regionId)
    const level = regionExp?.level ?? ExpLevel.UNVISITED
    const isMaster = level === ExpLevel.MASTER

    return {
      fillColor: EXP_COLORS[level],
      fillOpacity: 0.7,
      color: isMaster ? '#FFD700' : '#666',
      weight: isMaster ? 3 : 1,
    }
  }

  // 각 지역 레이어에 이벤트 추가
  const onEachFeature = (feature: Feature, layer: Layer) => {
    if (!feature.properties?.id) return

    const regionId = feature.properties.id as string
    const regionName = feature.properties.name_ko || feature.properties.name

    // 호버 시 툴팁
    layer.bindTooltip(regionName, {
      permanent: false,
      direction: 'top',
      className: 'region-tooltip',
    })

    // 클릭 이벤트
    layer.on({
      click: (e: LeafletMouseEvent) => {
        onRegionClick(regionId)
      },
      mouseover: (e: LeafletMouseEvent) => {
        const target = e.target
        target.setStyle({
          weight: 3,
          color: '#333',
          fillOpacity: 0.9,
        })
      },
      mouseout: (e: LeafletMouseEvent) => {
        const target = e.target
        const style = getRegionStyle(feature)
        target.setStyle(style)
      },
    })
  }

  // 지도 중심 및 줌 설정
  const mapCenter = country === 'japan' ? [37.5, 138.5] : [36.5, 127.5]
  const mapZoom = country === 'japan' ? 5 : 7

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">지도 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!geoData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-red-600">지도 데이터를 불러올 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={mapCenter as [number, number]}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%', minHeight: '600px' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoData && (
          <GeoJSON
            key={country}
            data={geoData}
            style={getRegionStyle}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  )
}
