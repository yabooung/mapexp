import { RegionExp, GyeongHyeonChi, ExperienceGrade } from '@/types'

/**
 * 뱃지(업적) 시스템
 */

export interface Badge {
  id: string
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
export function computeBadges(regions: RegionExp[], totalRegions: number, trackKm: number): Badge[] {
  // 도도부현 레벨 기록만 집계 (시정촌 기록 제외)
  const prefRegions = regions.filter((r) => !r.regionId.includes('_'))
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
    make('first-step', '👣', '첫 발자국', '첫 지역 기록하기', visitedCount, 1),
    make('explorer', '🧭', '탐험가', '10개 지역 방문하기', visitedCount, 10),
    make('adventurer', '🗺️', '모험가', '25개 지역 방문하기', visitedCount, 25),
    make('half-japan', '🗾', '절반 정복', '달성률 50% 달성하기', completionRate, 0.5),
    make('complete', '🏆', '전국 제패', '47개 도도부현 모두 방문하기', visitedCount, totalRegions),
    make('first-stay', '🏨', '첫 숙박', '숙박(4) 지역 만들기', stayedCount, 1),
    make('first-master', '⭐', '첫 마스터', '거주(5) 지역 만들기', masterCount, 1),
    make('triple-master', '🌟', '트리플 마스터', '거주(5) 지역 3개 만들기', masterCount, 3),
    make('kansai-king', '👑', '간사이 킹', '간사이 6개 지역 모두 방문하기', kansaiVisited, KANSAI_IDS.length),
    make('kanto-master', '🗼', '간토 마스터', '간토 7개 지역 모두 방문하기', kantoVisited, KANTO_IDS.length),
    make('kyushu-explorer', '🌋', '규슈 탐험가', '규슈·오키나와 8개 지역 모두 방문하기', kyushuVisited, KYUSHU_IDS.length),
    make('on-the-road', '🛤️', '길 위에서', 'GPS 트랙 10km 기록하기', trackKm, 10),
  ]
}
