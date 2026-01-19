'use client'

import { RegionExp, RegionMetadata, ExpLevel, EXP_LEVEL_LABELS } from '@/types'
import { EXP_COLORS } from '@/constants'
import Card from '@/components/common/Card'

interface RegionCardProps {
  regionInfo: RegionMetadata
  regionExp?: RegionExp
  onClick: (e: React.MouseEvent) => void
}

/**
 * 지역 카드 컴포넌트
 */
export default function RegionCard({
  regionInfo,
  regionExp,
  onClick,
}: RegionCardProps) {
  const level = regionExp?.level ?? ExpLevel.UNVISITED
  const backgroundColor = EXP_COLORS[level]
  const levelLabel = EXP_LEVEL_LABELS[level]

  // 레벨 5는 금색 별 표시
  const isMaster = level === ExpLevel.MASTER

  // 텍스트 색상 (배경이 밝으면 검정, 어두우면 흰색)
  const textColor = level >= ExpLevel.VISITED ? 'text-white' : 'text-gray-900'

  return (
    <Card
      padding="md"
      shadow="sm"
      onClick={(e) => onClick(e as unknown as React.MouseEvent)}
      hover={true}
      className="relative overflow-hidden"
      style={{ backgroundColor }}
    >
      {/* 마스터 뱃지 */}
      {isMaster && (
        <div className="absolute top-2 right-2">
          <span className="text-2xl">⭐</span>
        </div>
      )}

      {/* 지역명 */}
      <h3 className={`text-lg font-bold ${textColor} mb-1`}>
        {regionInfo.name}
      </h3>

      {/* 영문/현지명 */}
      <p className={`text-sm ${textColor} opacity-80 mb-2`}>
        {regionInfo.nameEn}
        {regionInfo.nameLocal !== regionInfo.name && (
          <span className="ml-2">{regionInfo.nameLocal}</span>
        )}
      </p>

      {/* 레벨 표시 */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${textColor} opacity-90`}>
          {levelLabel}
        </span>
        {level > ExpLevel.UNVISITED && (
          <span className={`text-xs ${textColor} opacity-75`}>
            Lv.{level}
          </span>
        )}
      </div>

      {/* 메모 표시 (있을 경우) */}
      {regionExp?.memo && (
        <div className="mt-2 pt-2 border-t border-white border-opacity-30">
          <p className={`text-xs ${textColor} opacity-75 line-clamp-2`}>
            {regionExp.memo}
          </p>
        </div>
      )}
    </Card>
  )
}
