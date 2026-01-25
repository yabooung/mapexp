'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, useMap } from 'react-leaflet'
import { feature } from 'topojson-client'
import { geoCentroid } from 'd3-geo'
import L from 'leaflet'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import type { GeoJsonObject, Feature, FeatureCollection } from 'geojson'
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet'
import type { Topology } from 'topojson-specification'

interface MapViewProps {
  onRegionClick: (regionId: string) => void
}

interface RegionLabel {
  id: string
  name: string
  position: [number, number] // [lat, lng]
}

type LabelMode = 'custom' | 'native' | 'none'

// 지역 ID 매핑
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

const BoundaryTileLayer = ({ url, boundary, attribution }: { url: string, boundary: GeoJsonObject, attribution?: string }) => {
  const map = useMap()
  const layerRef = useRef<L.Layer | null>(null)

  useEffect(() => {
    if (!boundary) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('leaflet-boundary-canvas')
    } catch (e) {
      console.error("Failed to load leaflet-boundary-canvas", e)
      return
    }
    
    const TileLayerAny = L.TileLayer as any
    if (TileLayerAny.BoundaryCanvas) {
        const layer = TileLayerAny.BoundaryCanvas.createFromLayer(
            L.tileLayer(url, { attribution }),
            { boundary, trackAttribution: true }
        )
        
        layer.addTo(map)
        layerRef.current = layer
    }
    
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map, url, boundary, attribution])
  
  return null
}

