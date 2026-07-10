import { TOTAL_REGIONS } from '@/constants'
import { isRegionOfCountry } from '@/constants/regions'
import { GyeongHyeonChi, ExperienceGrade, RegionExp } from '@/types'
import type { Country } from '@/lib/geo'

/**
 * 국가별 통계 (광역만 - 시정촌/시군구는 부모에 롤업되므로 제외)
 * 스토어 게터는 "현재 국가" 고정이라, 양국 뷰/공유 카드처럼
 * 임의 국가의 통계가 필요한 곳은 이 헬퍼를 쓴다.
 */
export function countryStats(regions: RegionExp[], c: Country) {
  let score = 0
  let visited = 0
  for (const r of regions) {
    if (r.regionId.includes('_') || !isRegionOfCountry(r.regionId, c)) continue
    const lvl = r.gyeonghyeonchi ?? r.level ?? 0
    score += lvl
    if (lvl > 0) visited++
  }
  const total = TOTAL_REGIONS[c]
  return {
    score,
    visited,
    total,
    completion: total > 0 ? Math.round((visited / total) * 100) : 0,
  }
}

/** 국가별 등급 분포 카운트 */
export function countryGradeCounts(regions: RegionExp[], c: Country): Record<ExperienceGrade, number> {
  const total = TOTAL_REGIONS[c]
  const counts: Record<ExperienceGrade, number> = {
    [GyeongHyeonChi.UNVISITED]: total,
    [GyeongHyeonChi.PASSED]: 0,
    [GyeongHyeonChi.LANDED]: 0,
    [GyeongHyeonChi.VISITED]: 0,
    [GyeongHyeonChi.STAYED]: 0,
    [GyeongHyeonChi.RESIDED]: 0,
  }
  for (const r of regions) {
    if (r.regionId.includes('_') || !isRegionOfCountry(r.regionId, c)) continue
    const lvl = (r.gyeonghyeonchi ?? r.level ?? 0) as ExperienceGrade
    if (lvl > 0) {
      counts[lvl]++
      counts[GyeongHyeonChi.UNVISITED]--
    }
  }
  return counts
}

/** 점수 → 여행자 레벨 (스토어 getSystemLevel과 동일 공식) */
export const levelFromScore = (score: number) => 1 + Math.floor(score / 10)
