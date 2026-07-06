import { ExpLevel } from '@/types/region'

/**
 * 레벨별 색상 정의
 * Tailwind config의 exp 색상과 동일
 */
export const EXP_COLORS: Record<ExpLevel, string> = {
  [ExpLevel.UNVISITED]: '#D9D9D9', // 부드러운 그레이
  [ExpLevel.PASSED]: '#8EE7E3',    // 파스텔 씨얀  
  [ExpLevel.LANDED]: '#9BE79B',    // 파스텔 민트그린
  [ExpLevel.VISITED]: '#FFE88C',   // 파스텔 옐로우
  [ExpLevel.STAYED]: '#FF9A8C',    // 소프트 레드(코랄 느낌)
  [ExpLevel.RESIDED]: '#E58CFF',   // 파스텔 퍼플
}


