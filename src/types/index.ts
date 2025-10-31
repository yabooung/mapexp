import { ExpLevel, RegionExp, RegionMetadata } from './region'

export * from './region'

/**
 * 전체 맵 경험치 데이터
 */
export interface MapExpData {
  version: string // 데이터 버전
  country: 'japan' | 'korea' // 현재 선택된 국가
  regions: RegionExp[] // 지역 경험치 배열
  createdAt: string // 생성 시간
  updatedAt: string // 마지막 업데이트 시간
}

/**
 * 사용자 설정
 */
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto' // 테마
  language: 'ko' | 'en' | 'ja' // 언어
  defaultCountry: 'japan' | 'korea' // 기본 국가
  showLegend: boolean // 범례 표시
  showStats: boolean // 통계 표시
  enableAnimation: boolean // 애니메이션 활성화
}

/**
 * 공유 데이터 (압축된 데이터)
 */
export interface ShareData {
  v: string // 버전
  c: 'jp' | 'kr' // 국가 (압축)
  r: Array<{
    // 지역 배열 (압축)
    i: string // 지역 ID
    l: number // 레벨
    d?: string // 방문 날짜 (선택)
  }>
  t: string // 타임스탬프
}

/**
 * 통계 데이터
 */
export interface StatsData {
  totalRegions: number // 전체 지역 수
  visitedCount: number // 방문한 지역 수 (레벨 1 이상)
  completionRate: number // 완성률 (%)
  totalExp: number // 총 경험치
  levelCounts: Record<ExpLevel, number> // 레벨별 카운트
  lastUpdated: string // 마지막 업데이트
}

/**
 * 지역 필터 옵션
 */
export interface RegionFilter {
  country?: 'japan' | 'korea'
  minLevel?: ExpLevel
  maxLevel?: ExpLevel
  searchText?: string
  hasVisitDate?: boolean
}

/**
 * 정렬 옵션
 */
export type SortOption = 'name' | 'level' | 'visitDate' | 'updatedAt'

/**
 * 정렬 방향
 */
export type SortDirection = 'asc' | 'desc'


