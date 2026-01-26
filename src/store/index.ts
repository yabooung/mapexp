import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GyeongHyeonChi, MapExpData, RegionExp, UserSettings, ExperienceGrade } from "@/types";
import { STORAGE_KEYS, DEFAULT_SETTINGS, DATA_VERSION } from "@/constants";
import { TOTAL_REGIONS } from "@/constants/regions";

/**
 * 맵 경험치 스토어 인터페이스
 */
interface MapExpStore {
  // 상태
  country: "japan" | "korea";
  regions: RegionExp[];
  selectedRegionId: string | null;
  settings: UserSettings;

  // 기본 액션
  setCountry: (country: "japan" | "korea") => void;
  addRegion: (region: RegionExp) => void;
  updateRegion: (regionId: string, updates: Partial<RegionExp>) => void;
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
};

/**
 * 맵 경험치 스토어
 */
export const useMapExpStore = create<MapExpStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 국가 선택
      setCountry: (country) => {
        set({ country, selectedRegionId: null });
      },

      // 지역 추가
      addRegion: (region) => {
        set((state) => {
          // 통계 자동 계산
          const visitCount = region.visits ? region.visits.length : (region.visitCount || 0)
          let totalNights = region.totalNights || 0
          
          if (region.visits) {
            totalNights = region.visits.reduce((sum, visit) => {
              const start = new Date(visit.startDate)
              const end = new Date(visit.endDate)
              const diffTime = Math.abs(end.getTime() - start.getTime())
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              return sum + diffDays
            }, 0)
          }

          const regionWithStats = {
            ...region,
            visitCount,
            totalNights,
            updatedAt: new Date().toISOString(),
          }

          // 이미 존재하는 지역이면 업데이트
          const existingIndex = state.regions.findIndex(
            (r) => r.regionId === region.regionId,
          );

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
            
            // visits가 변경되었으면 통계 재계산
            if (updates.visits) {
              updatedRegion.visitCount = updates.visits.length
              updatedRegion.totalNights = updates.visits.reduce((sum, visit) => {
                const start = new Date(visit.startDate)
                const end = new Date(visit.endDate)
                const diffTime = Math.abs(end.getTime() - start.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                return sum + diffDays
              }, 0)
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

      // 총 경현치 계산 (구 getTotalExp)
      getTotalGyeonghyeonchi: () => {
        return get().regions.reduce((sum, region) => {
          // region.level is deprecated, use gyeonghyeonchi if available, else level
          const val = region.gyeonghyeonchi ?? region.level ?? 0;
          return sum + val;
        }, 0);
      },

      // 시스템 레벨 계산 (New)
      getSystemLevel: () => {
        const total = get().getTotalGyeonghyeonchi();
        return 1 + Math.floor(total / 10);
      },

      // 방문한 지역 수 (레벨 1 이상)
      getVisitedCount: () => {
        return get().regions.filter(
          (region) => (region.gyeonghyeonchi ?? region.level ?? 0) > GyeongHyeonChi.UNVISITED,
        ).length;
      },

      // 완성률 계산
      getCompletionRate: () => {
        const state = get();
        const totalRegions = TOTAL_REGIONS[state.country];
        const visitedCount = state.regions.filter(
          (region) => (region.gyeonghyeonchi ?? region.level ?? 0) > GyeongHyeonChi.UNVISITED,
        ).length;

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
          const val = (region.gyeonghyeonchi ?? region.level ?? 0) as ExperienceGrade;
          counts[val]++;
          counts[GyeongHyeonChi.UNVISITED]--;
        });

        return counts;
      },
    }),
    {
      name: STORAGE_KEYS.MAP_DATA,
      partialize: (state) => ({
        country: state.country,
        regions: state.regions,
        settings: state.settings,
      }),
      // Migration logic: on rehydrate, if level exists but gyeonghyeonchi doesn't, copy it
      onRehydrateStorage: () => (state) => {
        if (state) {
          let hasChanges = false;
          const migratedRegions = state.regions.map(r => {
             if (r.gyeonghyeonchi === undefined && r.level !== undefined) {
               hasChanges = true;
               return { ...r, gyeonghyeonchi: r.level as ExperienceGrade };
             }
             return r;
          });
          
          if (hasChanges) {
             state.regions = migratedRegions;
             // We can't easily force an update here without a setter, but state mutation works in zustand rehydrate callback often or we'd need a migration action. 
             // Actually zustand persist doesn't always support direct mutation here.
             // Better: use 'migrate' option in persist, but that requires versioning.
             // Simple fallback: The getters I wrote above handle `gyeonghyeonchi ?? level`. 
             // So explicit migration isn't strictly necessary for READ, but good for WRITE.
             // I will leave this empty and rely on dual-read for now to be safe, or just mutation.
          }
        }
      }
    },
  ),
);
