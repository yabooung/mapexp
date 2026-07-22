import type { RegionExp } from '@/types'
import { getSupabase } from '@/lib/supabase'

/**
 * 월별 히스토리 (회원 전용).
 * - 자동 요약: 방문 기록(visits)의 시작일을 월(YYYY-MM)로 묶어 그 달에 찍은 지역을 집계
 * - 메모: 회원이 월별로 자유롭게 남기는 코멘트 (Supabase `monthly_history` 테이블)
 *
 * 자동 요약은 이미 동기화된 regions에서 클라이언트 계산이라 서버 왕복이 없다.
 * 메모만 서버에 저장한다.
 */

const TABLE = 'monthly_history'

export interface MonthlyRegionEntry {
  regionId: string
  /** 그 달 이 지역에서의 최고 등급 (visit는 등급 정보가 없어 지역 현재 등급으로 표기) */
  level: number
  /** 그 달 이 지역의 방문 기록 수 */
  count: number
}

export interface MonthlySummary {
  month: string // YYYY-MM
  /** 그 달에 방문 기록이 있는 지역들 (광역·기초 모두, regionId 기준 distinct) */
  regions: MonthlyRegionEntry[]
  /** 그 달 방문 기록 총 개수 */
  visitCount: number
}

/** regions → 월별 자동 요약 (최신 월 먼저) */
export function computeMonthlySummaries(regions: RegionExp[]): MonthlySummary[] {
  // month -> regionId -> { level, count }
  const byMonth = new Map<string, Map<string, MonthlyRegionEntry>>()

  for (const region of regions) {
    const level = region.gyeonghyeonchi ?? region.level ?? 0
    for (const visit of region.visits ?? []) {
      const month = (visit.startDate ?? '').slice(0, 7)
      if (!/^\d{4}-\d{2}$/.test(month)) continue
      let regionMap = byMonth.get(month)
      if (!regionMap) {
        regionMap = new Map()
        byMonth.set(month, regionMap)
      }
      const entry = regionMap.get(region.regionId)
      if (entry) {
        entry.count += 1
        entry.level = Math.max(entry.level, level)
      } else {
        regionMap.set(region.regionId, { regionId: region.regionId, level, count: 1 })
      }
    }
  }

  const summaries: MonthlySummary[] = [...byMonth.entries()].map(([month, regionMap]) => {
    const regionEntries = [...regionMap.values()]
    return {
      month,
      regions: regionEntries,
      visitCount: regionEntries.reduce((sum, e) => sum + e.count, 0),
    }
  })

  // 최신 월 먼저
  summaries.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0))
  return summaries
}

/** 서버에서 월별 메모 전부 읽기 → { 'YYYY-MM': memo } */
export async function fetchHistoryMemos(userId: string): Promise<Record<string, string>> {
  const supabase = getSupabase()
  if (!supabase) return {}
  const { data, error } = await supabase
    .from(TABLE)
    .select('month, memo')
    .eq('user_id', userId)
  if (error || !data) return {}
  const memos: Record<string, string> = {}
  for (const row of data as Array<{ month: string; memo: string | null }>) {
    if (row.memo) memos[row.month] = row.memo
  }
  return memos
}

/** 월별 메모 저장 (빈 문자열이면 삭제) */
export async function saveHistoryMemo(userId: string, month: string, memo: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const trimmed = memo.trim().slice(0, 2000)
  if (!trimmed) {
    const { error } = await supabase.from(TABLE).delete().eq('user_id', userId).eq('month', month)
    return !error
  }
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      month,
      memo: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,month' },
  )
  return !error
}
