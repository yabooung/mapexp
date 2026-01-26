/**
 * 한국 관련 데이터 (Archive)
 * 나중에 다시 사용할 수 있도록 보관
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

export const KOREA_id_map: Record<string, string> = {
    '서울특별시': 'seoul',
    '부산광역시': 'busan',
    '대구광역시': 'daegu',
    '인천광역시': 'incheon',
    '광주광역시': 'gwangju',
    '대전광역시': 'daejeon',
    '울산광역시': 'ulsan',
    '세종특별자치시': 'sejong',
    '경기도': 'gyeonggi',
    '강원특별자치도': 'gangwon',
    '강원도': 'gangwon',
    '충청북도': 'chungbuk',
    '충청남도': 'chungnam',
    '전라북도': 'jeonbuk',
    '전북특별자치도': 'jeonbuk',
    '전라남도': 'jeonnam',
    '경상북도': 'gyeongbuk',
    '경상남도': 'gyeongnam',
    '제주특별자치도': 'jeju',
}
