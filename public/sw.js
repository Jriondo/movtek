// Service worker mínimo: habilita la instalación de la app (PWA) y un caché básico.
const CACHE = 'movtek-app-v1'

self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })

// Estrategia: red primero; si falla, intenta el caché (para que abra sin conexión lo ya visto).
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req))
  )
})

// ---- Notificaciones push (recordatorio de preoperacional) ----
self.addEventListener('push', (e) => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch { data = { body: e.data && e.data.text() } }
  const titulo = data.title || 'Preoperacional pendiente'
  const opciones = {
    body: data.body || 'Recuerda hacer la preoperacional de hoy.',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'preop-recordatorio',
    renotify: true,
    data: { url: data.url || '/' },
  }
  e.waitUntil(self.registration.showNotification(titulo, opciones))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) { if (c.url.includes(url) && 'focus' in c) return c.focus() }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
