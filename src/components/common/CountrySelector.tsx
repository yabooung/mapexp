'use client'

import { useMapExpStore } from '@/store'
import { useT } from '@/lib/i18n'

/**
 * 국가 선택 컴포넌트
 */
export default function CountrySelector() {
  const { country, setCountry } = useMapExpStore()
  const t = useT()

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
        {t('common.japan')}
      </button>
      <button
        onClick={() => setCountry('korea')}
        className={`px-4 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${
          country === 'korea'
            ? 'bg-ink text-paper'
            : 'text-muted hover:text-ink'
        }`}
      >
        {t('common.korea')}
      </button>
    </div>
  )
}
