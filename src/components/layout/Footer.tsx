'use client'

import Link from 'next/link'
import { APP_NAME, APP_VERSION } from '@/constants'
import { useT } from '@/lib/i18n'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const t = useT()

  return (
    <footer className="bg-card border-t border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-muted">
            © {currentYear} {APP_NAME} <span className="text-faint">v{APP_VERSION}</span>
          </div>

          {/* 프라이버시 한 줄 + 법률 문서 링크 */}
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="hidden sm:inline">{t('footer.privacy')}</span>
            <Link href="/privacy" className="hover:text-ink transition-colors">
              {t('footer.privacyPolicy')}
            </Link>
            <span className="text-faint">·</span>
            <Link href="/terms" className="hover:text-ink transition-colors">
              {t('footer.terms')}
            </Link>
          </div>

          <a
            href="https://github.com/yabooung/mapexp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            GitHub
          </a>
        </div>

        {/* 데이터 출처 (라이선스 표기) */}
        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          {t('footer.sources')}{' '}
          <a href="https://nlftp.mlit.go.jp/ksj/" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted">
            国土数値情報 (N03)
          </a>
          {' · '}
          <a href="https://github.com/smartnews-smri/japan-topography" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted">
            smartnews-smri/japan-topography
          </a>
          {' · '}
          <a href="https://github.com/southkorea/southkorea-maps" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted">
            southkorea-maps (KOSTAT)
          </a>
          {' · '}
          <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted">
            CARTO
          </a>
          {' / '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted">
            OpenStreetMap
          </a>
        </p>

        {/* 경현치(経県値) 개념 원조 크레딧 - 経県値는 uub.jp의 등록상표 */}
        <p className="mt-1.5 text-[11px] text-faint">
          {t('footer.concept')}{' '}
          <a href="https://uub.jp/kkn/" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted">
            都道府県市区町村 (uub.jp)
          </a>
        </p>
      </div>
    </footer>
  )
}
