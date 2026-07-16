import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GyeongHyeonChi, MapExpData, RegionExp, UserSettings, ExperienceGrade, Visit } from "@/types";
import { STORAGE_KEYS, DEFAULT_SETTINGS, DATA_VERSION } from "@/constants";
import { TOTAL_REGIONS, isRegionOfCountry, isHiddenRegion, LEGACY_REGION_ID_MAP } from "@/constants/regions";

/**
 * 저장 데이터 마이그레이션
 * - level → gyeonghyeonchi 필드 이관
 * - 행정구역 개편 반영: 폐지 지역 ID를 승계 지역으로 이관 후 중복 병합
 *   (광주/전남 → 전남광주통합특별시, 경북 군위군 → 대구 군위군)
 */
function migrateRegions(regions: RegionExp[]): RegionExp[] {
  const renamed = regions.map((r) => {
    const region = { ...r };
    if (region.gyeonghyeonchi === undefined && region.level !== undefined) {
      region.gyeonghyeonchi = region.level as ExperienceGrade;
    }

    // ID 이관: 정확 일치 우선, 아니면 부모 접두사 교체 (예: gwangju_동구 → jeonnamgwangju_동구)
    if (LEGACY_REGION_ID_MAP[region.regionId]) {
      region.regionId = LEGACY_REGION_ID_MAP[region.regionId];
    } else if (region.regionId.includes("_")) {
      const [parent, ...rest] = region.regionId.split("_");
      if (LEGACY_REGION_ID_MAP[parent]) {
        region.regionId = `${LEGACY_REGION_ID_MAP[parent]}_${rest.join("_")}`;
      }
    }
    return region;
  });

  // 이관 후 같은 ID로 합쳐진 기록 병합 (최고 레벨 + 방문 기록 합집합)
  const merged = new Map<string, RegionExp>();
  for (const region of renamed) {
    const existing = merged.get(region.regionId);
    if (!existing) {
      merged.set(region.regionId, region);
      continue;
    }
    const levelA = existing.gyeonghyeonchi ?? (existing.level as ExperienceGrade) ?? 0;
    const levelB = region.gyeonghyeonchi ?? (region.level as ExperienceGrade) ?? 0;
    const visitIds = new Set((existing.visits ?? []).map((v) => v.id));
    const visits = [
      ...(existing.visits ?? []),
      ...(region.visits ?? []).filter((v) => !visitIds.has(v.id)),
    ].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const stats = computeVisitStats(visits);
    merged.set(region.regionId, {
      ...existing,
      ...region,
      gyeonghyeonchi: Math.max(levelA, levelB) as ExperienceGrade,
      visits,
      visitCount: stats.visitCount,
      totalNights: stats.totalNights,
      memo: existing.memo && region.memo ? `${existing.memo}\n${region.memo}` : existing.memo || region.memo,
      updatedAt: existing.updatedAt > region.updatedAt ? existing.updatedAt : region.updatedAt,
    });
  }
  return [...merged.values()];
}

/**
 * GPS 인증 방문 기록 불변성 보장 병합
 * - 기존 GPS 기록은 원본 그대로 유지 (수정/삭제된 사본은 무시)
 * - 새로 들어온 데이터가 GPS 출처를 사칭하면 제거 (위조 방지)
 */
function mergeVisitsPreservingGps(original: Visit[] | undefined, incoming: Visit[] | undefined): Visit[] {
  const originalGps = (original ?? []).filter((v) => v.source === "gps");
  const originalGpsIds = new Set(originalGps.map((v) => v.id));
  // 수동 기록만 수용, 기존 GPS 기록의 변조된 사본은 배제
  const manualIncoming = (incoming ?? []).filter((v) => v.source !== "gps" && !originalGpsIds.has(v.id));
  return [...originalGps, ...manualIncoming].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
  );
}

