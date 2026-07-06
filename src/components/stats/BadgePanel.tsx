'use client'

import { useState, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import { TOTAL_REGIONS } from '@/constants'
import { computeBadges } from '@/lib/badges'
import { trackDistanceMeters } from '@/lib/geo'
import Card from '@/components/common/Card'

/**
 * 뱃지(업적) 패널
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
  const badges = computeBadges(regions, TOTAL_REGIONS[country], trackKm)
  const achievedCount = badges.filter((b) => b.achieved).length

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-semibold text-gray-900">🎖️ 뱃지</h3>
        <span className="text-xs font-medium text-gray-500">
          {achievedCount}/{badges.length}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`relative flex flex-col items-center p-2 rounded-lg text-center transition-all ${
              badge.achieved ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-gray-50 opacity-60'
            }`}
            title={`${badge.name}: ${badge.description}`}
          >
            <span className={`text-2xl ${badge.achieved ? '' : 'grayscale'}`}>{badge.icon}</span>
            <span className="text-[10px] font-medium text-gray-700 mt-1 leading-tight break-keep">
              {badge.name}
            </span>
            {!badge.achieved && badge.progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all"
                  style={{ width: `${Math.round(badge.progress * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
