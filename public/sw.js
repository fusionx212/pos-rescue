// POS Rescue — Service Worker
// Strategy: NETWORK-FIRST for pages (stale app code at an emergency is
// fatal — cache is the offline fallback, never the default), CACHE-FIRST
// only for content-hashed static assets, which are immutable by name.

const CACHE = 'pos-rescue-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting() // activate immediately — no waiting for tab close
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim() // take over open tabs so v1's cache-first dies now
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Never touch API calls — always live
  if (request.url.includes('/api/')) return

  const isImmutableAsset =
    request.url.includes('/_next/static/') ||
    ['style', 'script', 'font', 'image'].includes(request.destination)

  if (isImmutableAsset) {
    // Content-hashed: safe to serve from cache forever
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      })(),
    )
    return
  }

  // Pages and everything else: network first, cache as offline fallback
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      } catch {
        const cached = await caches.match(request)
        return cached || new Response('Offline', { status: 503 })
      }
    })(),
  )
})
