# 지도 통합 가이드 (Leaflet + GeoJSON)

현재 카드 리스트 기반에서 인터랙티브 지도 기반으로 전환하는 완전한 가이드입니다.

---

## 📋 목차
1. [개요](#개요)
2. [필요한 GeoJSON 데이터](#필요한-geojson-데이터)
3. [컴포넌트 구조 변경](#컴포넌트-구조-변경)
4. [단계별 구현](#단계별-구현)
5. [UI/UX 개선사항](#uiux-개선사항)
6. [성능 최적화](#성능-최적화)

---

## 개요

### 현재 상태
- ✅ RegionList: 카드 그리드로 지역 표시
- ✅ RegionCard: 클릭하여 모달 오픈
- ✅ RegionModal: 레벨 선택 및 저장

### 목표 상태
- 🎯 MapComponent: Leaflet 지도로 지역 표시
- 🎯 지역 폴리곤 클릭 → 모달 오픈
- 🎯 레벨별 색상으로 지도 채색
- 🎯 호버 시 지역명 + 레벨 표시

### 장점
- 시각적으로 훨씬 직관적
- 지리적 위치 파악 용이
- 게임 같은 재미 요소 증가
- 전체 진행도 한눈에 파악

---

## 필요한 GeoJSON 데이터

### 1. 데이터 소스

#### 일본 (47개 도도부현)
- **추천 소스**: [geoshape-jp](https://github.com/dataofjapan/land)
- **형식**: GeoJSON (TopoJSON 변환 가능)
- **좌표계**: WGS84 (EPSG:4326)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "tokyo",
        "name": "東京都",
        "nameKo": "도쿄",
        "nameEn": "Tokyo"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      }
    }
  ]
}
```

#### 한국 (17개 시도)
- **추천 소스**: [국토교통부 공간정보 오픈플랫폼](https://www.vworld.kr/)
- **대안**: [OpenStreetMap](https://www.openstreetmap.org/)
- **형식**: GeoJSON
- **좌표계**: WGS84 (EPSG:4326)

### 2. GeoJSON 파일 배치

```
public/
└── geojson/
    ├── japan.geojson        # 일본 47개 도도부현
    └── korea.geojson        # 한국 17개 시도
```

### 3. 데이터 최적화

GeoJSON 파일은 상세도에 따라 매우 커질 수 있으므로 최적화가 필요합니다.

```bash
# mapshaper로 단순화 (npm install -g mapshaper)
mapshaper japan.geojson -simplify 5% -o japan-simplified.geojson

# 또는 TopoJSON으로 변환 (더 작은 용량)
npm install -g topojson
geo2topo regions=japan.geojson > japan.topojson
```

**권장 파일 크기**: 각 500KB 이하

---

## 컴포넌트 구조 변경

### 현재 구조
```
app/page.tsx
├── CountrySelector
├── StatsPanel
└── RegionList
    └── RegionCard (클릭)
        └── RegionModal
```

### 새로운 구조
```
app/page.tsx
├── CountrySelector
├── StatsPanel (사이드바로 이동)
└── MapComponent ⭐ (메인 영역)
    ├── Leaflet Map
    ├── GeoJSON Layer
    └── RegionModal (폴리곤 클릭 시)
```

### 레이아웃 변경

**데스크톱 (≥1024px)**
```
┌────────────────────────────────────┐
│ Header (국가 선택)                  │
├─────────┬──────────────────────────┤
│ Stats   │                          │
│ Panel   │    Leaflet Map           │
│ (사이드) │    (지도 영역)            │
│         │                          │
└─────────┴──────────────────────────┘
```

**모바일 (<1024px)**
```
┌────────────────┐
│ Header         │
├────────────────┤
│ [통계 토글]     │
├────────────────┤
│                │
│  Leaflet Map   │
│                │
└────────────────┘
```

---

## 단계별 구현

### Step 1: GeoJSON 데이터 준비

#### 1-1. 데이터 다운로드 및 배치
```bash
# public/geojson/ 폴더에 배치
public/geojson/japan.geojson
public/geojson/korea.geojson
```

#### 1-2. 데이터 검증
각 feature의 properties에 다음 필드가 있어야 합니다:
- `id`: 지역 ID (src/data/regions.ts의 id와 일치)
- `name`: 지역명 (현지어)
- `nameKo`: 한글명
- `nameEn`: 영문명

만약 없다면, 스크립트로 추가해야 합니다.

---

### Step 2: Leaflet 설정

#### 2-1. CSS 추가
`app/globals.css`에 Leaflet CSS 추가:

```css
@import 'leaflet/dist/leaflet.css';

/* Leaflet 커스터마이징 */
.leaflet-container {
  background: #f3f4f6; /* gray-100 */
  font-family: inherit;
}

.leaflet-popup-content-wrapper {
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

#### 2-2. Leaflet 아이콘 수정
`src/lib/leaflet-config.ts` 생성:

```typescript
import L from 'leaflet'

// 기본 마커 아이콘 수정 (필요한 경우)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})
```

---

### Step 3: MapComponent 구현

#### 3-1. 기본 지도 컴포넌트
`src/components/map/MapComponent.tsx` 생성:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { useMapExpStore } from '@/store'
import { EXP_COLORS } from '@/constants'
import { ExpLevel } from '@/types'
import type { FeatureCollection, Feature } from 'geojson'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapComponentProps {
  onRegionClick: (regionId: string) => void
}

export default function MapComponent({ onRegionClick }: MapComponentProps) {
  const { country, regions, getRegionById } = useMapExpStore()
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null)

  // GeoJSON 데이터 로드
  useEffect(() => {
    const loadGeoJson = async () => {
      const fileName = country === 'japan' ? 'japan.geojson' : 'korea.geojson'
      const response = await fetch(`/geojson/${fileName}`)
      const data = await response.json()
      setGeoData(data)
    }

    loadGeoJson()
  }, [country])

  // 지역별 스타일 함수
  const getFeatureStyle = (feature: Feature) => {
    const regionId = feature.properties?.id
    const regionExp = getRegionById(regionId)
    const level = regionExp?.level ?? ExpLevel.UNVISITED
    const color = EXP_COLORS[level]

    return {
      fillColor: color,
      fillOpacity: 0.7,
      color: '#9CA3AF', // gray-400
      weight: 1,
      opacity: 1,
    }
  }

  // 호버 스타일
  const onEachFeature = (feature: Feature, layer: L.Layer) => {
    const regionId = feature.properties?.id
    const regionName = feature.properties?.nameKo || feature.properties?.name

    layer.on({
      mouseover: (e) => {
        const layer = e.target
        layer.setStyle({
          weight: 3,
          color: '#3B82F6', // blue-500
          fillOpacity: 0.9,
        })

        // 툴팁 표시
        const regionExp = getRegionById(regionId)
        const level = regionExp?.level ?? 0
        layer.bindTooltip(`${regionName} (Lv.${level})`, {
          permanent: false,
          sticky: true,
        }).openTooltip()
      },
      mouseout: (e) => {
        const layer = e.target
        layer.setStyle(getFeatureStyle(feature))
        layer.closeTooltip()
      },
      click: () => {
        onRegionClick(regionId)
      },
    })
  }

  // 지도 중심 좌표 및 줌 레벨
  const mapConfig = {
    japan: {
      center: [36.5, 138.0] as [number, number],
      zoom: 5,
    },
    korea: {
      center: [36.0, 127.5] as [number, number],
      zoom: 7,
    },
  }

  const config = mapConfig[country]

  if (!geoData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">지도를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <MapContainer
      center={config.center}
      zoom={config.zoom}
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      {/* 타일 레이어 (배경 지도) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* GeoJSON 레이어 */}
      <GeoJSON
        key={country} // 국가 변경 시 리렌더링
        data={geoData}
        style={getFeatureStyle}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  )
}
```

#### 3-2. 지도 범례 추가
`src/components/map/MapLegend.tsx` 생성:

```typescript
'use client'

import { ExpLevel, EXP_LEVEL_LABELS } from '@/types'
import { EXP_COLORS } from '@/constants'

export default function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">레벨별 색상</h3>
      <div className="space-y-1">
        {Object.values(ExpLevel)
          .filter((v) => typeof v === 'number')
          .map((level) => {
            const lv = level as ExpLevel
            return (
              <div key={lv} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: EXP_COLORS[lv] }}
                />
                <span className="text-xs text-gray-700">
                  Lv.{lv} {EXP_LEVEL_LABELS[lv]}
                  {lv === ExpLevel.MASTER && ' ⭐'}
                </span>
              </div>
            )
          })}
      </div>
    </div>
  )
}
```

---

### Step 4: 페이지 통합

#### 4-1. app/page.tsx 수정

```typescript
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import CountrySelector from '@/components/common/CountrySelector'
import RegionModal from '@/components/region/RegionModal'
import StatsPanel from '@/components/stats/StatsPanel'
import MapLegend from '@/components/map/MapLegend'

