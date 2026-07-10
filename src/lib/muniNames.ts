import type { Country } from '@/lib/geo'
import type { Lang } from '@/lib/i18n'

/**
 * 시정촌/시군구 표시명 다국어화
 * - 일본: 총무성 코드(N03_007) → 로마자/한글 표기 (scripts/gen-muni-names.mjs 생성물)
 * - 한국: GeoJSON에 이미 있는 name(한글)/name_eng(로마자) 사용, 일본어는 로마자 폴백
 * - ID 체계는 원어(한자/한글) 기반으로 불변 — 이 모듈은 표시 전용
 */
export interface MuniNameEntry {
  e: string // 영어 (로마자)
  k: string // 한국어 표기
}

let jpNames: Record<string, MuniNameEntry> | null = null
let pending: Promise<Record<string, MuniNameEntry> | null> | null = null

/** 일본 시정촌 이름 사전 로드 (91KB, 1회 캐시). 일본 기초 지역을 표시하기 전에 await */
export function loadJpMuniNames(): Promise<Record<string, MuniNameEntry> | null> {
  if (jpNames) return Promise.resolve(jpNames)
  if (!pending) {
    pending = fetch('/geojson/jp-muni-names.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, MuniNameEntry> | null) => {
        jpNames = d
        return d
      })
      .catch(() => null)
  }
  return pending
}

type MuniProps = Record<string, unknown> | null | undefined

/**
 * 기초 지역 표시명. 사전 미로드·미매칭 시 원어 이름으로 폴백.
 * fallbackName은 ID에 쓰이는 원어 이름 (일본: 한자, 한국: 한글)
 */
export function muniDisplayName(country: Country, props: MuniProps, fallbackName: string, lang: Lang): string {
  if (!props) return fallbackName
  if (country === 'korea') {
    if (lang === 'ko') return (props.name as string) ?? fallbackName
    return (props.name_eng as string) ?? fallbackName
  }
  if (lang === 'ja') return fallbackName
  const code = (props.N03_007 as string | undefined) ?? null
  const entry = code && jpNames ? jpNames[code] : null
  if (!entry) return fallbackName
  return lang === 'ko' ? entry.k : entry.e
}
