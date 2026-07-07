import { track } from '@vercel/analytics'

/**
 * 익명 사용 통계 이벤트.
 *
 * 개인정보 원칙: 사용자의 실제 기록(어느 지역/좌표/메모)이나 위치 정보는
 * 절대 전송하지 않는다. 집계에 필요한 최소 속성(국가, 레벨 버킷 등
 * 개인을 식별할 수 없는 값)만 담는다. → "기록·위치는 내 기기에만 저장" 약속 유지.
 */
export function ev(
  name: string,
  props?: Record<string, string | number | boolean>,
) {
  try {
    track(name, props)
  } catch {
    // 애널리틱스 미탑재(로컬)·차단 환경에서는 조용히 무시
  }
}
