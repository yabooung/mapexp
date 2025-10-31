'use client'

import { useState, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { getRegionMetadata } from '@/data/regions'
import { ExpLevel } from '@/types'
import { EXP_LEVEL_LABELS } from '@/types/region'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import toast from 'react-hot-toast'

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

  const [level, setLevel] = useState<ExpLevel>(
    existingRegion?.level ?? ExpLevel.UNVISITED
  )
  const [visitDate, setVisitDate] = useState(existingRegion?.visitDate ?? '')
  const [memo, setMemo] = useState(existingRegion?.memo ?? '')
  const [visitCount, setVisitCount] = useState(
    existingRegion?.visitCount?.toString() ?? ''
  )
  const [totalNights, setTotalNights] = useState(
    existingRegion?.totalNights?.toString() ?? ''
  )

  // 지역이 변경되면 폼 초기화
  useEffect(() => {
    if (isOpen && regionId) {
      const existing = getRegionById(regionId)
      setLevel(existing?.level ?? ExpLevel.UNVISITED)
      setVisitDate(existing?.visitDate ?? '')
      setMemo(existing?.memo ?? '')
      setVisitCount(existing?.visitCount?.toString() ?? '')
      setTotalNights(existing?.totalNights?.toString() ?? '')
    }
  }, [isOpen, regionId, getRegionById])

  if (!regionInfo) return null

  const handleSave = () => {
    // 검증
    if (level === ExpLevel.MASTER) {
      const count = parseInt(visitCount)
      const nights = totalNights ? parseInt(totalNights) : 0

      if (!visitCount || isNaN(count) || count < 1) {
        toast.error('방문 횟수를 입력해주세요 (최소 1회)')
        return
      }

      // 마스터 조건: 3회 이상 & 3박 이상 OR 30일 이상
      const meetsCondition =
        (count >= 3 && nights >= 3) || nights >= 30

      if (!meetsCondition) {
        toast.error(
          '마스터 조건: (3회 이상 & 3박 이상) 또는 30일 이상'
        )
        return
      }
    }

    if (memo.length > 500) {
      toast.error('메모는 최대 500자까지 입력 가능합니다')
      return
    }

    // 저장
    const regionData = {
      regionId,
      level,
      memo: memo.trim() || undefined,
      visitDate: visitDate || undefined,
      visitCount: visitCount ? parseInt(visitCount) : undefined,
      totalNights: totalNights ? parseInt(totalNights) : undefined,
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
    [ExpLevel.UNVISITED]: '방문한 적 없음',
    [ExpLevel.PASSED]: '공항, 역 등에서 환승만',
    [ExpLevel.STOPPED]: '2-3시간 정도 짧게 방문',
    [ExpLevel.VISITED]: '반나절 ~ 하루 정도 방문',
    [ExpLevel.RESIDED]: '1박 이상 숙박',
    [ExpLevel.MASTER]: '마스터/거주 (3회 이상 & 3박 이상 OR 30일 이상)',
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
            {existingRegion && level > ExpLevel.UNVISITED && (
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
                const lvNum = lv as ExpLevel
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
                        {lvNum === ExpLevel.MASTER && <span>⭐</span>}
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

        {/* 레벨 5 추가 입력 */}
        {level === ExpLevel.MASTER && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-yellow-800">
              마스터 레벨 추가 정보
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  방문 횟수 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={visitCount}
                  onChange={(e) => setVisitCount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="회"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  총 숙박일
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalNights}
                  onChange={(e) => setTotalNights(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="일"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600">
              조건: (3회 이상 & 3박 이상) 또는 30일 이상
            </p>
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
