'use client'

import { useState } from 'react'
import { Visit } from '@/types'
import Button from '@/components/common/Button'
import { differenceInDays, format } from 'date-fns'

interface VisitListProps {
  visits: Visit[]
  onChange: (visits: Visit[]) => void
}

export default function VisitList({ visits, onChange }: VisitListProps) {
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
    if (confirm('이 방문 기록을 삭제하시겠습니까?')) {
      const newVisits = visits.filter(v => v.id !== visitId)
      onChange(newVisits)
    }
  }

  const handleSave = () => {
    if (!startDate || !endDate) {
      alert('날짜를 선택해주세요.')
      return
    }

    if (startDate > endDate) {
      alert('종료일은 시작일 이후여야 합니다.')
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
        <h4 className="text-sm font-medium text-gray-900">방문 기록 ({visits.length})</h4>
        {!isAdding && (
          <Button variant="secondary" size="sm" onClick={handleAddClick}>
            + 기록 추가
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">제목 (선택)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 여름 휴가, 출장"
              className="w-full text-sm border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">메모 (선택)</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full text-sm border-gray-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={resetForm}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleSave}>저장</Button>
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
                isGps ? 'border-indigo-100 bg-indigo-50/50' : 'border-gray-100 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm text-gray-900 flex items-center gap-2 flex-wrap">
                    {visit.title || '방문'}
                    {isGps && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                        🛰️ GPS 인증
                      </span>
                    )}
                    {!isGps && (
                      <span className="text-xs font-normal text-gray-500">
                        ({days}일간, {nights}박)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isGps
                      ? format(new Date(visit.startDate), 'yyyy.MM.dd HH:mm')
                      : `${format(new Date(visit.startDate), 'yyyy.MM.dd')} ~ ${format(new Date(visit.endDate), 'yyyy.MM.dd')}`}
                  </div>
                  {visit.memo && (
                    <div className="text-xs text-gray-600 mt-2 bg-white p-2 rounded border border-gray-100">
                      {visit.memo}
                    </div>
                  )}
                </div>
                {isGps ? (
                  <span className="text-xs text-gray-400 px-2 py-1 select-none" title="GPS 인증 기록은 시간을 수정하거나 삭제할 수 없습니다">
                    🔒
                  </span>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditClick(visit)}
                      className="text-xs text-blue-600 px-2 py-1 hover:bg-blue-50 rounded"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteClick(visit.id)}
                      className="text-xs text-red-600 px-2 py-1 hover:bg-red-50 rounded"
                    >
                      삭제
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
