'use client'

import { RegionExp, RegionMetadata, GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import Card from '@/components/common/Card'
import { useLang, levelLabel, regionDisplayName } from '@/lib/i18n'

interface RegionCardProps {
  regionInfo: RegionMetadata
  regionExp?: RegionExp
  onClick: (e: React.MouseEvent) => void
}

/**
 * 지역 카드 — 화이트 카드에 등급 컬러 칩으로 상태 표시.
 * 칩의 색이 지도의 등급색과 동일한 데이터 인코딩.
 */
export default function RegionCard({
  regionInfo,
  regionExp,
  onClick,
}: RegionCardProps) {
  const lang = useLang()
  const gyeonghyeonchi = (regionExp?.gyeonghyeonchi ?? regionExp?.level ?? GyeongHyeonChi.UNVISITED) as ExperienceGrade
  const isUnvisited = gyeonghyeonchi === GyeongHyeonChi.UNVISITED
  const isResided = gyeonghyeonchi === GyeongHyeonChi.RESIDED
  const gradeLabel = levelLabel(gyeonghyeonchi, lang)
  const displayName = regionDisplayName(regionInfo, lang)

  return (
    <Card
      padding="sm"
      shadow="sm"
      onClick={(e) => onClick(e)}
      hover={true}
      className="relative select-none"
    >
      <div className="flex items-center gap-3">
        {/* 등급 컬러 칩 */}
        <span
          className={`w-10 h-10 shrink-0 rounded-md flex items-center justify-center text-sm font-bold tabular-nums ${
            isUnvisited ? 'border-[1.5px] border-dashed border-line text-faint' : 'text-ink/80 border border-black/10'
          }`}
          style={isUnvisited ? undefined : { backgroundColor: EXP_COLORS[gyeonghyeonchi] }}
        >
          {gyeonghyeonchi}
        </span>

        {/* 지역명 */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-[15px] font-bold truncate ${isUnvisited ? 'text-muted' : 'text-ink'}`}>
            {displayName}
          </h3>
          <p className="text-xs text-faint truncate">
            {lang === 'en' ? regionInfo.nameLocal : regionInfo.nameEn}
            {regionInfo.nameLocal !== displayName && lang !== 'en' && (
              <span className="ml-1.5">{regionInfo.nameLocal}</span>
            )}
          </p>
        </div>

        {/* 등급 라벨 / 거주 도장 */}
        {isResided ? (
          <span
            className="w-8 h-8 shrink-0 rounded-full bg-seal text-white flex items-center justify-center text-[13px] font-bold"
            style={{ transform: 'rotate(-4deg)' }}
            title="거주 (최고 등급)"
          >
            住
          </span>
        ) : (
          <span className={`text-xs shrink-0 ${isUnvisited ? 'text-faint' : 'text-muted font-medium'}`}>
            {gradeLabel}
          </span>
        )}
      </div>

      {/* 메모 표시 (있을 경우) */}
      {regionExp?.memo && (
        <p className="mt-2 pt-2 border-t border-line text-xs text-muted line-clamp-2">
          {regionExp.memo}
        </p>
      )}
    </Card>
  )
}
