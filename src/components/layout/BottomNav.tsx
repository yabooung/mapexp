'use client'

import { useGpsStore } from '@/store/gps'

export type MobileTab = 'map' | 'list' | 'stats'

interface BottomNavProps {
  tab: MobileTab
  onChange: (tab: MobileTab) => void
}

const TABS: Array<{ id: MobileTab; icon: string; label: string }> = [
  { id: 'map', icon: '🗺️', label: '지도' },
  { id: 'list', icon: '📋', label: '리스트' },
  { id: 'stats', icon: '📊', label: '통계' },
]

/**
 * 모바일 하단 탭 네비게이션 (lg 미만에서만 표시)
 */
export default function BottomNav({ tab, onChange }: BottomNavProps) {
  const isTracking = useGpsStore((s) => s.isTracking)

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[1100] bg-white/95 backdrop-blur border-t border-gray-200 pb-safe">
      <div className="flex">
        {TABS.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative ${
              tab === id ? 'text-blue-600' : 'text-gray-500 active:text-gray-700'
            }`}
            aria-label={label}
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className={`text-[11px] leading-none ${tab === id ? 'font-bold' : 'font-medium'}`}>
              {label}
            </span>
            {/* 트랙 기록 중 표시 */}
            {id === 'map' && isTracking && (
              <span className="absolute top-1.5 right-1/2 translate-x-5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
