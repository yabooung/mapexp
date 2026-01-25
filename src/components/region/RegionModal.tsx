'use client'

import { useState, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { getRegionMetadata } from '@/data/regions'
import { ExpLevel, Visit, GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_LEVEL_LABELS } from '@/types/region'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'
import VisitList from './VisitList'

interface RegionModalProps {
  isOpen: boolean
  onClose: () => void
  regionId: string
}

/**
 * 지역 레벨 선택 모달
 */
export default function RegionModal({
  isOpen,
  onClose,
  regionId,
}: RegionModalProps) {
  const { getRegionById, addRegion, updateRegion, deleteRegion } =
    useMapExpStore()
  const regionInfo = getRegionMetadata(regionId)
  const existingRegion = getRegionById(regionId)

  const [level, setLevel] = useState<ExperienceGrade>(
    existingRegion?.gyeonghyeonchi ?? (existingRegion?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
  )
  const [visitDate, setVisitDate] = useState(existingRegion?.visitDate ?? '')
  const [memo, setMemo] = useState(existingRegion?.memo ?? '')
  const [visitCount, setVisitCount] = useState(
    existingRegion?.visitCount?.toString() ?? ''
  )
  const [totalNights, setTotalNights] = useState(
    existingRegion?.totalNights?.toString() ?? ''
  )
  const [visits, setVisits] = useState<Visit[]>(existingRegion?.visits ?? [])

  // 지역이 변경되면 폼 초기화
  useEffect(() => {
    if (isOpen && regionId) {
      const existing = getRegionById(regionId)
      setLevel(existing?.gyeonghyeonchi ?? (existing?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED)
      setVisitDate(existing?.visitDate ?? '')
      setMemo(existing?.memo ?? '')
      setVisitCount(existing?.visitCount?.toString() ?? '')
      setTotalNights(existing?.totalNights?.toString() ?? '')
      setVisits(existing?.visits ?? [])
    }
  }, [isOpen, regionId, getRegionById])

  if (!regionInfo) return null

  const handleSave = () => {
    // 검증
    if (memo.length > 500) {
      toast.error('메모는 최대 500자까지 입력 가능합니다')
      return
    }

    // 저장
    const regionData = {
      regionId,
      gyeonghyeonchi: level,
      level, // 호환성 유지
      memo: memo.trim() || undefined,
      visitDate: visitDate || undefined,
      visitCount: visitCount ? parseInt(visitCount) : undefined,
      totalNights: totalNights ? parseInt(totalNights) : undefined,
      visits,
      updatedAt: new Date().toISOString(),
    }

    if (existingRegion) {
      updateRegion(regionId, regionData)
      toast.success('지역 정보가 수정되었습니다')
    } else {
      addRegion(regionData)
      toast.success('지역 정보가 추가되었습니다')
    }

    onClose()
  }

  const handleDelete = () => {
    if (confirm('이 지역의 기록을 삭제하시겠습니까?')) {
      deleteRegion(regionId)
      toast.success('지역 정보가 삭제되었습니다')
      onClose()
    }
  }

  const levelDescriptions = {
    [GyeongHyeonChi.UNVISITED]: '미경현 (스친 적도 없다) - 0점',
    [GyeongHyeonChi.PASSED]: '통과했다 (철도/차 통과, 배 기항. 항공기 제외) - 1점',
    [GyeongHyeonChi.LANDED]: '내렸다 (환승이나 휴게소 휴식 등) - 2점',
    [GyeongHyeonChi.VISITED]: '걸었다 (묵었던 적은 없다) - 3점',
    [GyeongHyeonChi.STAYED]: '묵었다 (야간 통과는 제외) - 4점',
    [GyeongHyeonChi.RESIDED]: '살았다 (3개월 정도의 장기 체류 포함) - 5점',
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${regionInfo.name} (${regionInfo.nameLocal})`}
      size="lg"
      footer={
        <div className="flex justify-between">
          <div>
            {existingRegion && level > GyeongHyeonChi.UNVISITED && (
              <Button variant="danger" onClick={handleDelete}>
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave}>
              저장
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 레벨 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            경험치 레벨 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {Object.values(ExpLevel)
              .filter((v) => typeof v === 'number')
              .map((lv) => {
                const lvNum = lv as ExperienceGrade
                return (
                  <label
                    key={lvNum}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      level === lvNum
                        ? 'bg-blue-50 border-blue-500'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="level"
                      value={lvNum}
                      checked={level === lvNum}
                      onChange={() => setLevel(lvNum)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Lv.{lvNum} - {EXP_LEVEL_LABELS[lvNum]}
                        </span>
                        {lvNum === GyeongHyeonChi.RESIDED && <span>👑</span>}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {levelDescriptions[lvNum]}
                      </p>
                    </div>
                  </label>
                )
              })}
          </div>
        </div>

        {/* 레벨 5 설명 */}
        {level === GyeongHyeonChi.RESIDED && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800 mb-1">
              거주 (居住) - 5점 최고 등급
            </p>
            <p className="text-xs text-yellow-700">
              해당 지역에서 생활한 경험이 있거나, 3개월 이상 장기 체류한 경우에 해당합니다.
            </p>
            {/* 자동 계산된 통계 표시 */}
            <div className="mt-3 flex gap-4 text-xs font-medium text-yellow-800">
              <div className="bg-white/50 px-2 py-1 rounded">
                총 방문: {visits.length}회
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 my-2"></div>

        {/* 방문 기록 관리 (New) */}
        <VisitList visits={visits} onChange={setVisits} />

        {/* 기존 메모/날짜 입력 (레거시 - 필요하다면 유지하지만, 방문 기록으로 대체 권장) */}
        {(visits.length === 0) && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-500">
            <p>💡 방문 기록을 추가하면 방문 횟수와 숙박일이 자동 계산됩니다.</p>
          </div>
        )}

        {/* 방문일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            방문일 (선택)
          </label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 메모 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            메모 (선택)
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="이 지역에 대한 메모를 입력하세요..."
          />
          <p className="text-xs text-gray-500 mt-1 text-right">
            {memo.length} / 500
          </p>
        </div>
      </div>
    </Modal>
  )
}
