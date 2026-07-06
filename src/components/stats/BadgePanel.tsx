'use client'

import { useState, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import { TOTAL_REGIONS } from '@/constants'
import { computeBadges } from '@/lib/badges'
import { trackDistanceMeters } from '@/lib/geo'
import Card from '@/components/common/Card'

/**
 * 뱃지 패널 — 낙관(落款) 도장 스타일.
 * 달성한 업적은 인주 도장이 찍히고, 미달성은 빈 원과 진행 바로 표시된다.
 */
export default function BadgePanel() {
  const [mounted, setMounted] = useState(false)
  const { country, regions } = useMapExpStore()
  const trackPoints = useGpsStore((s) => s.trackPoints)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const trackKm = trackDistanceMeters(trackPoints) / 1000
  const badges = computeBadges(regions, TOTAL_REGIONS[country], trackKm, country)
  const achievedCount = badges.filter((b) => b.achieved).length

  return (
    <Card>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">도장첩</h3>
        <span className="text-xs text-muted tabular-nums">
          {achievedCount} / {badges.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
        {badges.map((badge, i) => (
          <div
            key={badge.id}
            className="flex flex-col items-center text-center"
            title={`${badge.name}: ${badge.description}`}
          >
            {/* 도장 */}
            <span
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold select-none leading-none ${
                badge.achieved
                  ? 'bg-seal text-white'
                  : 'border-[1.5px] border-dashed border-line text-faint bg-transparent'
              } ${badge.icon.length > 1 ? 'text-[13px]' : 'text-lg'}`}
              style={badge.achieved ? { transform: `rotate(${((i % 5) - 2) * 4}deg)` } : undefined}
            >
              {badge.icon}
            </span>
            <span className={`mt-1.5 text-[10px] leading-tight break-keep ${badge.achieved ? 'text-ink font-medium' : 'text-muted'}`}>
              {badge.name}
            </span>
            {!badge.achieved && badge.progress > 0 && (
              <span className="mt-1 w-9 bg-paper rounded-full h-0.5 overflow-hidden">
                <span
                  className="block bg-faint h-full"
                  style={{ width: `${Math.round(badge.progress * 100)}%` }}
                />
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
