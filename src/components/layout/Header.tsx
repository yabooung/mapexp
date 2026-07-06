'use client'

import { useState } from 'react'
import ShareModal from '@/components/share/ShareModal'
import SettingsModal from '@/components/common/SettingsModal'
import Icon from '@/components/common/Icon'
import LanguageSwitcher from '@/components/common/LanguageSwitcher'
import { useMapExpStore } from '@/store'
import { useT } from '@/lib/i18n'

export default function Header() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const { country, setCountry } = useMapExpStore()
  const t = useT()

  return (
    <>
      <header className="bg-card border-b border-line shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* 워드마크: 인장 + MAPEXP */}
            <div className="flex items-center gap-2.5">
              <span
                className="w-8 h-8 rounded-[6px] bg-seal text-white flex items-center justify-center text-[15px] font-bold select-none"
                aria-hidden="true"
                style={{ transform: 'rotate(-3deg)' }}
              >
                経
              </span>
              <div className="leading-none">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-ink">MAPEXP</h1>
                <p className="hidden sm:block text-[11px] text-muted mt-0.5">{t('app.subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* 국가 전환 (모든 화면 크기에서 노출) */}
              <div className="inline-flex rounded-md border border-line bg-card p-0.5">
                {(
                  [
                    ['japan', 'JP'],
                    ['korea', 'KR'],
                  ] as const
                ).map(([c, label]) => (
                  <button
                    key={c}
                    onClick={() => setCountry(c)}
                    className={`px-2 py-1 rounded-[4px] text-[11px] font-bold tracking-wide transition-colors ${
                      country === c ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                    }`}
                    aria-label={t(c === 'japan' ? 'common.japan' : 'common.korea')}
                    title={t(c === 'japan' ? 'common.japan' : 'common.korea')}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 언어 전환 */}
              <LanguageSwitcher />

              {/* 공유 버튼 */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-ink text-paper rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
              >
                <Icon name="share" size={15} />
                {t('common.share')}
              </button>

              {/* 설정 버튼 */}
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 text-muted hover:text-ink hover:bg-paper rounded-md transition-colors"
                aria-label={t('common.settings')}
              >
                <Icon name="gear" size={19} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  )
}
