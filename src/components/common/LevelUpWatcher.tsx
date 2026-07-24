'use client'

import { useEffect, useRef, useState } from 'react'
import toast from '@/lib/appToast'
import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import { TOTAL_REGIONS, STORAGE_KEYS } from '@/constants'
import { computeBadges } from '@/lib/badges'
import { countryStats, levelFromScore } from '@/lib/stats'
import { trackDistanceMeters } from '@/lib/geo'
import { tNow, useT, useLang, I18nKey } from '@/lib/i18n'
import { ev } from '@/lib/analytics'

/**
 * 레벨업/뱃지 달성 감지 워처
 * - 시스템 레벨 상승 시 축하 오버레이 표시
 * - 새 뱃지 달성 시 토스트 표시
 * (세션 중 변화만 감지 - 페이지 로드 시에는 발동하지 않음)
 *
 * 뱃지 기준값은 localStorage에 남긴다 — 세션 ref만 쓰면 마운트 직후(빈/병합 전 상태)가
 * 기준이 되어, 클라우드 병합·재수화로 regions가 교체될 때마다 이미 딴 뱃지가
 * 전부 새 달성처럼 다시 토스트된다.
 */
type CountryKey = 'japan' | 'korea'

function readSeenBadges(country: CountryKey): Set<string> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEEN_BADGES)
    if (!raw) return null
    const list = (JSON.parse(raw) as Partial<Record<CountryKey, string[]>>)[country]
    return Array.isArray(list) ? new Set(list) : null
  } catch {
    return null
  }
}

function writeSeenBadges(country: CountryKey, ids: Set<string>) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEEN_BADGES)
    const parsed = (raw ? JSON.parse(raw) : {}) as Partial<Record<CountryKey, string[]>>
    parsed[country] = [...ids]
    localStorage.setItem(STORAGE_KEYS.SEEN_BADGES, JSON.stringify(parsed))
  } catch {
    // 저장 실패 시 세션 ref 기준으로만 동작
  }
}

function readSeenLevel(country: CountryKey): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEEN_LEVEL)
    if (!raw) return null
    const v = (JSON.parse(raw) as Partial<Record<CountryKey, number>>)[country]
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

function writeSeenLevel(country: CountryKey, level: number) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEEN_LEVEL)
    const parsed = (raw ? JSON.parse(raw) : {}) as Partial<Record<CountryKey, number>>
    parsed[country] = level
    localStorage.setItem(STORAGE_KEYS.SEEN_LEVEL, JSON.stringify(parsed))
  } catch {
    // 저장 실패 시 세션 ref 기준으로만 동작
  }
}

export default function LevelUpWatcher() {
  const regions = useMapExpStore((s) => s.regions)
  const country = useMapExpStore((s) => s.country)
  const isViewer = useMapExpStore((s) => s.isViewer)
  const trackPoints = useGpsStore((s) => s.trackPoints)

  const prevLevelRef = useRef<number | null>(null)
  const prevBadgesRef = useRef<Set<string> | null>(null)
  const prevCountryRef = useRef(country)
  const [celebration, setCelebration] = useState<number | null>(null)
  const t = useT()
  const lang = useLang()

  useEffect(() => {
    // 공유 열람 중: 남의 기록으로 축하·토스트하거나 내 기준값을 오염시키면 안 됨
    if (isViewer) return

    // 여행자 레벨은 국가 탭을 따라감 (StatsPanel과 동일). 국가 전환 시엔 기준값만
    // 리셋해 가짜 레벨업이 뜨지 않게 한다.
    const level = levelFromScore(countryStats(regions, country).score)
    const trackKm = trackDistanceMeters(trackPoints) / 1000
    const badges = computeBadges(regions, TOTAL_REGIONS[country], trackKm, country, lang)
    const achieved = new Set(badges.filter((b) => b.achieved).map((b) => b.id))
    const countrySwitch = country !== prevCountryRef.current

    // 레벨업 감지: 기준은 세션 ref → 없으면 localStorage — 뱃지와 같은 이유로,
    // 새로고침 후 클라우드 병합이 점수를 되살릴 때마다 축하가 다시 뜨지 않게 한다.
    // 기준은 최고값으로만 갱신해 일시적 빈 상태에도 줄어들지 않는다.
    const baseLevel = countrySwitch ? readSeenLevel(country) : (prevLevelRef.current ?? readSeenLevel(country))
    if (baseLevel !== null && level > baseLevel) {
      setCelebration(level)
      ev('level_up', { level })
      setTimeout(() => setCelebration(null), 2500)
    }
    const topLevel = Math.max(level, baseLevel ?? level)
    prevLevelRef.current = topLevel
    prevCountryRef.current = country
    writeSeenLevel(country, topLevel)

    // 새 뱃지 감지: 기준은 세션 ref → 없으면 localStorage (국가 전환 시엔 저장분으로 재조회)
    // 저장된 기준이 아예 없으면(최초 사용) 토스트 없이 현재 달성분을 기준으로 삼는다.
    const seen = countrySwitch ? readSeenBadges(country) : (prevBadgesRef.current ?? readSeenBadges(country))
    if (seen) {
      for (const badge of badges) {
        if (badge.achieved && !seen.has(badge.id)) {
          // 광역 완주 도장은 동적 생성이라 i18n 키가 없음 → badge.name 사용
          const badgeName = badge.id.startsWith('pref-complete-')
            ? badge.name
            : tNow(`badge.${badge.id}.name` as I18nKey)
          toast(tNow('levelup.badgeToast', { name: badgeName }), {
            duration: 4000,
            style: {
              background: badge.kind === 'region' ? 'var(--region)' : 'var(--seal)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
            },
          })
        }
      }
    }
    // 기준은 누적(합집합)으로 유지 — 마운트 직후 빈 상태로 한 번 돌아도 기준이
    // 줄어들지 않아, 이후 재수화/병합 때 기존 뱃지가 다시 토스트되지 않는다.
    const union = seen ? new Set([...seen, ...achieved]) : achieved
    prevBadgesRef.current = union
    writeSeenBadges(country, union)
  }, [regions, country, isViewer, trackPoints, lang])

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
