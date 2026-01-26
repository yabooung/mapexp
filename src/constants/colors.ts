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

/**
 * Tailwind 클래스 이름 (배경색)
 */
export const EXP_BG_CLASSES: Record<ExpLevel, string> = {
  [ExpLevel.UNVISITED]: 'bg-exp-unvisited',
  [ExpLevel.PASSED]: 'bg-exp-passed',
  [ExpLevel.LANDED]: 'bg-exp-stopped',
  [ExpLevel.VISITED]: 'bg-exp-visited',
  [ExpLevel.STAYED]: 'bg-exp-resided',
  [ExpLevel.RESIDED]: 'bg-exp-master',
}

/**
 * Tailwind 클래스 이름 (텍스트 색상)
 */
export const EXP_TEXT_CLASSES: Record<ExpLevel, string> = {
  [ExpLevel.UNVISITED]: 'text-exp-unvisited',
  [ExpLevel.PASSED]: 'text-exp-passed',
  [ExpLevel.LANDED]: 'text-exp-stopped',
  [ExpLevel.VISITED]: 'text-exp-visited',
  [ExpLevel.STAYED]: 'text-exp-resided',
  [ExpLevel.RESIDED]: 'text-exp-master',
}

/**
 * Hover 상태 색상 (파스텔 블루)
 */
export const HOVER_COLOR = '#60A5FA' // blue-400

/**
 * 선택된 지역 색상 (파스텔 바이올렛)
 */
export const SELECTED_COLOR = '#A78BFA' // violet-400

/**
 * 테두리 색상 (소프트 그레이)
 */
export const BORDER_COLOR = '#D1D5DB' // gray-300

/**
 * 배경 색상 (맵용 파스텔 그레이)
 */
export const MAP_BACKGROUND_COLOR = '#F9FAFB' // gray-50

