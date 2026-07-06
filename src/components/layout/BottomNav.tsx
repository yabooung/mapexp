'use client'

import { useGpsStore } from '@/store/gps'
import Icon, { IconName } from '@/components/common/Icon'
import { useT, I18nKey } from '@/lib/i18n'

export type MobileTab = 'map' | 'list' | 'stats'

interface BottomNavProps {
  tab: MobileTab
  onChange: (tab: MobileTab) => void
}

const TABS: Array<{ id: MobileTab; icon: IconName; labelKey: I18nKey }> = [
  { id: 'map', icon: 'map', labelKey: 'nav.map' },
  { id: 'list', icon: 'list', labelKey: 'nav.list' },
  { id: 'stats', icon: 'chart', labelKey: 'nav.stats' },
]

/**
 * 모바일 하단 탭 네비게이션 (lg 미만에서만 표시)
 */
export default function BottomNav({ tab, onChange }: BottomNavProps) {
  const isTracking = useGpsStore((s) => s.isTracking)
  const t = useT()

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[1100] bg-card border-t border-line pb-safe">
      <div className="flex">
        {TABS.map(({ id, icon, labelKey }) => {
          const label = t(labelKey)
          return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors relative ${
              tab === id ? 'text-seal' : 'text-muted active:text-ink'
            }`}
            aria-label={label}
          >
            <Icon name={icon} size={20} strokeWidth={tab === id ? 2 : 1.7} />
            <span className={`text-[11px] leading-none ${tab === id ? 'font-semibold' : 'font-medium'}`}>
              {label}
            </span>
            {/* 트랙 기록 중 표시 */}
            {id === 'map' && isTracking && (
              <span className="absolute top-1.5 right-1/2 translate-x-5 w-1.5 h-1.5 bg-seal rounded-full animate-pulse" />
            )}
          </button>
          )
        })}
      </div>
    </nav>
  )
}
