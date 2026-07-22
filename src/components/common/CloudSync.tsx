'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { useMapExpStore } from '@/store'
import { pullCloudData, pushCloudData, mergeSnapshots } from '@/lib/cloudSync'

/**
 * 헤드리스: 회원 인증 초기화 + 계정 클라우드 동기화.
 * - 로그인하면 서버 스냅샷을 받아 로컬과 손실 없이 병합하고, 병합본을 서버에 되돌려 저장
 * - 이후 로컬 기록이 바뀌면 디바운스 후 서버로 push
 * 공유 열람(viewer) 중에는 동기화하지 않는다 (남의 데이터를 내 계정에 저장하면 안 됨).
 */
export default function CloudSync() {
  const init = useAuthStore((s) => s.init)
  const user = useAuthStore((s) => s.user)
  const hydratedForUser = useRef<string | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    init()
  }, [init])

  // 로그인 시: 서버 ↔ 로컬 병합 후 반영, 병합본 서버 저장
  useEffect(() => {
    if (!user) {
      hydratedForUser.current = null
      return
    }
    if (hydratedForUser.current === user.id) return

    let cancelled = false
    ;(async () => {
      const store = useMapExpStore.getState()
      if (store.isViewer) return // 공유 열람 중엔 건드리지 않음
      const local = store.exportData()
      const remote = await pullCloudData(user.id)
      if (cancelled) return
      const merged = mergeSnapshots(local, remote)
      useMapExpStore.getState().importData(merged)
      hydratedForUser.current = user.id
      await pushCloudData(user.id, merged)
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  // 로컬 변경 → 서버 push (디바운스 1.5s)
  useEffect(() => {
    if (!user) return
    const unsub = useMapExpStore.subscribe((state, prev) => {
      if (state.regions === prev.regions && state.country === prev.country) return
      if (state.isViewer) return
      if (hydratedForUser.current !== user.id) return // 최초 병합 완료 전엔 push 금지
      if (pushTimer.current) clearTimeout(pushTimer.current)
      pushTimer.current = setTimeout(() => {
        const u = useAuthStore.getState().user
        if (!u) return
        pushCloudData(u.id, useMapExpStore.getState().exportData())
      }, 1500)
    })
    return () => {
      unsub()
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [user])

  return null
}