// Leaflet은 SSR 비활성화
const MapComponent = dynamic(
  () => import('@/components/map/MapComponent'),
  { ssr: false }
)

export default function Home() {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl h-[calc(100vh-200px)]">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          지역 경험치 맵
        </h1>
        <CountrySelector />
      </div>

      {/* 메인 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
        {/* 통계 패널 */}
        <div className="lg:col-span-1 overflow-y-auto">
          <StatsPanel />
        </div>

        {/* 지도 */}
        <div className="lg:col-span-3 relative rounded-lg overflow-hidden shadow-lg">
          <MapComponent onRegionClick={setSelectedRegionId} />
          <MapLegend />
        </div>
      </div>

      {/* 지역 모달 */}
      {selectedRegionId && (
        <RegionModal
          isOpen={!!selectedRegionId}
          onClose={() => setSelectedRegionId(null)}
          regionId={selectedRegionId}
        />
      )}
    </div>
  )
}
```

---

### Step 5: 반응형 처리

#### 5-1. 모바일 최적화

모바일에서는 지도가 전체 화면을 차지하고, 통계는 하단 시트로 표시:

```typescript
// 모바일 감지
const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 1024)
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
  return () => window.removeEventListener('resize', checkMobile)
}, [])
```

#### 5-2. 터치 제스처
- **탭**: 지역 선택
- **핀치 줌**: 확대/축소
- **드래그**: 지도 이동

---

## UI/UX 개선사항

### 1. 애니메이션 효과

#### 레벨 변경 시 부드러운 색상 전환
```typescript
const getFeatureStyle = (feature: Feature) => {
  // ...
  return {
    // ...
    className: 'region-polygon', // CSS transition 적용
  }
}
```

```css
/* globals.css */
.region-polygon {
  transition: fill 0.3s ease, fill-opacity 0.3s ease;
}
```

#### 국가 전환 시 페이드 인/아웃
```typescript
<div className="animate-fade-in">
  <MapComponent ... />
