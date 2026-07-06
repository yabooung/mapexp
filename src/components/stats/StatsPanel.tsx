'use client'

import { useState, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS, TOTAL_REGIONS } from '@/constants'
import Card from '@/components/common/Card'
import { useT, useLang, levelLabel } from '@/lib/i18n'

/**
 * 통계 패널
 */
export default function StatsPanel() {
  const [mounted, setMounted] = useState(false)
  const { country, getTotalGyeonghyeonchi, getSystemLevel, getVisitedCount, getCompletionRate, getGyeonghyeonchiCounts } =
    useMapExpStore()
  const t = useT()
  const lang = useLang()

  useEffect(() => {
    setMounted(true)
  }, [])

  const totalGyeonghyeonchi = getTotalGyeonghyeonchi()
  const systemLevel = getSystemLevel()
  const visitedCount = getVisitedCount()
  const completionRate = getCompletionRate()
  const valCounts = getGyeonghyeonchiCounts()
  const totalRegions = TOTAL_REGIONS[country]

  if (!mounted) return null // Prevent hydration mismatch

  return (
    <div className="space-y-4">
      {/* 주요 통계 */}
      <Card>
        {/* 시스템 레벨 */}
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">{t('stats.travelerLevel')}</span>
          <span className="text-xs text-muted tabular-nums">{t('stats.exp', { n: totalGyeonghyeonchi })}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[40px] leading-none font-bold text-ink tabular-nums tracking-tight">
            {systemLevel}
          </span>
          <span className="text-sm text-muted">{t('stats.toNext', { n: 10 - (totalGyeonghyeonchi % 10) })}</span>
        </div>
        <div className="mt-3 w-full bg-paper rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-seal h-full rounded-full transition-all duration-700"
            style={{ width: `${(totalGyeonghyeonchi % 10) * 10}%` }}
          />
        </div>

        {/* 방문/달성률 */}
        <div className="mt-5 grid grid-cols-2 divide-x divide-line border-t border-line pt-4">
          <div className="pr-4">
            <p className="text-xs text-muted">{t('stats.visited')}</p>
            <p className="mt-0.5 text-xl font-bold text-ink tabular-nums">
              {visitedCount}
              <span className="text-sm font-medium text-faint"> / {totalRegions}</span>
            </p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-muted">{t('stats.completion')}</p>
            <p className="mt-0.5 text-xl font-bold text-ink tabular-nums">{completionRate}%</p>
          </div>
        </div>
      </Card>

      {/* 레벨별 분포 */}
      <Card>
        <h3 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase mb-3">{t('stats.distribution')}</h3>

        <div className="space-y-1">
          {[
            GyeongHyeonChi.RESIDED,
            GyeongHyeonChi.STAYED,
            GyeongHyeonChi.VISITED,
            GyeongHyeonChi.LANDED,
            GyeongHyeonChi.PASSED,
            GyeongHyeonChi.UNVISITED,
          ].map((level) => {
            const count = valCounts[level]
            const points = count * level
            const pct = totalRegions > 0 ? (count / totalRegions) * 100 : 0

            return (
              <div key={level} className="flex items-center gap-2.5 py-1">
                <span
                  className="w-3 h-3 rounded-[3px] shrink-0 border border-black/10"
                  style={{ backgroundColor: EXP_COLORS[level] }}
                />
                <span className="text-sm text-ink w-16 shrink-0">
                  {levelLabel(level, lang)}
                </span>
                {/* 미니 바 */}
                <span className="flex-1 h-1 bg-paper rounded-full overflow-hidden">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: level === 0 ? 'var(--line)' : EXP_COLORS[level] }}
                  />
                </span>
                <span className="text-xs text-muted tabular-nums w-8 text-right">{count}</span>
                <span className="text-xs text-faint tabular-nums w-9 text-right">{t('stats.points', { n: points })}</span>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-xs text-muted">
          <span>{t('stats.progress')}</span>
          <span className="tabular-nums">
            {t('stats.regions', { a: visitedCount, b: totalRegions })}
          </span>
        </div>
      </Card>
    </div>
  )
}
