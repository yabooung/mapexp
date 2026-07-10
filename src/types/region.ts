/**
 * 경험치 등급 (0-5)
 * Generic scale for Gyeonghyeonchi
 */
export type ExperienceGrade = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * 지역 경험치 레벨 (경현도 기준)
 * 0: 미답 (Unvisited) - 0점
 * 1: 통과 (Passed) - 1점
 * 2: 접지 (Landed) - 2점
 * 3: 방문 (Visited) - 3점
 * 4: 숙박 (Stayed) - 4점
 * 5: 거주 (Resided) - 5점
 */
export enum GyeongHyeonChi {
  UNVISITED = 0,
  PASSED = 1,
  LANDED = 2,
  VISITED = 3,
  STAYED = 4,
  RESIDED = 5,
}

/** @deprecated use GyeongHyeonChi */
export const ExpLevel = GyeongHyeonChi;
export type ExpLevel = GyeongHyeonChi;

/**
 * 레벨별 라벨
 */
export const EXP_LEVEL_LABELS: Record<GyeongHyeonChi, string> = {
  [GyeongHyeonChi.UNVISITED]: "미답 (미경현)",
  [GyeongHyeonChi.PASSED]: "통과",
  [GyeongHyeonChi.LANDED]: "접지",
  [GyeongHyeonChi.VISITED]: "방문",
  [GyeongHyeonChi.STAYED]: "숙박",
  [GyeongHyeonChi.RESIDED]: "거주",
};

/**
 * 레벨별 영문 라벨
 */
export const EXP_LEVEL_LABELS_EN: Record<GyeongHyeonChi, string> = {
  [GyeongHyeonChi.UNVISITED]: "Unvisited",
  [GyeongHyeonChi.PASSED]: "Passed",
  [GyeongHyeonChi.LANDED]: "Landed",
  [GyeongHyeonChi.VISITED]: "Visited",
  [GyeongHyeonChi.STAYED]: "Stayed",
  [GyeongHyeonChi.RESIDED]: "Resided",
};

/**
 * 방문 기록
 * - manual: 사용자가 직접 입력 (과거 날짜 포함 자유롭게 수정 가능)
 * - gps: GPS로 자동 생성된 인증 기록 (날짜/시간 수정·삭제 불가)
 */
export interface Visit {
  id: string; // 고유 ID (UUID or timestamp)
  startDate: string; // 시작일 (ISO 8601)
  endDate: string; // 종료일 (ISO 8601)
  title?: string; // 방문 제목 (예: 여름 휴가)
  memo?: string; // 메모
  source?: "manual" | "gps"; // 기록 출처 (기본: manual)
}

/**
 * 지역 경험치 데이터
 */
export interface RegionExp {
  regionId: string; // 지역 ID (예: 'tokyo', 'seoul')
  gyeonghyeonchi: ExperienceGrade; // 경험치 등급 (0-5)
  /** @deprecated use gyeonghyeonchi */
  level?: number; // 호환성 유지용
  memo?: string; // 메모 (레거시 - 호환성 유지)
  visitDate?: string; // 방문 날짜 (레거시 - 호환성 유지)
  visitCount?: number; // 방문 횟수 (자동 계산됨)
  totalNights?: number; // 총 숙박일 (자동 계산됨)
  visits?: Visit[]; // 방문 기록 리스트 (New)
  updatedAt: string; // 마지막 수정 시간
}

/**
 * 지역 메타데이터 (GeoJSON 속성)
 */
export interface RegionMetadata {
  id: string; // 지역 ID
  name: string; // 지역명 (한국어)
  nameEn: string; // 지역명 (영어)
  nameLocal: string; // 지역명 (현지어)
  nameJa?: string; // 지역명 (일본어 표기 - 한국 지역용, 일본 지역은 nameLocal이 일본어)
  country: "japan" | "korea"; // 국가
  type: "prefecture" | "province"; // 행정구역 타입
  population?: number; // 인구 (선택)
  area?: number; // 면적 (km²) (선택)
}
