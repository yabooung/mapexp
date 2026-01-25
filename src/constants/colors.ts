import { ExpLevel } from '@/types/region'

/**
 * 레벨별 색상 정의
 * Tailwind config의 exp 색상과 동일
 */
export const EXP_COLORS: Record<ExpLevel, string> = {
  [ExpLevel.UNVISITED]: '#E5E5E5', // 회색
  [ExpLevel.PASSED]: '#00FFFF', // 씨얀
  [ExpLevel.LANDED]: '#00FF00', // 초록
  [ExpLevel.VISITED]: '#FFFF00', // 노랑
  [ExpLevel.STAYED]: '#FF0000', // 빨강
  [ExpLevel.RESIDED]: '#FF00FF', // 금색
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


