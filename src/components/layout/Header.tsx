'use client'

import { useMapExpStore } from '@/store'
import { APP_NAME } from '@/constants'

export default function Header() {
  const { country, setCountry } = useMapExpStore()

  const toggleCountry = () => {
    setCountry(country === 'japan' ? 'korea' : 'japan')
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고/타이틀 */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">{APP_NAME}</h1>
            <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              Beta
            </span>
          </div>

          {/* 국가 선택 토글 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">국가:</span>
              <button
                onClick={toggleCountry}
                className="relative inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="국가 변경"
              >
                <span className="text-2xl">
                  {country === 'japan' ? '🇯🇵' : '🇰🇷'}
                </span>
                <span className="font-medium text-gray-900">
                  {country === 'japan' ? '일본' : '한국'}
                </span>
              </button>
            </div>

            {/* 메뉴 버튼 (나중에 구현) */}
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="메뉴"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}



