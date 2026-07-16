'use client'

import { useState, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS, TOTAL_REGIONS } from '@/constants'
import { countryStats, countryGradeCounts, levelFromScore, regionScoreRows } from '@/lib/stats'
import type { Country } from '@/lib/geo'
import { getRegionMetadata } from '@/data/regions'
import Card from '@/components/common/Card'
import { useT, useLang, levelLabel, regionDisplayName } from '@/lib/i18n'

interface StatsPanelProps {
  /** 양국 지도 뷰가 켜져 있으면 두 나라 통계를 함께 보여준다 */
  showBoth?: boolean
}

/**
 * 통계 패널
 */
export default function StatsPanel({ showBoth = false }: StatsPanelProps) {
  const [mounted, setMounted] = useState(false)
  const { country, regions, getVisitedCount, getCompletionRate, getGyeonghyeonchiCounts } = useMapExpStore()
  const t = useT()
  const lang = useLang()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null // Prevent hydration mismatch

  // 양국 뷰: 두 나라를 합산해 계산 (한 나라만 볼 때는 스토어 게터 = 현재 국가)
  const jp = countryStats(regions, 'japan')
  const kr = countryStats(regions, 'korea')

  // 여행자 레벨은 항상 양국 합산 - 국가 탭 전환으로 '나의 레벨'이 출렁이지 않게 한다
  const totalGyeonghyeonchi = jp.score + kr.score
  const systemLevel = levelFromScore(totalGyeonghyeonchi)
  const visitedCount = showBoth ? jp.visited + kr.visited : getVisitedCount()
  const totalRegions = showBoth ? jp.total + kr.total : TOTAL_REGIONS[country]
  const completionRate = showBoth
    ? (totalRegions > 0 ? Math.round((visitedCount / totalRegions) * 100) : 0)
    : getCompletionRate()

  const valCounts: Record<ExperienceGrade, number> = showBoth
    ? (() => {
        const a = countryGradeCounts(regions, 'japan')
        const b = countryGradeCounts(regions, 'korea')
        const merged = { ...a }
        ;([0, 1, 2, 3, 4, 5] as ExperienceGrade[]).forEach((l) => {
          merged[l] = a[l] + b[l]
        })
        return merged
      })()
    : getGyeonghyeonchiCounts()

  const countryRows: Array<{ c: Country; label: string; s: typeof jp }> = [
    { c: 'japan', label: t('common.japan'), s: jp },
    { c: 'korea', label: t('common.korea'), s: kr },
  ]

  // 지역별 점수 (방문 지역만): 광역 등급 + 산하 기초 지역 점수 - 국가 무관 전체 기록
  const scoreRows = regionScoreRows(regions, ['japan', 'korea'])
  const muniTotalScore = scoreRows.reduce((s, r) => s + r.muniScore, 0)
  const muniTotalCount = scoreRows.reduce((s, r) => s + r.muniCount, 0)

  return (
    <div className="space-y-4">
      {/* 주요 통계 */}
      <Card>
        {/* 시스템 레벨 */}
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
            {t('stats.travelerLevel')}
            <span className="ml-1.5 normal-case tracking-normal">· {t('common.japan')} × {t('common.korea')}</span>
          </span>
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
        {showBoth ? (
          <div className="mt-5 space-y-2.5 border-t border-line pt-4">
            {countryRows.map(({ c, label, s }) => (
              <div key={c} className="flex items-center gap-3">
                <span className="text-sm font-semibold text-ink w-12 shrink-0">{label}</span>
                <span className="text-sm text-ink tabular-nums">
                  {s.visited}
                  <span className="text-faint"> / {s.total}</span>
                </span>
                <span className="flex-1 h-1 bg-paper rounded-full overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-seal"
                    style={{ width: `${s.completion}%` }}
                  />
                </span>
                <span className="text-xs text-muted tabular-nums w-16 text-right">
                  {t('stats.exp', { n: s.score })}
                </span>
              </div>
            ))}
          </div>
        ) : (
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
        )}
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

      {/* 지역별 점수 (방문 지역 + 기초 지역 점수) */}
      {scoreRows.length > 0 && (
        <Card>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">{t('stats.regionScores')}</h3>
            {muniTotalCount > 0 && (
              <span className="text-xs text-muted tabular-nums">
                {t('stats.muniTotal', { n: muniTotalScore, m: muniTotalCount })}
              </span>
            )}
          </div>

          <div className="space-y-0.5 max-h-72 overflow-y-auto pr-1">
            {scoreRows.map((r) => {
              const meta = getRegionMetadata(r.id)
              const name = meta ? regionDisplayName(meta, lang) : r.id
              return (
                <div key={r.id} className="flex items-center gap-2 py-1">
                  <span
                    className="w-3 h-3 rounded-[3px] shrink-0 border border-black/10"
                    style={{ backgroundColor: r.ownLevel > 0 ? EXP_COLORS[r.ownLevel] : 'var(--line)' }}
                  />
                  <span className="text-sm text-ink truncate">{name}</span>
                  {r.ownLevel > 0 && (
                    <span className="text-[11px] text-muted shrink-0">{levelLabel(r.ownLevel, lang)}</span>
                  )}
                  <span className="ml-auto text-xs text-muted tabular-nums shrink-0">
                    {r.muniCount > 0 ? t('stats.muniRow', { n: r.muniScore, m: r.muniCount }) : t('stats.points', { n: r.ownLevel })}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
