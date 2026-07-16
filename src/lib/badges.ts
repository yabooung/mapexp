import { RegionExp, GyeongHyeonChi, ExperienceGrade } from '@/types'
import { isRegionOfCountry, isHiddenRegion } from '@/constants/regions'

/**
 * 뱃지(업적) 시스템
 */

export interface Badge {
  id: string
  /** 낙관 도장에 새길 글자 (1~2자) */
  icon: string
  name: string
  description: string
  /** 진행도 (0~1) - 잠금 뱃지에 표시 */
  progress: number
  achieved: boolean
}

const KANSAI_IDS = ['osaka', 'kyoto', 'hyogo', 'nara', 'wakayama', 'shiga']
const KANTO_IDS = ['tokyo', 'kanagawa', 'saitama', 'chiba', 'ibaraki', 'tochigi', 'gunma']
const KYUSHU_IDS = ['fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa']

const levelOf = (r: RegionExp): ExperienceGrade =>
  r.gyeonghyeonchi ?? (r.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED

const visitedIn = (regions: RegionExp[], ids: string[]) =>
  ids.filter((id) => {
    const r = regions.find((reg) => reg.regionId === id)
    return r && levelOf(r) > GyeongHyeonChi.UNVISITED
  }).length

/**
 * 현재 기록 기준 뱃지 목록 계산
 * @param regions 지역 기록
 * @param totalRegions 전체 지역 수 (달성률용)
 * @param trackKm 누적 이동 거리 (km)
 */
export function computeBadges(
  regions: RegionExp[],
  totalRegions: number,
  trackKm: number,
  country: 'japan' | 'korea' = 'japan',
): Badge[] {
  // 현재 국가의 광역 지역 기록만 집계 (시정촌/시군구 기록 제외)
  const prefRegions = regions.filter(
    (r) => !r.regionId.includes('_') && isRegionOfCountry(r.regionId, country) && !isHiddenRegion(r.regionId),
  )
  const visitedCount = prefRegions.filter((r) => levelOf(r) > GyeongHyeonChi.UNVISITED).length
  const masterCount = prefRegions.filter((r) => levelOf(r) === GyeongHyeonChi.RESIDED).length
  const stayedCount = prefRegions.filter((r) => levelOf(r) >= GyeongHyeonChi.STAYED).length
  const completionRate = totalRegions > 0 ? visitedCount / totalRegions : 0

  const kansaiVisited = visitedIn(prefRegions, KANSAI_IDS)
  const kantoVisited = visitedIn(prefRegions, KANTO_IDS)
  const kyushuVisited = visitedIn(prefRegions, KYUSHU_IDS)

  const make = (
    id: string,
    icon: string,
    name: string,
    description: string,
    current: number,
    target: number,
  ): Badge => ({
    id,
    icon,
    name,
    description,
    progress: Math.min(1, target > 0 ? current / target : 0),
    achieved: current >= target,
  })

  return [
    make('first-step', '足', '첫 발자국', '첫 지역 기록하기', visitedCount, 1),
    make('explorer', '探', '탐험가', '10개 지역 방문하기', visitedCount, 10),
    make('adventurer', '冒', '모험가', '25개 지역 방문하기', visitedCount, 25),
    make('half-japan', '半', '절반 정복', '달성률 50% 달성하기', completionRate, 0.5),
    make('complete', '制覇', '전국 제패', '47개 도도부현 모두 방문하기', visitedCount, totalRegions),
    make('first-stay', '泊', '첫 숙박', '숙박(4) 지역 만들기', stayedCount, 1),
    make('first-master', '住', '첫 마스터', '거주(5) 지역 만들기', masterCount, 1),
    make('triple-master', '三住', '트리플 마스터', '거주(5) 지역 3개 만들기', masterCount, 3),
    make('kansai-king', '関西', '간사이 킹', '간사이 6개 지역 모두 방문하기', kansaiVisited, KANSAI_IDS.length),
    make('kanto-master', '関東', '간토 마스터', '간토 7개 지역 모두 방문하기', kantoVisited, KANTO_IDS.length),
    make('kyushu-explorer', '九州', '규슈 탐험가', '규슈·오키나와 8개 지역 모두 방문하기', kyushuVisited, KYUSHU_IDS.length),
    make('on-the-road', '道', '길 위에서', 'GPS 트랙 10km 기록하기', trackKm, 10),
  ]
}
