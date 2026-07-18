import { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, useMap, useMapEvents } from 'react-leaflet'
import { geoCentroid } from 'd3-geo'
import L from 'leaflet'
import { useMapExpStore, getViewerBackupRegions } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import { REGION_ID_MAP, isHiddenRegion } from '@/constants/regions'
import { LABEL_OVERRIDES } from '@/constants/label_overrides'
import type { GeoJsonObject, Feature, FeatureCollection } from 'geojson'
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet'
import GpsLayer from './GpsLayer'
import GpsControls from './GpsControls'
import Icon from '@/components/common/Icon'
import { municipalityName, loadPrefectures, loadMunicipalities, featureContainsPoint, type Country } from '@/lib/geo'
import { KOREA_PROV_CODE_BY_ID } from '@/constants/regions'
import { useT, tNow, useLang, muniTerm, regionDisplayName, mapLangNow, useMapLang, I18nKey, type Lang } from '@/lib/i18n'
import { loadJpMuniNames, muniDisplayName } from '@/lib/muniNames'
import { getRegionMetadata } from '@/data/regions'
import { showLevelUndoToast } from '@/lib/undoToast'
import toast from '@/lib/appToast'

/** 광역 지명: 지도 언어 설정에 따라 (메타데이터 없으면 GeoJSON 원어 폴백) */
const prefDisplayName = (regionId: string, fallback: string): string => {
  const meta = getRegionMetadata(regionId)
  return meta ? regionDisplayName(meta, mapLangNow()) : fallback
}

// 한국 시군구 코드 접두사 → 광역 ID (전국 오버레이의 부모 판정용)
const KOREA_ID_BY_PROV_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(KOREA_PROV_CODE_BY_ID).map(([id, code]) => [code, id]),
)

interface MapViewProps {
  onRegionClick: (regionId: string) => void
  /** 양국(일본+한국) 지도를 동시에 표시 */
  showBoth?: boolean
  onToggleBoth?: () => void
  /** 기초 지역(시정촌/시군구) 도장 모달 열기 - prefectureId를 주면 해당 광역으로 */
  onOpenMuniManager?: (prefectureId?: string) => void
}

interface RegionLabelNames {
  nameEn?: string
  nameKo?: string
  nameJa?: string
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

/** Leaflet 맵 인스턴스를 부모 ref로 노출 (오버레이 버튼이 지도 중심을 읽을 수 있게) */
const MapRefCapture = ({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) => {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
    return () => {
      mapRef.current = null
    }
  }, [map, mapRef])
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

export default function MapView({ onRegionClick, showBoth = false, onToggleBoth, onOpenMuniManager }: MapViewProps) {
  const { country: storeCountry, setCountry, getRegionById, addRegion, updateRegion, updateSettings, settings, isViewer, compareMine } = useMapExpStore()
  const country = storeCountry as Country
  const otherCountry: Country = country === 'japan' ? 'korea' : 'japan'
  const [baseGeoData, setBaseGeoData] = useState<GeoJsonObject | null>(null)
  const [baseCountry, setBaseCountry] = useState<string | null>(null)
  // 양국 동시 표시: 반대 국가의 광역 지도 (읽기·클릭만, 시정촌 오버레이 없음)
  const [secondaryGeoData, setSecondaryGeoData] = useState<FeatureCollection | null>(null)

  const leafletMapRef = useRef<L.Map | null>(null)

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
  // 기본 '직접 표시': 타일 원본 라벨(CARTO)은 로마자 위주라 지명 언어 설정이 안 먹는다.
  // 자체 라벨은 지명 언어(자동=UI 언어)를 따르므로 이쪽이 기본.
  const [labelMode, setLabelMode] = useState<LabelMode>('custom')
  const [mapLevel, setMapLevel] = useState<'prefecture' | 'municipality'>('prefecture')
  const [viewPrefectureId, setViewPrefectureId] = useState<string | null>(null) // ID of the prefecture to show details for
  // 시정촌 표시 모드: 켜면 전국 기초 지역을 보여준다 (읽기 전용 - 수정은 관리 모달에서만)
  // 기본 끔: 첫 방문자는 광역 탭-도장 흐름(온보딩 안내)이 바로 동작해야 한다
  const [showMuniLayer, setShowMuniLayer] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false) // 범례/컨트롤 패널 토글 (데스크톱은 기본 열림)
  // 편집 잠금: 이동/구경 중 실수 탭으로 등급이 바뀌는 걸 방지 (기기에 기억)
  const [editLock, setEditLock] = useState(false)
  const editLockRef = useRef(false)
  const [retryKey, setRetryKey] = useState(0) // 지도 데이터 로드 실패 시 재시도
  const t = useT()
  const uiLang = useLang()
  // 지도 지명 언어 (auto = UI 언어 따름) - 툴팁/라벨 전용
  const mapLang = useMapLang()

