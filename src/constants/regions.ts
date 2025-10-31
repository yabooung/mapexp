/**
 * 일본 지역 ID 상수 (47개 도도부현)
 */
export const JAPAN_REGION_IDS = [
  'hokkaido', // 북해도
  'aomori',
  'iwate',
  'miyagi',
  'akita',
  'yamagata',
  'fukushima',
  'ibaraki',
  'tochigi',
  'gunma',
  'saitama',
  'chiba',
  'tokyo',
  'kanagawa',
  'niigata',
  'toyama',
  'ishikawa',
  'fukui',
  'yamanashi',
  'nagano',
  'gifu',
  'shizuoka',
  'aichi',
  'mie',
  'shiga',
  'kyoto',
  'osaka',
  'hyogo',
  'nara',
  'wakayama',
  'tottori',
  'shimane',
  'okayama',
  'hiroshima',
  'yamaguchi',
  'tokushima',
  'kagawa',
  'ehime',
  'kochi',
  'fukuoka',
  'saga',
  'nagasaki',
  'kumamoto',
  'oita',
  'miyazaki',
  'kagoshima',
  'okinawa',
] as const

/**
 * 한국 지역 ID 상수 (17개 시도)
 */
export const KOREA_REGION_IDS = [
  'seoul', // 서울특별시
  'busan', // 부산광역시
  'daegu', // 대구광역시
  'incheon', // 인천광역시
  'gwangju', // 광주광역시
  'daejeon', // 대전광역시
  'ulsan', // 울산광역시
  'sejong', // 세종특별자치시
  'gyeonggi', // 경기도
  'gangwon', // 강원특별자치도
  'chungbuk', // 충청북도
  'chungnam', // 충청남도
  'jeonbuk', // 전북특별자치도
  'jeonnam', // 전라남도
  'gyeongbuk', // 경상북도
  'gyeongnam', // 경상남도
  'jeju', // 제주특별자치도
] as const

/**
 * 전체 지역 수
 */
export const TOTAL_REGIONS = {
  japan: JAPAN_REGION_IDS.length, // 47
  korea: KOREA_REGION_IDS.length, // 17
} as const

/**
 * 지역 ID 타입
 */
export type JapanRegionId = (typeof JAPAN_REGION_IDS)[number]
export type KoreaRegionId = (typeof KOREA_REGION_IDS)[number]
export type RegionId = JapanRegionId | KoreaRegionId


