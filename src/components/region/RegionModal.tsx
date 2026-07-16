'use client'

import { useState, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { getRegionMetadata } from '@/data/regions'
import { ExpLevel, Visit, GyeongHyeonChi, ExperienceGrade } from '@/types'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import toast from 'react-hot-toast'
import VisitList from './VisitList'
import { useT, useLang, levelLabel, muniTerm, I18nKey } from '@/lib/i18n'

interface RegionModalProps {
  isOpen: boolean
  onClose: () => void
  regionId: string
  /** 이 광역의 기초 지역(시정촌/시군구) 도장 모달 열기 */
  onOpenMunis?: (prefectureId: string) => void
}

/**
 * 지역 레벨 선택 모달
 */
export default function RegionModal({
  isOpen,
  onClose,
  regionId,
  onOpenMunis,
}: RegionModalProps) {
  const { getRegionById, addRegion, updateRegion, deleteRegion } =
    useMapExpStore()
  const t = useT()
  const lang = useLang()
  // 시정촌 ID(예: tokyo_千代田区)는 메타데이터가 없으므로 ID에서 이름을 유도
  const regionInfo = (() => {
    const meta = getRegionMetadata(regionId)
    if (meta) return meta
    if (regionId.includes('_')) {
      const [parentId, muniName] = regionId.split('_')
      const parentMeta = getRegionMetadata(parentId)
      return {
        id: regionId,
        name: muniName,
        nameEn: muniName,
        nameLocal: parentMeta ? `${parentMeta.nameLocal} ${muniName}` : muniName,
        country: parentMeta?.country ?? ('japan' as const),
        type: 'prefecture' as const,
      }
    }
    return undefined
  })()
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
      toast.error(t('region.memoLimit'))
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
      toast.success(t('region.saved'))
    } else {
      addRegion(regionData)
      toast.success(t('region.added'))
    }

    onClose()
  }

  const handleDelete = () => {
    if (confirm(t('region.deleteConfirm'))) {
      deleteRegion(regionId)
      toast.success(t('region.deleted'))
      onClose()
    }
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
                {t('common.delete')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 레벨 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('region.levelLabel')} <span className="text-red-500">*</span>
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
                        ? 'bg-seal-soft border-seal'
                        : 'border-line hover:bg-paper'
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
                          Lv.{lvNum} - {levelLabel(lvNum, lang)}
                        </span>
                        {lvNum === GyeongHyeonChi.RESIDED && (
                          <span className="w-5 h-5 rounded-full bg-seal text-white flex items-center justify-center text-[10px] font-bold select-none">
                            住
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {t(`region.levelDesc.${lvNum}` as I18nKey)}
                      </p>
                    </div>
                  </label>
                )
              })}
          </div>
        </div>

        {/* 이 광역의 세부 지역 도장 진입 (광역 상세에서만 - 시정촌 상세에는 불필요) */}
        {onOpenMunis && !regionId.includes('_') && regionInfo && (
          <button
            onClick={() => onOpenMunis(regionId)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-line bg-paper text-ink text-sm font-medium hover:border-seal/50 hover:bg-seal-soft transition-colors"
          >
            <Icon name="building" size={15} className="text-seal" />
            {t('page.manageMunisLong', { term: muniTerm(regionInfo.country, lang) })}
          </button>
        )}

        {/* 레벨 5 설명 */}
        {level === GyeongHyeonChi.RESIDED && (
          <div className="bg-seal-soft border border-seal/30 rounded-lg p-4">
            <p className="text-sm font-medium text-seal mb-1">{t('region.residedTitle')}</p>
            <p className="text-xs text-ink/70">{t('region.residedDesc')}</p>
            {/* 자동 계산된 통계 표시 */}
            <div className="mt-3 flex gap-4 text-xs font-medium text-ink">
              <div className="bg-card px-2 py-1 rounded border border-line tabular-nums">
                {t('region.totalVisits', { n: visits.length })}
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
            <p>{t('region.visitTip')}</p>
          </div>
        )}

        {/* 방문일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('region.visitDate')}
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
            {t('region.memo')}
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('region.memoPlaceholder')}
          />
          <p className="text-xs text-gray-500 mt-1 text-right">
            {memo.length} / 500
          </p>
        </div>
      </div>
    </Modal>
  )
}
