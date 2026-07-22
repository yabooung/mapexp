import type { MapExpData, RegionExp, Visit } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { DATA_VERSION } from '@/constants'

/**
 * 계정 클라우드 동기화 (Supabase `map_data` 테이블).
 * - 로그인하면 서버 스냅샷을 받아 로컬과 병합 → 앱에 반영 → 병합본을 다시 서버에 저장
 * - 이후 로컬이 바뀔 때마다 디바운스 후 서버에 push
 *
 * 병합은 손실 없이(non-destructive): 지역별로 최고 등급 + 방문 기록 합집합.
 * 오프라인에서 편집했다가 로그인해도 어느 쪽 기록도 사라지지 않는다.
 */

const TABLE = 'map_data'

/** 방문 기록 합집합 (id 기준 중복 제거, GPS 인증 기록 보존) */
function mergeVisits(a: Visit[] | undefined, b: Visit[] | undefined): Visit[] | undefined {
  if (!a && !b) return undefined
  const byId = new Map<string, Visit>()
  for (const v of [...(a ?? []), ...(b ?? [])]) {
    if (!v?.id) continue
    // 기존 항목 유지 (먼저 들어온 원본 우선). GPS 사칭 방지는 스토어 병합이 담당.
    if (!byId.has(v.id)) byId.set(v.id, v)
  }
  const visits = [...byId.values()].sort(
    (x, y) => new Date(y.startDate).getTime() - new Date(x.startDate).getTime(),
  )
  return visits.length ? visits : undefined
}

function computeVisitStats(visits: Visit[] | undefined): { visitCount: number; totalNights: number } {
  if (!visits) return { visitCount: 0, totalNights: 0 }
  const totalNights = visits.reduce((sum, v) => {
    const diff = Math.abs(new Date(v.endDate).getTime() - new Date(v.startDate).getTime())
    return sum + Math.ceil(diff / (1000 * 60 * 60 * 24))
  }, 0)
  return { visitCount: visits.length, totalNights }
}

/** 지역 기록 병합 (등급은 max, 방문은 합집합) */
export function mergeRegions(local: RegionExp[], remote: RegionExp[]): RegionExp[] {
  const map = new Map<string, RegionExp>()
  const add = (r: RegionExp) => {
    const cur = map.get(r.regionId)
    if (!cur) {
      map.set(r.regionId, { ...r })
      return
    }
    const lc = cur.gyeonghyeonchi ?? cur.level ?? 0
    const lr = r.gyeonghyeonchi ?? r.level ?? 0
    const level = Math.max(lc, lr) as RegionExp['gyeonghyeonchi']
    const visits = mergeVisits(cur.visits, r.visits)
    const stats = computeVisitStats(visits)
    const curNewer = (cur.updatedAt ?? '') >= (r.updatedAt ?? '')
    map.set(r.regionId, {
      ...cur,
      ...r,
      gyeonghyeonchi: level,
      level,
      visits,
      visitCount: visits ? stats.visitCount : cur.visitCount ?? r.visitCount,
      totalNights: visits ? stats.totalNights : cur.totalNights ?? r.totalNights,
      // 메모는 더 최근에 수정된 쪽을 신뢰
      memo: cur.memo && r.memo ? (curNewer ? cur.memo : r.memo) : cur.memo || r.memo,
      updatedAt: curNewer ? cur.updatedAt : r.updatedAt,
    })
  }
  for (const r of local) add(r)
  for (const r of remote) add(r)
  return [...map.values()]
}

/** 서버에서 내 스냅샷 읽기 (없으면 null) */
export async function pullCloudData(userId: string): Promise<MapExpData | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.data) return null
  return data.data as MapExpData
}

/** 서버에 내 스냅샷 저장 (upsert) */
export async function pushCloudData(userId: string, data: MapExpData): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
}

/** 로컬 + 서버 스냅샷을 병합해 하나의 MapExpData로 (로그인 직후 사용) */
export function mergeSnapshots(local: MapExpData, remote: MapExpData | null): MapExpData {
  if (!remote) return local
  return {
    version: DATA_VERSION,
    // 국가(현재 보는 지도)는 더 최근에 수정된 스냅샷을 따름
    country: (remote.updatedAt ?? '') > (local.updatedAt ?? '') ? remote.country : local.country,
    regions: mergeRegions(local.regions ?? [], remote.regions ?? []),
    createdAt: local.createdAt ?? remote.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
