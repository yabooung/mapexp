'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Feature, FeatureCollection } from 'geojson'
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import { KOREA_PROV_CODE_BY_ID } from '@/constants/regions'
import { loadMunicipalities, municipalityName, PREF_KANJI_BY_ID, type Country } from '@/lib/geo'
import { loadJpMuniNames, muniDisplayName } from '@/lib/muniNames'
import type { Lang } from '@/lib/i18n'

interface Props {
  country: Country
  prefectureId: string
}

/**
 * 선택 광역의 기초 지역을 화면에 맞춘다.
 * 도쿄(이즈·오가사와라 제도)·가고시마·나가사키·인천처럼 멀리 떨어진 섬이 있는
 * 광역은 전체 bounds로 맞추면 본토가 점처럼 작아지므로, 중앙값에서 크게 벗어난
 * 이상치(먼 섬) 폴리곤을 제외하고 본체 위주로 맞춘다.
 */
const FitToData = ({ data }: { data: FeatureCollection | null }) => {
  const map = useMap()
  useEffect(() => {
    if (!data || data.features.length === 0) return
    try {
      // 모달 안에서 마운트되므로 컨테이너 크기를 한 번 재계산 후 맞춘다
      map.invalidateSize()

      const centers = data.features
        .map((f) => {
          try {
            return L.geoJSON(f).getBounds().getCenter()
          } catch {
            return null
          }
        })
        .filter((c): c is L.LatLng => !!c)
      if (centers.length === 0) return

      const median = (arr: number[]) => {
        const s = [...arr].sort((a, b) => a - b)
        return s[Math.floor(s.length / 2)]
      }
      const medLat = median(centers.map((c) => c.lat))
      const medLng = median(centers.map((c) => c.lng))
      const dists = centers.map((c) => Math.hypot(c.lat - medLat, c.lng - medLng)).sort((a, b) => a - b)
      // 85% 지점까지의 확산 반경 (섬 이상치는 그 바깥으로 밀려남)
      const r = Math.max(0.03, dists[Math.floor(dists.length * 0.85)] ?? 0.03)

      const bounds = L.latLngBounds([medLat - r, medLng - r], [medLat + r, medLng + r]).pad(0.15)
      map.fitBounds(bounds, { padding: [10, 10] })
    } catch {
      /* 지오메트리 오류 무시 */
    }
  }, [data, map])
  return null
}

/**
 * 시정촌/시군구 관리 모달의 '지도' 뷰
 * - 선택된 광역의 기초 지역만 렌더 (MunicipalityManagerModal과 동일한 ID 규약)
 * - 지역 클릭 = 레벨 순환(0→5→0), 목록 뷰와 완전히 동일한 스토어를 조작
 */
export default function MunicipalityMiniMap({ country, prefectureId }: Props) {
  // selector 없이 구독 → 레벨 변경 시 리렌더되어 아래 재스타일 effect가 돈다
  useMapExpStore()
  const { getRegionById, addRegion, updateRegion } = useMapExpStore.getState()
  const [geo, setGeo] = useState<FeatureCollection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const layerRef = useRef<L.GeoJSON | null>(null)
  const styleRef = useRef<(f?: Feature) => PathOptions>(() => ({}))

  // 선택 광역의 기초 지역 추출 (모달 목록과 동일한 필터/ID)
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setGeo(null)
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
        features.push({ ...f, properties: { ...(f.properties as object), id, name } })
      })
      setGeo({ type: 'FeatureCollection', features })
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
      return { fillColor: '#ffffff', fillOpacity: 0.2, color: '#8a8a8a', weight: 0.8, dashArray: '2' }
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
        () => {
          const lang = (useMapExpStore.getState().settings.language ?? 'ko') as Lang
          return muniDisplayName(country, feature.properties, name, lang)
        },
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
        {geo && geo.features.length > 0 && (
          <GeoJSON
            ref={layerRef}
            key={`${country}-${prefectureId}`}
            data={geo}
            style={styleFor}
            onEachFeature={onEach}
          />
        )}
        <FitToData data={geo} />
      </MapContainer>
    </div>
  )
}