</div>
```

### 2. 인터랙션 개선

#### 지역 하이라이트
- 호버 시: 테두리 강조 + 툴팁
- 클릭 시: 짧은 펄스 애니메이션

#### 검색 기능 추가
```typescript
// 지역 검색 바 추가
<input
  type="text"
  placeholder="지역 검색..."
  onChange={(e) => searchAndHighlight(e.target.value)}
/>
```

검색된 지역으로 자동 줌:
```typescript
const searchAndHighlight = (query: string) => {
  const feature = findFeature(query)
  if (feature) {
    map.fitBounds(feature.getBounds())
    // 하이라이트 효과
  }
}
```

### 3. 추가 UI 요소

#### 미니맵 (선택사항)
```typescript
import { MiniMap } from 'react-leaflet-minimap'

<MiniMap position="bottomright" />
```

#### 줌 컨트롤 스타일링
```css
.leaflet-control-zoom {
  border: none !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
}
```

#### 풀스크린 버튼
```typescript
import { FullscreenControl } from 'react-leaflet-fullscreen'

<FullscreenControl position="topright" />
```

---

## 성능 최적화

### 1. GeoJSON 최적화

#### 단순화 (Simplification)
```bash
# 복잡한 폴리곤 단순화 (5% 허용 오차)
mapshaper input.geojson -simplify 5% -o output.geojson
```

#### TopoJSON 사용
TopoJSON은 GeoJSON보다 40-80% 작습니다:
```bash
geo2topo regions=input.geojson > output.topojson
```

```typescript
// TopoJSON 사용 시
import * as topojson from 'topojson-client'

const topoData = await fetch('/geojson/japan.topojson').then(r => r.json())
const geoData = topojson.feature(topoData, topoData.objects.regions)
```

### 2. 레이어 캐싱

```typescript
const [geoLayer, setGeoLayer] = useState<L.GeoJSON | null>(null)

