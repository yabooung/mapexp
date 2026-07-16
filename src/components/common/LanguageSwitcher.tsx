'use client'

import { useState, useRef, useEffect } from 'react'
import { useMapExpStore } from '@/store'
import { useLang, Lang } from '@/lib/i18n'
import Icon from '@/components/common/Icon'

const OPTIONS: Array<{ value: Lang; label: string; short: string }> = [
  { value: 'ko', label: '한국어', short: '한' },
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'ja', label: '日本語', short: '日' },
]

/**
 * 헤더용 언어 드롭다운 — 지구본 아이콘 + 현재 언어, 클릭 시 목록
 */
export default function LanguageSwitcher() {
  const lang = useLang()
  const updateSettings = useMapExpStore((s) => s.updateSettings)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // 바깥 클릭으로 닫기
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const current = OPTIONS.find((o) => o.value === lang) ?? OPTIONS[0]

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
          open ? 'bg-paper text-ink' : 'text-muted hover:text-ink hover:bg-paper'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        <Icon name="globe" size={17} />
        {/* 한/EN/日 폭 차이로 헤더가 흔들리지 않게 고정 폭 */}
        <span className="text-xs font-semibold w-5 text-center">{current.short}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 w-32 bg-card border border-line rounded-lg shadow-[0_6px_20px_rgba(38,35,28,0.14)] py-1 z-[1300]"
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              role="option"
              aria-selected={lang === opt.value}
              onClick={() => {
                // 지명 언어를 '자동'으로 되돌려 지도 라벨도 새 언어를 따르게 한다.
                // (지도 패널에서 지명 언어를 직접 고르면 그때부터 지도만 따로 감)
                updateSettings({ language: opt.value, mapLanguage: 'auto' })
                setOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                lang === opt.value ? 'text-ink font-semibold' : 'text-muted hover:text-ink hover:bg-paper'
              }`}
            >
              {opt.label}
              {lang === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-seal" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
