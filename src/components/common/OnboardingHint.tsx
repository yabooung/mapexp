'use client'

import { useState, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import Icon, { IconName } from '@/components/common/Icon'
import { useT, useLang, levelLabel, muniTerm, I18nKey, type Lang } from '@/lib/i18n'

const STORAGE_KEY = 'mapexp_onboarded'

const LANG_OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

/**
 * 첫 방문 웰컴 모달 — 언어 선택 + 간단 매뉴얼을 한 번만 보여준다.
 * 언어 버튼은 즉시 UI 전체에 반영되고(모달 텍스트 포함),
 * 첫 방문 감지와 같은 규칙으로 기본 국가도 함께 정한다 (한국어 → 한국 지도).
 */
export default function OnboardingHint() {
  const [show, setShow] = useState(false)
  const t = useT()
  const lang = useLang()
  const { updateSettings, setCountry, country } = useMapExpStore()
  const term = muniTerm(country, lang)

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

  // ESC로 닫기
  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  if (!show) return null

  const pickLang = (value: Lang) => {
    updateSettings({ language: value, mapLanguage: 'auto' })
    setCountry(value === 'ko' ? 'korea' : 'japan')
  }

  const manual: Array<{ icon: IconName; key: I18nKey }> = [
    { icon: 'map', key: 'onboard.tap' },
    { icon: 'pen', key: 'onboard.detail' },
    { icon: 'building', key: 'onboard.muni' },
    { icon: 'locate', key: 'onboard.gps' },
    { icon: 'share', key: 'onboard.privacy' },
  ]

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboard-title"
    >
      <div
        className="w-full max-w-sm bg-card border border-line rounded-2xl shadow-[0_12px_40px_rgba(38,35,28,0.25)] p-5 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 타이틀 */}
        <div className="flex items-center gap-2.5 mb-4">
          <span
            className="w-9 h-9 shrink-0 rounded-lg bg-seal text-white flex items-center justify-center text-[17px] font-bold"
            style={{ transform: 'rotate(-3deg)' }}
          >
            経
          </span>
          <h3 id="onboard-title" className="text-[15px] font-bold text-ink leading-snug">
            {t('onboard.title')}
          </h3>
        </div>

        {/* 언어 선택 - 누르면 즉시 전체 UI에 반영 */}
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => pickLang(opt.value)}
              className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                lang === opt.value
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-card text-muted border-line hover:text-ink hover:bg-paper'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 간단 매뉴얼 */}
        <ul className="space-y-2.5 text-[13px] text-ink leading-snug">
          {manual.map(({ icon, key }) => (
            <li key={key} className="flex items-start gap-2.5">
              <Icon name={icon} size={15} className="text-seal mt-0.5 shrink-0" />
              <span>{t(key, { term })}</span>
            </li>
          ))}
        </ul>

        {/* 등급 사다리 - 색이 곧 기록의 깊이라는 걸 첫 화면에서 보여준다 */}
        <div className="mt-4 pt-3.5 border-t border-line">
          <div className="flex items-center justify-between gap-1">
            {([1, 2, 3, 4, 5] as ExperienceGrade[]).map((lvl, i) => (
              <span key={lvl} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="w-full h-2.5 rounded-[3px] border border-black/10" style={{ backgroundColor: EXP_COLORS[lvl] }} />
                <span className="text-[10px] text-muted whitespace-nowrap">
                  {levelLabel(lvl, lang)}
                  {i === 0 || i === 4 ? ` ${lvl}` : ''}
                </span>
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={dismiss}
          className="mt-4 w-full py-2.5 bg-ink text-paper rounded-lg text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all"
        >
          {t('onboard.start')}
        </button>
      </div>
    </div>
  )
}
