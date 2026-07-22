import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase 브라우저 클라이언트 (회원 인증 + 클라우드 동기화)
 *
 * 로컬 우선 원칙 유지: env가 없으면 null을 반환해 기능이 조용히 꺼진다
 * (기기 간 코드 동기화의 Redis 503 그레이스풀 패턴과 동일).
 *
 * env(빌드 타임 인라인):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** 회원 기능(로그인·클라우드 동기화·히스토리) 사용 가능 여부 */
export const isAuthEnabled = (): boolean => !!(url && anonKey)

let client: SupabaseClient | null = null
let initialized = false

/** 싱글턴 Supabase 클라이언트. env 미설정이면 null. 브라우저에서만 호출할 것. */
export function getSupabase(): SupabaseClient | null {
  if (initialized) return client
  initialized = true
  if (!url || !anonKey) return null
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // OAuth 리다이렉트(구글) 콜백 처리
    },
  })
  return client
}
