import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    // 앱 이름은 'MAPEXP'로 통일 (OAuth 동의화면 앱 이름과 일치 - 구글이 manifest name을 읽음)
    name: 'MAPEXP',
    short_name: 'MAPEXP',
    description: '방문한 지역을 지도에 기록하고 색칠하는 여행 기록 앱. 로그인하면 기록을 클라우드에 저장하고 여러 기기에서 동기화할 수 있습니다.',
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