/** visits 배열에서 방문 횟수/숙박일 재계산 */
function computeVisitStats(visits: Visit[]): { visitCount: number; totalNights: number } {
  const totalNights = visits.reduce((sum, visit) => {
    const start = new Date(visit.startDate);
    const end = new Date(visit.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return sum + Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, 0);
  return { visitCount: visits.length, totalNights };
}

/**
 * 맵 경험치 스토어 인터페이스
 */
interface MapExpStore {
  // 상태
  country: "japan" | "korea";
  regions: RegionExp[];
  selectedRegionId: string | null;
  settings: UserSettings;

  /** 공유 지도 열람 모드 (내 데이터는 백업 후 안전하게 보관) */
  isViewer: boolean;

  // 뷰어 액션
  enterViewerMode: (data: MapExpData) => void;
  exitViewerMode: () => void;
  adoptSharedMap: () => void;
  initViewerFromStorage: () => void;

  // 기본 액션
  setCountry: (country: "japan" | "korea") => void;
  addRegion: (region: RegionExp) => void;
  updateRegion: (regionId: string, updates: Partial<RegionExp>) => void;
  /** GPS 인증 기록: 레벨 상향 + 불변 방문 기록 추가 (하루 1건) */
  addGpsRecord: (regionId: string, minLevel: ExperienceGrade) => void;
  deleteRegion: (regionId: string) => void;
  selectRegion: (regionId: string | null) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;

  // 유틸리티 액션
  clearAllRegions: () => void;
  importData: (data: MapExpData) => void;
  exportData: () => MapExpData;

  // Computed getters
  getRegionById: (regionId: string) => RegionExp | undefined;
  getTotalGyeonghyeonchi: () => number; // Renamed from getTotalExp
  getSystemLevel: () => number; // New System Level
  getVisitedCount: () => number;
  getCompletionRate: () => number;
  getGyeonghyeonchiCounts: () => Record<ExperienceGrade, number>; // Renamed
}

/**
 * 초기 상태
 */
const initialState = {
  country: "japan" as const,
  regions: [] as RegionExp[],
  selectedRegionId: null,
  settings: DEFAULT_SETTINGS,
  isViewer: false,
};

/** 뷰어 모드 진입 시 내 데이터 백업 키 */
const VIEWER_BACKUP_KEY = "mapexp_viewer_backup";

/** 외부에서 온 공유 데이터 정제 (레벨 범위/타입 검증, GPS 인증 사칭 제거) */
function sanitizeSharedRegions(regions: unknown): RegionExp[] {
  if (!Array.isArray(regions)) return [];
  return regions
    .filter((r): r is RegionExp => !!r && typeof (r as RegionExp).regionId === "string")
    .map((r) => {
      const raw = Number(r.gyeonghyeonchi ?? r.level ?? 0);
      const level = (Number.isFinite(raw) ? Math.min(5, Math.max(0, Math.round(raw))) : 0) as ExperienceGrade;
      return {
        regionId: r.regionId,
        gyeonghyeonchi: level,
        memo: typeof r.memo === "string" ? r.memo.slice(0, 500) : undefined,
        updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
      };
    });
}

/**
 * 맵 경험치 스토어
 */
export const useMapExpStore = create<MapExpStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── 공유 지도 뷰어 모드 ──────────────────────────────
      // 내 데이터를 localStorage에 백업해두고 공유 데이터를 로드한다.
      // 새로고침해도 백업이 남아 있어 언제든 복원 가능.
      enterViewerMode: (data) => {
        const state = get();
        try {
          // 이미 뷰어 모드면 기존 백업 유지 (공유→공유 이동 시 원본 보존)
          if (!state.isViewer) {
            localStorage.setItem(
              VIEWER_BACKUP_KEY,
              JSON.stringify({ country: state.country, regions: state.regions }),
            );
          }
        } catch {
          return; // 백업 실패 시 내 데이터를 덮어쓰지 않는다
        }
        set({
          country: data.country === "korea" ? "korea" : "japan",
          regions: sanitizeSharedRegions(data.regions),
          selectedRegionId: null,
          isViewer: true,
        });
      },

      exitViewerMode: () => {
        try {
          const raw = localStorage.getItem(VIEWER_BACKUP_KEY);
          const backup = raw ? (JSON.parse(raw) as { country: "japan" | "korea"; regions: RegionExp[] }) : null;
          localStorage.removeItem(VIEWER_BACKUP_KEY);
          set({
            country: backup?.country ?? "japan",
            regions: backup?.regions ?? [],
            selectedRegionId: null,
            isViewer: false,
          });
        } catch {
          set({ isViewer: false });
        }
      },

      adoptSharedMap: () => {
        try {
          localStorage.removeItem(VIEWER_BACKUP_KEY);
        } catch {
          // 무시
        }
        set({ isViewer: false });
      },

      // 새로고침 후에도 뷰어 모드 유지 (백업 존재 = 뷰어 중)
      initViewerFromStorage: () => {
        try {
          if (localStorage.getItem(VIEWER_BACKUP_KEY) && !get().isViewer) {
            set({ isViewer: true });
          }
        } catch {
          // 무시
        }
      },

      // 국가 선택
      setCountry: (country) => {
        set({ country, selectedRegionId: null });
      },

      // 지역 추가
      addRegion: (region) => {
        set((state) => {
          const existingIndex = state.regions.findIndex(
            (r) => r.regionId === region.regionId,
          );
          const existing = existingIndex >= 0 ? state.regions[existingIndex] : undefined;

          // GPS 인증 기록 보호: 기존 GPS 기록은 유지, 외부에서 온 GPS 사칭 기록은 제거
          let visits = region.visits;
          if (visits !== undefined || existing?.visits?.some((v) => v.source === "gps")) {
            visits = mergeVisitsPreservingGps(existing?.visits, visits);
          }

          // 통계 자동 계산
          let visitCount = region.visitCount || 0;
          let totalNights = region.totalNights || 0;
          if (visits) {
            const stats = computeVisitStats(visits);
            visitCount = stats.visitCount;
            totalNights = stats.totalNights;
          }

          const regionWithStats = {
            ...region,
            visits,
            visitCount,
            totalNights,
            updatedAt: new Date().toISOString(),
          }

          // 이미 존재하는 지역이면 업데이트
          if (existingIndex >= 0) {
            const updatedRegions = [...state.regions];
            updatedRegions[existingIndex] = regionWithStats;
            return { regions: updatedRegions };
          }

          // 새 지역 추가
          return {
            regions: [
              ...state.regions,
              regionWithStats,
            ],
          };
        });
        
        // Roll-up Logic for New Region
        const regionId = region.regionId
        if (regionId.includes('_')) {
             const [parentId] = regionId.split('_')
             const currentStore = get()
             const childRegion = currentStore.getRegionById(regionId) // The one we just added
             const parentRegion = currentStore.getRegionById(parentId)
             
             if (childRegion) {
                 const childLevel = childRegion.gyeonghyeonchi ?? childRegion.level ?? 0
                 
                 if (parentRegion) {
                     const parentLevel = parentRegion.gyeonghyeonchi ?? parentRegion.level ?? 0
                     if (childLevel > parentLevel) {
                         get().updateRegion(parentId, { gyeonghyeonchi: childLevel as ExperienceGrade })
                     }
                 } else {
                     // Parent doesn't exist yet, add it if child has level
                     if (childLevel > 0) {
                         get().addRegion({
                             regionId: parentId,
                             gyeonghyeonchi: childLevel as ExperienceGrade,
                             updatedAt: new Date().toISOString()
                         })
                     }
                 }
             }
        }
      },

      // 지역 업데이트
      updateRegion: (regionId, updates) => {
        set((state) => ({
          regions: state.regions.map((region) => {
            if (region.regionId !== regionId) return region

            const updatedRegion = { ...region, ...updates }

            // visits가 변경되었으면 GPS 기록 보호 병합 후 통계 재계산
            if (updates.visits) {
              const merged = mergeVisitsPreservingGps(region.visits, updates.visits)
              const stats = computeVisitStats(merged)
              updatedRegion.visits = merged
              updatedRegion.visitCount = stats.visitCount
              updatedRegion.totalNights = stats.totalNights
            }

            return {
              ...updatedRegion,
              updatedAt: new Date().toISOString(),
            }
          }),
        }));
        
        // Roll-up Logic: If child level > parent level, update parent
        // We do this in a separate set() to ensure state consistency or chain it?
        // Better to check current state after update or compute derived updates.
        // Let's do a second pass if needed.
        if (regionId.includes('_')) {
             const [parentId] = regionId.split('_')
             const currentStore = get()
             const childRegion = currentStore.getRegionById(regionId)
             const parentRegion = currentStore.getRegionById(parentId)
             
             if (childRegion && parentRegion) {
                 const childLevel = childRegion.gyeonghyeonchi ?? childRegion.level ?? 0
                 const parentLevel = parentRegion.gyeonghyeonchi ?? parentRegion.level ?? 0
                 
                 if (childLevel > parentLevel) {
                     // Upgrade Parent!
                     get().updateRegion(parentId, { gyeonghyeonchi: childLevel as ExperienceGrade })
                 }
             } else if (childRegion && !parentRegion) {
                 // Parent doesn't exist in store yet (Unvisited)
                 // We should create it if child is visited
                 const childLevel = childRegion.gyeonghyeonchi ?? childRegion.level ?? 0
                 if (childLevel > 0) {
                     get().addRegion({
                         regionId: parentId,
                         gyeonghyeonchi: childLevel as ExperienceGrade,
                         updatedAt: new Date().toISOString()
                     })
                 }
             }
        }
      },

      // GPS 인증 기록 (불변)
      // - 레벨은 상향만 (이미 더 높으면 유지)
      // - GPS 방문 기록은 지역당 하루 1건, 생성 후 수정/삭제 불가
      // - 시정촌이면 부모 현에도 동일하게 기록
      addGpsRecord: (regionId, minLevel) => {
        const now = new Date()
        const nowIso = now.toISOString()
        const today = nowIso.slice(0, 10)

        set((state) => {
          const existingIndex = state.regions.findIndex((r) => r.regionId === regionId)
          const existing = existingIndex >= 0 ? state.regions[existingIndex] : undefined

          const currentLevel =
            existing?.gyeonghyeonchi ?? (existing?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
          const newLevel = (currentLevel >= minLevel ? currentLevel : minLevel) as ExperienceGrade

          const visits = [...(existing?.visits ?? [])]
          const hasGpsToday = visits.some(
            (v) => v.source === "gps" && v.startDate.slice(0, 10) === today,
          )
          if (!hasGpsToday) {
            visits.push({
              id: `gps-${now.getTime()}-${regionId}`,
              startDate: nowIso,
              endDate: nowIso,
              title: "GPS 인증 기록",
              source: "gps",
            })
            visits.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
          } else if (newLevel === currentLevel) {
            return state // 변경 사항 없음
          }

          const stats = computeVisitStats(visits)
          const updated: RegionExp = {
            ...(existing ?? { regionId }),
            regionId,
            gyeonghyeonchi: newLevel,
            visits,
            visitCount: stats.visitCount,
            totalNights: stats.totalNights,
            updatedAt: nowIso,
          }

          const regions = [...state.regions]
          if (existingIndex >= 0) regions[existingIndex] = updated
          else regions.push(updated)
          return { regions }
        })

        // 시정촌이면 부모 현에도 GPS 인증 기록 (롤업)
        if (regionId.includes("_")) {
          const [parentId] = regionId.split("_")
          get().addGpsRecord(parentId, minLevel)
        }
      },

      // 지역 삭제
      deleteRegion: (regionId) => {
        set((state) => ({
          regions: state.regions.filter(
            (region) => region.regionId !== regionId,
          ),
          selectedRegionId:
            state.selectedRegionId === regionId ? null : state.selectedRegionId,
        }));
      },

      // 지역 선택
      selectRegion: (regionId) => {
        set({ selectedRegionId: regionId });
      },

      // 설정 업데이트
      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      // 모든 지역 삭제
      clearAllRegions: () => {
        set({ regions: [], selectedRegionId: null });
      },

      // 데이터 가져오기
      importData: (data) => {
        set({
          country: data.country,
          regions: data.regions,
          selectedRegionId: null,
        });
      },

      // 데이터 내보내기
      exportData: () => {
        const state = get();
        return {
          version: DATA_VERSION,
          country: state.country,
          regions: state.regions,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },

      // ID로 지역 찾기
      getRegionById: (regionId) => {
        return get().regions.find((region) => region.regionId === regionId);
      },

      // 총 경현치 계산 (현재 국가의 광역 지역만 - 시정촌/시군구는 부모에 롤업되므로 제외)
      getTotalGyeonghyeonchi: () => {
        const state = get();
        return state.regions.reduce((sum, region) => {
          if (region.regionId.includes("_")) return sum;
          if (!isRegionOfCountry(region.regionId, state.country)) return sum;
          const val = region.gyeonghyeonchi ?? region.level ?? 0;
          return sum + val;
        }, 0);
      },

      // 시스템 레벨 계산 (New)
      getSystemLevel: () => {
        const total = get().getTotalGyeonghyeonchi();
        return 1 + Math.floor(total / 10);
      },

      // 방문한 지역 수 (레벨 1 이상, 현재 국가의 광역 지역만)
      getVisitedCount: () => {
        const state = get();
        return state.regions.filter(
          (region) =>
            !region.regionId.includes("_") &&
            isRegionOfCountry(region.regionId, state.country) &&
            !isHiddenRegion(region.regionId) &&
            (region.gyeonghyeonchi ?? region.level ?? 0) > GyeongHyeonChi.UNVISITED,
        ).length;
      },

      // 완성률 계산
      getCompletionRate: () => {
        const state = get();
        const totalRegions = TOTAL_REGIONS[state.country];
        const visitedCount = state.getVisitedCount();

        return totalRegions > 0
          ? Math.round((visitedCount / totalRegions) * 100)
          : 0;
      },

      // 경현치별 카운트
      getGyeonghyeonchiCounts: () => {
        const state = get();
        const totalRegions = TOTAL_REGIONS[state.country];
        const counts: Record<ExperienceGrade, number> = {
          [GyeongHyeonChi.UNVISITED]: totalRegions,
          [GyeongHyeonChi.PASSED]: 0,
          [GyeongHyeonChi.LANDED]: 0,
          [GyeongHyeonChi.VISITED]: 0,
          [GyeongHyeonChi.STAYED]: 0,
          [GyeongHyeonChi.RESIDED]: 0,
        };

        state.regions.forEach((region) => {
          if (region.regionId.includes("_")) return;
          if (!isRegionOfCountry(region.regionId, state.country)) return;
          if (isHiddenRegion(region.regionId)) return;
          const val = (region.gyeonghyeonchi ?? region.level ?? 0) as ExperienceGrade;
          counts[val]++;
          counts[GyeongHyeonChi.UNVISITED]--;
        });

        return counts;
      },
    }),
    {
      name: STORAGE_KEYS.MAP_DATA,
      version: 2,
      partialize: (state) => ({
        country: state.country,
        regions: state.regions,
        settings: state.settings,
      }),
      // 구버전 저장 데이터 마이그레이션 (level 필드, 행정구역 개편)
      migrate: (persisted, _version) => {
        const state = persisted as { regions?: RegionExp[] } | undefined;
        if (state?.regions) {
          state.regions = migrateRegions(state.regions);
        }
        return persisted;
      },
    },
  ),
);
