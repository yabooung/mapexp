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
  fetchHistoryMemos,
  saveHistoryMemo,
  type MonthlySummary,
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

/** YYYY-MM → 언어별 표기 */
function formatMonth(month: string, lang: Lang): string {
  const [y, m] = month.split('-')
  const mi = Number(m)
  if (lang === 'ko') return `${y}년 ${mi}월`
  if (lang === 'ja') return `${y}年${mi}月`
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[mi - 1] ?? m} ${y}`
}

function MonthCard({
  summary,
  memo,
  onSaveMemo,
}: {
  summary: MonthlySummary
  memo: string
  onSaveMemo: (month: string, memo: string) => Promise<void>
}) {
  const t = useT()
  const lang = useLang()
  const [draft, setDraft] = useState(memo)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(memo), [memo])

  const dirty = draft.trim() !== (memo ?? '').trim()

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onSaveMemo(summary.month, draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-base font-bold text-ink">{formatMonth(summary.month, lang)}</h4>
        <span className="text-xs text-muted shrink-0">
          {t('history.summary', { regions: summary.regions.length, visits: summary.visitCount })}
        </span>
      </div>

      {/* 자동 요약: 그 달 찍은 지역 칩 */}
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

      {/* 월 메모 */}
      <div className="mt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('history.memoPlaceholder')}
          rows={2}
          className="w-full resize-y px-3 py-2 rounded-md border border-line bg-card text-sm text-ink placeholder:text-faint focus:outline-none focus:border-ink"
        />
        {dirty && (
          <div className="mt-1.5 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 rounded-md bg-ink text-paper text-xs font-medium hover:opacity-90 disabled:opacity-60"
            >
              {t('common.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HistoryModal({ isOpen, onClose }: HistoryModalProps) {
  const t = useT()
  const user = useAuthStore((s) => s.user)
  const regions = useMapExpStore((s) => s.regions)
  const summaries = useMemo(() => computeMonthlySummaries(regions), [regions])
  const [memos, setMemos] = useState<Record<string, string>>({})

  // 열릴 때 서버에서 월별 메모 로드
  useEffect(() => {
    if (!isOpen || !user) return
    let cancelled = false
    fetchHistoryMemos(user.id).then((m) => {
      if (!cancelled) setMemos(m)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, user])

  const handleSaveMemo = async (month: string, memo: string) => {
    if (!user) return
    const ok = await saveHistoryMemo(user.id, month, memo)
    if (ok) {
      setMemos((prev) => {
        const next = { ...prev }
        if (memo.trim()) next[month] = memo.trim()
        else delete next[month]
        return next
      })
      toast.success(t('history.memoSaved'))
    } else {
      toast.error(t('history.memoFailed'))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('history.title')} size="lg">
      {!user ? (
        <p className="text-sm text-muted py-2">{t('history.loginNeeded')}</p>
      ) : summaries.length === 0 ? (
        <div className="py-8 text-center">
          <Icon name="calendar" size={32} className="mx-auto text-faint" />
          <p className="mt-3 text-sm text-muted">{t('history.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[65vh] overflow-y-auto -mx-1 px-1">
          <p className="text-xs text-muted">{t('history.intro')}</p>
          {summaries.map((s) => (
            <MonthCard key={s.month} summary={s} memo={memos[s.month] ?? ''} onSaveMemo={handleSaveMemo} />
          ))}
        </div>
      )}
    </Modal>
  )
}
