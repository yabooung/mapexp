'use client'

import { useState, useEffect, useRef } from 'react'
import Icon from '@/components/common/Icon'
import { useT } from '@/lib/i18n'

const STORAGE_KEY = 'mapexp_onboarded'

/**
 * 첫 방문 온보딩 카드 — 지도 위에 한 번만 표시.
 * 핵심 행동(탭=도장) 한 줄만 크게, 나머지는 보조 한 줄로.
 * 카드 밖(지도)을 탭해도 닫힌다 - 첫 탭이 곧 첫 도장이 되는 흐름.
 */
export default function OnboardingHint() {
  const [show, setShow] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
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

  // 카드 밖을 탭하면 닫기 (지도 첫 탭을 막지 않도록 캡처 단계가 아닌 일반 리스너)
  useEffect(() => {
    if (!show) return
    const onPointerDown = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) dismiss()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  if (!show) return null

  return (
    <div className="absolute inset-x-4 bottom-20 lg:bottom-6 lg:inset-x-auto lg:right-6 lg:w-80 z-[1200]">
      <div ref={cardRef} className="bg-card border border-line rounded-xl shadow-[0_8px_28px_rgba(38,35,28,0.18)] p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="w-7 h-7 rounded-md bg-seal text-white flex items-center justify-center text-sm font-bold"
            style={{ transform: 'rotate(-3deg)' }}
          >
            経
          </span>
          <h3 className="text-sm font-bold text-ink">{t('onboard.title')}</h3>
        </div>

        <p className="flex items-start gap-2.5 text-[14px] font-medium text-ink">
          <Icon name="map" size={16} className="text-seal mt-0.5 shrink-0" />
          <span>{t('onboard.tap')}</span>
        </p>
        <p className="mt-2 text-xs text-muted pl-[26px]">{t('onboard.sub')}</p>

        <button
          onClick={dismiss}
          className="mt-3.5 w-full py-2 bg-ink text-paper rounded-md text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all"
        >
          {t('onboard.start')}
        </button>
      </div>
    </div>
  )
}
