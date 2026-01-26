import { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents } from 'react-leaflet'
import { geoCentroid } from 'd3-geo'
import L from 'leaflet'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import { REGION_ID_MAP } from '@/constants/regions'
import { LABEL_OVERRIDES } from '@/constants/label_overrides'
import type { GeoJsonObject, Feature, FeatureCollection } from 'geojson'
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet'

interface MapViewProps {
  onRegionClick: (regionId: string) => void
}

interface RegionLabel {
  id: string
  name: string
  position: [number, number] // [lat, lng]
}

type LabelMode = 'custom' | 'native' | 'none'
type TileLanguage = 'local' | 'ko' | 'ja'

// REGION_ID_MAP imported from constants

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

import { geoContains } from 'd3-geo'

const ZoomHandler = ({ setMapLevel, setViewPrefecture, baseGeoData }: { setMapLevel: (level: 'prefecture' | 'municipality') => void, setViewPrefecture: (id: string | null) => void, baseGeoData: GeoJsonObject | null }) => {
  const map = useMapEvents({
      zoomend: () => {
          const z = map.getZoom()
          if (z >= 9) {
              setMapLevel('municipality')
              
              // Dynamic Detection: Find which prefecture is in the center
              const center = map.getCenter()
              const centerPoint = [center.lng, center.lat] // GeoJSON is [lng, lat]
              
              if (baseGeoData && (baseGeoData as any).features) {
                  const features = (baseGeoData as any).features as Feature[]
                  const found = features.find(f => {
                       // Simple check or robust point-in-polygon
                       // For performance, let's trust d3-geo's geoContains
                       // Note: geoContains takes [lng, lat]
                       try {
                           return geoContains(f, centerPoint)
                       } catch (e) {
                           return false 
                       }
                  })
                  
                  if (found && found.properties?.id) {
                      setViewPrefecture(found.properties.id)
                  } else {
                      // Fallback to Tokyo if center is unclear or off-map (e.g. ocean)
                      // But maybe don't force it if we are far away?
                      // For now, keep user behavior consistent.
                      setViewPrefecture('tokyo') 
                  }
              }
          } else {
              setMapLevel('prefecture')
              setViewPrefecture(null)
          }
      }
  })
  return null
}

