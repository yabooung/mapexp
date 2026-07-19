export * from './colors'
export * from './regions'

/**
 * 애플리케이션 상수
 */
export const APP_NAME = 'MAPEXP'
export const APP_VERSION = '1.9.0'
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

/**
 * GPS 연속 추적(watchPosition·트랙 로그·자동 방문 감지·Wake Lock) 활성화 여부.
 *
 * 웹 PWA는 백그라운드/화면 꺼짐 상태에서 위치 추적이 불가능(Chromium WontFix)하므로
 * 기본 GPS 동선은 "현재 위치 도장" 원샷(getCurrentPosition 1회)만 사용한다.
 * 연속 추적 코드는 네이티브 앱 전환 시 되살릴 자산으로 보존만 하고 꺼 둔다.
 * (되살리려면 이 값을 true로 바꾸면 관련 UI/워처가 다시 켜진다.)
 */
export const ENABLE_GPS_TRACKING = false


