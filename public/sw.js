const CACHE = 'qu4sar-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      const core = ['./', './index.html', './manifest.webmanifest', './qu4sar.ico', './qu4sar.svg']
        .map((p) => new URL(p, self.location.origin).href)
      return cache.addAll(core)
    }).then(() => self.skipWaiting()).catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Network-first para navegación, cache-first para assets con versión (hash /assets/)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (event.request.method !== 'GET') return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone)).catch(() => {})
          return res
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
    )
    return
  }

  if (url.pathname.includes('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone)).catch(() => {})
          return res
        })
      })
    )
    return
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawTarget = event.notification.data?.url || '#/'
  const target = rawTarget.startsWith('#') ? rawTarget : `#${rawTarget.startsWith('/') ? rawTarget : `/${rawTarget}`}`
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client)
      if (existing) {
        existing.navigate(new URL(target, self.location.origin).href)
        return existing.focus()
      }
      return self.clients.openWindow(new URL(target, self.location.origin).href)
    })
  )
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'QU4SAR Academy', {
      body: data.body || 'Tienes una nueva actualización.',
      icon: data.icon || './qu4sar.ico',
      badge: data.badge || './qu4sar.ico',
      data: { url: data.url || '#/' },
    })
  )
})