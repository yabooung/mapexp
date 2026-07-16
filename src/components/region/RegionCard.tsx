'use client'

import { RegionExp, RegionMetadata, GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import { useLang, useT, levelLabel, regionDisplayName, I18nKey } from '@/lib/i18n'
import Icon from '@/components/common/Icon'

interface RegionCardProps {
  regionInfo: RegionMetadata
  regionExp?: RegionExp
  onClick: (e: React.MouseEvent) => void
  /** 상세 모달 열기 (메모·방문 기록) - 터치에서도 접근 가능한 진입점 */
  onDetail?: () => void
}

/**
 * 지역 카드 — 등급을 한 글자 도장으로 표시.
 * 방문한 지역은 등급색 좌측 바 + 도장이 찍히고, 거주는 인주 도장.
 */
export default function RegionCard({
  regionInfo,
  regionExp,
  onClick,
  onDetail,
}: RegionCardProps) {
  const lang = useLang()
  const t = useT()
  const gyeonghyeonchi = (regionExp?.gyeonghyeonchi ?? regionExp?.level ?? GyeongHyeonChi.UNVISITED) as ExperienceGrade
  const isUnvisited = gyeonghyeonchi === GyeongHyeonChi.UNVISITED
  const isResided = gyeonghyeonchi === GyeongHyeonChi.RESIDED
  const gradeLabel = levelLabel(gyeonghyeonchi, lang)
  const shortChar = t(`level.short.${gyeonghyeonchi}` as I18nKey)
  const displayName = regionDisplayName(regionInfo, lang)
  const levelColor = EXP_COLORS[gyeonghyeonchi]

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${displayName} · ${gradeLabel}`}
      onClick={(e) => onClick(e)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(e as unknown as React.MouseEvent)
        }
      }}
      className={`relative bg-card border rounded-[10px] p-3 pl-4 cursor-pointer select-none transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-seal/60 ${
        isUnvisited
          ? 'border-line hover:border-faint'
          : 'border-line hover:border-seal/50 hover:shadow-[0_2px_10px_rgba(190,58,43,0.08)]'
      }`}
    >
      {/* 등급색 좌측 바 (방문한 지역만) */}
      {!isUnvisited && (
        <span
          className="absolute inset-y-0 left-0 w-[5px]"
          style={{ backgroundColor: isResided ? 'var(--seal)' : levelColor }}
        />
      )}

      <div className="flex items-center gap-3">
        {/* 한 글자 도장 */}
        <span
          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[15px] font-bold select-none ${
            isUnvisited
              ? 'border-[1.5px] border-dashed border-line text-faint'
              : isResided
                ? 'bg-seal text-white'
                : 'text-ink/75 border border-black/10'
          }`}
          style={{
            backgroundColor: isUnvisited || isResided ? undefined : levelColor,
            transform: isUnvisited ? undefined : 'rotate(-4deg)',
          }}
        >
          {shortChar}
        </span>

        {/* 지역명 */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-[15px] font-bold truncate leading-tight ${isUnvisited ? 'text-muted' : 'text-ink'}`}>
            {displayName}
          </h3>
          <p className="text-xs text-faint truncate mt-0.5">
            {lang === 'en' ? regionInfo.nameLocal : regionInfo.nameEn}
          </p>
        </div>

        {/* 상세(메모·방문 기록) 진입 버튼 */}
        {onDetail && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDetail()
            }}
            className="shrink-0 p-1.5 -m-1 rounded-md text-faint hover:text-ink hover:bg-paper transition-colors"
            aria-label={t('gps.detail')}
            title={t('gps.detail')}
          >
            <Icon name="pen" size={14} />
          </button>
        )}

        {/* 등급 라벨 + 진행 점 */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs ${isUnvisited ? 'text-faint' : isResided ? 'text-seal font-semibold' : 'text-muted font-medium'}`}>
            {gradeLabel}
          </span>
          {/* 레벨 진행 점 5개 */}
          <span className="flex gap-[3px]">
            {[1, 2, 3, 4, 5].map((step) => (
              <span
                key={step}
                className="w-[7px] h-[7px] rounded-full border border-black/5"
                style={{
                  backgroundColor:
                    step <= gyeonghyeonchi
                      ? isResided
                        ? 'var(--seal)'
                        : levelColor
                      : 'var(--line)',
                }}
              />
            ))}
          </span>
        </div>
      </div>

      {/* 메모 표시 (있을 경우) */}
      {regionExp?.memo && (
        <p className="mt-2 pt-2 border-t border-line text-xs text-muted line-clamp-2">
          {regionExp.memo}
        </p>
      )}
    </div>
  )
}
