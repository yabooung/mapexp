'use client'

import { useEffect } from 'react'
import { useMapExpStore } from '@/store'

/**
 * 데이터 손실 방지 — 영속 저장소 요청.
 *
 * 브라우저는 저장 공간이 부족하면 localStorage를 자동 삭제(eviction)할 수 있고,
 * Safari(ITP)는 방문이 뜸하면 7일 후 사이트 데이터를 지운다.
 * navigator.storage.persist()로 "영속" 권한을 얻으면 이런 자동 삭제 대상에서 제외된다.
 *
 * 기록이 실제로 생겼을 때 요청한다 (지킬 데이터가 있을 때).
 */
export default function StoragePersist() {
  const hasData = useMapExpStore((s) => s.regions.length > 0)

  useEffect(() => {
    if (!hasData) return
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return

    navigator.storage
      .persisted()
      .then((already) => {
        if (!already) navigator.storage.persist().catch(() => {})
      })
      .catch(() => {})
  }, [hasData])

  return null
}
