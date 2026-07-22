import type { Metadata } from 'next'
import AppRoot from '@/components/AppRoot'

// 언어별 라우트(한국어): 검색엔진이 이 URL을 한국어 스니펫으로 색인하도록 별도 메타 제공.
// 経県値는 uub.jp 상표라 제품명이 아닌 '방식 참조'(지시적 사용)로만 언급.
export const metadata: Metadata = {
  title: 'MAPEXP · 여행 도장 지도',
  description:
    '방문한 지역을 6단계 도장으로 기록·공유하는 여행 지도. 経県値(경현치, uub.jp) 방식을 참고해 도도부현·시도부터 시정촌·시군구까지 기록하고 GPS 자동 감지·공유를 지원합니다.',
  alternates: {
    canonical: '/ko',
    languages: { ko: '/ko', ja: '/ja', en: '/en', 'x-default': '/' },
  },
  openGraph: {
    type: 'website',
    siteName: 'MAPEXP',
    url: '/ko',
    locale: 'ko_KR',
    title: 'MAPEXP · 여행 도장 지도',
    description: '방문한 지역을 6단계 도장으로 기록·공유하는 여행 지도. 도도부현·시도부터 시정촌·시군구까지, GPS 자동 감지.',
  },
}

export default function Page() {
  return <AppRoot initialLang="ko" />
}
