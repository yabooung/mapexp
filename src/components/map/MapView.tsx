'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { feature } from 'topojson-client'
import { useMapExpStore } from '@/store'
import { ExpLevel } from '@/types'
import { EXP_COLORS } from '@/constants'
import type { GeoJsonObject, Feature } from 'geojson'
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet'
import type { Topology } from 'topojson-specification'

interface MapViewProps {
  onRegionClick: (regionId: string) => void
}

// 지역 ID 매핑 (TopoJSON 속성 → regions.ts ID)
const REGION_ID_MAP: Record<string, Record<string, string>> = {
  japan: {
    '北海道': 'hokkaido',
    '青森県': 'aomori',
    '岩手県': 'iwate',
    '宮城県': 'miyagi',
    '秋田県': 'akita',
    '山形県': 'yamagata',
    '福島県': 'fukushima',
    '茨城県': 'ibaraki',
    '栃木県': 'tochigi',
    '群馬県': 'gunma',
    '埼玉県': 'saitama',
    '千葉県': 'chiba',
    '東京都': 'tokyo',
    '神奈川県': 'kanagawa',
    '新潟県': 'niigata',
    '富山県': 'toyama',
    '石川県': 'ishikawa',
    '福井県': 'fukui',
    '山梨県': 'yamanashi',
    '長野県': 'nagano',
    '岐阜県': 'gifu',
    '静岡県': 'shizuoka',
    '愛知県': 'aichi',
    '三重県': 'mie',
    '滋賀県': 'shiga',
    '京都府': 'kyoto',
    '大阪府': 'osaka',
    '兵庫県': 'hyogo',
    '奈良県': 'nara',
    '和歌山県': 'wakayama',
    '鳥取県': 'tottori',
    '島根県': 'shimane',
    '岡山県': 'okayama',
    '広島県': 'hiroshima',
    '山口県': 'yamaguchi',
    '徳島県': 'tokushima',
    '香川県': 'kagawa',
    '愛媛県': 'ehime',
    '高知県': 'kochi',
    '福岡県': 'fukuoka',
    '佐賀県': 'saga',
    '長崎県': 'nagasaki',
    '熊本県': 'kumamoto',
    '大分県': 'oita',
    '宮崎県': 'miyazaki',
    '鹿児島県': 'kagoshima',
    '沖縄県': 'okinawa',
  },
  korea: {
    '서울특별시': 'seoul',
    '부산광역시': 'busan',
    '대구광역시': 'daegu',
    '인천광역시': 'incheon',
    '광주광역시': 'gwangju',
    '대전광역시': 'daejeon',
    '울산광역시': 'ulsan',
    '세종특별자치시': 'sejong',
    '경기도': 'gyeonggi',
    '강원특별자치도': 'gangwon',
    '강원도': 'gangwon',
    '충청북도': 'chungbuk',
    '충청남도': 'chungnam',
    '전라북도': 'jeonbuk',
    '전북특별자치도': 'jeonbuk',
    '전라남도': 'jeonnam',
    '경상북도': 'gyeongbuk',
    '경상남도': 'gyeongnam',
    '제주특별자치도': 'jeju',
  },
}

/**
 * Leaflet 지도 뷰 컴포넌트 (TopoJSON 사용)
 */
