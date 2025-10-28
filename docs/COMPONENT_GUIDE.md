# 컴포넌트 구현 가이드

> React 컴포넌트 개발 실전 가이드

## 목차

1. [상태 관리 (Zustand)](#상태-관리-zustand)
2. [타입 정의](#타입-정의)
3. [지도 컴포넌트](#지도-컴포넌트)
4. [지역 선택 UI](#지역-선택-ui)
5. [통계 패널](#통계-패널)
6. [공유 기능](#공유-기능)
7. [LocalStorage 통합](#localstorage-통합)

---

## 상태 관리 (Zustand)

### 1. 스토어 구조

```typescript
// src/store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface RegionExp {
  id: string;
  regionId: string;
  regionName: string;
  countryCode: string;
  level: 0 | 1 | 2 | 3 | 4;
  visitedAt?: string;
  lastVisitedAt?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

interface MapExpStore {
  // State
  regions: RegionExp[];
  selectedRegion: string | null;
  selectedCountry: 'JP' | 'KR';

  // Actions
  addRegion: (region: Omit<RegionExp, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRegion: (id: string, updates: Partial<RegionExp>) => void;
  deleteRegion: (id: string) => void;
  selectRegion: (regionId: string | null) => void;
  setCountry: (country: 'JP' | 'KR') => void;

  // Computed
  getRegionById: (regionId: string) => RegionExp | undefined;
  getTotalExp: () => number;
  getVisitedCount: () => number;
  getCompletionRate: () => number;
}

export const useMapExpStore = create<MapExpStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        regions: [],
        selectedRegion: null,
        selectedCountry: 'JP',

        // Actions
        addRegion: (region) =>
          set((state) => ({
            regions: [
              ...state.regions,
              {
                ...region,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          })),

        updateRegion: (id, updates) =>
          set((state) => ({
            regions: state.regions.map((r) =>
              r.id === id
                ? { ...r, ...updates, updatedAt: new Date().toISOString() }
                : r
            ),
          })),

        deleteRegion: (id) =>
          set((state) => ({
            regions: state.regions.filter((r) => r.id !== id),
          })),

        selectRegion: (regionId) =>
          set({ selectedRegion: regionId }),

        setCountry: (country) =>
          set({ selectedCountry: country }),

        // Computed
        getRegionById: (regionId) =>
          get().regions.find((r) => r.regionId === regionId),

        getTotalExp: () =>
          get().regions.reduce((sum, r) => sum + r.level, 0),

        getVisitedCount: () =>
          get().regions.filter((r) => r.level > 0).length,

        getCompletionRate: () => {
          const state = get();
          const totalRegions = state.selectedCountry === 'JP' ? 47 : 17;
          return (state.getVisitedCount() / totalRegions) * 100;
        },
      }),
      {
        name: 'mapexp-storage',
        version: 1,
      }
    )
  )
);
```

### 2. 셀렉터 (성능 최적화)

```typescript
// src/store/selectors.ts
import { useMapExpStore } from './index';
import { useMemo } from 'react';

// 특정 국가의 지역만 가져오기
export const useRegionsByCountry = (countryCode: string) => {
  return useMapExpStore((state) =>
    state.regions.filter((r) => r.countryCode === countryCode)
  );
};

// 레벨별 지역 분포
export const useLevelDistribution = () => {
  const regions = useMapExpStore((state) => state.regions);

  return useMemo(() => {
    const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    regions.forEach((r) => {
      distribution[r.level]++;
    });
    return distribution;
  }, [regions]);
};

// 통계
export const useStats = () => {
  return useMapExpStore((state) => ({
    totalExp: state.getTotalExp(),
    visitedCount: state.getVisitedCount(),
    completionRate: state.getCompletionRate(),
  }));
};
```

---

## 타입 정의

```typescript
// src/types/region.ts

export enum ExpLevel {
  UNVISITED = 0,
  PASSED = 1,
  STOPPED = 2,
  VISITED = 3,
  RESIDED = 4,
}

export const EXP_LEVEL_LABELS = {
  [ExpLevel.UNVISITED]: '미방문',
  [ExpLevel.PASSED]: '지나감',
  [ExpLevel.STOPPED]: '들름',
  [ExpLevel.VISITED]: '방문',
  [ExpLevel.RESIDED]: '거주/장기체류',
} as const;

export interface RegionExp {
  id: string;
  regionId: string;
  regionName: string;
  regionNameLocal: string;
  countryCode: string;
  level: ExpLevel;
  visitedAt?: string;
  lastVisitedAt?: string;
  memo?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RegionMetadata {
  id: string;
  countryCode: string;
  name: string;
  nameEn: string;
  nameKo: string;
  nameJa?: string;
  category: string;
}
```

---

## 지도 컴포넌트

### 1. 기본 Leaflet 지도

```typescript
// src/components/map/Map.tsx
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapExpStore } from '@/store';
import { COLOR_SCHEME } from '@/constants/colors';

interface MapProps {
  country: 'JP' | 'KR';
  onRegionClick?: (regionId: string) => void;
}

export function Map({ country, onRegionClick }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const regions = useMapExpStore((state) => state.regions);

  useEffect(() => {
    // 지도 초기화
    if (!mapRef.current) {
      mapRef.current = L.map('map', {
        center: country === 'JP' ? [36.5, 138] : [36.5, 127.5],
        zoom: country === 'JP' ? 5 : 7,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);
    }

    // GeoJSON 로드 및 렌더링
    loadAndRenderGeoJSON();

    return () => {
      if (layerRef.current) {
        layerRef.current.remove();
      }
    };
  }, [country]);

  // 지역 데이터가 변경되면 색상 업데이트
  useEffect(() => {
    updateRegionColors();
  }, [regions]);

  const loadAndRenderGeoJSON = async () => {
    try {
      const response = await fetch(`/geojson/${country.toLowerCase()}.geojson`);
      const geojson = await response.json();

      if (layerRef.current) {
        layerRef.current.remove();
      }

      layerRef.current = L.geoJSON(geojson, {
        style: getRegionStyle,
        onEachFeature: (feature, layer) => {
          const regionId = feature.properties.id;

          // 호버 효과
          layer.on('mouseover', () => {
            layer.setStyle({
              weight: 2,
              color: COLOR_SCHEME.hover,
            });
          });

          layer.on('mouseout', () => {
            layer.setStyle(getRegionStyle(feature));
          });

          // 클릭 이벤트
          layer.on('click', () => {
            onRegionClick?.(regionId);
          });

          // 툴팁
          const regionExp = regions.find((r) => r.regionId === regionId);
          const tooltipContent = regionExp
            ? `${feature.properties.name} (Lv.${regionExp.level})`
            : feature.properties.name;

          layer.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
          });
        },
      }).addTo(mapRef.current!);
    } catch (error) {
      console.error('Failed to load GeoJSON:', error);
    }
  };

  const getRegionStyle = (feature: any): L.PathOptions => {
    const regionId = feature.properties.id;
    const regionExp = regions.find((r) => r.regionId === regionId);
    const level = regionExp?.level ?? 0;

    return {
      fillColor: COLOR_SCHEME[level],
      fillOpacity: 0.7,
      color: '#333',
      weight: 1,
    };
  };

  const updateRegionColors = () => {
    if (layerRef.current) {
      layerRef.current.eachLayer((layer) => {
        const feature = (layer as any).feature;
        if (feature) {
          (layer as L.Path).setStyle(getRegionStyle(feature));
        }
      });
    }
  };

  return (
    <div id="map" className="w-full h-full rounded-lg shadow-lg" />
  );
}
```

### 2. 색상 상수

```typescript
// src/constants/colors.ts

export const COLOR_SCHEME = {
  0: '#E5E5E5',  // 미방문
  1: '#FEF3C7',  // 지나감
  2: '#FCD34D',  // 들름
  3: '#F59E0B',  // 방문
  4: '#DC2626',  // 거주
  hover: '#3B82F6',
  selected: '#8B5CF6',
} as const;

export const COLOR_LABELS = {
  0: '미방문',
  1: '지나감',
  2: '들름',
  3: '방문',
  4: '거주/장기체류',
} as const;
```

---

## 지역 선택 UI

### 1. 지역 선택 모달

```typescript
// src/components/region/RegionModal.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMapExpStore } from '@/store';
import { ExpLevel, EXP_LEVEL_LABELS } from '@/types/region';

const regionFormSchema = z.object({
  level: z.nativeEnum(ExpLevel),
  visitedAt: z.string().optional(),
  memo: z.string().max(500).optional(),
});

type RegionFormData = z.infer<typeof regionFormSchema>;

interface RegionModalProps {
  regionId: string;
  regionName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RegionModal({
  regionId,
  regionName,
  isOpen,
  onClose,
}: RegionModalProps) {
  const { getRegionById, addRegion, updateRegion } = useMapExpStore();
  const existingRegion = getRegionById(regionId);

  const { register, handleSubmit, formState: { errors } } = useForm<RegionFormData>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: {
      level: existingRegion?.level ?? ExpLevel.UNVISITED,
      visitedAt: existingRegion?.visitedAt ?? '',
      memo: existingRegion?.memo ?? '',
    },
  });

  const onSubmit = (data: RegionFormData) => {
    if (existingRegion) {
      updateRegion(existingRegion.id, data);
    } else {
      addRegion({
        regionId,
        regionName,
        regionNameLocal: regionName,
        countryCode: regionId.split('-')[0],
        ...data,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{regionName}</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* 경치 레벨 선택 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              경치 레벨
            </label>
            <div className="space-y-2">
              {Object.entries(EXP_LEVEL_LABELS).map(([level, label]) => (
                <label key={level} className="flex items-center">
                  <input
                    type="radio"
                    value={level}
                    {...register('level', { valueAsNumber: true })}
                    className="mr-2"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 방문일 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              방문일 (선택사항)
            </label>
            <input
              type="date"
              {...register('visitedAt')}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* 메모 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              메모 (최대 500자)
            </label>
            <textarea
              {...register('memo')}
              rows={4}
              className="w-full border rounded px-3 py-2"
              placeholder="이 지역에 대한 메모를 남겨보세요..."
            />
            {errors.memo && (
              <p className="text-red-500 text-sm mt-1">
                {errors.memo.message}
              </p>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              취소
            </button>
            <button type="submit" className="btn-primary">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 2. 지역 리스트

```typescript
// src/components/region/RegionList.tsx
import { useMemo, useState } from 'react';
import { useMapExpStore } from '@/store';
import { JAPAN_METADATA } from '@mapexp/geojson';

export function RegionList() {
  const [searchQuery, setSearchQuery] = useState('');
  const regions = useMapExpStore((state) => state.regions);
  const selectedCountry = useMapExpStore((state) => state.selectedCountry);

  const filteredRegions = useMemo(() => {
    const metadata = selectedCountry === 'JP' ? JAPAN_METADATA : KOREA_METADATA;

    return Object.values(metadata)
      .filter((region) =>
        region.nameKo.includes(searchQuery) ||
        region.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((region) => ({
        ...region,
        exp: regions.find((r) => r.regionId === region.id),
      }));
  }, [searchQuery, regions, selectedCountry]);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* 검색 */}
      <input
        type="text"
        placeholder="지역 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
      />

      {/* 리스트 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredRegions.map((region) => (
          <div
            key={region.id}
            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <div>
              <p className="font-medium">{region.nameKo}</p>
              <p className="text-sm text-gray-500">{region.nameEn}</p>
            </div>
            <div className="flex items-center gap-2">
              {region.exp ? (
                <span className="text-yellow-500">
                  {'★'.repeat(region.exp.level)}
                </span>
              ) : (
                <span className="text-gray-300">☆</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 통계 패널

```typescript
// src/components/stats/StatsPanel.tsx
import { useStats, useLevelDistribution } from '@/store/selectors';
import { COLOR_SCHEME, COLOR_LABELS } from '@/constants/colors';

export function StatsPanel() {
  const stats = useStats();
  const levelDistribution = useLevelDistribution();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">통계</h2>

      {/* 주요 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="총 경치"
          value={stats.totalExp}
        />
        <StatCard
          label="방문 지역"
          value={`${stats.visitedCount}/47`}
        />
        <StatCard
          label="달성률"
          value={`${stats.completionRate.toFixed(1)}%`}
        />
      </div>

      {/* 레벨별 분포 */}
      <div className="space-y-2">
        <h3 className="font-medium mb-2">레벨별 분포</h3>
        {Object.entries(levelDistribution).map(([level, count]) => (
          <div key={level} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: COLOR_SCHEME[Number(level) as keyof typeof COLOR_SCHEME] }}
            />
            <span className="text-sm flex-1">
              {COLOR_LABELS[Number(level) as keyof typeof COLOR_LABELS]}
            </span>
            <span className="font-medium">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
```

---

## 공유 기능

### 1. 공유 유틸리티

```typescript
// src/lib/share.ts
import LZString from 'lz-string';
import { RegionExp } from '@/types/region';

interface ShareData {
  v: string;  // version
  r: Array<[string, number]>;  // [regionId, level]
  c: string;  // countryCode
}

export function generateShareUrl(
  regions: RegionExp[],
  country: string
): string {
  const shareData: ShareData = {
    v: '1',
    r: regions.map((r) => [r.regionId, r.level]),
    c: country,
  };

  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(shareData)
  );

  return `${window.location.origin}?share=${compressed}`;
}

export function parseShareUrl(url: string): ShareData | null {
  try {
    const params = new URLSearchParams(new URL(url).search);
    const shareParam = params.get('share');

    if (!shareParam) return null;

    const decompressed = LZString.decompressFromEncodedURIComponent(shareParam);
    if (!decompressed) return null;

    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Failed to parse share URL:', error);
    return null;
  }
}
```

### 2. 공유 모달

```typescript
// src/components/share/ShareModal.tsx
import { useState } from 'react';
import { useMapExpStore } from '@/store';
import { generateShareUrl } from '@/lib/share';
import toast from 'react-hot-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const regions = useMapExpStore((state) => state.regions);
  const country = useMapExpStore((state) => state.selectedCountry);

  const handleGenerateUrl = () => {
    const url = generateShareUrl(regions, country);
    setShareUrl(url);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('링크가 복사되었습니다!');
    } catch (error) {
      toast.error('복사에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">공유하기</h2>

        <button
          onClick={handleGenerateUrl}
          className="btn-primary w-full mb-4"
        >
          공유 링크 생성
        </button>

        {shareUrl && (
          <div className="mb-4">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <button
              onClick={handleCopyUrl}
              className="btn-secondary w-full mt-2"
            >
              링크 복사
            </button>
          </div>
        )}

        <button onClick={onClose} className="btn-secondary w-full">
          닫기
        </button>
      </div>
    </div>
  );
}
```

---

## LocalStorage 통합

Zustand의 `persist` 미들웨어가 자동으로 처리하지만, 수동 제어가 필요한 경우:

```typescript
// src/lib/storage.ts
import { MapExpData } from '@/types';

const STORAGE_KEY = 'mapexp_data_v1';

export function saveToLocalStorage(data: MapExpData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function loadFromLocalStorage(): MapExpData | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

export function exportData(): void {
  const data = loadFromLocalStorage();
  if (!data) return;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mapexp_backup_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file: File): Promise<MapExpData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}
```

---

## 다음 단계

컴포넌트 구현이 완료되면:

1. [배포 가이드](./DEPLOYMENT_GUIDE.md)를 참고하여 프로덕션 배포
2. 테스트 작성 및 실행
3. 성능 최적화

---

**작성일**: 2025-10-28
**참고**: 코드는 예시이며, 프로젝트에 맞게 수정하세요.
