import { create } from 'zustand'
import { getSupabase, isAuthEnabled } from '@/lib/supabase'

/**
 * 회원 인증 상태 (Supabase). 세션 자체는 Supabase가 localStorage에 영속화하므로
 * 이 스토어는 파생 상태(현재 유저)만 들고 있는다.
 *
 * 로컬 우선 원칙: env 미설정(isAuthEnabled=false)이면 status는 즉시 'ready',
 * user는 null로 남아 회원 기능만 비활성화되고 앱 본체는 그대로 동작한다.
 */

export interface AuthUser {
  id: string
  email: string | null
}

interface AuthState {
  user: AuthUser | null
  /** 초기 세션 확인 전에는 'loading' (깜빡임 방지) */
  status: 'loading' | 'ready'
  initialized: boolean

  init: () => void
  signInEmail: (email: string, password: string) => Promise<{ error?: string }>
  signUpEmail: (email: string, password: string) => Promise<{ error?: string; needsConfirm?: boolean }>
  signInGoogle: () => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',
  initialized: false,

  // 앱 진입 시 1회 호출 (CloudSync에서 마운트 시). 세션 복원 + 변경 구독.
  init: () => {
    if (get().initialized) return
    set({ initialized: true })

    const supabase = getSupabase()
    if (!supabase) {
      // 회원 기능 미설정 - 로딩 종료하고 비회원 상태로 확정
      set({ status: 'ready', user: null })
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user
      set({ user: u ? { id: u.id, email: u.email ?? null } : null, status: 'ready' })
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
      set({ user: u ? { id: u.id, email: u.email ?? null } : null, status: 'ready' })
    })
  },

  signInEmail: async (email, password) => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'not_configured' }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return error ? { error: error.message } : {}
  },

  signUpEmail: async (email, password) => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'not_configured' }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
    if (error) return { error: error.message }
    // 이메일 확인이 필요한 프로젝트면 session이 없다 (확인 메일 발송됨)
    return { needsConfirm: !data.session }
  },

  signInGoogle: async () => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'not_configured' }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    })
    return error ? { error: error.message } : {}
  },

  signOut: async () => {
    const supabase = getSupabase()
    if (!supabase) return
    await supabase.auth.signOut()
    set({ user: null })
  },
}))

export { isAuthEnabled }
