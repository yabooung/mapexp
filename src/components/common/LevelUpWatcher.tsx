'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import { TOTAL_REGIONS } from '@/constants'
import { computeBadges } from '@/lib/badges'
import { trackDistanceMeters } from '@/lib/geo'

/**
 * 레벨업/뱃지 달성 감지 워처
 * - 시스템 레벨 상승 시 축하 오버레이 표시
 * - 새 뱃지 달성 시 토스트 표시
 * (세션 중 변화만 감지 - 페이지 로드 시에는 발동하지 않음)
 */
export default function LevelUpWatcher() {
  const regions = useMapExpStore((s) => s.regions)
  const country = useMapExpStore((s) => s.country)
  const getSystemLevel = useMapExpStore((s) => s.getSystemLevel)
  const trackPoints = useGpsStore((s) => s.trackPoints)

  const prevLevelRef = useRef<number | null>(null)
  const prevBadgesRef = useRef<Set<string> | null>(null)
  const [celebration, setCelebration] = useState<number | null>(null)

  useEffect(() => {
    const level = getSystemLevel()
    const trackKm = trackDistanceMeters(trackPoints) / 1000
    const achieved = new Set(
      computeBadges(regions, TOTAL_REGIONS[country], trackKm)
        .filter((b) => b.achieved)
        .map((b) => b.id),
    )

    // 첫 실행: 기준값만 저장
    if (prevLevelRef.current === null || prevBadgesRef.current === null) {
      prevLevelRef.current = level
      prevBadgesRef.current = achieved
      return
    }

    // 레벨업 감지
    if (level > prevLevelRef.current) {
      setCelebration(level)
      setTimeout(() => setCelebration(null), 2500)
    }
    prevLevelRef.current = level

    // 새 뱃지 감지
    const badges = computeBadges(regions, TOTAL_REGIONS[country], trackKm)
    for (const badge of badges) {
      if (badge.achieved && !prevBadgesRef.current.has(badge.id)) {
        toast(`${badge.icon} 뱃지 획득: ${badge.name}!`, {
          duration: 4000,
          style: { background: '#FEF3C7', color: '#92400E', fontWeight: 600 },
        })
      }
    }
    prevBadgesRef.current = achieved
  }, [regions, country, trackPoints, getSystemLevel])

  if (celebration === null) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="animate-levelup bg-white/95 backdrop-blur rounded-2xl shadow-2xl px-10 py-8 text-center border-2 border-indigo-200">
        <div className="text-5xl mb-2">🎉</div>
        <div className="text-2xl font-bold text-indigo-600">LEVEL UP!</div>
        <div className="text-4xl font-black text-gray-900 mt-1">Lv.{celebration}</div>
      </div>
    </div>
  )
}
