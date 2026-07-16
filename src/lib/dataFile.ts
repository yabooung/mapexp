import { MapExpData, RegionExp, ExperienceGrade, Visit } from '@/types'

/**
 * 데이터 파일(내보내기/가져오기) 공용 모듈
 * - 내보내기는 스키마 버전 + 앱 식별자 봉투로 감싼다
 *   (나중에 데이터 구조가 바뀌어도 구버전 파일을 구분 처리할 수 있고,
 *    엉뚱한 JSON이 들어오면 즉시 거부할 수 있다)
 * - 가져오기는 신뢰 불가 입력: 필드 타입을 전부 강제한 뒤에만 상태에 넣는다
 */

export const FILE_SCHEMA = 1

export interface ExportEnvelope {
  schema: number
  app: 'mapexp'
  exportedAt: string
  data: MapExpData
}

export function buildExportEnvelope(data: MapExpData): ExportEnvelope {
  return { schema: FILE_SCHEMA, app: 'mapexp', exportedAt: new Date().toISOString(), data }
}

/** 파일명: mapexp_이름_2026-07-16.json (이름은 선택 - 친구끼리 여러 파일을 구분) */
export function exportFileName(name?: string | null): string {
  const date = new Date().toISOString().slice(0, 10)
  const safe = (name ?? '').replace(/[^\w가-힣ぁ-んァ-ヶ一-龥-]/g, '').slice(0, 20)
  return safe ? `mapexp_${safe}_${date}.json` : `mapexp_${date}.json`
}

const clampLevel = (v: unknown): ExperienceGrade => {
  const n = Math.round(Number(v))
  return (Number.isFinite(n) ? Math.min(5, Math.max(0, n)) : 0) as ExperienceGrade
}

/** 방문 기록 얕은 검증 (형태가 이상한 항목은 버림) */
function sanitizeVisits(raw: unknown): Visit[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const visits: Visit[] = raw
    .filter(
      (v): v is Record<string, unknown> =>
        !!v && typeof v === 'object' && typeof (v as Record<string, unknown>).startDate === 'string',
    )
    .slice(0, 500)
    .map((v, i) => {
      const startDate = (v.startDate as string).slice(0, 10)
      return {
        id: typeof v.id === 'string' && v.id ? v.id.slice(0, 64) : `import-${Date.now()}-${i}`,
        startDate,
        endDate: typeof v.endDate === 'string' ? v.endDate.slice(0, 10) : startDate,
        title: typeof v.title === 'string' ? v.title.slice(0, 100) : undefined,
        memo: typeof v.memo === 'string' ? v.memo.slice(0, 500) : undefined,
        source: v.source === 'gps' ? ('gps' as const) : ('manual' as const),
      }
    })
  return visits.length > 0 ? visits : undefined
}

/** 지역 기록 타입 강제 (백업 복원용 - visits/memo 등은 형태 검증 후 유지) */
function sanitizeRegions(raw: unknown): RegionExp[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && typeof r.regionId === 'string')
    .slice(0, 5000) // 비정상적으로 큰 파일 방어
    .map((r) => {
      const level = clampLevel(r.gyeonghyeonchi ?? r.level)
      return {
        regionId: (r.regionId as string).slice(0, 100),
        gyeonghyeonchi: level,
        level,
        memo: typeof r.memo === 'string' ? r.memo.slice(0, 500) : undefined,
        visitDate: typeof r.visitDate === 'string' ? r.visitDate.slice(0, 10) : undefined,
        visitCount: Number.isFinite(Number(r.visitCount)) ? Math.max(0, Math.round(Number(r.visitCount))) : undefined,
        totalNights: Number.isFinite(Number(r.totalNights)) ? Math.max(0, Math.round(Number(r.totalNights))) : undefined,
        visits: sanitizeVisits(r.visits),
        updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
      }
    })
}

/**
 * 파일 텍스트 → 검증된 MapExpData.
 * 봉투(신규)와 맨몸 MapExpData(구버전 백업) 모두 수용, 그 외에는 null.
 */
export function parseImportFile(text: string): MapExpData | null {
  try {
    const raw: unknown = JSON.parse(text)
    if (!raw || typeof raw !== 'object') return null

    let data: Record<string, unknown>
    if ('app' in raw) {
      // 봉투 형식: 앱 식별자가 다르면 즉시 거부
      const env = raw as Partial<ExportEnvelope>
      if (env.app !== 'mapexp' || !env.data || typeof env.data !== 'object') return null
      data = env.data as unknown as Record<string, unknown>
    } else {
      data = raw as Record<string, unknown> // 구버전 (봉투 없음)
    }

    const regions = sanitizeRegions(data.regions)
    if (!Array.isArray(data.regions)) return null

    return {
      version: typeof data.version === 'string' ? data.version : '1.0.0',
      country: data.country === 'korea' ? 'korea' : 'japan',
      regions,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/** JSON 다운로드 (백업/폴백 공용) */
export function downloadDataFile(data: MapExpData, name?: string | null) {
  const blob = new Blob([JSON.stringify(buildExportEnvelope(data), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName(name)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 터치 기기 여부 - navigator.share는 데스크톱에서 시트 없이 영원히 pending일 수 있어
 *  모바일에서만 시도한다 (데스크톱은 다운로드가 자연스럽기도 함) */
export const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/**
 * 모바일 우선 공유: Web Share API로 파일을 메신저에 바로 전달, 미지원이면 다운로드 폴백.
 * (다운로드 → 메신저 첨부는 모바일에서 마찰이 커 실사용률이 크게 갈린다)
 */
export async function shareDataFile(data: MapExpData, name?: string | null): Promise<'shared' | 'downloaded'> {
  const json = JSON.stringify(buildExportEnvelope(data), null, 2)
  const file = new File([json], exportFileName(name), { type: 'application/json' })
  if (isTouchDevice() && typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'MAPEXP' })
      return 'shared'
    } catch (err) {
      // 사용자 취소(AbortError)는 조용히 종료, 공유 시트가 실제로 없는 환경이면 다운로드 폴백
      if ((err as Error)?.name === 'AbortError') return 'shared'
    }
  }
  downloadDataFile(data, name)
  return 'downloaded'
}
