/**
 * 자동 백업 알림(넛지) 상태 관리.
 *
 * 데이터는 브라우저 localStorage에만 있어(서버·계정 없음), 캐시 삭제·기기 교체 시
 * 사라진다. 진짜 자동 백업은 서버 없이는 불가능하므로, 대신 "백업할 때가 됐다"고
 * 주기적으로 알려 사용자가 JSON을 직접 내보내도록 유도한다.
 *
 * 저장 키:
 *  - mapexp_backup_meta  : 마지막 백업 시각/기록 수 { at, count }
 *  - mapexp_backup_snooze: 알림 다시 보이지 않을 시각(ISO) - '나중에' 누르면 연기
 */

const META_KEY = 'mapexp_backup_meta'
const SNOOZE_KEY = 'mapexp_backup_snooze'

/** 첫 백업 알림을 띄우기 위한 최소 기록 수 (너무 적으면 잃어도 아깝지 않으니 조용히) */
const MIN_RECORDS = 3
/** 마지막 백업 이후 이 일수가 지나면 다시 알림 */
const INTERVAL_DAYS = 14
/** '나중에'를 누르면 이 일수만큼 연기 */
const SNOOZE_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

interface BackupMeta {
  at: string
  count: number
}

function readJson<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** 내보내기/백업 다운로드가 성공했을 때 호출 - 마지막 백업 시각과 기록 수를 갱신 */
export function recordBackup(count: number, atMs: number): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ at: new Date(atMs).toISOString(), count }))
    localStorage.removeItem(SNOOZE_KEY) // 백업했으니 연기 상태도 해제
  } catch {
    // 저장 실패는 무시 (알림 로직이 다음 기회에 다시 판단)
  }
}

/** '나중에' 선택 - SNOOZE_DAYS 동안 알림을 띄우지 않는다 */
export function snoozeReminder(nowMs: number): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SNOOZE_KEY, new Date(nowMs + SNOOZE_DAYS * DAY_MS).toISOString())
  } catch {
    // 무시
  }
}

/**
 * 지금 백업 알림을 띄워야 하는지 판단.
 * @param currentCount 현재 기록(regions) 수
 * @param nowMs        현재 시각(ms) - 호출부에서 주입(테스트/결정성)
 */
export function shouldRemind(currentCount: number, nowMs: number): boolean {
  if (currentCount < MIN_RECORDS) return false

  // 연기 중이면 조용히
  const snooze = readJson<string>(SNOOZE_KEY)
  if (snooze && nowMs < new Date(snooze).getTime()) return false

  const meta = readJson<BackupMeta>(META_KEY)

  // 한 번도 백업한 적 없음 → 쌓인 기록이 있으니 알림
  if (!meta || !meta.at) return true

  // 백업 이후 새로 추가/변경된 기록이 없으면 조를 이유가 없다
  if (currentCount <= meta.count) return false

  const daysSince = (nowMs - new Date(meta.at).getTime()) / DAY_MS
  return daysSince >= INTERVAL_DAYS
}
