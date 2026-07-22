import type { MetadataRoute } from 'next'

const BASE = 'https://mapexp.app'

// 루트 + 언어별 라우트를 모두 등재하고, 각 항목에 언어 대체 링크(hreflang)를 붙인다.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const languages = {
    ko: `${BASE}/ko`,
    ja: `${BASE}/ja`,
    en: `${BASE}/en`,
  }
  const entry = (path: string): MetadataRoute.Sitemap[number] => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.9,
    alternates: { languages },
  })

  const legal = (path: string): MetadataRoute.Sitemap[number] => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.3,
  })

  return [entry(''), entry('/ko'), entry('/ja'), entry('/en'), legal('/privacy'), legal('/terms')]
}
