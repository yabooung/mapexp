import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ExpLevel, MapExpData, RegionExp, UserSettings } from "@/types";
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
  getTotalExp: () => number;
  getVisitedCount: () => number;
  getCompletionRate: () => number;
  getLevelCounts: () => Record<ExpLevel, number>;
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

      // 총 경험치 계산
      getTotalExp: () => {
        return get().regions.reduce((sum, region) => {
          // 경현도 기준: 레벨 = 점수 (거주는 5점, 숙박은 4점...)
          return sum + region.level;
        }, 0);
      },

      // 방문한 지역 수 (레벨 1 이상)
      getVisitedCount: () => {
        return get().regions.filter(
          (region) => region.level > ExpLevel.UNVISITED,
        ).length;
      },

      // 완성률 계산
      getCompletionRate: () => {
        const state = get();
        const totalRegions = TOTAL_REGIONS[state.country];
        const visitedCount = state.regions.filter(
          (region) => region.level > ExpLevel.UNVISITED,
        ).length;

        return totalRegions > 0
          ? Math.round((visitedCount / totalRegions) * 100)
          : 0;
      },

      // 레벨별 카운트
      getLevelCounts: () => {
        const state = get();
        const totalRegions = TOTAL_REGIONS[state.country];
        const counts: Record<ExpLevel, number> = {
          [ExpLevel.UNVISITED]: totalRegions,
          [ExpLevel.PASSED]: 0,
          [ExpLevel.LANDED]: 0,
          [ExpLevel.VISITED]: 0,
          [ExpLevel.STAYED]: 0,
          [ExpLevel.RESIDED]: 0,
        };

        state.regions.forEach((region) => {
          counts[region.level]++;
          counts[ExpLevel.UNVISITED]--;
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
    },
  ),
);
