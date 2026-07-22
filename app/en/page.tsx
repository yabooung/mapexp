import type { Metadata } from 'next'
import AppRoot from '@/components/AppRoot'

// Locale route (English): indexed with an English snippet for English searches.
// 経県値 is a uub.jp trademark — referenced as a method, not used as a product name.
export const metadata: Metadata = {
  title: 'MAPEXP · Travel Stamp Map',
  description:
    "Record and share the places you've visited on a 6-level stamp map. Inspired by the keikenchi (経県値, uub.jp) method — from prefectures and provinces to cities and wards across Japan and Korea, with GPS auto-detection.",
  alternates: {
    canonical: '/en',
    languages: { ko: '/ko', ja: '/ja', en: '/en', 'x-default': '/' },
  },
  openGraph: {
    type: 'website',
    siteName: 'MAPEXP',
    url: '/en',
    locale: 'en_US',
    title: 'MAPEXP · Travel Stamp Map',
    description: "Record and share the places you've visited on a 6-level stamp map across Japan and Korea, with GPS auto-detection.",
  },
}

export default function Page() {
  return <AppRoot initialLang="en" />
}
