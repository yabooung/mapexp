'use client'

import { useState } from 'react'
import { Visit } from '@/types'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import { useT } from '@/lib/i18n'
import { differenceInDays, format } from 'date-fns'

interface VisitListProps {
  visits: Visit[]
  onChange: (visits: Visit[]) => void
}

export default function VisitList({ visits, onChange }: VisitListProps) {
  const t = useT()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // 폼 상태
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')

  const resetForm = () => {
    setStartDate('')
    setEndDate('')
    setTitle('')
    setMemo('')
    setIsAdding(false)
    setEditingId(null)
  }

  const handleAddClick = () => {
    resetForm()
    setIsAdding(true)
    // 기본값: 오늘
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }

  const handleEditClick = (visit: Visit) => {
    setStartDate(visit.startDate.split('T')[0])
    setEndDate(visit.endDate.split('T')[0])
    setTitle(visit.title || '')
    setMemo(visit.memo || '')
    setEditingId(visit.id)
    setIsAdding(true)
  }

  const handleDeleteClick = (visitId: string) => {
    if (confirm(t('visits.deleteConfirm'))) {
      const newVisits = visits.filter(v => v.id !== visitId)
      onChange(newVisits)
    }
  }

  const handleSave = () => {
    if (!startDate || !endDate) {
      alert(t('visits.dateRequired'))
      return
    }

    if (startDate > endDate) {
      alert(t('visits.dateOrder'))
      return
    }

    const visitData: Visit = {
      id: editingId || crypto.randomUUID(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      title: title.trim() || undefined,
      memo: memo.trim() || undefined
    }

    let newVisits: Visit[]
    if (editingId) {
      newVisits = visits.map(v => v.id === editingId ? visitData : v)
    } else {
      newVisits = [...visits, visitData]
    }

    // 날짜순 정렬 (최신순)
    newVisits.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

    onChange(newVisits)
    resetForm()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-ink">{t('visits.title', { n: visits.length })}</h4>
        {!isAdding && (
          <Button variant="secondary" size="sm" onClick={handleAddClick}>
            {t('visits.add')}
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-paper p-4 rounded-lg space-y-3 border border-line">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">{t('visits.start')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm bg-card border border-line rounded-md px-2.5 py-1.5 text-ink focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">{t('visits.end')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm bg-card border border-line rounded-md px-2.5 py-1.5 text-ink focus:outline-none focus:border-ink"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">{t('visits.visitTitle')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('visits.titlePlaceholder')}
              className="w-full text-sm bg-card border border-line rounded-md px-2.5 py-1.5 text-ink focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">메모 (선택)</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full text-sm bg-card border border-line rounded-md px-2.5 py-1.5 text-ink focus:outline-none focus:border-ink"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={resetForm}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={handleSave}>{t('common.save')}</Button>
          </div>
        </div>
      )}

      {/* 리스트 */}
      <div className="space-y-2">
        {visits.map((visit) => {
          const days = differenceInDays(new Date(visit.endDate), new Date(visit.startDate)) + 1
          const nights = days - 1
          const isGps = visit.source === 'gps'

          return (
            <div
              key={visit.id}
              className={`border rounded-lg p-3 transition-colors ${
                isGps ? 'border-seal/25 bg-seal-soft/60' : 'border-line hover:bg-paper'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm text-ink flex items-center gap-2 flex-wrap">
                    {visit.title === 'GPS 인증 기록' ? t('visits.gpsTitle') : visit.title || t('visits.defaultTitle')}
                    {isGps && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-seal border border-seal/40 px-1.5 py-0.5 rounded-full">
                        <Icon name="pin" size={9} />
                        {t('visits.gpsBadge')}
                      </span>
                    )}
                    {!isGps && (
                      <span className="text-xs font-normal text-muted">
                        {t('visits.durationFmt', { d: days, n: nights })}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-1 tabular-nums">
                    {isGps
                      ? format(new Date(visit.startDate), 'yyyy.MM.dd HH:mm')
                      : `${format(new Date(visit.startDate), 'yyyy.MM.dd')} ~ ${format(new Date(visit.endDate), 'yyyy.MM.dd')}`}
                  </div>
                  {visit.memo && (
                    <div className="text-xs text-ink mt-2 bg-card p-2 rounded border border-line">
                      {visit.memo}
                    </div>
                  )}
                </div>
                {isGps ? (
                  <span
                    className="text-faint px-2 py-1 select-none"
                    title={t('visits.gpsLocked')}
                  >
                    <Icon name="lock" size={13} />
                  </span>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditClick(visit)}
                      className="text-xs text-muted px-2 py-1 hover:text-ink hover:bg-paper rounded"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(visit.id)}
                      className="text-xs text-seal px-2 py-1 hover:bg-seal-soft rounded"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
