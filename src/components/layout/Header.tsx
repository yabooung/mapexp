'use client'

import { useState } from 'react'
import ShareModal from '@/components/share/ShareModal'
import SettingsModal from '@/components/common/SettingsModal'
import AuthModal from '@/components/auth/AuthModal'
import HistoryModal from '@/components/history/HistoryModal'
import Icon from '@/components/common/Icon'
import LanguageSwitcher from '@/components/common/LanguageSwitcher'
import { useT } from '@/lib/i18n'
import { useAuthStore, isAuthEnabled } from '@/store/auth'

export default function Header() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const t = useT()
  const user = useAuthStore((s) => s.user)
  const authEnabled = isAuthEnabled()

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

            {/* 국가 전환 토글은 지도 우상단으로 이동 - 모바일 헤더 밀도 완화 */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* 언어 전환 */}
              <LanguageSwitcher />

              {/* 공유 버튼 - 모바일은 아이콘만 (텍스트 폭 차이로 흔들리지 않게 sm 이상만 최소 폭) */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2 sm:min-w-[5.75rem] bg-ink text-paper rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
                aria-label={t('common.share')}
              >
                <Icon name="share" size={16} />
                <span className="hidden sm:inline">{t('common.share')}</span>
              </button>

              {/* 계정 버튼 (회원 기능 설정된 경우만) - 로그인 시 인장색 강조 */}
              {authEnabled && (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className={`p-2 rounded-md transition-colors ${
                    user ? 'text-seal hover:bg-paper' : 'text-muted hover:text-ink hover:bg-paper'
                  }`}
                  aria-label={t('auth.title')}
                >
                  <Icon name="user" size={19} />
                </button>
              )}

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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </>
  )
}
