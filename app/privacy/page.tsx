import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: '개인정보처리방침 · Privacy Policy — MAPEXP',
  description: 'MAPEXP가 수집·이용·보관하는 정보와 삭제 방법 안내.',
  alternates: { canonical: '/privacy' },
}

export default function Page() {
  return <LegalPage doc="privacy" />
}
