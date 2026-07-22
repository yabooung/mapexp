'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, GeoJSON, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { geoCentroid } from 'd3-geo'
import type { Feature, FeatureCollection } from 'geojson'
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import { KOREA_PROV_CODE_BY_ID } from '@/constants/regions'
import { loadMunicipalities, municipalityName, PREF_KANJI_BY_ID, type Country } from '@/lib/geo'
import { loadJpMuniNames, muniDisplayName } from '@/lib/muniNames'
import { mapLangNow, useMapLang, useLang, useT, levelLabel, I18nKey, type Lang } from '@/lib/i18n'
import Icon from '@/components/common/Icon'

const TILES_KEY = 'mapexp_minimap_tiles' // 배경 지도 토글 기억 (모달을 다시 열어도 유지)
const LABELS_KEY = 'mapexp_minimap_labels' // 지명 라벨 표시 토글 기억

interface Props {
  country: Country
  prefectureId: string
  /** 현 위치 도장 등으로 특정 세부 지역에 초점 - 지도가 그 지역으로 줌 이동 */
  focusMuniId?: string | null
}

/**
 * 선택 광역의 기초 지역을 화면에 맞춘다.
 * 도쿄(이즈·오가사와라 제도)·가고시마·나가사키·인천처럼 멀리 떨어진 섬이 있는
 * 광역은 전체 bounds로 맞추면 본토가 점처럼 작아지므로, 중앙값에서 크게 벗어난
 * 이상치(먼 섬) 폴리곤을 제외하고 본체 위주로 맞춘다.
 */
const FitToData = ({ data, focusMuniId }: { data: FeatureCollection | null; focusMuniId?: string | null }) => {
  const map = useMap()
  useEffect(() => {
    if (!data || data.features.length === 0) return
    // 모달과 동시에 마운트되면 컨테이너가 아직 레이아웃 전이라
    // fitBounds가 엉뚱하게 계산됨 → 한 템포 뒤로 미뤄 크기 확정 후 맞춘다
    const timer = setTimeout(() => {
    try {
      map.invalidateSize()

      // 초점 지역이 지정되면(현 위치 도장) 그 세부 지역 주변으로 줌
      if (focusMuniId) {
        let fb: L.LatLngBounds | null = null
        data.features.forEach((f) => {
          if ((f.properties as Record<string, unknown> | null)?.id !== focusMuniId) return
          try {
            const b = L.geoJSON(f).getBounds()
            fb = fb ? fb.extend(b) : b
          } catch { /* 지오메트리 오류 무시 */ }
        })
        if (fb) {
          map.fitBounds((fb as L.LatLngBounds).pad(2), { padding: [10, 10], maxZoom: 12 })
          return
        }
      }

      const entries = data.features
        .map((f) => {
          try {
            const b = L.geoJSON(f).getBounds()
            return { bounds: b, center: b.getCenter() }
          } catch {
            return null
          }
        })
        .filter((e): e is { bounds: L.LatLngBounds; center: L.LatLng } => !!e)
      if (entries.length === 0) return

      const median = (arr: number[]) => {
        const s = [...arr].sort((a, b) => a - b)
        return s[Math.floor(s.length / 2)]
      }
      const medLat = median(entries.map((e) => e.center.lat))
      const medLng = median(entries.map((e) => e.center.lng))
      const dists = entries.map((e) => Math.hypot(e.center.lat - medLat, e.center.lng - medLng))
      // 중앙값 기반 이상치 컷: 먼 섬(이즈·오가사와라, 백령도 등)만 밖으로 밀려난다
      const cut = Math.max(0.35, median(dists) * 2.5)

      // 본체 폴리곤들의 실제 bounds 합집합 - 반경 정사각형보다 타이트하게 맞는다
      let fit: L.LatLngBounds | null = null
      entries.forEach((e, i) => {
        if (dists[i] > cut) return
        fit = fit ? fit.extend(e.bounds) : L.latLngBounds(e.bounds.getSouthWest(), e.bounds.getNorthEast())
      })
      if (fit) map.fitBounds((fit as L.LatLngBounds).pad(0.05), { padding: [10, 10] })
    } catch {
      /* 지오메트리 오류 무시 */
    }
    }, 120)
    return () => clearTimeout(timer)
  }, [data, focusMuniId, map])
  return null
}

