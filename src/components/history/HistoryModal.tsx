'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/common/Modal'
import Icon from '@/components/common/Icon'
import { useMapExpStore } from '@/store'
import { useAuthStore } from '@/store/auth'
import { useT, useLang, regionDisplayName, levelLabel, type Lang } from '@/lib/i18n'
import { getRegionMetadata } from '@/data/regions'
import {
  computeMonthlySummaries,
  fetchJournalEntries,
  addJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  type MonthlySummary,
  type JournalEntry,
} from '@/lib/monthlyHistory'
import type { ExperienceGrade } from '@/types'
import toast from '@/lib/appToast'

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

/** 지역 ID → 표시 이름 (광역은 메타데이터, 기초는 '광역 · 세부') */
function regionLabel(regionId: string, lang: Lang): string {
  const meta = getRegionMetadata(regionId)
  if (meta) return regionDisplayName(meta, lang)
  const [parent, ...rest] = regionId.split('_')
  const pMeta = getRegionMetadata(parent)
  const pName = pMeta ? regionDisplayName(pMeta, lang) : parent
  const suffix = rest.join('_')
  return suffix ? `${pName} · ${suffix}` : pName
}

function formatMonth(month: string, lang: Lang): string {
  const [y, m] = month.split('-')
  const mi = Number(m)
  if (lang === 'ko') return `${y}년 ${mi}월`
  if (lang === 'ja') return `${y}年${mi}月`
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[mi - 1] ?? m} ${y}`
}

function formatYear(year: string, lang: Lang): string {
  return lang === 'en' ? year : `${year}년`.replace('년', lang === 'ja' ? '年' : '년')
}

function formatDate(date: string, lang: Lang): string {
  const [, m, d] = date.split('-').map((x) => x)
  const mi = Number(m)
  const di = Number(d)
  if (lang === 'ko') return `${mi}월 ${di}일`
  if (lang === 'ja') return `${mi}月${di}日`
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][mi - 1]} ${di}`
}