export default function MapView({ onRegionClick }: MapViewProps) {
  const { country, getRegionById } = useMapExpStore()
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // GeoJSON/TopoJSON 데이터 로드
  useEffect(() => {
    const loadGeoData = async () => {
      setIsLoading(true)
      try {
        let url: string
        let isTopoJSON: boolean

        if (country === 'japan') {
          // 로컬 GeoJSON (dataofjapan/land)
          url = '/geojson/japan-prefectures.json'
          isTopoJSON = false
        } else {
          // 로컬 TopoJSON (southkorea-maps)
          url = '/geojson/korea-provinces.json'
          isTopoJSON = true
        }

        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to load map data')

        let geoJson: GeoJsonObject

        if (isTopoJSON) {
          // TopoJSON → GeoJSON 변환 (한국)
          const topoData = (await response.json()) as Topology
          const objectName = 'skorea-provinces-2018-topo'
          const objects = topoData.objects[objectName]

          if (!objects) {
            console.error('Available objects:', Object.keys(topoData.objects))
            throw new Error(`Object '${objectName}' not found in TopoJSON`)
          }

          geoJson = feature(topoData, objects) as GeoJsonObject
        } else {
          // 이미 GeoJSON (일본)
          geoJson = await response.json()
        }

        // 지역 ID 매핑
        if (geoJson.type === 'FeatureCollection') {
          geoJson.features.forEach((feat) => {
            // 일본: nam_ja, 한국: NAME_1 또는 name_ko
            const nameJa = feat.properties?.nam_ja || feat.properties?.name_ja
            const nameKo = feat.properties?.name_ko || feat.properties?.NAME_1 || feat.properties?.name
            const originalName = country === 'japan' ? nameJa : nameKo

            // ID 매핑
            const mappedId = REGION_ID_MAP[country][originalName]
            if (mappedId) {
              feat.properties = {
                ...feat.properties,
                id: mappedId,
                name_ko: country === 'japan' ? feat.properties?.nam_ja : nameKo,
                name: originalName,
              }
            } else {
              console.warn(`No mapping for: ${originalName}`)
            }
          })
        }

        setGeoData(geoJson)
      } catch (error) {
        console.error('Error loading TopoJSON:', error)
        setGeoData(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadGeoData()
  }, [country])

  // 지역 스타일 결정 (개선된 시각화)
  const getRegionStyle = (feature?: Feature): PathOptions => {
    if (!feature?.properties?.id) {
      return {
        fillColor: EXP_COLORS[ExpLevel.UNVISITED],
        fillOpacity: 0.6,
        color: '#999',
        weight: 0.5,
      }
    }

    const regionId = feature.properties.id as string
    const regionExp = getRegionById(regionId)
    const level = regionExp?.level ?? ExpLevel.UNVISITED
    const isMaster = level === ExpLevel.MASTER

    return {
      fillColor: EXP_COLORS[level],
      fillOpacity: level === ExpLevel.UNVISITED ? 0.3 : 0.7,
      color: isMaster ? '#FFD700' : level === ExpLevel.UNVISITED ? '#ccc' : '#fff',
      weight: isMaster ? 2.5 : level === ExpLevel.UNVISITED ? 0.5 : 1.5,
    }
  }

  // 각 지역 레이어에 이벤트 추가
  const onEachFeature = (feature: Feature, layer: Layer) => {
    if (!feature.properties?.id) return

    const regionId = feature.properties.id as string
    const regionName = feature.properties.name_ko || feature.properties.name
    const regionExp = getRegionById(regionId)
    const level = regionExp?.level ?? ExpLevel.UNVISITED

    // 툴팁 내용 (레벨 정보 포함)
    const levelLabels = ['미방문', '통과', '정차', '방문', '거주', '마스터 ⭐']
    const tooltipContent = `
      <div style="text-align: center;">
        <div style="font-weight: bold; font-size: 14px;">${regionName}</div>
        <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">
          ${levelLabels[level]} (Lv.${level})
        </div>
      </div>
    `

    // 호버 시 툴팁
    layer.bindTooltip(tooltipContent, {
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
          color: '#000',
          fillOpacity: 0.9,
        })
        target.bringToFront()
      },
      mouseout: (e: LeafletMouseEvent) => {
        const target = e.target
        const style = getRegionStyle(feature)
        target.setStyle(style)
      },
    })
  }

  // 지도 중심 및 줌 설정
  const mapCenter = country === 'japan' ? [36.5, 138.0] : [36.5, 127.5]
  const mapZoom = country === 'japan' ? 5 : 7

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">지도 로딩 중...</p>
          <p className="text-xs text-gray-500 mt-2">
            {country === 'japan' ? '47개 도도부현' : '17개 시도'} 경계 데이터 불러오는 중
          </p>
        </div>
      </div>
    )
  }

  if (!geoData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 font-medium">지도 데이터를 불러올 수 없습니다</p>
          <p className="text-sm text-gray-600 mt-2">네트워크 연결을 확인해주세요</p>
        </div>
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
        scrollWheelZoom={true}
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

      {/* 범례 */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs z-[1000]">
        <div className="font-semibold mb-2">경험치 레벨</div>
        {[
          { level: 0, label: '미방문', color: EXP_COLORS[0] },
          { level: 1, label: '통과', color: EXP_COLORS[1] },
          { level: 2, label: '정차', color: EXP_COLORS[2] },
          { level: 3, label: '방문', color: EXP_COLORS[3] },
          { level: 4, label: '거주', color: EXP_COLORS[4] },
          { level: 5, label: '마스터 ⭐', color: EXP_COLORS[5] },
        ].map((item) => (
          <div key={item.level} className="flex items-center gap-2 mt-1">
            <div
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
