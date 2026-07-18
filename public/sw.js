/* MAPEXP 서비스 워커
 * - GeoJSON/정적 자산: cache-first (용량 큰 지도 데이터 재다운로드 방지)
 * - 페이지/기타: network-first (오프라인 시 캐시 폴백)
 */
const CACHE_NAME = 'mapexp-v8'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // 외부 요청(지도 타일 등)은 브라우저 기본 처리
  if (url.origin !== self.location.origin) return

  // GeoJSON 및 Next 정적 자산: cache-first
  const isStatic =
    url.pathname.startsWith('/geojson/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/')

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          })
      )
    )
    return
  }

  // 페이지: network-first, 오프라인 시 캐시 폴백
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.mode === 'navigate') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})
