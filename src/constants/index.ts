export * from './colors'
export * from './regions'

/**
 * 애플리케이션 상수
 */
export const APP_NAME = 'MAPEXP'
export const APP_VERSION = '1.7.2'
export const APP_DESCRIPTION = '여행 도장 지도'

/**
 * LocalStorage 키
 */
export const STORAGE_KEYS = {
  MAP_DATA: 'mapexp_data',
  USER_SETTINGS: 'mapexp_settings',
  SELECTED_COUNTRY: 'mapexp_country',
} as const

/**
 * 기본 설정값
 */
export const DEFAULT_SETTINGS = {
  theme: 'light' as const,
  language: 'ko' as const,
  defaultCountry: 'japan' as const,
  showLegend: true,
  showStats: true,
  enableAnimation: true,
  mapMode: 'standard' as const,
}

/**
 * 데이터 버전
 */
export const DATA_VERSION = '1.0'


