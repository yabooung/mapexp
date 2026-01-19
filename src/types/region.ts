/**
 * 지역 경험치 레벨 (경현도 기준)
 * 0: 미답 (Unvisited) - 0점
 * 1: 통과 (Passed) - 1점
 * 2: 접지 (Landed) - 2점
 * 3: 방문 (Visited) - 3점
 * 4: 숙박 (Stayed) - 4점
 * 5: 거주 (Resided) - 5점
 */
export enum ExpLevel {
  UNVISITED = 0,
  PASSED = 1,
  LANDED = 2,
  VISITED = 3,
  STAYED = 4,
  RESIDED = 5,
}

/**
 * 레벨별 라벨
 */
export const EXP_LEVEL_LABELS: Record<ExpLevel, string> = {
  [ExpLevel.UNVISITED]: '미답 (미경현)',
  [ExpLevel.PASSED]: '통과',
  [ExpLevel.LANDED]: '접지',
  [ExpLevel.VISITED]: '방문',
  [ExpLevel.STAYED]: '숙박',
  [ExpLevel.RESIDED]: '거주',
}

/**
 * 레벨별 영문 라벨
 */
export const EXP_LEVEL_LABELS_EN: Record<ExpLevel, string> = {
  [ExpLevel.UNVISITED]: 'Unvisited',
  [ExpLevel.PASSED]: 'Passed',
  [ExpLevel.LANDED]: 'Landed',
  [ExpLevel.VISITED]: 'Visited',
  [ExpLevel.STAYED]: 'Stayed',
  [ExpLevel.RESIDED]: 'Resided',
}

/**
 * 방문 기록
 */
export interface Visit {
  id: string // 고유 ID (UUID or timestamp)
  startDate: string // 시작일 (ISO 8601)
  endDate: string // 종료일 (ISO 8601)
  title?: string // 방문 제목 (예: 여름 휴가)
  memo?: string // 메모
}

/**
 * 지역 경험치 데이터
 */
export interface RegionExp {
  regionId: string // 지역 ID (예: 'tokyo', 'seoul')
  level: ExpLevel // 경험치 레벨
  memo?: string // 메모 (레거시 - 호환성 유지)
  visitDate?: string // 방문 날짜 (레거시 - 호환성 유지)
  visitCount?: number // 방문 횟수 (자동 계산됨)
  totalNights?: number // 총 숙박일 (자동 계산됨)
  visits?: Visit[] // 방문 기록 리스트 (New)
  updatedAt: string // 마지막 수정 시간
}

/**
 * 지역 메타데이터 (GeoJSON 속성)
 */
export interface RegionMetadata {
  id: string // 지역 ID
  name: string // 지역명 (한국어)
  nameEn: string // 지역명 (영어)
  nameLocal: string // 지역명 (현지어)
  country: 'japan' | 'korea' // 국가
  type: 'prefecture' | 'province' // 행정구역 타입
  population?: number // 인구 (선택)
  area?: number // 면적 (km²) (선택)
}


