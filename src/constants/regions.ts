import { HIDDEN_REGIONS } from '@/data/hiddenOverlay'

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
 * 전체 지역 수
 */
export const TOTAL_REGIONS = {
  japan: JAPAN_REGION_IDS.length, // 47
  korea: 16, // 2026-07 전남광주통합특별시 출범으로 17 → 16개 시도
} as const

export const HIDDEN_REGION_IDS = new Set<string>(HIDDEN_REGIONS.map((h) => h.id))

export function isHiddenRegion(regionId: string): boolean {
  const parentId = regionId.includes('_') ? regionId.split('_')[0] : regionId
  return HIDDEN_REGION_IDS.has(parentId)
}

/**
 * 지역 ID 타입
 */
export type JapanRegionId = (typeof JAPAN_REGION_IDS)[number]
export type RegionId = JapanRegionId

/**
 * Kanji to ID Mapping
 */
export const REGION_ID_MAP: Record<string, Record<string, string>> = {
  japan: {
    '北海道': 'hokkaido',
    '青森県': 'aomori',
    '岩手県': 'iwate',
    '宮城県': 'miyagi',
    '秋田県': 'akita',
    '山形県': 'yamagata',
    '福島県': 'fukushima',
    '茨城県': 'ibaraki',
    '栃木県': 'tochigi',
    '群馬県': 'gunma',
    '埼玉県': 'saitama',
    '千葉県': 'chiba',
    '東京都': 'tokyo',
    '神奈川県': 'kanagawa',
    '新潟県': 'niigata',
    '富山県': 'toyama',
    '石川県': 'ishikawa',
    '福井県': 'fukui',
    '山梨県': 'yamanashi',
    '長野県': 'nagano',
    '岐阜県': 'gifu',
    '静岡県': 'shizuoka',
    '愛知県': 'aichi',
    '三重県': 'mie',
    '滋賀県': 'shiga',
    '京都府': 'kyoto',
    '大阪府': 'osaka',
    '兵庫県': 'hyogo',
    '奈良県': 'nara',
    'wakayama': 'wakayama', // Fallback
    '和歌山県': 'wakayama',
    '鳥取県': 'tottori',
    '島根県': 'shimane',
    '岡山県': 'okayama',
    '広島県': 'hiroshima',
    '山口県': 'yamaguchi',
    '徳島県': 'tokushima',
    '香川県': 'kagawa',
    '愛媛県': 'ehime',
    '高知県': 'kochi',
    '福岡県': 'fukuoka',
    '佐賀県': 'saga',
    '長崎県': 'nagasaki',
    '熊本県': 'kumamoto',
    '大分県': 'oita',
    '宮崎県': 'miyazaki',
    '鹿児島県': 'kagoshima',
    '沖縄県': 'okinawa',
  },
  korea: {
    // 2026-07 행정구역 기준 (전남광주통합특별시 출범, 군위군 대구 편입 반영)
    '서울특별시': 'seoul',
    '인천광역시': 'incheon',
    '경기도': 'gyeonggi',
    '부산광역시': 'busan',
    '대구광역시': 'daegu',
    '대전광역시': 'daejeon',
    '울산광역시': 'ulsan',
    '세종특별자치시': 'sejong',
    '강원도': 'gangwon',
    '강원특별자치도': 'gangwon',
    '충청북도': 'chungbuk',
    '충청남도': 'chungnam',
    '전라북도': 'jeonbuk',
    '전북특별자치도': 'jeonbuk',
    '경상북도': 'gyeongbuk',
    '경상남도': 'gyeongnam',
    '제주특별자치도': 'jeju',
    '전남광주통합특별시': 'jeonnamgwangju',
    // 구 명칭 → 통합시로 흡수 (구버전 데이터/공유 링크 호환)
    '광주광역시': 'jeonnamgwangju',
    '전라남도': 'jeonnamgwangju',
  },
}

/**
 * 행정구역 개편으로 폐지된 지역 ID → 승계 지역 ID
 * (localStorage 구버전 기록 마이그레이션용)
 */
export const LEGACY_REGION_ID_MAP: Record<string, string> = {
  gwangju: 'jeonnamgwangju',
  jeonnam: 'jeonnamgwangju',
  'gyeongbuk_군위군': 'daegu_군위군',
}

/**
 * 한국 시도 통계청 코드 (시군구 code 앞 2자리와 매칭)
 */
export const KOREA_PROV_CODE_BY_ID: Record<string, string> = {
  seoul: '11',
  busan: '21',
  daegu: '22',
  incheon: '23',
  daejeon: '25',
  ulsan: '26',
  sejong: '29',
  gyeonggi: '31',
  gangwon: '32',
  chungbuk: '33',
  chungnam: '34',
  jeonbuk: '35',
  jeonnamgwangju: '36', // 전남광주통합특별시 (구 광주 24 + 전남 36)
  gyeongbuk: '37',
  gyeongnam: '38',
  jeju: '39',
}

/**
 * 지역 ID가 해당 국가 소속인지 판별 (시군구/시정촌 ID는 부모 기준)
 */
const KOREA_ID_SET = new Set<string>(Object.keys(KOREA_PROV_CODE_BY_ID))
const JAPAN_ID_SET = new Set<string>(JAPAN_REGION_IDS)

// 오버레이 보너스 지역을 국가 매핑/집합에 병합 (데이터는 env로만 주입, 없으면 no-op)
HIDDEN_REGIONS.forEach((h) => {
  REGION_ID_MAP[h.country][h.nameKey] = h.id
  ;(h.country === 'korea' ? KOREA_ID_SET : JAPAN_ID_SET).add(h.id)
})

export function isRegionOfCountry(regionId: string, country: 'japan' | 'korea'): boolean {
  const parentId = regionId.includes('_') ? regionId.split('_')[0] : regionId
  return country === 'japan' ? JAPAN_ID_SET.has(parentId) : KOREA_ID_SET.has(parentId)
}

/**
 * 리스트 그룹핑용 지방/권역 구분
 * name은 i18n 키 (group.*) - 표시할 때 t()로 해석
 */
export const REGION_GROUPS: Record<'japan' | 'korea', Array<{ name: string; ids: string[] }>> = {
  japan: [
    { name: 'group.hokkaido', ids: ['hokkaido'] },
    { name: 'group.tohoku', ids: ['aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima'] },
    { name: 'group.kanto', ids: ['ibaraki', 'tochigi', 'gunma', 'saitama', 'chiba', 'tokyo', 'kanagawa'] },
    { name: 'group.chubu', ids: ['niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano', 'gifu', 'shizuoka', 'aichi'] },
    { name: 'group.kansai', ids: ['mie', 'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama'] },
    { name: 'group.chugoku', ids: ['tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi'] },
    { name: 'group.shikoku', ids: ['tokushima', 'kagawa', 'ehime', 'kochi'] },
    { name: 'group.kyushu', ids: ['fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa'] },
  ],
  korea: [
    { name: 'group.capital', ids: ['seoul', 'incheon', 'gyeonggi'] },
    { name: 'group.gangwon', ids: ['gangwon'] },
    { name: 'group.chungcheong', ids: ['daejeon', 'sejong', 'chungbuk', 'chungnam'] },
    { name: 'group.jeolla', ids: ['jeonbuk', 'jeonnamgwangju'] },
    { name: 'group.gyeongsang', ids: ['busan', 'daegu', 'ulsan', 'gyeongbuk', 'gyeongnam'] },
    { name: 'group.jeju', ids: ['jeju'] },
  ],
}