  // 라벨 표시명: 지도 언어별 선택 (ja는 한국 지역이면 한자+가나, 없으면 원어 폴백)
  // 지도 라벨은 공간이 좁아 ja의 가나 병기 괄호를 뗀다 - '江原特別自治道(カンウォン)' → '江原特別自治道'
  // (툴팁은 발음 학습용으로 가나를 유지)
  const labelText = (l: RegionLabel) =>
    mapLang === 'ko' ? (l.nameKo ?? l.name)
    : mapLang === 'en' ? (l.nameEn ?? l.name)
    : (l.nameJa ?? l.name).replace(/\s*[(（].*?[)）]/g, '')

  // 타일 URL (CARTO Voyager - 무료 사용 가능한 합법 타일만 사용)
  const getTileUrl = (mode: LabelMode) =>
    mode === 'native'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png'

  const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

  // 데스크톱은 패널 기본 열림 (접었다 펼 수 있음), 모바일은 기본 닫힘
  useEffect(() => {
    if (window.matchMedia('(min-width: 640px)').matches) setPanelOpen(true)
    try {
      if (localStorage.getItem('mapexp_edit_lock') === '1') setEditLock(true)
    } catch { /* 무시 */ }
  }, [])

  const toggleEditLock = () => {
    setEditLock((v) => {
      try {
        localStorage.setItem('mapexp_edit_lock', v ? '0' : '1')
      } catch { /* 무시 */ }
      return !v
    })
  }

  // 국가 전환 시 오버레이/뷰 상태 초기화
  useEffect(() => {
    setMapLevel('prefecture')
    setViewPrefectureId(null)
    setOverlayGeoData(null)
  }, [country])

