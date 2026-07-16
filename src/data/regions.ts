import { RegionMetadata } from '@/types'

/**
 * 일본 지역 메타데이터 (47개 도도부현)
 */
export const JAPAN_REGIONS: RegionMetadata[] = [
  // 홋카이도
  { id: 'hokkaido', name: '홋카이도', nameEn: 'Hokkaido', nameLocal: '北海道', country: 'japan', type: 'prefecture' },

  // 도호쿠 (東北)
  { id: 'aomori', name: '아오모리', nameEn: 'Aomori', nameLocal: '青森県', country: 'japan', type: 'prefecture' },
  { id: 'iwate', name: '이와테', nameEn: 'Iwate', nameLocal: '岩手県', country: 'japan', type: 'prefecture' },
  { id: 'miyagi', name: '미야기', nameEn: 'Miyagi', nameLocal: '宮城県', country: 'japan', type: 'prefecture' },
  { id: 'akita', name: '아키타', nameEn: 'Akita', nameLocal: '秋田県', country: 'japan', type: 'prefecture' },
  { id: 'yamagata', name: '야마가타', nameEn: 'Yamagata', nameLocal: '山形県', country: 'japan', type: 'prefecture' },
  { id: 'fukushima', name: '후쿠시마', nameEn: 'Fukushima', nameLocal: '福島県', country: 'japan', type: 'prefecture' },

  // 간토 (関東)
  { id: 'ibaraki', name: '이바라키', nameEn: 'Ibaraki', nameLocal: '茨城県', country: 'japan', type: 'prefecture' },
  { id: 'tochigi', name: '도치기', nameEn: 'Tochigi', nameLocal: '栃木県', country: 'japan', type: 'prefecture' },
  { id: 'gunma', name: '군마', nameEn: 'Gunma', nameLocal: '群馬県', country: 'japan', type: 'prefecture' },
  { id: 'saitama', name: '사이타마', nameEn: 'Saitama', nameLocal: '埼玉県', country: 'japan', type: 'prefecture' },
  { id: 'chiba', name: '치바', nameEn: 'Chiba', nameLocal: '千葉県', country: 'japan', type: 'prefecture' },
  { id: 'tokyo', name: '도쿄', nameEn: 'Tokyo', nameLocal: '東京都', country: 'japan', type: 'prefecture' },
  { id: 'kanagawa', name: '가나가와', nameEn: 'Kanagawa', nameLocal: '神奈川県', country: 'japan', type: 'prefecture' },

  // 주부 (中部)
  { id: 'niigata', name: '니가타', nameEn: 'Niigata', nameLocal: '新潟県', country: 'japan', type: 'prefecture' },
  { id: 'toyama', name: '도야마', nameEn: 'Toyama', nameLocal: '富山県', country: 'japan', type: 'prefecture' },
  { id: 'ishikawa', name: '이시카와', nameEn: 'Ishikawa', nameLocal: '石川県', country: 'japan', type: 'prefecture' },
  { id: 'fukui', name: '후쿠이', nameEn: 'Fukui', nameLocal: '福井県', country: 'japan', type: 'prefecture' },
  { id: 'yamanashi', name: '야마나시', nameEn: 'Yamanashi', nameLocal: '山梨県', country: 'japan', type: 'prefecture' },
  { id: 'nagano', name: '나가노', nameEn: 'Nagano', nameLocal: '長野県', country: 'japan', type: 'prefecture' },
  { id: 'gifu', name: '기후', nameEn: 'Gifu', nameLocal: '岐阜県', country: 'japan', type: 'prefecture' },
  { id: 'shizuoka', name: '시즈오카', nameEn: 'Shizuoka', nameLocal: '静岡県', country: 'japan', type: 'prefecture' },
  { id: 'aichi', name: '아이치', nameEn: 'Aichi', nameLocal: '愛知県', country: 'japan', type: 'prefecture' },

  // 간사이 (関西/近畿)
  { id: 'mie', name: '미에', nameEn: 'Mie', nameLocal: '三重県', country: 'japan', type: 'prefecture' },
  { id: 'shiga', name: '시가', nameEn: 'Shiga', nameLocal: '滋賀県', country: 'japan', type: 'prefecture' },
  { id: 'kyoto', name: '교토', nameEn: 'Kyoto', nameLocal: '京都府', country: 'japan', type: 'prefecture' },
  { id: 'osaka', name: '오사카', nameEn: 'Osaka', nameLocal: '大阪府', country: 'japan', type: 'prefecture' },
  { id: 'hyogo', name: '효고', nameEn: 'Hyogo', nameLocal: '兵庫県', country: 'japan', type: 'prefecture' },
  { id: 'nara', name: '나라', nameEn: 'Nara', nameLocal: '奈良県', country: 'japan', type: 'prefecture' },
  { id: 'wakayama', name: '와카야마', nameEn: 'Wakayama', nameLocal: '和歌山県', country: 'japan', type: 'prefecture' },

  // 주고쿠 (中国)
  { id: 'tottori', name: '돗토리', nameEn: 'Tottori', nameLocal: '鳥取県', country: 'japan', type: 'prefecture' },
  { id: 'shimane', name: '시마네', nameEn: 'Shimane', nameLocal: '島根県', country: 'japan', type: 'prefecture' },
  { id: 'okayama', name: '오카야마', nameEn: 'Okayama', nameLocal: '岡山県', country: 'japan', type: 'prefecture' },
  { id: 'hiroshima', name: '히로시마', nameEn: 'Hiroshima', nameLocal: '広島県', country: 'japan', type: 'prefecture' },
  { id: 'yamaguchi', name: '야마구치', nameEn: 'Yamaguchi', nameLocal: '山口県', country: 'japan', type: 'prefecture' },

  // 시코쿠 (四国)
  { id: 'tokushima', name: '도쿠시마', nameEn: 'Tokushima', nameLocal: '徳島県', country: 'japan', type: 'prefecture' },
  { id: 'kagawa', name: '가가와', nameEn: 'Kagawa', nameLocal: '香川県', country: 'japan', type: 'prefecture' },
  { id: 'ehime', name: '에히메', nameEn: 'Ehime', nameLocal: '愛媛県', country: 'japan', type: 'prefecture' },
  { id: 'kochi', name: '고치', nameEn: 'Kochi', nameLocal: '高知県', country: 'japan', type: 'prefecture' },

  // 규슈 (九州)
  { id: 'fukuoka', name: '후쿠오카', nameEn: 'Fukuoka', nameLocal: '福岡県', country: 'japan', type: 'prefecture' },
  { id: 'saga', name: '사가', nameEn: 'Saga', nameLocal: '佐賀県', country: 'japan', type: 'prefecture' },
  { id: 'nagasaki', name: '나가사키', nameEn: 'Nagasaki', nameLocal: '長崎県', country: 'japan', type: 'prefecture' },
  { id: 'kumamoto', name: '구마모토', nameEn: 'Kumamoto', nameLocal: '熊本県', country: 'japan', type: 'prefecture' },
  { id: 'oita', name: '오이타', nameEn: 'Oita', nameLocal: '大分県', country: 'japan', type: 'prefecture' },
  { id: 'miyazaki', name: '미야자키', nameEn: 'Miyazaki', nameLocal: '宮崎県', country: 'japan', type: 'prefecture' },
  { id: 'kagoshima', name: '가고시마', nameEn: 'Kagoshima', nameLocal: '鹿児島県', country: 'japan', type: 'prefecture' },
  { id: 'okinawa', name: '오키나와', nameEn: 'Okinawa', nameLocal: '沖縄県', country: 'japan', type: 'prefecture' },
]

