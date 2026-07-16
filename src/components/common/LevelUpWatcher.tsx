'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import { TOTAL_REGIONS } from '@/constants'
import { computeBadges } from '@/lib/badges'
import { countryStats, levelFromScore } from '@/lib/stats'
import { trackDistanceMeters } from '@/lib/geo'
import { tNow, useT, I18nKey } from '@/lib/i18n'
import { ev } from '@/lib/analytics'

/**
 * 레벨업/뱃지 달성 감지 워처
 * - 시스템 레벨 상승 시 축하 오버레이 표시
 * - 새 뱃지 달성 시 토스트 표시
 * (세션 중 변화만 감지 - 페이지 로드 시에는 발동하지 않음)
 */
export default function LevelUpWatcher() {
  const regions = useMapExpStore((s) => s.regions)
  const country = useMapExpStore((s) => s.country)
  const trackPoints = useGpsStore((s) => s.trackPoints)

  const prevLevelRef = useRef<number | null>(null)
  const prevBadgesRef = useRef<Set<string> | null>(null)
  const prevCountryRef = useRef(country)
  const [celebration, setCelebration] = useState<number | null>(null)
  const t = useT()

  useEffect(() => {
    // 여행자 레벨은 양국 합산 - 국가 전환으로 출렁이지 않음
    const level = levelFromScore(countryStats(regions, 'japan').score + countryStats(regions, 'korea').score)
    const trackKm = trackDistanceMeters(trackPoints) / 1000
    const achieved = new Set(
      computeBadges(regions, TOTAL_REGIONS[country], trackKm, country)
        .filter((b) => b.achieved)
        .map((b) => b.id),
    )

    // 첫 실행 또는 국가 전환: 기준값만 저장
    // (뱃지는 국가별 집계라, 전환 직후 비교하면 이미 달성한 뱃지가 새로 딴 것처럼 토스트됨)
    if (prevLevelRef.current === null || prevBadgesRef.current === null || country !== prevCountryRef.current) {
      prevLevelRef.current = level
      prevBadgesRef.current = achieved
      prevCountryRef.current = country
      return
    }

    // 레벨업 감지
    if (level > prevLevelRef.current) {
      setCelebration(level)
      ev('level_up', { level })
      setTimeout(() => setCelebration(null), 2500)
    }
    prevLevelRef.current = level

    // 새 뱃지 감지
    const badges = computeBadges(regions, TOTAL_REGIONS[country], trackKm, country)
    for (const badge of badges) {
      if (badge.achieved && !prevBadgesRef.current.has(badge.id)) {
        toast(tNow('levelup.badgeToast', { name: tNow(`badge.${badge.id}.name` as I18nKey) }), {
          duration: 4000,
          style: {
            background: 'var(--seal)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
          },
        })
      }
    }
    prevBadgesRef.current = achieved
  }, [regions, country, trackPoints])

  if (celebration === null) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* 레벨업: 인주 도장이 쿵 찍히는 연출 */}
      <div className="animate-levelup w-44 h-44 rounded-full border-[5px] border-seal bg-seal-soft/95 flex flex-col items-center justify-center text-seal shadow-[0_8px_32px_rgba(190,58,43,0.35)]">
        <span className="text-[11px] font-bold tracking-[0.3em] uppercase">{t('levelup.title')}</span>
        <span className="text-6xl font-bold leading-none mt-1 tabular-nums">{celebration}</span>
        <span className="text-xs font-medium mt-1.5">{t('levelup.sub')}</span>
      </div>
    </div>
  )
}