/** 한 개 일지 항목 (표시 + 편집) */
function EntryRow({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: JournalEntry
  onUpdate: (id: string, updates: { body?: string; month?: string; entryDate?: string | null }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const t = useT()
  const lang = useLang()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(entry.body)
  const [month, setMonth] = useState(entry.month)
  const [date, setDate] = useState(entry.entryDate ?? '')
  const [busy, setBusy] = useState(false)

  const start = () => {
    setBody(entry.body)
    setMonth(entry.month)
    setDate(entry.entryDate ?? '')
    setEditing(true)
  }

  const save = async () => {
    if (busy) return
    setBusy(true)
    try {
      await onUpdate(entry.id, { body, month, entryDate: date || null })
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-line bg-card p-2.5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full resize-y px-2.5 py-1.5 rounded-md border border-line bg-paper text-sm text-ink focus:outline-none focus:border-ink"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted">{t('history.month')}</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-2 py-1 rounded-md border border-line bg-paper text-xs text-ink"
          />
          <label className="text-xs text-muted ml-1">{t('history.date')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-2 py-1 rounded-md border border-line bg-paper text-xs text-ink"
          />
          <div className="ml-auto flex gap-1.5">
            <button onClick={() => setEditing(false)} className="px-2.5 py-1 rounded-md text-xs text-muted hover:text-ink">
              {t('common.cancel')}
            </button>
            <button onClick={save} disabled={busy} className="px-3 py-1 rounded-md bg-ink text-paper text-xs font-medium hover:opacity-90 disabled:opacity-60">
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group rounded-lg border border-line bg-card p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-ink whitespace-pre-wrap break-words flex-1">{entry.body}</p>
        <div className="flex shrink-0 gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button onClick={start} aria-label={t('common.edit')} className="p-1 rounded text-muted hover:text-ink">
            <Icon name="pen" size={13} />
          </button>
          <button
            onClick={() => {
              if (confirm(t('history.deleteConfirm'))) onDelete(entry.id)
            }}
            aria-label={t('common.delete')}
            className="p-1 rounded text-muted hover:text-seal"
          >
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>
      {entry.entryDate && <p className="mt-1 text-[11px] text-faint">{formatDate(entry.entryDate, lang)}</p>}
    </div>
  )
}

/** 한 달 카드: 자동 요약 + 일지 목록 + 추가 폼 */
function MonthCard({
  month,
  summary,
  entries,
  onAdd,
  onUpdate,
  onDelete,
}: {
  month: string
  summary?: MonthlySummary
  entries: JournalEntry[]
  onAdd: (month: string, body: string, date: string | null) => Promise<void>
  onUpdate: (id: string, updates: { body?: string; month?: string; entryDate?: string | null }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const t = useT()
  const lang = useLang()
  const [adding, setAdding] = useState(false)
  const [body, setBody] = useState('')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (busy || !body.trim()) return
    setBusy(true)
    try {
      await onAdd(month, body, date || null)
      setBody('')
      setDate('')
      setAdding(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-base font-bold text-ink">{formatMonth(month, lang)}</h4>
        {summary && (
          <span className="text-xs text-muted shrink-0">
            {t('history.summary', { regions: summary.regions.length, visits: summary.visitCount })}
          </span>
        )}
      </div>

      {/* 자동 요약: 그 달 찍은 지역 칩 */}
      {summary && summary.regions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {summary.regions.map((r) => (
            <span
              key={r.regionId}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card border border-line text-xs text-ink"
              title={levelLabel(r.level as ExperienceGrade, lang)}
            >
              {regionLabel(r.regionId, lang)}
              {r.count > 1 && <span className="text-faint">×{r.count}</span>}
            </span>
          ))}
        </div>
      )}

      {/* 일지 항목들 */}
      {entries.length > 0 && (
        <div className="mt-3 space-y-2">
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}

      {/* 추가 */}
      {adding ? (
        <div className="mt-3 rounded-lg border border-line bg-card p-2.5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('history.entryPlaceholder')}
            rows={3}
            autoFocus
            className="w-full resize-y px-2.5 py-1.5 rounded-md border border-line bg-paper text-sm text-ink placeholder:text-faint focus:outline-none focus:border-ink"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted">{t('history.date')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2 py-1 rounded-md border border-line bg-paper text-xs text-ink"
            />
            <div className="ml-auto flex gap-1.5">
              <button onClick={() => setAdding(false)} className="px-2.5 py-1 rounded-md text-xs text-muted hover:text-ink">
                {t('common.cancel')}
              </button>
              <button onClick={save} disabled={busy || !body.trim()} className="px-3 py-1 rounded-md bg-ink text-paper text-xs font-medium hover:opacity-90 disabled:opacity-60">
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line bg-card text-xs font-medium text-muted hover:text-ink hover:bg-paper transition-colors"
        >
          <Icon name="plus" size={13} />
          {t('history.addEntry')}
        </button>
      )}
    </div>
  )
}

/** 연별 요약 카드 */
function YearCard({
  year,
  months,
  summaryByMonth,
  entriesByMonth,
  onOpenMonth,
}: {
  year: string
  months: string[]
  summaryByMonth: Map<string, MonthlySummary>
  entriesByMonth: Map<string, JournalEntry[]>
  onOpenMonth: () => void
}) {
  const t = useT()
  const lang = useLang()

  // 그 해 방문한 distinct 지역 수 + 일지 개수
  const regionSet = new Set<string>()
  let entryCount = 0
  for (const m of months) {
    summaryByMonth.get(m)?.regions.forEach((r) => regionSet.add(r.regionId))
    entryCount += entriesByMonth.get(m)?.length ?? 0
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-base font-bold text-ink">{formatYear(year, lang)}</h4>
        <span className="text-xs text-muted shrink-0">
          {t('history.yearSummary', { regions: regionSet.size, entries: entryCount })}
        </span>
      </div>
      <div className="mt-2.5 space-y-1">
        {months.map((m) => {
          const s = summaryByMonth.get(m)
          const ec = entriesByMonth.get(m)?.length ?? 0
          return (
            <button
              key={m}
              onClick={onOpenMonth}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md hover:bg-card transition-colors text-left"
            >
              <span className="text-sm font-medium text-ink">{formatMonth(m, lang)}</span>
              <span className="text-xs text-muted">
                {t('history.monthMini', { regions: s?.regions.length ?? 0, entries: ec })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const t = useT()
  const lang = useLang()
  const user = useAuthStore((s) => s.user)
  const regions = useMapExpStore((s) => s.regions)
  const summaries = useMemo(() => computeMonthlySummaries(regions), [regions])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [view, setView] = useState<'month' | 'year'>('month')
  const [extraMonths, setExtraMonths] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen || !user) return
    let cancelled = false
    fetchJournalEntries(user.id).then((e) => {
      if (!cancelled) setEntries(e)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, user])

  const summaryByMonth = useMemo(() => new Map(summaries.map((s) => [s.month, s])), [summaries])
  const entriesByMonth = useMemo(() => {
    const map = new Map<string, JournalEntry[]>()
    for (const e of entries) {
      const arr = map.get(e.month) ?? []
      arr.push(e)
      map.set(e.month, arr)
    }
    return map
  }, [entries])

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])

  // 표시할 월 = 방문 있는 달 ∪ 일지 있는 달 ∪ 수동 추가 달 ∪ 이번 달, 최신순
  const months = useMemo(() => {
    const set = new Set<string>([currentMonth, ...extraMonths])
    summaries.forEach((s) => set.add(s.month))
    entries.forEach((e) => set.add(e.month))
    return [...set].filter((m) => /^\d{4}-\d{2}$/.test(m)).sort((a, b) => (a < b ? 1 : -1))
  }, [summaries, entries, extraMonths, currentMonth])

  // 연별 그룹
  const years = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const m of months) {
      const y = m.slice(0, 4)
      const arr = map.get(y) ?? []
      arr.push(m)
      map.set(y, arr)
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [months])

  const handleAdd = async (month: string, body: string, date: string | null) => {
    if (!user) return
    const created = await addJournalEntry(user.id, month, body, date)
    if (created) {
      setEntries((prev) => [created, ...prev])
      toast.success(t('history.entrySaved'))
    } else {
      toast.error(t('history.memoFailed'))
    }
  }

  const handleUpdate = async (
    id: string,
    updates: { body?: string; month?: string; entryDate?: string | null },
  ) => {
    if (!user) return
    const ok = await updateJournalEntry(user.id, id, updates)
    if (ok) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                body: updates.body ?? e.body,
                month: updates.month ?? e.month,
                entryDate: updates.entryDate !== undefined ? updates.entryDate : e.entryDate,
              }
            : e,
        ),
      )
      toast.success(t('history.entrySaved'))
    } else {
      toast.error(t('history.memoFailed'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    const ok = await deleteJournalEntry(user.id, id)
    if (ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id))
      toast.success(t('history.entryDeleted'))
    } else {
      toast.error(t('history.memoFailed'))
    }
  }

  const addOtherMonth = () => {
    const input = prompt(t('history.otherMonthPrompt'), currentMonth)
    if (input && /^\d{4}-\d{2}$/.test(input.trim())) {
      setExtraMonths((prev) => (prev.includes(input.trim()) ? prev : [...prev, input.trim()]))
      setView('month')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('history.title')} size="lg">
      {!user ? (
        <p className="text-sm text-muted py-2">{t('history.loginNeeded')}</p>
      ) : (
        <div className="space-y-3">
          {/* 월별 / 연별 토글 + 다른 달 추가 */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-md border border-line bg-card p-0.5">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1 rounded-[5px] text-sm font-medium transition-colors ${
                  view === 'month' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                {t('history.viewMonth')}
              </button>
              <button
                onClick={() => setView('year')}
                className={`px-3 py-1 rounded-[5px] text-sm font-medium transition-colors ${
                  view === 'year' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                {t('history.viewYear')}
              </button>
            </div>
            {view === 'month' && (
              <button
                onClick={addOtherMonth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line bg-card text-xs font-medium text-muted hover:text-ink hover:bg-paper transition-colors"
              >
                <Icon name="calendar" size={13} />
                {t('history.otherMonth')}
              </button>
            )}
          </div>

          <p className="text-xs text-muted">{t('history.intro')}</p>

          <div className="space-y-3 max-h-[62vh] overflow-y-auto -mx-1 px-1">
            {view === 'month'
              ? months.map((m) => (
                  <MonthCard
                    key={m}
                    month={m}
                    summary={summaryByMonth.get(m)}
                    entries={entriesByMonth.get(m) ?? []}
                    onAdd={handleAdd}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))
              : years.map(([year, ms]) => (
                  <YearCard
                    key={year}
                    year={year}
                    months={ms}
                    summaryByMonth={summaryByMonth}
                    entriesByMonth={entriesByMonth}
                    onOpenMonth={() => setView('month')}
                  />
                ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
