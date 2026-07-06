'use client'

import { useEffect } from 'react'

/**
 * 전역 에러 바운더리 — 런타임 에러 시 빈 화면 대신 복구 UI 표시
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <span
        className="w-12 h-12 rounded-full bg-seal text-white flex items-center justify-center text-xl font-bold"
        style={{ transform: 'rotate(-4deg)' }}
      >
        !
      </span>
      <h2 className="text-lg font-bold text-ink">문제가 발생했습니다</h2>
      <p className="text-sm text-muted max-w-sm">
        일시적인 오류일 수 있습니다. 기록은 기기에 안전하게 저장되어 있으니 다시 시도해주세요.
      </p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={reset}
          className="px-4 py-2 bg-ink text-paper rounded-md text-sm font-medium hover:opacity-90"
        >
          다시 시도
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-line text-ink rounded-md text-sm font-medium hover:bg-paper"
        >
          새로고침
        </button>
      </div>
    </div>
  )
}
