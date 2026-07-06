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
import GpsLayer from './GpsLayer'
import GpsControls from './GpsControls'
import Icon from '@/components/common/Icon'
import { municipalityName, PREF_KANJI_BY_ID, loadPrefectures, featureContainsPoint, type Country } from '@/lib/geo'
import { KOREA_PROV_CODE_BY_ID } from '@/constants/regions'
import { useT, tNow, I18nKey } from '@/lib/i18n'

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

/** 컨테이너 크기 변경 시 Leaflet 리사이즈 (탭 전환/모바일 회전 대응)
 *  주의: 줌 애니메이션 중 invalidateSize를 호출하면 벡터/타일 좌표가 어긋나
 *  "보이는 위치와 클릭 위치가 다른" 버그가 생기므로 애니메이션 종료 후로 미룬다. */
const AutoResize = () => {
  const map = useMap()
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const safeInvalidate = () => {
      if ((map as unknown as { _animatingZoom?: boolean })._animatingZoom) {
        map.once('zoomend', () => map.invalidateSize())
        return
      }
      map.invalidateSize()
    }

    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(safeInvalidate, 150)
    })
    observer.observe(map.getContainer())
    return () => {
      observer.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [map])
  return null
}

const ZoomHandler = ({ setMapLevel, setViewPrefecture, baseGeoData }: { setMapLevel: (level: 'prefecture' | 'municipality') => void, setViewPrefecture: (id: string | null) => void, baseGeoData: GeoJsonObject | null }) => {
  const baseGeoDataRef = useRef(baseGeoData)
  
  useEffect(() => {
      baseGeoDataRef.current = baseGeoData
  }, [baseGeoData])

  const map = useMapEvents({
      zoomend: () => {
          updateMapState()
      },
      moveend: () => {
          updateMapState()
      }
  })

  const updateMapState = () => {
      const z = map.getZoom()
      if (z >= 9) {
          setMapLevel('municipality')
          
          // Dynamic Detection: Find which prefecture is in the center
          const center = map.getCenter()
          const centerPoint: [number, number] = [center.lng, center.lat] // GeoJSON is [lng, lat]
          
          const currentData = baseGeoDataRef.current
          if (currentData && (currentData as any).features) {
              const features = (currentData as any).features as Feature[]
              // turf 기반 판정 (winding order에 안전 - geo.ts 참고)
              const found = features.find(f => featureContainsPoint(f, centerPoint[0], centerPoint[1]))
              
              if (found && found.properties?.id) {
                  setViewPrefecture(found.properties.id)
              } else {
                  // Fallback: Find Closest Centroid
                  // useful for bays, oceans, or complex borders where center is technically "outside"
                  let minDist = Infinity
                  let closestId: string | null = null
                  
                  features.forEach(f => {
                      if (f.properties?.id) {
                         const centerLng = center.lng
                         const centerLat = center.lat
                         
                         // Approx Centroid
                         const centroid = geoCentroid(f) // [lng, lat]
                         const dist = Math.sqrt(Math.pow(centroid[0] - centerLng, 2) + Math.pow(centroid[1] - centerLat, 2))
                         
                         if (dist < minDist) {
                             minDist = dist
                             closestId = f.properties.id
                         }
                      }
                  })
                  
                  setViewPrefecture(closestId)
              }
          }
      } else {
          setMapLevel('prefecture')
          setViewPrefecture(null)
      }
  }
  return null
}

