import { ExpLevel } from '@/types/region'

/**
 * 레벨별 색상 정의 — 経県値 원조 표준 팔레트 (uub.jp)
 * 원조 지도와 같은 색으로 통일해 経県値 문화권 사용자가 바로 읽을 수 있게 한다.
 */
export const EXP_COLORS: Record<ExpLevel, string> = {
  [ExpLevel.UNVISITED]: '#ffffff', // 미답 = 흰색
  [ExpLevel.PASSED]: '#b7ddfd',    // 통과 = 하늘색
  [ExpLevel.LANDED]: '#bbf59d',    // 접지 = 연두
  [ExpLevel.VISITED]: '#faff79',   // 방문 = 노랑
  [ExpLevel.STAYED]: '#f56d64',    // 숙박 = 빨강
  [ExpLevel.RESIDED]: '#e87afd',   // 거주 = 적자(마젠타)
}


