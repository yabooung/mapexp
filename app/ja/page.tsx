import type { Metadata } from 'next'
import AppRoot from '@/components/AppRoot'

// 언어별 라우트(日本語): 日本語検索で日本語スニペットとして索引されるよう専用メタを提供。
// 経県値は uub.jp の登録商標のため、製品名ではなく「考え方の参照」(指示的使用)としてのみ言及。
export const metadata: Metadata = {
  title: 'MAPEXP · 旅スタンプ地図',
  description:
    '訪れた地域を6段階のスタンプで記録・共有する旅の地図。経県値(uub.jp)の考え方を参考に、都道府県・市区町村から韓国の広域・市郡区まで記録でき、GPSで自動記録・共有できます。',
  alternates: {
    canonical: '/ja',
    languages: { ko: '/ko', ja: '/ja', en: '/en', 'x-default': '/' },
  },
  openGraph: {
    type: 'website',
    siteName: 'MAPEXP',
    url: '/ja',
    locale: 'ja_JP',
    title: 'MAPEXP · 旅スタンプ地図',
    description: '訪れた地域を6段階のスタンプで記録・共有する旅の地図。都道府県・市区町村から韓国の広域・市郡区まで、GPSで自動記録。',
  },
}

export default function Page() {
  return <AppRoot initialLang="ja" />
}
