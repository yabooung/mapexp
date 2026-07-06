'use client'

import { useEffect } from 'react'

/**
 * PWA 서비스 워커 등록 (프로덕션에서만)
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return
    }

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err)
    })
  }, [])

  return null
}
