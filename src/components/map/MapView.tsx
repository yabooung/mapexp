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
import { useT, tNow, muniTerm, regionDisplayName, mapLangNow, useMapLang, I18nKey, type Lang } from '@/lib/i18n'
import { loadJpMuniNames, muniDisplayName } from '@/lib/muniNames'
import { getRegionMetadata } from '@/data/regions'
import toast from 'react-hot-toast'

/** 광역 지명: 지도 언어 설정에 따라 (메타데이터 없으면 GeoJSON 원어 폴백) */
const prefDisplayName = (regionId: string, fallback: string): string => {
  const meta = getRegionMetadata(regionId)
  return meta ? regionDisplayName(meta, mapLangNow()) : fallback
}

interface MapViewProps {
  onRegionClick: (regionId: string) => void
  /** 양국(일본+한국) 지도를 동시에 표시 */
  showBoth?: boolean
  onToggleBoth?: () => void
}

interface RegionLabelNames {
  nameEn?: string
  nameKo?: string
}

interface RegionLabel extends RegionLabelNames {
  id: string
  name: string
  position: [number, number] // [lat, lng]
}

type LabelMode = 'custom' | 'native' | 'none'

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

/** 양국 동시 표시 시 일본+한국이 모두 보이도록 뷰를 맞춘다 */
const FitBoth = ({ active }: { active: boolean }) => {
  const map = useMap()
  useEffect(() => {
    if (active) {
      // 오키나와~홋카이도, 한국 전체를 포함하는 동아시아 범위
      map.fitBounds([[26.0, 122.0], [46.5, 146.5]], { padding: [16, 16] })
    }
  }, [active, map])
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

export default function MapView({ onRegionClick, showBoth = false, onToggleBoth }: MapViewProps) {
  const { country: storeCountry, getRegionById, addRegion, updateRegion, updateSettings, settings } = useMapExpStore()
  const country = storeCountry as Country
  const otherCountry: Country = country === 'japan' ? 'korea' : 'japan'
  const [baseGeoData, setBaseGeoData] = useState<GeoJsonObject | null>(null)
  const [baseCountry, setBaseCountry] = useState<string | null>(null)
  // 양국 동시 표시: 반대 국가의 광역 지도 (읽기·클릭만, 시정촌 오버레이 없음)
  const [secondaryGeoData, setSecondaryGeoData] = useState<FeatureCollection | null>(null)

  // 성능/안정성: 데이터 변경 시 레이어를 재마운트하지 않고 setStyle로 갱신한다.
  // (재마운트 방식은 클릭 직후 레이어가 파괴되어 연속 클릭·줌 중 클릭이 유실되던 원인)
  const baseLayerRef = useRef<L.GeoJSON | null>(null)
  const overlayLayerRef = useRef<L.GeoJSON | null>(null)
  const secondaryLayerRef = useRef<L.GeoJSON | null>(null)

  const [overlayGeoData, setOverlayGeoData] = useState<GeoJsonObject | null>(null)
  const [boundary, setBoundary] = useState<GeoJsonObject | null>(null)
  const [regionLabels, setRegionLabels] = useState<RegionLabel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showTiles, setShowTiles] = useState(true) // 기본값: 타일 표시
  const [labelMode, setLabelMode] = useState<LabelMode>('native') // Default to native for Japan focus
  const [mapLevel, setMapLevel] = useState<'prefecture' | 'municipality'>('prefecture')
  const [viewPrefectureId, setViewPrefectureId] = useState<string | null>(null) // ID of the prefecture to show details for
  // 시정촌 표시 모드: 켜면 줌인 시 기초 지역 색칠을 보여준다 (읽기 전용 - 수정은 관리 모달에서만)
  const [showMuniLayer, setShowMuniLayer] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false) // 모바일: 범례/컨트롤 패널 토글
  const [retryKey, setRetryKey] = useState(0) // 지도 데이터 로드 실패 시 재시도
  const t = useT()
  // 지도 지명 언어 (auto = UI 언어 따름) - 툴팁/라벨 전용
  const mapLang = useMapLang()

  // 라벨 표시명: 지도 언어별 선택 (ja는 일본=원어 한자, 한국=로마자 / 없으면 원어 폴백)
  const labelText = (l: RegionLabel) =>
    mapLang === 'ko' ? (l.nameKo ?? l.name)
    : mapLang === 'en' ? (l.nameEn ?? l.name)
    : country === 'korea' ? (l.nameEn ?? l.name) : l.name

  // 타일 URL (CARTO Voyager - 무료 사용 가능한 합법 타일만 사용)
  const getTileUrl = (mode: LabelMode) =>
    mode === 'native'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png'

  const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

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

        // 2. Load Overlay Data (기초: 시정촌/시군구) - On Demand (표시 모드가 켜진 경우만)
        if (mapLevel === 'municipality' && viewPrefectureId && showMuniLayer) {
             let url = country === 'japan'
                 ? '/geojson/japan-municipalities.json'
                 : '/geojson/korea-municipalities.json'

             // Tokyo (Use detailed separate file)
             if (country === 'japan' && (viewPrefectureId === 'tokyo' || viewPrefectureId === '13')) {
                 url = '/geojson/japan-detail/N03-21_13_210101.json'
             }

             if (url) {
                 // 일본 시정촌 다국어 이름 사전 (라벨/툴팁 표시용)
                 const jpNames = country === 'japan' ? await loadJpMuniNames() : null
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
                             // 라벨 다국어: 일본은 코드 사전, 한국은 name_eng
                             let nameEn: string | undefined
                             let nameKo: string | undefined
                             if (country === 'japan') {
                                 const entry = jpNames?.[feat.properties?.N03_007 as string]
                                 nameEn = entry?.e
                                 nameKo = entry?.k
                             } else {
                                 nameEn = feat.properties?.name_eng as string | undefined
                                 nameKo = muniName
                             }
                             labels.push({ id: genId, name: muniName, nameEn, nameKo, position })
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
                          const meta = getRegionMetadata(id)
                          labels.push({
                              id,
                              name: feat.properties.name,
                              nameKo: meta?.name,
                              nameEn: meta?.nameEn,
                              position,
                          })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, mapLevel, viewPrefectureId, baseGeoData, retryKey, showMuniLayer])

  // 양국 동시 표시: 반대 국가 광역 데이터 로드 (geo.ts 공용 로더 - ID 주입·캐싱)
  useEffect(() => {
    if (!showBoth) {
      setSecondaryGeoData(null)
      return
    }
    let cancelled = false
    loadPrefectures(otherCountry).then((fc) => {
      if (!cancelled) setSecondaryGeoData(fc)
    })
    return () => {
      cancelled = true
    }
  }, [showBoth, otherCountry])

  // 타일 클리핑 경계: 양국 표시 중이면 두 나라 경계를 합친다
  const effectiveBoundary = useMemo(() => {
    if (showBoth && boundary && secondaryGeoData) {
      const b = boundary as FeatureCollection
      return {
        type: 'FeatureCollection',
        features: [...(b.features ?? []), ...secondaryGeoData.features],
      } as unknown as GeoJsonObject
    }
    return boundary
  }, [showBoth, boundary, secondaryGeoData])

  // 항상 최신 스타일 함수를 참조하기 위한 ref
  // (레이어 이벤트 핸들러의 스테일 클로저 문제 방지)
  const baseStyleRef = useRef<(f?: Feature) => PathOptions>(() => ({}))
  const muniStyleRef = useRef<(f?: Feature) => PathOptions>(() => ({}))
  // 기초 지역 표시 중에는 지도 전체가 읽기 전용 (광역 탭 수정도 금지)
  const readOnlyRef = useRef(false)

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

    // 기초 지역 표시 중에는 광역 탭도 수정 금지 (구경만) - 안내 1회
    if (readOnlyRef.current) {
      showMuniHintOnce()
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
    // 툴팁은 열릴 때만 내용을 만들므로, 떠 있는 동안 탭하면 이전 등급이 보인다 → 즉시 갱신
    const regionName = (feature.properties?.name_ko || feature.properties?.name) as string
    ;(e.target as L.Path).setTooltipContent(buildTooltip(regionId, prefDisplayName(regionId, regionName)))
  }

  const onEachFeature = (feature: Feature, layer: Layer) => {
    if (!feature.properties?.id) return

    const regionId = feature.properties.id as string
    const regionName = (feature.properties.name_ko || feature.properties.name) as string

    // 열릴 때마다 지도 언어 설정으로 광역 지명 해석 (시정촌과 언어 통일)
    layer.bindTooltip(() => buildTooltip(regionId, prefDisplayName(regionId, regionName)), {
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

  // 시정촌은 자기 기록만 표시한다 - 부모 광역 색 상속 없음.
  // (상속하면 광역만 기록한 경우 모든 시정촌이 칠해져 어디를 실제로 갔는지 안 보임)
  const getMunicipalityStyle = (feature?: Feature): PathOptions => {
        if (!feature?.properties?.id) return { fillOpacity: 0, opacity: 0 }
        const regionId = feature.properties.id as string
        const regionExp = getRegionById(regionId)
        const gyeonghyeonchi = regionExp?.gyeonghyeonchi ?? (regionExp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED

        if (gyeonghyeonchi === GyeongHyeonChi.UNVISITED) {
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
    readOnlyRef.current = showMuniLayer && mapLevel === 'municipality'
    baseLayerRef.current?.setStyle((f) => baseStyleRef.current(f as Feature))
    overlayLayerRef.current?.setStyle((f) => muniStyleRef.current(f as Feature))
    secondaryLayerRef.current?.setStyle((f) => baseStyleRef.current(f as Feature))
  })

  // 전체맵의 시정촌 레이어는 읽기 전용 - 수정은 '시정촌/시군구 관리' 모달에서만.
  // 탭하면 이름·등급 툴팁만 보여주고, 세션당 1회 편집 위치 안내 토스트를 띄운다.
  const muniHintShownRef = useRef(false)
  const showMuniHintOnce = () => {
    if (muniHintShownRef.current) return
    muniHintShownRef.current = true
    const lang = (useMapExpStore.getState().settings.language ?? 'ko') as Lang
    toast(tNow('map.muniReadOnly', { term: muniTerm(country, lang) }))
  }

  const onEachMunicipalityFeature = (feature: Feature, layer: Layer) => {
    if (!feature.properties?.id) return

    const regionId = feature.properties.id as string
    const regionName = (feature.properties.name_ko || feature.properties.name) as string

    // 열릴 때마다 현재 언어로 표시명 해석 (일본: 한자/로마자/한글, 한국: 한글/로마자)
    layer.bindTooltip(
      () => buildTooltip(regionId, muniDisplayName(country, feature.properties, regionName, mapLangNow())),
      {
        permanent: false,
        direction: 'top',
        className: 'region-tooltip',
      },
    )

    layer.on({
        click: (e: LeafletMouseEvent) => {
            e.originalEvent.preventDefault()
            showMuniHintOnce()
        },
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

  const mapCenter = showBoth ? [36.5, 133.5] : country === 'japan' ? [36.5, 138.0] : [36.5, 127.5]
  const mapZoom = showBoth ? 5 : country === 'japan' ? 5 : 7

  const mapBounds = showBoth
    ? [[15.0, 110.0], [55.0, 160.0]]
    : country === 'japan'
      ? [[15.0, 110.0], [55.0, 160.0]]
      : [[30.0, 120.0], [43.0, 135.0]]

  if (!baseGeoData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-paper">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seal"></div>
            <p className="text-sm text-muted">{t('map.loading')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted">{t('map.loadFailed')}</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="px-4 py-2 bg-ink text-paper rounded-md text-sm font-medium hover:opacity-90"
            >
              {t('map.retry')}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg relative bg-white">
      <MapContainer
        key={`${country}-${settings.mapMode}-${showBoth}`}
        center={mapCenter as [number, number]}
        zoom={mapZoom}
        minZoom={showBoth ? 3 : country === 'japan' ? 3 : 5}
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
          effectiveBoundary ? (
              <BoundaryTileLayer
                key={showBoth ? 'boundary-both' : 'boundary-single'}
                boundary={effectiveBoundary}
                attribution={TILE_ATTRIBUTION}
                url={getTileUrl(labelMode)}
              />
          ) : (
              <TileLayer
                attribution={TILE_ATTRIBUTION}
                url={getTileUrl(labelMode)}
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
                   // Hide if this is the active view prefecture (시정촌 표시가 켜진 경우만)
                   if (showMuniLayer && viewPrefectureId && fid) {
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

        {/* 양국 동시 표시: 반대 국가 광역 레이어 (시정촌 오버레이 없음, 클릭·색칠만) */}
        {showBoth && secondaryGeoData && (
             <GeoJSON
                ref={secondaryLayerRef}
                key={`secondary-${otherCountry}`}
                data={secondaryGeoData}
                style={getRegionStyle}
                onEachFeature={onEachFeature}
             />
        )}

        {/* Overlay Layer (Municipalities) - Only if zoomed in. 읽기 전용 표시 */}
        {showMuniLayer && overlayGeoData && (
             <GeoJSON
                ref={overlayLayerRef}
                key={`overlay-${country}-${viewPrefectureId}`}
                data={overlayGeoData}
                style={getMunicipalityStyle}
                onEachFeature={onEachMunicipalityFeature}
             />
        )}

        {/* 양국 뷰 맞춤 */}
        <FitBoth active={showBoth} />
        <ZoomHandler setMapLevel={setMapLevel} setViewPrefecture={setViewPrefectureId} baseGeoData={baseGeoData} />
        <AutoResize />

        {/* GPS: 현재 위치 마커 + 트랙 폴리라인 */}
        <GpsLayer />
        
        {/* Custom Labels: 커스텀 모드이거나, 시정촌 표시 중(색칠이 타일 지명을 가리므로 라벨 '끔'만 아니면) */}
        {(labelMode === 'custom' ||
          (labelMode !== 'none' && showMuniLayer && mapLevel === 'municipality' && !!overlayGeoData)) &&
         regionLabels.map((label) => (
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
              ">${labelText(label)}</div>`,
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

            <button
              onClick={() => {
                  // 지명 언어 순환: 자동 → 한국어 → English → 日本語
                  const order: Array<'auto' | Lang> = ['auto', 'ko', 'en', 'ja']
                  const cur = settings.mapLanguage ?? 'auto'
                  const next = order[(order.indexOf(cur) + 1) % order.length]
                  updateSettings({ mapLanguage: next })
              }}
              className="w-full py-1.5 px-2.5 rounded-md border border-line font-medium flex items-center justify-between text-ink hover:bg-paper transition-colors"
            >
               <span className="text-muted">{t('map.mapLang')}</span>
               <span className="font-semibold">
                 {(settings.mapLanguage ?? 'auto') === 'auto'
                   ? t('map.langAuto')
                   : settings.mapLanguage === 'ko' ? '한국어' : settings.mapLanguage === 'en' ? 'English' : '日本語'}
               </span>
            </button>

            <button
              onClick={() => setShowMuniLayer(!showMuniLayer)}
              className={`w-full py-1.5 px-2.5 rounded-md border font-medium flex items-center justify-between transition-colors ${
                showMuniLayer ? 'bg-ink text-paper border-ink' : 'border-line text-ink hover:bg-paper'
              }`}
            >
               <span className={showMuniLayer ? 'text-paper/70' : 'text-muted'}>{t('map.muniLayer')}</span>
               <span className="font-semibold">{showMuniLayer ? t('map.on') : t('map.off')}</span>
            </button>

            {onToggleBoth && (
              <button
                onClick={onToggleBoth}
                className={`w-full py-1.5 px-2.5 rounded-md border font-medium flex items-center justify-between transition-colors ${
                  showBoth ? 'bg-ink text-paper border-ink' : 'border-line text-ink hover:bg-paper'
                }`}
              >
                 <span className={showBoth ? 'text-paper/70' : 'text-muted'}>{t('map.both')}</span>
                 <span className="font-semibold">{showBoth ? t('map.on') : t('map.off')}</span>
              </button>
            )}
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