export default function MapView({ onRegionClick }: MapViewProps) {
  const { country, getRegionById, addRegion, updateRegion, settings } = useMapExpStore()
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null)
  const [boundary, setBoundary] = useState<GeoJsonObject | null>(null)
  const [regionLabels, setRegionLabels] = useState<RegionLabel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showTiles, setShowTiles] = useState(true) // 기본값: 타일 표시
  const [labelMode, setLabelMode] = useState<LabelMode>('custom') // 기본값: 커스텀 라벨

  // GeoJSON/TopoJSON 데이터 로드
  useEffect(() => {
    const loadGeoData = async () => {
      setIsLoading(true)
      try {
        let url: string
        let isTopoJSON: boolean

        if (country === 'japan') {
          url = '/geojson/japan-prefectures.json'
          isTopoJSON = false
        } else {
          url = '/geojson/korea-provinces.json'
          isTopoJSON = true
        }

        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to load map data')

        let geoJson: any

        if (isTopoJSON) {
          const topoData = (await response.json()) as Topology
          const objectName = 'skorea-provinces-2018-topo'
          const objects = topoData.objects[objectName]
          if (!objects) throw new Error(`Object '${objectName}' not found`)
          geoJson = feature(topoData, objects) as GeoJsonObject
        } else {
          geoJson = await response.json()
        }

        // 라벨 생성 & 지역 필터링
        const labels: RegionLabel[] = []
        if (geoJson.type === 'FeatureCollection') {
          const collection = geoJson as FeatureCollection
          /* [영토 범위 수정 방법] collection.features.filter(...) */


          // 일본일 경우 전체 경계 생성 (BoundaryCanvas용)
          if (country === 'japan') {
              // turf.dissolve might be failing or slow. 
              // leaflet-boundary-canvas supports FeatureCollection directly.
              console.log("Setting boundary from collection directly...")
              setBoundary(collection)
          } else {
              setBoundary(null)
          }
          
          collection.features.forEach((feat: any) => {
            const nameJa = feat.properties?.nam_ja || feat.properties?.name_ja
            const nameKo = feat.properties?.name_ko || feat.properties?.NAME_1 || feat.properties?.name
            const originalName = country === 'japan' ? nameJa : nameKo

            const mappedId = REGION_ID_MAP[country][originalName]
            if (mappedId) {
              feat.properties = {
                ...feat.properties,
                id: mappedId,
                name_ko: country === 'japan' ? feat.properties?.nam_ja : nameKo,
                name: originalName,
              }
              
              const centroid = geoCentroid(feat)
              labels.push({
                id: mappedId,
                name: country === 'japan' ? feat.properties?.nam_ja : nameKo,
                position: [centroid[1], centroid[0]],
              })
            }
          })
        }

        setRegionLabels(labels)
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

  // 지역 스타일
  const getRegionStyle = (feature?: Feature): PathOptions => {
    if (!feature?.properties?.id) return { fillOpacity: 0, opacity: 0 }

    const regionId = feature.properties.id as string
    const regionExp = getRegionById(regionId)
    const gyeonghyeonchi = regionExp?.gyeonghyeonchi ?? (regionExp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
    const isResided = gyeonghyeonchi === GyeongHyeonChi.RESIDED

    if (gyeonghyeonchi === GyeongHyeonChi.UNVISITED) {
        return {
            fillColor: showTiles ? 'transparent' : '#ffffff', 
            fillOpacity: showTiles ? 0 : 1.0,
            color: '#999',
            weight: 0.5,
            dashArray: '3',
        }
    }

    return {
      fillColor: EXP_COLORS[gyeonghyeonchi],
      fillOpacity: gyeonghyeonchi === GyeongHyeonChi.UNVISITED ? 0.3 : 0.7,
      color: isResided ? '#FFD700' : '#fff',
      weight: isResided ? 2.5 : 1,
    }
  }

  const onEachFeature = (feature: Feature, layer: Layer) => {
    if (!feature.properties?.id) return

    const regionId = feature.properties.id as string
    const regionName = feature.properties.name_ko || feature.properties.name
    const regionExp = getRegionById(regionId)
    const gyeonghyeonchi = regionExp?.gyeonghyeonchi ?? (regionExp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED

    const levelLabels = ['미답 (0)', '통과 (1)', '접지 (2)', '방문 (3)', '숙박 (4)', '거주 (5)']
    const tooltipContent = `
      <div style="text-align: center;">
        <div style="font-weight: bold; font-size: 14px;">${regionName}</div>
        <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">
          경현치: ${levelLabels[gyeonghyeonchi]}
        </div>
      </div>
    `

    layer.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'top',
      className: 'region-tooltip',
    })

    const handleClick = (e: LeafletMouseEvent) => {
      e.originalEvent.preventDefault()
      if (e.originalEvent.shiftKey) {
        onRegionClick(regionId)
        return
      }

      const currentExp = useMapExpStore.getState().getRegionById(regionId)
      const currentVal = currentExp?.gyeonghyeonchi ?? (currentExp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
      const nextVal = (currentVal >= GyeongHyeonChi.RESIDED ? GyeongHyeonChi.UNVISITED : currentVal + 1) as ExperienceGrade

      if (currentExp) {
        updateRegion(regionId, { gyeonghyeonchi: nextVal })
      } else {
        addRegion({ regionId, gyeonghyeonchi: nextVal, updatedAt: new Date().toISOString() })
      }

      setTimeout(() => {
        const target = e.target
        const newStyle = getRegionStyle(feature)
        target.setStyle(newStyle)
      }, 50)
    }

    layer.on({
      click: handleClick,
      mouseover: (e: LeafletMouseEvent) => {
        const target = e.target
        target.setStyle({ weight: 3, color: '#000', fillOpacity: 0.9 })
        target.bringToFront()
      },
      mouseout: (e: LeafletMouseEvent) => {
        const target = e.target
        const style = getRegionStyle(feature)
        target.setStyle(style)
      },
    })
  }

  // 라벨 모드 전환 핸들러
  const cycleLabelMode = () => {
      if (labelMode === 'custom') {
          setLabelMode('native')
          setShowTiles(true) // Native 라벨은 타일에 있으므로 타일 강제 활성화
      } else if (labelMode === 'native') {
          setLabelMode('none')
      } else {
          setLabelMode('custom')
      }
  }

  const mapCenter = country === 'japan' ? [36.5, 138.0] : [36.5, 127.5]
  const mapZoom = country === 'japan' ? 5 : 7
  
  const mapBounds = country === 'japan'
    ? [[15.0, 110.0], [55.0, 160.0]]
    : [[30.0, 120.0], [43.0, 135.0]]

  if (isLoading || !geoData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg relative bg-white">
      <MapContainer
        key={`${country}-${settings.mapMode}`}
        center={mapCenter as [number, number]}
        zoom={mapZoom}
        minZoom={country === 'japan' ? 3 : 5}
        maxZoom={18}
        maxBounds={mapBounds as [[number, number], [number, number]]}
        maxBoundsViscosity={0.5} 
        style={{ 
            width: '100%', 
            height: '100%', 
            minHeight: '600px',
            backgroundColor: '#aad3df'
        }}
        className="z-0"
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        touchZoom={true}
      >
        {showTiles && (
          country === 'japan' && boundary ? (
              <BoundaryTileLayer
                boundary={boundary}
                attribution='&copy; CARTO'
                url={
                    labelMode === 'native'
                    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
                }
              />
          ) : (
              <TileLayer
                attribution='&copy; CARTO'
                // 'native' 모드일 때는 라벨 있는 버전(voyager), 그 외는 라벨 없는 버전(voyager_nolabels)
                url={
                    labelMode === 'native'
                    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
                }
              />
          )
        )}
        
        <GeoJSON
          key={`${country}-${showTiles}-${labelMode}`} 
          data={geoData}
          style={getRegionStyle}
          onEachFeature={onEachFeature}
        />
        
        {/* Custom Labels: Only show if mode is 'custom' */}
        {labelMode === 'custom' && regionLabels.map((label) => (
          <Marker
            key={label.id}
            position={label.position}
            icon={L.divIcon({
              className: 'custom-map-label',
              html: `<div style="
                text-align: center; 
                font-size: 10px; 
                font-weight: 600; 
                color: #333; 
                text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;
                white-space: nowrap;
                transform: translate(-50%, -50%);
                pointer-events: none;
              ">${label.name}</div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            })}
          />
        ))}
      </MapContainer>

      {/* Controls */}
      <div className={`absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 text-xs z-[1000] max-w-[200px]`}>
        <div className="flex flex-col gap-2 mb-3">
            <button
              onClick={cycleLabelMode}
              className={`w-full py-1.5 px-2 rounded border font-medium flex items-center justify-center gap-2 transition-colors ${
                  labelMode !== 'none'
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
               <span>
                 {labelMode === 'custom' ? '🏷️' : labelMode === 'native' ? '🗺️' : '🚫'}
               </span> 
               {labelMode === 'custom' ? 'Label: Custom' : labelMode === 'native' ? 'Label: Native' : 'Label: None'}
            </button>

            <button
              onClick={() => {
                  if (!showTiles && labelMode === 'native') {
                      // 타일을 켰는데 네이티브 모드라면 유지
                      setShowTiles(true)
                  } else if (showTiles && labelMode === 'native') {
                      // 타일을 끄면 네이티브 라벨도 안보이므로 커스텀이나 non으로 바꿔야 좋겠지만, 일단 타일만 끔
                      // 사용자 경험상 "Isolate"시에는 Custom을 보여주는게 나을수도.
                      // 여기서는 단순 타일 토글만 함.
                      setShowTiles(false)
                  } else {
                      setShowTiles(!showTiles)
                  }
              }}
              className={`w-full py-1.5 px-2 rounded border font-medium flex items-center justify-center gap-2 transition-colors ${
                  showTiles 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
               <span>{showTiles ? '🌏' : '🚫'}</span> 
               {showTiles ? 'Hide Geography' : 'Show Geography'}
            </button>
        </div>

        <div className="font-semibold mb-2">경현치 (경험치 등급)</div>
        {[0, 1, 2, 3, 4, 5].map((lvl) => (
          <div key={lvl} className="flex items-center gap-2 mt-1">
             <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: EXP_COLORS[lvl as ExperienceGrade] }} />
             <span>{lvl}</span>
          </div>
        ))}
        
        <div className="border-t border-gray-200 my-2"></div>
        <div className="text-[10px] text-gray-600">
            {showTiles ? 'Standard View' : 'Isolated View (Background)'}
        </div>
      </div>
    </div>
  )
}
