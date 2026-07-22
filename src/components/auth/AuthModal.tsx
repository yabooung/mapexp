'use client'

import { useState } from 'react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import { useT } from '@/lib/i18n'
import { useAuthStore, isAuthEnabled } from '@/store/auth'
import toast from '@/lib/appToast'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenHistory: () => void
}

/** 구글 4색 로고 (Icon 세트는 stroke 전용이라 여기서 직접 렌더) */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.1 17.7 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16Z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.7-2.9-.7-4.7s.3-3.3.7-4.7l-7.9-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.9-6.1Z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.3 0-11.6-3.6-13.5-8.8l-7.9 6.1C6.5 42.6 14.6 48 24 48Z" />
    </svg>
  )
}

export default function AuthModal({ isOpen, onClose, onOpenHistory }: AuthModalProps) {
  const t = useT()
  const user = useAuthStore((s) => s.user)
  const signInEmail = useAuthStore((s) => s.signInEmail)
  const signUpEmail = useAuthStore((s) => s.signUpEmail)
  const signInGoogle = useAuthStore((s) => s.signInGoogle)
  const signOut = useAuthStore((s) => s.signOut)

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const configured = isAuthEnabled()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!email.trim() || password.length < 6) {
      toast.error(t('auth.invalidInput'))
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { error, needsConfirm } = await signUpEmail(email, password)
        if (error) {
          toast.error(t('auth.failed'))
          return
        }
        if (needsConfirm) {
          toast.success(t('auth.confirmSent'))
          onClose()
        } else {
          toast.success(t('auth.welcome'))
          onClose()
        }
      } else {
        const { error } = await signInEmail(email, password)
        if (error) {
          toast.error(t('auth.signinFailed'))
          return
        }
        toast.success(t('auth.welcome'))
        onClose()
      }
      setEmail('')
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async () => {
    if (busy) return
    setBusy(true)
    // 리다이렉트되므로 성공 시 이 페이지를 떠난다. 실패만 처리.
    const { error } = await signInGoogle()
    if (error) {
      toast.error(t('auth.failed'))
      setBusy(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success(t('auth.signedOut'))
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? t('auth.accountTitle') : t('auth.title')}
      size="sm"
    >
      {!configured ? (
        <p className="text-sm text-muted py-2">{t('auth.notConfigured')}</p>
      ) : user ? (
        // ── 로그인 상태: 계정 정보 + 히스토리 진입 + 로그아웃 ──
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-paper border border-line">
            <span className="w-9 h-9 rounded-full bg-seal/10 text-seal flex items-center justify-center shrink-0">
              <Icon name="user" size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{user.email ?? t('auth.member')}</p>
              <p className="text-xs text-muted mt-0.5">{t('auth.syncOn')}</p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              onClose()
              onOpenHistory()
            }}
            className="w-full gap-1.5"
          >
            <Icon name="calendar" size={15} />
            {t('history.open')}
          </Button>

          <Button variant="secondary" onClick={handleSignOut} className="w-full gap-1.5">
            <Icon name="logout" size={15} />
            {t('auth.signOut')}
          </Button>
        </div>
      ) : (
        // ── 비로그인: 이메일 + 구글 ──
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('auth.intro')}</p>

          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-md border border-line bg-card text-ink font-medium text-sm hover:bg-paper transition-colors disabled:opacity-60"
          >
            <GoogleMark />
            {t('auth.google')}
          </button>

          <div className="flex items-center gap-3 text-xs text-faint">
            <div className="flex-1 border-t border-line" />
            {t('auth.or')}
            <div className="flex-1 border-t border-line" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-2.5">
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email')}
              className="w-full px-3 py-2 rounded-md border border-line bg-card text-ink placeholder:text-faint focus:outline-none focus:border-ink"
            />
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.password')}
              className="w-full px-3 py-2 rounded-md border border-line bg-card text-ink placeholder:text-faint focus:outline-none focus:border-ink"
            />
            <Button type="submit" variant="primary" disabled={busy} className="w-full gap-1.5">
              <Icon name="mail" size={15} />
              {mode === 'signup' ? t('auth.signUp') : t('auth.signIn')}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            className="w-full text-center text-xs text-muted hover:text-ink transition-colors"
          >
            {mode === 'signup' ? t('auth.toSignin') : t('auth.toSignup')}
          </button>
        </div>
      )}
    </Modal>
  )
}
