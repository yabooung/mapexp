'use client'

import { useState, useEffect } from 'react'
import Icon from '@/components/common/Icon'
import { useT } from '@/lib/i18n'

const STORAGE_KEY = 'mapexp_onboarded'

/**
 * 첫 방문 온보딩 카드 — 지도 위에 한 번만 표시
 */
export default function OnboardingHint() {
  const [show, setShow] = useState(false)
  const t = useT()

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true)
    } catch {
      // localStorage 접근 불가 환경(시크릿 모드 등)에서는 표시하지 않음
    }
  }, [])

  const dismiss = () => {
    setShow(false)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // 무시
    }
  }

  if (!show) return null

  return (
    <div className="absolute inset-x-4 bottom-20 lg:bottom-6 lg:inset-x-auto lg:right-6 lg:w-80 z-[1200]">
      <div className="bg-card border border-line rounded-xl shadow-[0_8px_28px_rgba(38,35,28,0.18)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="w-7 h-7 rounded-md bg-seal text-white flex items-center justify-center text-sm font-bold"
            style={{ transform: 'rotate(-3deg)' }}
          >
            経
          </span>
          <h3 className="text-sm font-bold text-ink">{t('onboard.title')}</h3>
        </div>

        <ul className="space-y-2.5 text-[13px] text-ink">
          <li className="flex items-start gap-2.5">
            <Icon name="map" size={15} className="text-seal mt-0.5 shrink-0" />
            <span>{t('onboard.tap')}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Icon name="locate" size={15} className="text-seal mt-0.5 shrink-0" />
            <span>{t('onboard.gps')}</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Icon name="share" size={15} className="text-seal mt-0.5 shrink-0" />
            <span>{t('onboard.share')}</span>
          </li>
        </ul>

        <button
          onClick={dismiss}
          className="mt-4 w-full py-2 bg-ink text-paper rounded-md text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all"
        >
          {t('onboard.start')}
        </button>
      </div>
    </div>
  )
}