/**
 * 한국 지역 메타데이터 (17개 시도)
 */
export const KOREA_REGIONS: RegionMetadata[] = [
  // 수도권
  { id: 'seoul', name: '서울특별시', nameEn: 'Seoul', nameLocal: '서울특별시', nameJa: 'ソウル特別市', country: 'korea', type: 'province' },
  { id: 'incheon', name: '인천광역시', nameEn: 'Incheon', nameLocal: '인천광역시', nameJa: '仁川広域市(インチョン)', country: 'korea', type: 'province' },
  { id: 'gyeonggi', name: '경기도', nameEn: 'Gyeonggi-do', nameLocal: '경기도', nameJa: '京畿道(キョンギド)', country: 'korea', type: 'province' },

  // 광역시
  { id: 'busan', name: '부산광역시', nameEn: 'Busan', nameLocal: '부산광역시', nameJa: '釜山広域市(プサン)', country: 'korea', type: 'province' },
  { id: 'daegu', name: '대구광역시', nameEn: 'Daegu', nameLocal: '대구광역시', nameJa: '大邱広域市(テグ)', country: 'korea', type: 'province' },
  { id: 'daejeon', name: '대전광역시', nameEn: 'Daejeon', nameLocal: '대전광역시', nameJa: '大田広域市(テジョン)', country: 'korea', type: 'province' },
  { id: 'ulsan', name: '울산광역시', nameEn: 'Ulsan', nameLocal: '울산광역시', nameJa: '蔚山広域市(ウルサン)', country: 'korea', type: 'province' },
  { id: 'sejong', name: '세종특별자치시', nameEn: 'Sejong', nameLocal: '세종특별자치시', nameJa: '世宗特別自治市(セジョン)', country: 'korea', type: 'province' },

  // 도
  { id: 'gangwon', name: '강원특별자치도', nameEn: 'Gangwon-do', nameLocal: '강원특별자치도', nameJa: '江原特別自治道(カンウォン)', country: 'korea', type: 'province' },
  { id: 'chungbuk', name: '충청북도', nameEn: 'Chungcheongbuk-do', nameLocal: '충청북도', nameJa: '忠清北道(チュンチョンプクト)', country: 'korea', type: 'province' },
  { id: 'chungnam', name: '충청남도', nameEn: 'Chungcheongnam-do', nameLocal: '충청남도', nameJa: '忠清南道(チュンチョンナムド)', country: 'korea', type: 'province' },
  { id: 'jeonbuk', name: '전북특별자치도', nameEn: 'Jeonbuk', nameLocal: '전북특별자치도', nameJa: '全北特別自治道(チョンブク)', country: 'korea', type: 'province' },
  // 2026-07-01 광주광역시 + 전라남도 통합 출범
  { id: 'jeonnamgwangju', name: '전남광주통합특별시', nameEn: 'Jeonnam-Gwangju', nameLocal: '전남광주통합특별시', nameJa: '全南・光州特別市(チョンナム・クァンジュ)', country: 'korea', type: 'province' },
  { id: 'gyeongbuk', name: '경상북도', nameEn: 'Gyeongsangbuk-do', nameLocal: '경상북도', nameJa: '慶尚北道(キョンサンプクト)', country: 'korea', type: 'province' },
  { id: 'gyeongnam', name: '경상남도', nameEn: 'Gyeongsangnam-do', nameLocal: '경상남도', nameJa: '慶尚南道(キョンサンナムド)', country: 'korea', type: 'province' },
  { id: 'jeju', name: '제주특별자치도', nameEn: 'Jeju', nameLocal: '제주특별자치도', nameJa: '済州特別自治道(チェジュ)', country: 'korea', type: 'province' },
  { id: 'dokdo', name: '독도', nameEn: 'Dokdo', nameLocal: '독도', nameJa: '独島(トクト)', country: 'korea', type: 'province', hidden: true },
]

/**
 * 지역 ID로 메타데이터 찾기
 */
export const getRegionMetadata = (regionId: string): RegionMetadata | undefined => {
  return [...JAPAN_REGIONS, ...KOREA_REGIONS].find((region) => region.id === regionId)
}

/**
 * 국가별 지역 메타데이터 가져오기
 */
export const getRegionsByCountry = (country: 'japan' | 'korea'): RegionMetadata[] => {
  return (country === 'japan' ? JAPAN_REGIONS : KOREA_REGIONS).filter((r) => !r.hidden)
}

export const getHiddenRegionsByCountry = (country: 'japan' | 'korea'): RegionMetadata[] => {
  return (country === 'japan' ? JAPAN_REGIONS : KOREA_REGIONS).filter((r) => r.hidden)
}
