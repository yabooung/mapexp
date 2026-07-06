'use client'

import { useMapExpStore } from '@/store'

/**
 * 국가 선택 컴포넌트
 */
export default function CountrySelector() {
  const { country, setCountry } = useMapExpStore()

  return (
    <div className="inline-flex rounded-md border border-line bg-card p-0.5">
      <button
        onClick={() => setCountry('japan')}
        className={`px-4 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${
          country === 'japan'
            ? 'bg-ink text-paper'
            : 'text-muted hover:text-ink'
        }`}
      >
        일본
      </button>
      {/* 한국 버전 비활성화 (추후 확장 시 주석 해제) */}
      {/* 
      <button
        onClick={() => setCountry('korea')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          country === 'korea'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <span className="mr-2">🇰🇷</span>
        한국
      </button> 
      */}
    </div>
  )
}
