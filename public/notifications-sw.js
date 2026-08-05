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