export default function MapView({ onRegionClick }: MapViewProps) {
  const { country: storeCountry, getRegionById, addRegion, updateRegion, settings, regions } = useMapExpStore()
  const country = storeCountry as Country
  const [baseGeoData, setBaseGeoData] = useState<GeoJsonObject | null>(null)
  const [baseCountry, setBaseCountry] = useState<string | null>(null)

  // 성능/안정성: 데이터 변경 시 레이어를 재마운트하지 않고 setStyle로 갱신한다.
  // (재마운트 방식은 클릭 직후 레이어가 파괴되어 연속 클릭·줌 중 클릭이 유실되던 원인)
  const baseLayerRef = useRef<L.GeoJSON | null>(null)
  const overlayLayerRef = useRef<L.GeoJSON | null>(null)

  const [overlayGeoData, setOverlayGeoData] = useState<GeoJsonObject | null>(null)
  const [boundary, setBoundary] = useState<GeoJsonObject | null>(null)
  const [regionLabels, setRegionLabels] = useState<RegionLabel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showTiles, setShowTiles] = useState(true) // 기본값: 타일 표시
  const [labelMode, setLabelMode] = useState<LabelMode>('native') // Default to native for Japan focus
  const [tileLanguage, setTileLanguage] = useState<TileLanguage>('local') // 기본값: 현지어(영어/현지어)
  const [mapLevel, setMapLevel] = useState<'prefecture' | 'municipality'>('prefecture')
  const [viewPrefectureId, setViewPrefectureId] = useState<string | null>(null) // ID of the prefecture to show details for
  const [panelOpen, setPanelOpen] = useState(false) // 모바일: 범례/컨트롤 패널 토글
  const t = useT()

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

  // 국가 전환 시 오버레이/뷰 상태 초기화
  useEffect(() => {
    setMapLevel('prefecture')
    setViewPrefectureId(null)
    setOverlayGeoData(null)
  }, [country])

  // GeoJSON 데이터 로드
  useEffect(() => {
    const loadGeoData = async () => {
      setIsLoading(true)
      try {
        // 1. Load Base Data (광역: 도도부현/시도) - geo.ts 공용 로더 (ID 주입 + 캐싱)
        let base = baseGeoData as FeatureCollection | null
        if (!base || baseCountry !== country) {
             const fc = await loadPrefectures(country)
             if (fc) {
                 base = fc
                 setBaseGeoData(fc)
                 setBaseCountry(country)
                 setBoundary(fc)
             }
        }

        // 2. Load Overlay Data (기초: 시정촌/시군구) - On Demand
        if (mapLevel === 'municipality' && viewPrefectureId) {
             let url = country === 'japan'
                 ? '/geojson/japan-municipalities.json'
                 : '/geojson/korea-municipalities.json'

             // Tokyo (Use detailed separate file)
             if (country === 'japan' && (viewPrefectureId === 'tokyo' || viewPrefectureId === '13')) {
                 url = '/geojson/japan-detail/N03-21_13_210101.json'
             }

             if (url) {
                 const response = await fetch(url)
                 if (response.ok) {
                    const json = await response.json()

                     const labels: RegionLabel[] = []
                     if (json.type === 'FeatureCollection') {
                         const collection = json as FeatureCollection

                         // 전국 파일에서는 현재 보고 있는 광역의 기초 지역만 추림 (성능)
                         let features = collection.features
                         if (country === 'japan') {
                             const viewPrefKanji =
                                 viewPrefectureId === '13' ? '東京都' : PREF_KANJI_BY_ID[viewPrefectureId] ?? null
                             if (viewPrefKanji) {
                                 features = features.filter(
                                     (f: any) => !f.properties?.N03_001 || f.properties.N03_001 === viewPrefKanji,
                                 )
                             }
                         } else {
                             const provCode = KOREA_PROV_CODE_BY_ID[viewPrefectureId]
                             if (provCode) {
                                 features = features.filter((f: any) => f.properties?.code?.startsWith(provCode))
                             }
                         }
                         const filtered: FeatureCollection = { ...collection, features }

                         filtered.features.forEach((feat: any) => {
                             let muniName: string
                             let parentId: string

                             if (country === 'japan') {
                                 // 정령지정시 구는 시 이름 포함 (예: 札幌市中央区) - ID 충돌 방지
                                 muniName = municipalityName(feat.properties)
                                     || feat.properties?.name || feat.properties?.nam || 'Unknown'
                                 const prefName = feat.properties?.N03_001
                                 parentId = prefName && REGION_ID_MAP['japan'][prefName]
                                     ? REGION_ID_MAP['japan'][prefName]
                                     : viewPrefectureId
                             } else {
                                 muniName = feat.properties?.name || 'Unknown'
                                 parentId = viewPrefectureId
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

                         setOverlayGeoData(filtered)
                     } else {
                         setOverlayGeoData(json)
                     }
                     setRegionLabels(labels)
                  }
              }
         } else {
             // Restore Base Labels (Prefectures)
             // Data is ALREADY processed in Step 1, so we just build labels
             if (baseGeoData && (baseGeoData as any).type === 'FeatureCollection') {
                 setOverlayGeoData(null) // Clear overlay
                 
                 const labels: RegionLabel[] = []
                 const collection = baseGeoData as FeatureCollection
                 collection.features.forEach((feat: any) => {
                     if (feat.properties?.id) {
                          const id = feat.properties.id
                          let position: [number, number]
                          if (LABEL_OVERRIDES[id]) position = LABEL_OVERRIDES[id]
                          else {
                              const centroid = geoCentroid(feat)
                              position = [centroid[1], centroid[0]]
                          }
                          labels.push({ id, name: feat.properties.name, position })
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

  // 항상 최신 스타일 함수를 참조하기 위한 ref
  // (레이어 이벤트 핸들러의 스테일 클로저 문제 방지)
  const baseStyleRef = useRef<(f?: Feature) => PathOptions>(() => ({}))
  const muniStyleRef = useRef<(f?: Feature) => PathOptions>(() => ({}))

  // 지역 스타일
  // 주의: interactive:false를 반환하는 분기를 두면 안 된다.
  // 레이어 생성 시점의 스테일 스타일로 만들어진 path는 setStyle로
  // 인터랙티브를 복원할 수 없어 영구 클릭 불능이 된다.
  // (활성 현은 어차피 data 필터에서 제외되므로 숨김 분기 자체가 불필요)
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
      fillOpacity: 0.7,
      color: EXP_COLORS[gyeonghyeonchi], // 모든 레벨에 해당 색상 보더라인 적용
      weight: isResided ? 2.5 : 1.5, // 거주는 조금 더 두껍게
    }
  }

  // 툴팁 내용 빌더 - 열릴 때마다 최신 레벨/언어를 읽는다
  const buildTooltip = (regionId: string, regionName: string) => {
    const exp = useMapExpStore.getState().getRegionById(regionId)
    const lvl = exp?.gyeonghyeonchi ?? (exp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
    return `
      <div style="text-align: center;">
        <div style="font-weight: bold; font-size: 14px;">${regionName}</div>
        <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">
          ${tNow('level.term')}: ${tNow(`level.${lvl}` as I18nKey)} (${lvl})
        </div>
      </div>
    `
  }

  // 레벨 순환 클릭 처리 (base/overlay 공용)
  const cycleLevelOnClick = (
    e: LeafletMouseEvent,
    regionId: string,
    styleRef: React.RefObject<(f?: Feature) => PathOptions>,
    feature: Feature,
  ) => {
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

    // 즉시 반영 (스토어 갱신 → 효과에서 전체 재스타일도 수행되지만, 클릭 피드백은 바로)
    e.target.setStyle(styleRef.current(feature))
  }

  const onEachFeature = (feature: Feature, layer: Layer) => {
    if (!feature.properties?.id) return

    const regionId = feature.properties.id as string
    const regionName = feature.properties.name_ko || feature.properties.name

    layer.bindTooltip(() => buildTooltip(regionId, regionName), {
      permanent: false,
      direction: 'top',
      className: 'region-tooltip',
    })

    layer.on({
      click: (e: LeafletMouseEvent) => cycleLevelOnClick(e, regionId, baseStyleRef, feature),
      mouseover: (e: LeafletMouseEvent) => {
        const target = e.target
        target.setStyle({ weight: 3, color: '#000', fillOpacity: 0.9 })
        target.bringToFront()
      },
      mouseout: (e: LeafletMouseEvent) => {
        e.target.setStyle(baseStyleRef.current(feature))
      },
    })
  }

  const getMunicipalityStyle = (feature?: Feature): PathOptions => {
        // Filter: Only show style if VISITED. Otherwise transparent.
        if (!feature?.properties?.id) return { fillOpacity: 0, opacity: 0 }
        const regionId = feature.properties.id as string
        const regionExp = getRegionById(regionId)
        const gyeonghyeonchi = regionExp?.gyeonghyeonchi ?? (regionExp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
        
        if (gyeonghyeonchi === GyeongHyeonChi.UNVISITED) {
            // Unvisited: Check Parent Prefecture Level for Inheritance
            let parentLevel = GyeongHyeonChi.UNVISITED

            // genId가 `${parentId}_${muniName}` 형태이므로 접두사로 부모 판별 (국가 무관)
            const parentId = regionId.includes('_') ? regionId.split('_')[0] : ''
            
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
               // Fallthrough
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
  }

  // 매 렌더마다 최신 스타일 함수를 ref에 반영하고 레이어를 재스타일
  // (기록/설정이 바뀐 렌더에서만 실제 시각 변화 발생. 레이어 재마운트 없음)
  useEffect(() => {
    baseStyleRef.current = getRegionStyle
    muniStyleRef.current = getMunicipalityStyle
    baseLayerRef.current?.setStyle((f) => baseStyleRef.current(f as Feature))
    overlayLayerRef.current?.setStyle((f) => muniStyleRef.current(f as Feature))
  })

  const onEachMunicipalityFeature = (feature: Feature, layer: Layer) => {
    if (!feature.properties?.id) return

    const regionId = feature.properties.id as string
    const regionName = feature.properties.name_ko || feature.properties.name

    layer.bindTooltip(() => buildTooltip(regionId, regionName), {
      permanent: false,
      direction: 'top',
      className: 'region-tooltip',
    })

    layer.on({
        click: (e: LeafletMouseEvent) => cycleLevelOnClick(e, regionId, muniStyleRef, feature),
        mouseover: (e: LeafletMouseEvent) => {
            const target = e.target
            target.setStyle({ weight: 2, color: '#666', fillOpacity: 0.2 })
            target.bringToFront()
        },
        mouseout: (e: LeafletMouseEvent) => {
            e.target.setStyle(muniStyleRef.current(feature))
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
            backgroundColor: '#aad3df'
        }}
        className="z-0"
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={false}
        touchZoom={true}
      >
        {showTiles && (
          boundary ? (
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
          ref={baseLayerRef}
          key={`base-${country}-${mapLevel}-${viewPrefectureId}`}
          data={{
              ...baseGeoData!,
              features: (baseGeoData! as FeatureCollection).features.filter(f => {
                   const fid = f.properties?.id
                   // Hide if this is the active view prefecture
                   if (viewPrefectureId && fid) {
                       if (fid === viewPrefectureId) return false
                       if (viewPrefectureId === '13' && fid === 'tokyo') return false
                       if (viewPrefectureId === 'tokyo' && fid === '13') return false
                   }
                   return true
              })
          } as FeatureCollection}
          // 생성 시에는 현재 렌더의 신선한 클로저를 사용 (ref는 이 시점에 아직 이전 렌더 값)
          style={getRegionStyle}
          onEachFeature={onEachFeature}
        />

        {/* Overlay Layer (Municipalities) - Only if zoomed in */}
        {overlayGeoData && (
             <GeoJSON
                ref={overlayLayerRef}
                key={`overlay-${country}-${viewPrefectureId}`}
                data={overlayGeoData}
                style={getMunicipalityStyle}
                onEachFeature={onEachMunicipalityFeature}
             />
        )}
        <ZoomHandler setMapLevel={setMapLevel} setViewPrefecture={setViewPrefectureId} baseGeoData={baseGeoData} />
        <AutoResize />

        {/* GPS: 현재 위치 마커 + 트랙 폴리라인 */}
        <GpsLayer />
        
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

      {/* GPS 컨트롤 (내 위치, 트랙 기록, 현재 지역 배너) */}
      <GpsControls onRegionClick={onRegionClick} />

      {/* 모바일: 패널 토글 버튼 */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className={`sm:hidden absolute bottom-20 right-4 z-[1001] w-11 h-11 rounded-full border flex items-center justify-center transition-all active:scale-90 shadow-[0_2px_8px_rgba(38,35,28,0.14)] ${
          panelOpen ? 'bg-ink border-ink text-paper' : 'bg-card border-line text-muted'
        }`}
        aria-label={t('map.settingsAria')}
      >
        <Icon name={panelOpen ? 'x' : 'layers'} size={18} />
      </button>

      {/* Controls */}
      <div className={`${panelOpen ? 'block' : 'hidden'} sm:block absolute bottom-[8.5rem] right-4 sm:bottom-4 bg-card border border-line rounded-[10px] shadow-[0_2px_10px_rgba(38,35,28,0.12)] p-3 text-xs z-[1000] w-[172px] max-h-[55%] overflow-y-auto`}>
        <div className="flex flex-col gap-1.5 mb-3">
            <button
              onClick={cycleLabelMode}
              className="w-full py-1.5 px-2.5 rounded-md border border-line font-medium flex items-center justify-between text-ink hover:bg-paper transition-colors"
            >
               <span className="text-muted">{t('map.label')}</span>
               <span className="font-semibold">
                 {labelMode === 'custom' ? t('map.labelCustom') : labelMode === 'native' ? t('map.labelNative') : t('map.off')}
               </span>
            </button>

            <button
                onClick={cycleTileLanguage}
                className="w-full py-1.5 px-2.5 rounded-md border border-line font-medium flex items-center justify-between text-ink hover:bg-paper transition-colors"
                title="지도 라벨 언어 변경"
            >
                <span className="text-muted">{t('map.tileLang')}</span>
                <span className="font-semibold">
                  {tileLanguage === 'local' ? t('map.tileLocal') : tileLanguage === 'ko' ? t('map.tileKo') : t('map.tileJa')}
                </span>
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
                      setShowTiles(false)
                  } else {
                      setShowTiles(!showTiles)
                  }
              }}
              className="w-full py-1.5 px-2.5 rounded-md border border-line font-medium flex items-center justify-between text-ink hover:bg-paper transition-colors"
            >
               <span className="text-muted">{t('map.baseTiles')}</span>
               <span className="font-semibold">{showTiles ? t('map.on') : t('map.off')}</span>
            </button>
        </div>

        <div className="text-[10px] font-semibold tracking-[0.08em] text-muted uppercase mb-2">{t('level.term')}</div>
        <div className="space-y-1">
          {([5, 4, 3, 2, 1, 0] as ExperienceGrade[]).map((lvl) => (
            <div key={lvl} className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-[3px] border border-black/10" style={{ backgroundColor: EXP_COLORS[lvl] }} />
               <span className="text-ink">{t(`level.${lvl}` as I18nKey)}</span>
               <span className="ml-auto text-faint tabular-nums">{lvl}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
