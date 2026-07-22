import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: '서비스 이용약관 · Terms of Service — MAPEXP',
  description: 'MAPEXP 서비스 이용약관.',
  alternates: { canonical: '/terms' },
}

export default function Page() {
  return <LegalPage doc="terms" />
}
