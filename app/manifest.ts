import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MAPEXP - 지역 경험치 맵',
    short_name: 'MAPEXP',
    description: '방문한 지역을 기록하고 경험치를 쌓는 지도 서비스',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f3ec',
    theme_color: '#be3a2b',
    lang: 'ko',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
