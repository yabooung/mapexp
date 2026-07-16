'use client'

import { useState, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import { TOTAL_REGIONS } from '@/constants'
import { computeBadges } from '@/lib/badges'
import { trackDistanceMeters } from '@/lib/geo'
import Card from '@/components/common/Card'
import { useT, I18nKey } from '@/lib/i18n'

type BadgeView = 'list' | 'grid'

/**
 * 뱃지 패널 — 낙관(落款) 도장 스타일.
 * 리스트(기본): 이름·조건·진행 바까지 한눈에. 도장: 도장첩 느낌의 그리드.
 */
export default function BadgePanel() {
  const [mounted, setMounted] = useState(false)
  // 모바일=리스트(조건·진행률 학습), 데스크톱=도장 그리드(사이드바가 길어지지 않게)
  const [view, setView] = useState<BadgeView>('list')
  const { country, regions } = useMapExpStore()
  const trackPoints = useGpsStore((s) => s.trackPoints)
  const t = useT()

  useEffect(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) setView('grid')
    setMounted(true)
  }, [])

  if (!mounted) return null

  const trackKm = trackDistanceMeters(trackPoints) / 1000
  const badges = computeBadges(regions, TOTAL_REGIONS[country], trackKm, country)
  const achievedCount = badges.filter((b) => b.achieved).length

  const stampClass = (achieved: boolean, iconLen: number, size: 'sm' | 'md') =>
    `${size === 'md' ? 'w-11 h-11' : 'w-10 h-10'} rounded-full flex items-center justify-center font-bold select-none leading-none shrink-0 ${
      achieved ? 'bg-seal text-white' : 'border-[1.5px] border-dashed border-line text-faint bg-transparent'
    } ${iconLen > 1 ? 'text-[13px]' : size === 'md' ? 'text-lg' : 'text-[17px]'}`

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
          {t('badges.title')}
          <span className="ml-2 normal-case tracking-normal tabular-nums">{achievedCount} / {badges.length}</span>
        </h3>
        <div className="inline-flex rounded-full border border-line bg-card p-0.5">
          {(
            [
              ['list', t('badges.viewList')],
              ['grid', t('badges.viewGrid')],
            ] as Array<[BadgeView, string]>
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                view === mode ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {badges.map((badge, i) => {
            const name = t(`badge.${badge.id}.name` as I18nKey)
            const desc = t(`badge.${badge.id}.desc` as I18nKey)
            return (
              <div key={badge.id} className="flex flex-col items-center text-center" title={`${name}: ${desc}`}>
                <span
                  className={stampClass(badge.achieved, badge.icon.length, 'md')}
                  style={badge.achieved ? { transform: `rotate(${((i % 5) - 2) * 4}deg)` } : undefined}
                >
                  {badge.icon}
                </span>
                <span className={`mt-1.5 text-[10px] leading-tight break-keep ${badge.achieved ? 'text-ink font-medium' : 'text-muted'}`}>
                  {name}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        /* 데스크톱 사이드바에서 카드가 한없이 길어지지 않게 내부 스크롤 (지역별 점수 카드와 동일 패턴) */
        <div className="lg:max-h-80 lg:overflow-y-auto lg:pr-1">
          {badges.map((badge, i) => {
            const name = t(`badge.${badge.id}.name` as I18nKey)
            const desc = t(`badge.${badge.id}.desc` as I18nKey)
            const pct = Math.round(badge.progress * 100)
            return (
              <div key={badge.id} className="flex items-center gap-3 py-2.5 border-b border-line/60 last:border-0 last:pb-0 first:pt-0">
                <span
                  className={stampClass(badge.achieved, badge.icon.length, 'sm')}
                  style={badge.achieved ? { transform: `rotate(${((i % 5) - 2) * 4}deg)` } : undefined}
                >
                  {badge.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-[13px] font-bold truncate ${badge.achieved ? 'text-ink' : 'text-muted'}`}>
                      {name}
                    </span>
                    {badge.achieved ? (
                      <span className="shrink-0 text-[10px] font-bold text-seal tracking-wide">{t('badges.achieved')}</span>
                    ) : (
                      <span className="shrink-0 text-[11px] text-faint tabular-nums">{pct}%</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted truncate mt-0.5">{desc}</p>
                  {!badge.achieved && (
                    <div className="mt-1.5 h-1 bg-line/50 rounded-full overflow-hidden">
                      <span className="block h-full rounded-full bg-seal/60" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