export default function MapView({ onRegionClick }: MapViewProps) {
  const { country: storeCountry, getRegionById, addRegion, updateRegion, settings, regions } = useMapExpStore()
  const country = 'japan' // Force Japan mode (Korea archived)
  const [baseGeoData, setBaseGeoData] = useState<GeoJsonObject | null>(null)
  
  // Data Version Key to force re-render of GeoJSON when data changes
  // Data Version Key to force re-render of GeoJSON when data changes
  // We include length and max updatedAt.
  // Also adding a random element or sum of levels to be absolutely sure?
  // Let's stick to standard practice but ensure it's robust.
  const latestUpdate = regions.length > 0 ? regions.reduce((max, r) => r.updatedAt > max ? r.updatedAt : max, '') : 'init'
  const totalLevels = regions.reduce((sum, r) => sum + (r.gyeonghyeonchi ?? r.level ?? 0), 0)
  const dataKey = `${latestUpdate}-${regions.length}-${totalLevels}`

  const [overlayGeoData, setOverlayGeoData] = useState<GeoJsonObject | null>(null)
  const [boundary, setBoundary] = useState<GeoJsonObject | null>(null)
  const [regionLabels, setRegionLabels] = useState<RegionLabel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showTiles, setShowTiles] = useState(true) // 기본값: 타일 표시
  const [labelMode, setLabelMode] = useState<LabelMode>('native') // Default to native for Japan focus
  const [tileLanguage, setTileLanguage] = useState<TileLanguage>('local') // 기본값: 현지어(영어/현지어)
  const [mapLevel, setMapLevel] = useState<'prefecture' | 'municipality'>('prefecture')
  const [viewPrefectureId, setViewPrefectureId] = useState<string | null>(null) // ID of the prefecture to show details for

  // Smart Inheritance Logic:
  // Identify which prefectures have "Detailed" data (at least one child municipality is tracked).
  // If a prefecture has detailed data, we DISABLE top-down inheritance (Blanket Mode) for that prefecture.
  const parentsWithDetails = useMemo(() => {
      const parents = new Set<string>()
      regions.forEach(r => {
          if (r.regionId.includes('_')) {
              const [parentId] = r.regionId.split('_')
              parents.add(parentId)
          }
      })
      return parents
  }, [regions])



  // 타일 URL 생성 함수
  const getTileUrl = (lang: TileLanguage, mode: LabelMode) => {
    if (lang === 'local') {
        // CARTO Voyager (기존)
        return mode === 'native'
          ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
    } else {
        // Google Maps (언어 설정)
        // hl=ko, hl=ja
        // lyrs=m (roadmap), r (roadmap/alter), s (satellite), h (hybrid), p (terrain)
        // 여기서는 표준 로드맵(m) 사용
        return `https://mt0.google.com/vt/lyrs=m&hl=${lang}&x={x}&y={y}&z={z}`
    }
  }

  // 타일 Attribution 생성 함수
  const getAttribution = (lang: TileLanguage) => {
      return lang === 'local' ? '&copy; CARTO' : '&copy; Google Maps'
  }

  // GeoJSON/TopoJSON 데이터 로드
  useEffect(() => {
    const loadGeoData = async () => {
      setIsLoading(true)
      try {
        // 1. Load Base Data (Prefectures) - Always Japan for now
        // Cached or refetched? For simplicity, fetch if not present or country changed.
        // We actually want to keep base data stable.
        
        if (!baseGeoData || country !== 'japan') { // Simplified check
             const url = '/geojson/japan-prefectures.json'
             const response = await fetch(url)
             const json = await response.json()
             setBaseGeoData(json)
             
             // Initialization for boundary
             if (json.type === 'FeatureCollection') {
                 setBoundary(json as FeatureCollection)
             }
        }

        // 2. Load Overlay Data (Municipalities) - On Demand
        if (mapLevel === 'municipality' && viewPrefectureId) {
             let url = '/geojson/japan-municipalities.json' // Fallback
             
             // Tokyo (Use detailed separate file)
             if (viewPrefectureId === 'tokyo' || viewPrefectureId === '13') {
                 url = '/geojson/japan-detail/N03-21_13_210101.json' 
             }
             
             if (url) {
                 const response = await fetch(url)
                 if (response.ok) {
                    const json = await response.json()
                    setOverlayGeoData(json)
                    
                    const labels: RegionLabel[] = []
                    if (json.type === 'FeatureCollection') {
                        const collection = json as FeatureCollection
                        collection.features.forEach((feat: any) => {
                            const muniName = feat.properties?.N03_004 || feat.properties?.name || feat.properties?.nam || 'Unknown'
                            const prefName = feat.properties?.N03_001
                            
                            // Map Kanji Pref Name to English ID (e.g. 東京都 -> tokyo) to match Store IDs
                            let parentId = prefName
                            if (prefName && REGION_ID_MAP['japan'][prefName]) {
                                parentId = REGION_ID_MAP['japan'][prefName]
                            }
                            const genId = `${parentId}_${muniName}`
                            
                            feat.properties = { ...feat.properties, id: genId, name: muniName, name_ko: muniName }
                            
                            let position: [number, number]
                            if (LABEL_OVERRIDES[genId]) position = LABEL_OVERRIDES[genId]
                            else {
                                const centroid = geoCentroid(feat)
                                position = [centroid[1], centroid[0]]
                            }
                            labels.push({ id: genId, name: muniName, position })
                        })
                    }
                    setRegionLabels(labels)
                 }
             }
        } else {
            // Restore Base Labels (Prefectures)
            if (baseGeoData && (baseGeoData as any).type === 'FeatureCollection') {
                setOverlayGeoData(null) // Clear overlay
                
                const labels: RegionLabel[] = []
                const collection = baseGeoData as FeatureCollection
                collection.features.forEach((feat: any) => {
                    const nameJa = feat.properties?.nam_ja || feat.properties?.name_ja
                    const nameKo = feat.properties?.name_ko || feat.properties?.NAME_1 || feat.properties?.name
                    const originalName = country === 'japan' ? nameJa : nameKo
                    const mappedId = REGION_ID_MAP[country][originalName]
                    
                    if (mappedId) {
                         feat.properties = { ...feat.properties, id: mappedId, name_ko: country === 'japan' ? feat.properties?.nam_ja : nameKo, name: originalName }
                         let position: [number, number]
                         if (LABEL_OVERRIDES[mappedId]) position = LABEL_OVERRIDES[mappedId]
                         else {
                             const centroid = geoCentroid(feat)
                             position = [centroid[1], centroid[0]]
                         }
                         labels.push({ id: mappedId, name: country === 'japan' ? feat.properties?.nam_ja : nameKo, position })
                    }
                })
                setRegionLabels(labels)
            }
        }

      } catch (error) {
        console.error('Error loading map data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadGeoData()
  }, [country, mapLevel, viewPrefectureId, baseGeoData])

  // 지역 스타일
  const getRegionStyle = (feature?: Feature): PathOptions => {
    if (!feature?.properties?.id) return { fillOpacity: 0, opacity: 0 }

    const regionId = feature.properties.id as string
    
    // Visual Polish: Prevent Overlap
    // If we are showing the Municipality Overlay for this prefecture, hide the Base Layer prefecture
    // to avoid double-opacity artifacts.
    const isOverlayActive = mapLevel === 'municipality' && viewPrefectureId
    const isTargetPrefecture = regionId === viewPrefectureId || (viewPrefectureId === '13' && regionId === 'tokyo') // Handle ID mismatch
    
    if (isOverlayActive && isTargetPrefecture) {
        return { fillOpacity: 0, opacity: 0, interactive: false } // Hide completely
    }

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
      color: EXP_COLORS[gyeonghyeonchi], // 모든 레벨에 해당 색상 보더라인 적용
      weight: isResided ? 2.5 : 1.5, // 거주는 조금 더 두껍게
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
          setShowTiles(true)
      } else if (labelMode === 'native') {
          setLabelMode('none')
      } else {
          setLabelMode('custom')
          // Custom 모드일 때는 굳이 지도를 바꿀 필요는 없지만, 사용자가 라벨을 보고 싶어 모드를 바꿨을 수 있음.
      }
  }

  // 언어 모드 전환 핸들러
  const cycleTileLanguage = () => {
    if (tileLanguage === 'local') setTileLanguage('ko')
    else if (tileLanguage === 'ko') setTileLanguage('ja')
    else setTileLanguage('local')
    
    // 언어를 바꾼다는 것은 지도의 라벨을 보고 싶다는 뜻이므로, Native 모드 및 타일 활성화
    if (labelMode !== 'native') {
        setLabelMode('native')
        setShowTiles(true)
    }
  }

  const mapCenter = country === 'japan' ? [36.5, 138.0] : [36.5, 127.5]
  const mapZoom = country === 'japan' ? 5 : 7
  
  const mapBounds = country === 'japan'
    ? [[15.0, 110.0], [55.0, 160.0]]
    : [[30.0, 120.0], [43.0, 135.0]]

  if (isLoading && !baseGeoData) {
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
        doubleClickZoom={false}
        touchZoom={true}
      >
        {showTiles && (
          country === 'japan' && boundary ? (
              <BoundaryTileLayer
                boundary={boundary}
                attribution={getAttribution(tileLanguage)}
                url={getTileUrl(tileLanguage, labelMode)}
              />
          ) : (
              <TileLayer
                attribution={getAttribution(tileLanguage)}
                url={getTileUrl(tileLanguage, labelMode)}
              />
          )
        )}
        
        {/* Base Layer (Prefectures) - Always Visible */}
        <GeoJSON
          key={`base-${country}-${dataKey}-${mapLevel}`} 
          data={baseGeoData!}
          style={getRegionStyle}
          // Only enable interactions if NO overlay is present, OR if overlay treats unvisited as transparent
          // Actually, we want clicks on unvisited areas to fall through? 
          // Leaflet doesn't easily support "click-through" for specific polygons in a single layer unless we use pointer-events: none.
          // BUT, we want base layer to handle clicks for unvisited areas.
          // Strategy: Base Layer always handles clicks. Overlay Layer ONLY handles clicks for Visited features.
          onEachFeature={onEachFeature}
        />

        {/* Overlay Layer (Municipalities) - Only if zoomed in */}
        {overlayGeoData && (
             <GeoJSON
                key={`overlay-${viewPrefectureId}-${dataKey}`}
                data={overlayGeoData}
                style={(feature) => {
                     // Filter: Only show style if VISITED. Otherwise transparent.
                     if (!feature?.properties?.id) return { fillOpacity: 0, opacity: 0 }
                     const regionId = feature.properties.id as string
                     const regionExp = getRegionById(regionId)
                     const gyeonghyeonchi = regionExp?.gyeonghyeonchi ?? (regionExp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
                     
                     if (gyeonghyeonchi === GyeongHyeonChi.UNVISITED) {
                         // Unvisited: Check Parent Prefecture Level for Inheritance
                         const prefName = feature.properties?.N03_001
                         let parentLevel = GyeongHyeonChi.UNVISITED
                         
                         // Robust Parent Detection
                         let parentId = ''
                         
                         // 1. Try viewPrefectureId (Contextual)
                         if (viewPrefectureId === 'tokyo' || viewPrefectureId === '13') {
                             parentId = 'tokyo'
                         } 
                         // 2. Try Property Mapping (General)
                         else if (prefName && REGION_ID_MAP['japan'][prefName]) {
                             parentId = REGION_ID_MAP['japan'][prefName]
                         }
                         
                         // Determine Parent Level
                         if (parentId) {
                             // CRITICAL: Check for "Detailed Mode"
                             // If this parent has ANY child recorded in store, we disable blanket inheritance.
                             // User wants explicit control in that case.
                             if (!parentsWithDetails.has(parentId)) {
                                 const parentExp = getRegionById(parentId)
                                 parentLevel = parentExp?.gyeonghyeonchi ?? (parentExp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
                             }
                         }
                         
                         if (parentLevel > GyeongHyeonChi.UNVISITED) {
                             // Inherit Parent Color!
                             return {
                                fillColor: EXP_COLORS[parentLevel],
                                fillOpacity: 0.7, // Same opacity as visited to blend in
                                color: '#fff', // White border to distinguish boundaries
                                weight: 0.5,
                                interactive: true 
                             }
                         } else {
                             if (Math.random() < 0.001) console.log("Inheritance Fail:", { prefName, regionId, parentId: REGION_ID_MAP['japan'][prefName], parentExp: getRegionById('tokyo') })
                         }

                         // Totally Unvisited (Parent is also unvisited)
                         return { 
                            fillOpacity: 0, 
                            color: '#666', 
                            weight: 0.5, 
                            dashArray: '2',
                            interactive: true 
                         }
                     }
                     
                     // Visited: Show Color
                     const isResided = gyeonghyeonchi === GyeongHyeonChi.RESIDED
                     return {
                        fillColor: EXP_COLORS[gyeonghyeonchi],
                        fillOpacity: 0.7,
                        color: EXP_COLORS[gyeonghyeonchi], // Border matches 
                        weight: isResided ? 2.5 : 1.5,
                     }
                }}
                onEachFeature={onEachFeature}
             />
        )}
        <ZoomHandler setMapLevel={setMapLevel} setViewPrefecture={setViewPrefectureId} baseGeoData={baseGeoData} />
        
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

            {/* Language Toggle (Only visible if not using 'none' labels, or just always visible for ease) */}
            <button
                onClick={cycleTileLanguage}
                className={`w-full py-1.5 px-2 rounded border font-medium flex items-center justify-center gap-2 transition-colors ${
                    tileLanguage !== 'local'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
                title="Change Map Language (Native Labels)"
            >
                <span>
                    {tileLanguage === 'local' ? '🌐' : tileLanguage === 'ko' ? '🇰🇷' : '🇯🇵'}
                </span>
                {tileLanguage === 'local' ? 'Lang: Local' : tileLanguage === 'ko' ? 'Lang: Korean' : 'Lang: Japan'}
            </button>

            {/* Map Level Toggle - Removed as requested in favor of Zoom LOD */ }
            {/* 
            <button
                onClick={() => setMapLevel(prev => prev === 'prefecture' ? 'municipality' : 'prefecture')}
                className={`w-full py-1.5 px-2 rounded border font-medium flex items-center justify-center gap-2 transition-colors ${
                    mapLevel === 'municipality'
                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
            >
                <span>{mapLevel === 'prefecture' ? '🗾' : '🏙️'}</span>
                {mapLevel === 'prefecture' ? 'View: Prefectures' : 'View: Cities'}
            </button> 
            */}

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
