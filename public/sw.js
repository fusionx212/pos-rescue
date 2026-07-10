// POS Rescue — Minimal Service Worker
// Caches static assets for offline / flaky-connection resilience.

const CACHE = 'pos-rescue-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting() // activate immediately — no waiting for tab close
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ),
  )
})

self.addEventListener('fetch', (event) => {
  // Only cache GET requests for same-origin static assets
  const { request } = event
  if (request.method !== 'GET') return

  // Don't cache API responses — those are dynamic
  if (request.url.includes('/api/')) return

  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached

      try {
        const response = await fetch(request)
        if (response.ok && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      } catch {
        // Offline — serve cached if available
        return cached || new Response('Offline', { status: 503 })
      }
    })(),
  )
})