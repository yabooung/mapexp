'use client'

import { useState } from 'react'
import ShareModal from '@/components/share/ShareModal'
import SettingsModal from '@/components/common/SettingsModal'
import Icon from '@/components/common/Icon'

export default function Header() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

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
                <p className="hidden sm:block text-[11px] text-muted mt-0.5">일본 경현치 지도</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* 공유 버튼 */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-ink text-paper rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
              >
                <Icon name="share" size={15} />
                공유
              </button>

              {/* 설정 버튼 */}
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 text-muted hover:text-ink hover:bg-paper rounded-md transition-colors"
                aria-label="설정"
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