  // 광역 GeoJSON 로드 (도도부현/시도) - geo.ts 공용 로더 (ID 주입 + 캐싱)
  useEffect(() => {
    const loadGeoData = async () => {
      setIsLoading(true)
      try {
        if (!(baseGeoData as FeatureCollection | null) || baseCountry !== country) {
          const fc = await loadPrefectures(country)
          if (fc) {
            setBaseGeoData(fc)
            setBaseCountry(country)
            setBoundary(fc)
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
  }, [country, baseGeoData, retryKey])

  // 기초 지역 오버레이: 토글이 켜지면 줌과 무관하게 전국 시정촌/시군구를 통째로 렌더.
  // react-leaflet GeoJSON은 data 변경을 반영하지 않으므로 버전을 올려 key로 리마운트한다.
  const [overlayV, setOverlayV] = useState(0)
  useEffect(() => {
    // 국가 전환/토글 시 이전 데이터를 먼저 비워 스테일 렌더 방지
    setOverlayGeoData(null)
    if (!showMuniLayer) return
    let cancelled = false
    ;(async () => {
      try {
        if (country === 'japan') await loadJpMuniNames() // 툴팁/라벨 표시명 사전
        const fc = await loadMunicipalities(country)
        if (cancelled || !fc) return

        // 캐시된 원본을 변형하지 않도록 새 feature로 복사하며 ID 주입
        const features: Feature[] = []
        fc.features.forEach((f) => {
          const props = f.properties as Record<string, string | null> | null
          let muniName: string | null
          let parentId: string | null | undefined
          if (country === 'japan') {
            muniName = municipalityName(props)
            parentId = props?.N03_001 ? REGION_ID_MAP['japan'][props.N03_001] : null
          } else {
            muniName = props?.name ?? null
            parentId = props?.code ? KOREA_ID_BY_PROV_CODE[props.code.slice(0, 2)] : null
          }
          if (!muniName || !parentId) return
          const genId = `${parentId}_${muniName}`
          features.push({ ...f, properties: { ...(f.properties as object), id: genId, name: muniName, name_ko: muniName } })
        })
        setOverlayGeoData({ type: 'FeatureCollection', features } as FeatureCollection)
        setOverlayV((v) => v + 1)
      } catch (error) {
        console.error('Error loading municipality data:', error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [country, showMuniLayer])

  // 라벨 구성: 기초 표시 + 줌인 상태면 중앙 광역의 시정촌 라벨, 아니면 광역 라벨
  useEffect(() => {
    if (showMuniLayer && mapLevel === 'municipality' && viewPrefectureId && overlayGeoData) {
      const labels: RegionLabel[] = []
      ;(overlayGeoData as FeatureCollection).features.forEach((feat) => {
        const props = feat.properties as Record<string, string | null>
        const genId = props?.id as string | null
        if (!genId || !genId.startsWith(`${viewPrefectureId}_`)) return
        const muniName = props.name as string
        let position: [number, number]
        if (LABEL_OVERRIDES[genId]) position = LABEL_OVERRIDES[genId]
        else {
          const centroid = geoCentroid(feat)
          position = [centroid[1], centroid[0]]
        }
        labels.push({
          id: genId,
          name: muniName,
          nameEn: muniDisplayName(country, props, muniName, 'en'),
          nameKo: muniDisplayName(country, props, muniName, 'ko'),
          nameJa: muniDisplayName(country, props, muniName, 'ja'),
          position,
        })
      })
      setRegionLabels(labels)
    } else if (baseGeoData && baseCountry === country && (baseGeoData as FeatureCollection).type === 'FeatureCollection') {
      const labels: RegionLabel[] = []
      const collectPrefLabels = (fc: FeatureCollection) => {
        fc.features.forEach((feat) => {
          const props = feat.properties as Record<string, string | null>
          if (!props?.id) return
          const id = props.id
          let position: [number, number]
          if (LABEL_OVERRIDES[id]) position = LABEL_OVERRIDES[id]
          else {
            const centroid = geoCentroid(feat)
            position = [centroid[1], centroid[0]]
          }
          const meta = getRegionMetadata(id)
          if (meta?.hidden) return
          labels.push({
            id,
            name: props.name as string,
            nameKo: meta?.name,
            nameEn: meta?.nameEn,
            nameJa: meta ? regionDisplayName(meta, 'ja') : undefined,
            position,
          })
        })
      }
      collectPrefLabels(baseGeoData as FeatureCollection)
      // 양국 동시 표시 중엔 반대 국가 라벨도 함께 (없으면 한쪽만 이름이 뜬다)
      if (showBoth && secondaryGeoData) collectPrefLabels(secondaryGeoData)
      setRegionLabels(labels)
    }
  }, [showMuniLayer, mapLevel, viewPrefectureId, overlayGeoData, baseGeoData, baseCountry, country, showBoth, secondaryGeoData])

  // 양국 동시 표시: 반대 국가 광역 데이터 로드 (geo.ts 공용 로더 - ID 주입·캐싱)
  // 국가 전환 시 스테일 데이터가 새 key로 박제되지 않도록 즉시 비운다
  useEffect(() => {
    setSecondaryGeoData(null)
    if (!showBoth) return
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

  // 지금 보고 있는 지도 중심의 광역 - 세부 지도 진입 시 이 광역으로 바로 열리게
  const prefAtMapCenter = (): string | undefined => {
    const m = leafletMapRef.current
    const fc = baseGeoData as FeatureCollection | null
    if (!m || !fc?.features) return undefined
    const c = m.getCenter()
    const found = fc.features.find(
      (f) => (f.properties as Record<string, unknown> | null)?.id && featureContainsPoint(f as Feature, c.lng, c.lat),
    )
    const foundId = found?.properties?.id as string | undefined
    if (foundId && !isHiddenRegion(foundId)) return foundId
    // 중심이 바다 위면 가장 가까운 광역으로 (히든 제외)
    let minDist = Infinity
    let closest: string | undefined
    fc.features.forEach((f) => {
      const id = (f.properties as Record<string, unknown> | null)?.id as string | undefined
      if (!id || isHiddenRegion(id)) return
      const cent = geoCentroid(f as Feature)
      const d = Math.hypot(cent[0] - c.lng, cent[1] - c.lat)
      if (d < minDist) {
        minDist = d
        closest = id
      }
    })
    return closest
  }

  // 겹쳐보기(비교) 모드: 뷰어 중 내 백업 기록과 상대 기록의 방문 여부를 대비
  const COMPARE_COLORS = { mine: '#be3a2b', theirs: '#4a86c8', both: '#8e5bb8' } as const
  const myBackupLevels = useMemo(() => {
    if (!isViewer || !compareMine) return null
    const m = new Map<string, number>()
    getViewerBackupRegions()?.forEach((r) => {
      if (!r.regionId.includes('_')) m.set(r.regionId, r.gyeonghyeonchi ?? r.level ?? 0)
    })
    return m
  }, [isViewer, compareMine])

  const getCompareStyle = (feature?: Feature): PathOptions => {
    if (!feature?.properties?.id) return { fillOpacity: 0, opacity: 0 }
    const regionId = feature.properties.id as string
    const theirs = (useMapExpStore.getState().getRegionById(regionId)?.gyeonghyeonchi ?? 0) > 0
    const mine = (myBackupLevels?.get(regionId) ?? 0) > 0
    if (!theirs && !mine) {
      return { fillColor: '#f5f3ec', fillOpacity: showTiles ? 0.55 : 1.0, color: '#999', weight: 0.5, dashArray: '3' }
    }
    const color = theirs && mine ? COMPARE_COLORS.both : theirs ? COMPARE_COLORS.theirs : COMPARE_COLORS.mine
    return { fillColor: color, fillOpacity: 0.65, color, weight: 1.5 }
  }

  // 지역 스타일
  // 주의: interactive:false를 반환하는 분기를 두면 안 된다.
  // 레이어 생성 시점의 스테일 스타일로 만들어진 path는 setStyle로
  // 인터랙티브를 복원할 수 없어 영구 클릭 불능이 된다.
  // (활성 현은 어차피 data 필터에서 제외되므로 숨김 분기 자체가 불필요)
  const getRegionStyle = (feature?: Feature): PathOptions => {
    if (isViewer && compareMine && myBackupLevels) return getCompareStyle(feature)
    if (!feature?.properties?.id) return { fillOpacity: 0, opacity: 0 }

    const regionId = feature.properties.id as string
    const regionExp = getRegionById(regionId)
    const gyeonghyeonchi = regionExp?.gyeonghyeonchi ?? (regionExp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
    const isResided = gyeonghyeonchi === GyeongHyeonChi.RESIDED

    if (gyeonghyeonchi === GyeongHyeonChi.UNVISITED) {
        // 미획득 히든 지역(GPS로 아직 안 찍음)은 화면에 표시하지 않는다.
        // 찍고 나면(레벨>0) 아래 색칠 분기로 떨어져 그때부터 지도에 나타난다.
        if (isHiddenRegion(regionId)) return { fillOpacity: 0, opacity: 0 }
        // 타일 표시 중에도 종이톤 반투명을 덮어 도로·지명을 가라앉힌다.
        // (완전 투명이면 미답 지역의 타일 디테일이 방문 지역의 플랫 색보다 시끄러워
        //  시각적 주인공이 반전됨)
        return {
            fillColor: '#f5f3ec',
            fillOpacity: showTiles ? 0.55 : 1.0,
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
        <div style="font-size: 11px; margin-top: 2px; opacity: 0.7;">
          ${tNow(`level.hint.${lvl}` as I18nKey)}
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
    // 히든 지역은 지도 클릭으로 찍을 수 없다 — GPS로 현지에 갔을 때만 획득. 획득 후에도 클릭 변경 불가.
    if (isHiddenRegion(regionId)) return
    if (e.originalEvent.shiftKey) {
      onRegionClick(regionId)
      return
    }

    // 기초 지역 표시 중에는 광역 탭도 수정 금지 (구경만) - 안내 1회
    if (readOnlyRef.current) {
      showMuniHintOnce()
      return
    }

    // 편집 잠금 중: 실수 탭 방지 (상세 보기는 우클릭/길게 누르기로 여전히 가능)
    if (editLockRef.current) {
      toast(tNow('map.lockedToast'), { id: 'edit-lock-hint' })
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
    // 도장을 찍은 김에 그 지역의 세부 도장으로 이어지는 버튼을 토스트에 함께
    // (미답으로 되돌린 탭이나 세부 지역이 없는 히든 지역은 제외)
    const canGoDeeper = nextVal > GyeongHyeonChi.UNVISITED && !!onOpenMuniManager && !isHiddenRegion(regionId)
    showLevelUndoToast(
      regionId,
      prefDisplayName(regionId, regionName),
      currentVal,
      nextVal,
      canGoDeeper ? { onMuni: () => onOpenMuniManager!(regionId) } : undefined,
    )
  }

  const onEachFeature = (feature: Feature, layer: Layer) => {
    if (!feature.properties?.id) return

    const regionId = feature.properties.id as string
    const regionName = (feature.properties.name_ko || feature.properties.name) as string

    // 툴팁은 호버 가능한 기기(데스크톱)에서만 - 터치에서는 탭한 지역 위에 떠서
    // 지도를 가리고, 등급 피드백은 하단 실행취소 토스트가 이미 담당한다
    const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
    if (canHover) {
      // 열릴 때마다 지도 언어 설정으로 광역 지명 해석 (시정촌과 언어 통일)
      layer.bindTooltip(() => buildTooltip(regionId, prefDisplayName(regionId, regionName)), {
        permanent: false,
        direction: 'top',
        className: 'region-tooltip',
      })
    }

    layer.on({
      click: (e: LeafletMouseEvent) => cycleLevelOnClick(e, regionId, baseStyleRef, feature),
      // 우클릭/롱프레스(터치) = 상세 모달 (Shift+클릭의 터치 대체 수단)
      contextmenu: (e: LeafletMouseEvent) => {
        e.originalEvent.preventDefault()
        onRegionClick(regionId)
      },
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
    readOnlyRef.current = showMuniLayer
    editLockRef.current = editLock
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
        preferCanvas={true} /* 전국 시정촌(1,897 폴리곤) 렌더 성능 */
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
        
        {/* Base Layer (Prefectures) - 기초 표시 중에는 전국이 시정촌으로 보이므로 광역 색칠은 숨긴다.
            주의: 국가 전환 직후 baseGeoData는 아직 이전 국가 데이터 → 일치할 때만 렌더
            (react-leaflet GeoJSON은 data 변경을 반영하지 않으므로 스테일 데이터가 박제됨) */}
        {!showMuniLayer && baseCountry === country && (
          <GeoJSON
            ref={baseLayerRef}
            key={`base-${baseCountry}`}
            data={baseGeoData as FeatureCollection}
            // 생성 시에는 현재 렌더의 신선한 클로저를 사용 (ref는 이 시점에 아직 이전 렌더 값)
            style={getRegionStyle}
            onEachFeature={onEachFeature}
          />
        )}

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

        {/* Overlay Layer (Municipalities) - 전국 기초 지역, 읽기 전용 표시 */}
        {showMuniLayer && overlayGeoData && (
             <GeoJSON
                ref={overlayLayerRef}
                key={`overlay-${country}-${overlayV}`}
                data={overlayGeoData}
                style={getMunicipalityStyle}
                onEachFeature={onEachMunicipalityFeature}
             />
        )}

        {/* 기초 표시 중 광역 경계선 (비인터랙티브 - 맥락용, 시정촌 툴팁을 방해하지 않음) */}
        {showMuniLayer && baseGeoData && baseCountry === country && (
             <GeoJSON
                key={`prefline-${baseCountry}`}
                data={baseGeoData as FeatureCollection}
                style={{ fill: false, color: 'rgba(38, 35, 28, 0.45)', weight: 1.2, interactive: false }}
             />
        )}

        {/* 양국 뷰 맞춤 */}
        <MapRefCapture mapRef={leafletMapRef} />
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

      {/* 국가 전환 - 지도 우상단(1시 방향): 헤더 밀도를 낮추고, 지도 대상과 붙어 있어 인지가 쉽다 */}
      <div className="absolute top-3 right-3 z-[1000] inline-flex rounded-full border border-line bg-card p-0.5 shadow-[0_2px_8px_rgba(38,35,28,0.14)]">
        {(
          [
            ['japan', 'JP'],
            ['korea', 'KR'],
          ] as const
        ).map(([c, label]) => (
          <button
            key={c}
            onClick={() => setCountry(c)}
            className={`px-3 py-1 rounded-full text-[12px] font-bold tracking-wide transition-colors ${
              country === c ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
            }`}
            aria-label={t(c === 'japan' ? 'common.japan' : 'common.korea')}
            title={t(c === 'japan' ? 'common.japan' : 'common.korea')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GPS 컨트롤 (내 위치, 트랙 기록, 현재 지역 배너) + 시정촌 도장 버튼
          세부 지도는 지금 보고 있는 화면 중심의 광역으로 바로 열린다 */}
      <GpsControls
        onRegionClick={onRegionClick}
        onOpenMuniManager={onOpenMuniManager ? () => onOpenMuniManager(prefAtMapCenter()) : undefined}
      />

      {/* 공유 지도 열람 중에는 범례를 상시 노출 - 처음 보는 사람이 색의 의미를 바로 알 수 있게
          (뷰어 배너가 레이아웃을 아래로 밀어 bottom-20은 하단 탭에 가려짐 → 여유 있게 bottom-32)
          비교 모드에서는 나만/상대만/둘 다 3색으로 교체 */}
      {isViewer && (
        <div className="absolute bottom-32 lg:bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2.5 bg-card border border-line rounded-full shadow-[0_2px_10px_rgba(38,35,28,0.12)] px-3.5 py-1.5 max-w-[calc(100%-24px)] overflow-x-auto">
          {compareMine
            ? (
              [
                ['mine', 'compare.mine'],
                ['theirs', 'compare.theirs'],
                ['both', 'compare.both'],
              ] as Array<[keyof typeof COMPARE_COLORS, I18nKey]>
            ).map(([key, labelKey]) => (
              <span key={key} className="flex items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-[2px] border border-black/10" style={{ backgroundColor: COMPARE_COLORS[key] }} />
                <span className="text-[10px] font-medium text-ink whitespace-nowrap">{t(labelKey)}</span>
              </span>
            ))
            : ([5, 4, 3, 2, 1] as ExperienceGrade[]).map((lvl) => (
              <span key={lvl} className="flex items-center gap-1 shrink-0">
                <span className="w-2.5 h-2.5 rounded-[2px] border border-black/10" style={{ backgroundColor: EXP_COLORS[lvl] }} />
                <span className="text-[10px] font-medium text-ink whitespace-nowrap">{t(`level.${lvl}` as I18nKey)}</span>
              </span>
            ))}
        </div>
      )}

      {/* 패널 토글 버튼 (모바일·데스크톱 공통 - 지도를 넓게 보고 싶을 때 접기) */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className={`absolute bottom-20 sm:bottom-4 right-4 z-[1001] w-11 h-11 rounded-full border flex items-center justify-center transition-all active:scale-90 shadow-[0_2px_8px_rgba(38,35,28,0.14)] ${
          panelOpen ? 'bg-ink border-ink text-paper' : 'bg-card border-line text-muted hover:text-ink'
        }`}
        aria-label={t('map.settingsAria')}
      >
        <Icon name={panelOpen ? 'x' : 'layers'} size={18} />
      </button>

      {/* Controls */}
      <div className={`${panelOpen ? 'block' : 'hidden'} absolute bottom-[8.5rem] sm:bottom-16 right-4 bg-card border border-line rounded-[10px] shadow-[0_2px_10px_rgba(38,35,28,0.12)] p-3 text-xs z-[1000] w-[172px] max-h-[55%] overflow-y-auto`}>
        <div className="flex flex-col gap-1.5 mb-3">
            {/* 세부 지역 도장 진입 - 이 앱의 핵심 기능이라 지도에서 바로 갈 수 있어야 한다 */}
            {onOpenMuniManager && (
              <button
                onClick={() => {
                  setPanelOpen(false)
                  onOpenMuniManager(prefAtMapCenter())
                }}
                className="w-full py-2 px-2.5 rounded-md bg-seal text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-seal-hover active:scale-[0.99] transition-all"
              >
                <Icon name="building" size={14} />
                {t('page.manageMunisLong', { term: muniTerm(country, uiLang) })}
              </button>
            )}

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
                  // 지명 언어 순환: 자동 → 한국어 → 日本語 → English
                  const order: Array<'auto' | Lang> = ['auto', 'ko', 'ja', 'en']
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

            {/* 편집 잠금 - 이동/구경 중 실수 탭 방지 */}
            <button
              onClick={toggleEditLock}
              className={`w-full py-1.5 px-2.5 rounded-md border font-medium flex items-center justify-between transition-colors ${
                editLock ? 'bg-seal text-white border-seal' : 'border-line text-ink hover:bg-paper'
              }`}
            >
               <span className={editLock ? 'text-white/80' : 'text-muted'}>{t('map.editLock')}</span>
               <span className="font-semibold">{editLock ? t('map.on') : t('map.off')}</span>
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
            <div key={lvl} className="flex items-center gap-2" title={t(`level.hint.${lvl}` as I18nKey)}>
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
