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

/* ── 월별 일지(직접 작성) ─────────────────────────────────────
 * 한 달에 여러 개의 글을 남길 수 있는 본격 일지. journal_entries 테이블.
 */

const JOURNAL_TABLE = 'journal_entries'
const BODY_MAX = 4000

export interface JournalEntry {
  id: string
  month: string // YYYY-MM
  entryDate: string | null // YYYY-MM-DD (선택)
  body: string
  updatedAt: string
}

type JournalRow = { id: string; month: string; entry_date: string | null; body: string; updated_at: string }

function toEntry(r: JournalRow): JournalEntry {
  return { id: r.id, month: r.month, entryDate: r.entry_date, body: r.body, updatedAt: r.updated_at }
}

/** 내 일지 전부 읽기 (최신 월 → 최신순) */
export async function fetchJournalEntries(userId: string): Promise<JournalEntry[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from(JOURNAL_TABLE)
    .select('id, month, entry_date, body, updated_at')
    .eq('user_id', userId)
    .order('month', { ascending: false })
    .order('entry_date', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return (data as JournalRow[]).map(toEntry)
}

/** 일지 추가 → 생성된 항목 반환 (실패 시 null) */
export async function addJournalEntry(
  userId: string,
  month: string,
  body: string,
  entryDate?: string | null,
): Promise<JournalEntry | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const trimmed = body.trim().slice(0, BODY_MAX)
  if (!trimmed || !/^\d{4}-\d{2}$/.test(month)) return null
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from(JOURNAL_TABLE)
    .insert({
      user_id: userId,
      month,
      entry_date: entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate) ? entryDate : null,
      body: trimmed,
      created_at: now,
      updated_at: now,
    })
    .select('id, month, entry_date, body, updated_at')
    .single()
  if (error || !data) return null
  return toEntry(data as JournalRow)
}

/** 일지 수정 (본문 + 어느 달인지(month)·날짜까지 변경 가능) */
export async function updateJournalEntry(
  userId: string,
  id: string,
  updates: { body?: string; month?: string; entryDate?: string | null },
): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.body !== undefined) {
    const trimmed = updates.body.trim().slice(0, BODY_MAX)
    if (!trimmed) return deleteJournalEntry(userId, id)
    patch.body = trimmed
  }
  if (updates.month !== undefined && /^\d{4}-\d{2}$/.test(updates.month)) patch.month = updates.month
  if (updates.entryDate !== undefined)
    patch.entry_date = updates.entryDate && /^\d{4}-\d{2}-\d{2}$/.test(updates.entryDate) ? updates.entryDate : null
  const { error } = await supabase.from(JOURNAL_TABLE).update(patch).eq('user_id', userId).eq('id', id)
  return !error
}

/** 일지 삭제 */
export async function deleteJournalEntry(userId: string, id: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false
  const { error } = await supabase.from(JOURNAL_TABLE).delete().eq('user_id', userId).eq('id', id)
  return !error
}
