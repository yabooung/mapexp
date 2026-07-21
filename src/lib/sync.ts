import { MapExpData } from '@/types'

/**
 * 기기 간 동기화 클라이언트 (계정 없음, 코드 방식).
 * - pushSync: 내 기록을 서버에 올리고 코드 발급
 * - pullSync: 코드로 남/내 다른 기기의 기록을 불러옴
 * 서버가 미설정(503)이면 SyncNotConfiguredError를 던진다.
 */

export class SyncNotConfiguredError extends Error {
  constructor() {
    super('sync_not_configured')
    this.name = 'SyncNotConfiguredError'
  }
}

export interface PushResult {
  code: string
  ttlDays: number
}

/** 스냅샷 업로드 → 공유/복원용 코드 반환 */
export async function pushSync(data: MapExpData): Promise<PushResult> {
  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (res.status === 503) throw new SyncNotConfiguredError()
  if (!res.ok) throw new Error(`push_failed_${res.status}`)
  return (await res.json()) as PushResult
}

/** 코드로 스냅샷 다운로드 (없으면 null) */
export async function pullSync(code: string): Promise<MapExpData | null> {
  const normalized = code.trim().toUpperCase()
  const res = await fetch(`/api/sync?code=${encodeURIComponent(normalized)}`)
  if (res.status === 503) throw new SyncNotConfiguredError()
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`pull_failed_${res.status}`)
  const json = (await res.json()) as { data: MapExpData }
  return json.data
}
