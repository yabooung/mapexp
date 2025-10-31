'use client'

import { APP_NAME, APP_VERSION } from '@/constants'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* 왼쪽: 저작권 정보 */}
          <div className="text-sm text-gray-600">
            © {currentYear} {APP_NAME}. All rights reserved.
          </div>

          {/* 가운데: 버전 정보 */}
          <div className="text-xs text-gray-500">
            Version {APP_VERSION}
          </div>

          {/* 오른쪽: 링크들 */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              GitHub
            </a>
            <a
              href="#"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              도움말
            </a>
            <a
              href="#"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              피드백
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}



