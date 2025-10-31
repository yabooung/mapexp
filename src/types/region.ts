/**
 * 지역 경험치 레벨
 * 0: 미방문 (unvisited)
 * 1: 통과 (passed)
 * 2: 정차 (stopped)
 * 3: 방문 (visited)
 * 4: 거주 (resided)
 * 5: 마스터 (master)
 */
export enum ExpLevel {
  UNVISITED = 0,
  PASSED = 1,
  STOPPED = 2,
  VISITED = 3,
  RESIDED = 4,
  MASTER = 5,
}

/**
 * 레벨별 라벨
 */
export const EXP_LEVEL_LABELS: Record<ExpLevel, string> = {
  [ExpLevel.UNVISITED]: '미방문',
  [ExpLevel.PASSED]: '통과',
  [ExpLevel.STOPPED]: '정차',
  [ExpLevel.VISITED]: '방문',
  [ExpLevel.RESIDED]: '거주',
  [ExpLevel.MASTER]: '마스터',
}

/**
 * 레벨별 영문 라벨
 */
export const EXP_LEVEL_LABELS_EN: Record<ExpLevel, string> = {
  [ExpLevel.UNVISITED]: 'Unvisited',
  [ExpLevel.PASSED]: 'Passed',
  [ExpLevel.STOPPED]: 'Stopped',
  [ExpLevel.VISITED]: 'Visited',
  [ExpLevel.RESIDED]: 'Resided',
  [ExpLevel.MASTER]: 'Master',
}

/**
 * 지역 경험치 데이터
 */
export interface RegionExp {
  regionId: string // 지역 ID (예: 'tokyo', 'seoul')
  level: ExpLevel // 경험치 레벨
  memo?: string // 메모 (선택, 최대 500자)
  visitDate?: string // 방문 날짜 (ISO 8601 형식)
  visitCount?: number // 방문 횟수 (레벨 5 전용)
  totalNights?: number // 총 숙박일 (레벨 5 전용)
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