useEffect(() => {
  if (geoData && !geoLayer) {
    const layer = L.geoJSON(geoData, {
      style: getFeatureStyle,
      onEachFeature,
    })
    setGeoLayer(layer)
  }
}, [geoData])
```

### 3. 메모이제이션

```typescript
import { useMemo } from 'react'

const memoizedStyle = useMemo(() =>
  features.map(f => getFeatureStyle(f)),
  [regions, country]
)
```

### 4. 지연 로딩

```typescript
// 초기 로드 시 간단한 지도만 표시
const [detailLevel, setDetailLevel] = useState<'low' | 'high'>('low')

// 줌 레벨에 따라 상세도 조정
map.on('zoomend', () => {
  if (map.getZoom() > 8) {
    setDetailLevel('high')
  }
})
```

---

## 테스트 체크리스트

### 기능 테스트
- [ ] GeoJSON 로드 성공
- [ ] 지역 클릭 시 모달 오픈
- [ ] 레벨 변경 시 색상 업데이트
- [ ] 국가 전환 시 지도 교체
- [ ] 호버 시 툴팁 표시
- [ ] 줌/드래그 정상 작동

### 성능 테스트
- [ ] 초기 로드 시간 < 2초
- [ ] GeoJSON 파일 크기 < 500KB
- [ ] 지역 클릭 반응 속도 < 100ms
- [ ] 메모리 사용량 정상

### 반응형 테스트
- [ ] 데스크톱 (1920x1080)
- [ ] 태블릿 (768x1024)
- [ ] 모바일 (375x667)
- [ ] 가로/세로 모드 전환

### 브라우저 테스트
- [ ] Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Edge

---

## 문제 해결 (Troubleshooting)

### 1. Leaflet CSS가 로드되지 않음
```typescript
// next.config.ts에 추가
webpack: (config) => {
  config.externals = [...config.externals, { canvas: 'canvas' }]
  return config
}
```

### 2. SSR 에러
```typescript
// dynamic import with ssr: false
const MapComponent = dynamic(
  () => import('@/components/map/MapComponent'),
  { ssr: false, loading: () => <p>지도 로딩 중...</p> }
)
```

### 3. GeoJSON ID 불일치
```typescript
// 매핑 테이블 생성
const ID_MAP: Record<string, string> = {
  'JP-13': 'tokyo',
  'KR-11': 'seoul',
  // ...
}
```

### 4. 지도 렌더링 안됨
```typescript
// MapContainer에 key 추가
<MapContainer key={country} ... >
```

### 5. 타일 로드 실패
```typescript
// 대체 타일 서버 사용
url="https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png"
```

---

## 다음 단계

### Phase 2-1: 기본 지도 (1주)
- [ ] GeoJSON 데이터 수집 및 최적화
- [ ] MapComponent 기본 구현
- [ ] 레벨별 색상 적용

### Phase 2-2: 인터랙션 (1주)
- [ ] 클릭 이벤트 처리
- [ ] 호버 효과 및 툴팁
- [ ] 지도 범례 추가

### Phase 2-3: 반응형 및 최적화 (1주)
- [ ] 모바일 레이아웃
- [ ] 성능 최적화
- [ ] 크로스 브라우저 테스트

---

## 참고 자료

### 공식 문서
- [Leaflet 공식 문서](https://leafletjs.com/reference.html)
- [react-leaflet 공식 문서](https://react-leaflet.js.org/)
- [GeoJSON 명세](https://geojson.org/)

### 데이터 소스
- [Natural Earth Data](https://www.naturalearthdata.com/) - 무료 지리 데이터
- [OpenStreetMap](https://www.openstreetmap.org/) - 오픈소스 지도
- [geojson.io](https://geojson.io/) - GeoJSON 편집 도구

### 유용한 라이브러리
- `mapshaper` - GeoJSON 단순화
- `topojson` - GeoJSON 압축
- `turf.js` - 지리 데이터 연산
- `react-leaflet-fullscreen` - 풀스크린 기능

---

**작성일**: 2025-10-31
**버전**: 1.0
**작성자**: Claude Code

이 가이드를 따라 구현하면 카드 리스트 → 인터랙티브 지도로 성공적으로 전환할 수 있습니다! 🗺️✨
