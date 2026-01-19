import { ExpLevel } from '@/types/region'

/**
 * 레벨별 색상 정의
 * Tailwind config의 exp 색상과 동일
 */
export const EXP_COLORS: Record<ExpLevel, string> = {
  [ExpLevel.UNVISITED]: '#E5E5E5', // 회색
  [ExpLevel.PASSED]: '#FEF3C7', // 연노랑
  [ExpLevel.LANDED]: '#FCD34D', // 노랑
  [ExpLevel.VISITED]: '#F59E0B', // 주황
  [ExpLevel.STAYED]: '#DC2626', // 빨강
  [ExpLevel.RESIDED]: '#FFD700', // 금색
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
 * Hover 상태 색상
 */
export const HOVER_COLOR = '#3B82F6' // blue-500

/**
 * 선택된 지역 색상
 */
export const SELECTED_COLOR = '#8B5CF6' // violet-500

/**
 * 테두리 색상
 */
export const BORDER_COLOR = '#9CA3AF' // gray-400

/**
 * 배경 색상
 */
export const MAP_BACKGROUND_COLOR = '#F3F4F6' // gray-100