/**
 * 시정촌/시군구 관리 모달의 '지도' 뷰
 * - 선택된 광역의 기초 지역만 렌더 (MunicipalityManagerModal과 동일한 ID 규약)
 * - 지역 클릭 = 레벨 순환(0→5→0), 목록 뷰와 완전히 동일한 스토어를 조작
 */
interface MiniLabel {
  id: string
  name: string
  props: Record<string, unknown>
  position: [number, number]
}

export default function MunicipalityMiniMap({ country, prefectureId, focusMuniId }: Props) {
  // selector 없이 구독 → 레벨 변경 시 리렌더되어 아래 재스타일 effect가 돈다
  useMapExpStore()
  const { getRegionById, addRegion, updateRegion } = useMapExpStore.getState()
  const settings = useMapExpStore((s) => s.settings)
  const updateSettings = useMapExpStore((s) => s.updateSettings)
  const mapLang = useMapLang()
  const lang = useLang()
  const t = useT()
  const [geo, setGeo] = useState<FeatureCollection | null>(null)
  // react-leaflet GeoJSON은 data prop 변경을 반영하지 않음 → 버전으로 key를 바꿔 리마운트
  const [geoV, setGeoV] = useState(0)
  const [showTiles, setShowTiles] = useState(() => {
    try {
      return localStorage.getItem(TILES_KEY) !== '0'
    } catch {
      return true
    }
  })
  const toggleTiles = () => {
    setShowTiles((v) => {
      try {
        localStorage.setItem(TILES_KEY, v ? '0' : '1')
      } catch { /* 무시 */ }
      return !v
    })
  }
  const [showLabels, setShowLabels] = useState(() => {
    try {
      return localStorage.getItem(LABELS_KEY) !== '0'
    } catch {
      return true
    }
  })
  const toggleLabels = () => {
    setShowLabels((v) => {
      try {
        localStorage.setItem(LABELS_KEY, v ? '0' : '1')
      } catch { /* 무시 */ }
      return !v
    })
  }
  // 지명 라벨 언어 순환: 자동 → 한국어 → 日本語 → English (지도 패널 설정과 동일한 소스)
  const cycleMapLang = () => {
    const order: Array<'auto' | Lang> = ['auto', 'ko', 'ja', 'en']
    const cur = settings.mapLanguage ?? 'auto'
    updateSettings({ mapLanguage: order[(order.indexOf(cur) + 1) % order.length] })
  }
  const mapLangLabel =
    (settings.mapLanguage ?? 'auto') === 'auto'
      ? t('map.langAuto')
      : settings.mapLanguage === 'ko'
        ? '한국어'
        : settings.mapLanguage === 'en'
          ? 'English'
          : '日本語'
  const [labels, setLabels] = useState<MiniLabel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const layerRef = useRef<L.GeoJSON | null>(null)
  const styleRef = useRef<(f?: Feature) => PathOptions>(() => ({}))

  // 선택 광역의 기초 지역 추출 (모달 목록과 동일한 필터/ID)
  // 주의: 이전 지도를 지우지 않고 새 데이터로 교체한다 (광역 넘길 때 빈 화면 깜빡임 방지)
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.all([
      loadMunicipalities(country),
      country === 'japan' ? loadJpMuniNames() : Promise.resolve(null), // 툴팁 표시명 사전
    ]).then(([fc]) => {
      if (cancelled) return
      if (!fc) {
        setIsLoading(false)
        return
      }
      const features: Feature[] = []
      // 라벨은 id당 1개 - 가장 큰 폴리곤(본체) 위에만 (섬 분리 폴리곤 중복 방지)
      const labelCandidates = new Map<string, { feat: Feature; size: number; name: string }>()
      fc.features.forEach((f) => {
        const props = f.properties as Record<string, string | null> | null
        let name: string | null = null
        if (country === 'japan') {
          if (props?.N03_001 !== PREF_KANJI_BY_ID[prefectureId]) return
          name = municipalityName(props)
        } else {
          const provCode = KOREA_PROV_CODE_BY_ID[prefectureId]
          if (!provCode || !props?.code?.startsWith(provCode)) return
          name = props?.name ?? null
        }
        if (!name) return
        const id = `${prefectureId}_${name}`
        // 섬 등 분리 폴리곤은 같은 id로 그대로 둔다(렌더는 각각, 색은 동일)
        const feat: Feature = { ...f, properties: { ...(f.properties as object), id, name } }
        features.push(feat)

        // 대략적 크기: bounding box 면적
        try {
          const b = L.geoJSON(feat).getBounds()
          const size = Math.abs(b.getEast() - b.getWest()) * Math.abs(b.getNorth() - b.getSouth())
          const cur = labelCandidates.get(id)
          if (!cur || size > cur.size) labelCandidates.set(id, { feat, size, name })
        } catch { /* 지오메트리 오류 무시 */ }
      })

      const newLabels: MiniLabel[] = []
      labelCandidates.forEach(({ feat, name }, id) => {
        const c = geoCentroid(feat)
        if (Number.isFinite(c[0]) && Number.isFinite(c[1])) {
          newLabels.push({ id, name, props: feat.properties as Record<string, unknown>, position: [c[1], c[0]] })
        }
      })

      setGeo({ type: 'FeatureCollection', features })
      setGeoV((v) => v + 1)
      setLabels(newLabels)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [country, prefectureId])

  const styleFor = (feature?: Feature): PathOptions => {
    const id = feature?.properties?.id as string | undefined
    if (!id) return { fillOpacity: 0, opacity: 0 }
    const exp = getRegionById(id)
    const level = exp?.gyeonghyeonchi ?? (exp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
    if (level === GyeongHyeonChi.UNVISITED) {
      // 배경 끔이면 흰 종이처럼 채워 깔끔한 経県値 지도 느낌으로
      return { fillColor: '#ffffff', fillOpacity: showTiles ? 0.2 : 1, color: '#8a8a8a', weight: 0.8, dashArray: '2' }
    }
    const isResided = level === GyeongHyeonChi.RESIDED
    return {
      fillColor: EXP_COLORS[level],
      fillOpacity: 0.72,
      color: EXP_COLORS[level],
      weight: isResided ? 2.5 : 1.4,
    }
  }

  // 레벨 변경 시(스토어→리렌더) 레이어 재스타일 (레이어 재마운트 없이)
  useEffect(() => {
    styleRef.current = styleFor
    layerRef.current?.setStyle((f) => styleRef.current(f as Feature))
  })

  const cycle = (id: string) => {
    const exp = useMapExpStore.getState().getRegionById(id)
    const cur = exp?.gyeonghyeonchi ?? (exp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
    const next = (cur >= GyeongHyeonChi.RESIDED ? GyeongHyeonChi.UNVISITED : cur + 1) as ExperienceGrade
    if (exp) updateRegion(id, { gyeonghyeonchi: next })
    else addRegion({ regionId: id, gyeonghyeonchi: next, updatedAt: new Date().toISOString() })
  }

  const onEach = (feature: Feature, layer: Layer) => {
    const id = feature.properties?.id as string | undefined
    const name = feature.properties?.name as string | undefined
    if (!id) return
    if (name)
      layer.bindTooltip(
        () => muniDisplayName(country, feature.properties, name, mapLangNow()),
        { direction: 'top', className: 'region-tooltip', sticky: true },
      )
    layer.on({
      click: (e: LeafletMouseEvent) => {
        e.originalEvent.preventDefault()
        cycle(id)
        ;(e.target as L.Path).setStyle(styleRef.current(feature))
      },
      mouseover: (e: LeafletMouseEvent) => {
        const target = e.target as L.Path
        target.setStyle({ weight: 2.4, color: '#333' })
        target.bringToFront()
      },
      mouseout: (e: LeafletMouseEvent) => {
        ;(e.target as L.Path).setStyle(styleRef.current(feature))
      },
    })
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-line relative bg-[#dfe6ec]">
      {isLoading && (
        <div className="absolute inset-0 z-[10] flex items-center justify-center bg-paper/60">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-seal" />
        </div>
      )}
      <MapContainer
        center={[36.5, 137.5]}
        zoom={8}
        style={{ width: '100%', height: '100%', backgroundColor: '#dfe6ec' }}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        attributionControl={false}
      >
        {/* 실제 지도 배경 - 윤곽선만으로는 어디였는지 떠올리기 어렵다 (역·도로·지형이 기억의 단서) */}
        {showTiles && (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        )}
        {geo && geo.features.length > 0 && (
          <GeoJSON
            ref={layerRef}
            key={`${country}-${geoV}`}
            data={geo}
            style={styleFor}
            onEachFeature={onEach}
          />
        )}
        {/* 시정촌 이름 라벨 (id당 1개, 본체 폴리곤 중심) - 라벨 끄기로 숨김 */}
        {showLabels && labels.map((l) => (
          <Marker
            key={l.id}
            position={l.position}
            interactive={false}
            icon={L.divIcon({
              className: 'muni-mini-label',
              html: `<div style="transform: translate(-50%, -50%); white-space: nowrap; text-align: center;">${muniDisplayName(country, l.props, l.name, mapLang)}</div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
          />
        ))}
        <FitToData data={geo} focusMuniId={focusMuniId} />
      </MapContainer>

      {/* 지도 컨트롤 스택 (우상단): 배경 지도 · 지명 라벨 · 라벨 언어 */}
      <div className="absolute top-2 right-2 z-[1000] flex flex-col items-end gap-1.5">
        {/* 배경 지도 켬/끔 - 기억 단서(도로·역)가 필요할 때와 깔끔한 색 지도가 필요할 때 */}
        <button
          onClick={toggleTiles}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold shadow-[0_2px_8px_rgba(38,35,28,0.12)] transition-colors ${
            showTiles ? 'bg-ink text-paper border-ink' : 'bg-card text-muted border-line hover:text-ink'
          }`}
        >
          <Icon name="layers" size={12} />
          {t('map.baseTiles')} {showTiles ? t('map.on') : t('map.off')}
        </button>

        {/* 지명 라벨 켬/끔 */}
        <button
          onClick={toggleLabels}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold shadow-[0_2px_8px_rgba(38,35,28,0.12)] transition-colors ${
            showLabels ? 'bg-ink text-paper border-ink' : 'bg-card text-muted border-line hover:text-ink'
          }`}
        >
          <Icon name="pin" size={12} />
          {t('map.labels')} {showLabels ? t('map.on') : t('map.off')}
        </button>

        {/* 라벨 언어 순환 (라벨 켜져 있을 때만 의미) */}
        {showLabels && (
          <button
            onClick={cycleMapLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border bg-card text-muted border-line hover:text-ink text-[11px] font-semibold shadow-[0_2px_8px_rgba(38,35,28,0.12)] transition-colors"
          >
            <Icon name="globe" size={12} />
            {mapLangLabel}
          </button>
        )}
      </div>

      {/* 등급 색 범례 - 지도에서 색이 무슨 뜻인지 바로 알 수 있게 (호버 시 한 줄 설명) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2.5 bg-card/95 border border-line rounded-full shadow-[0_2px_8px_rgba(38,35,28,0.12)] px-3 py-1.5 max-w-[calc(100%-16px)] overflow-x-auto">
        {([5, 4, 3, 2, 1, 0] as ExperienceGrade[]).map((lvl) => (
          <span key={lvl} className="flex items-center gap-1 shrink-0" title={t(`level.hint.${lvl}` as I18nKey)}>
            <span
              className="w-2.5 h-2.5 rounded-[2px] border border-black/10"
              style={{ backgroundColor: EXP_COLORS[lvl] }}
            />
            <span className="text-[10px] font-medium text-ink whitespace-nowrap">{levelLabel(lvl, lang)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
