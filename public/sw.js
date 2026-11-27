// Service worker: instala la app (PWA/TWA) y acelera la carga con caché inteligente.
const CACHE = 'movtek-app-v7'

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    // Guarda el cascarón de la app para abrir al instante aunque la red esté lenta.
    try { const c = await caches.open(CACHE); await c.add('/') } catch {}
    self.skipWaiting()
  })())
})
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const esNavegacion = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')

  // HTML / navegación: red primero PERO con límite de 3.5 s. Si la red tarda, servimos el
  // cascarón guardado (apertura instantánea) y la red sigue actualizando la caché.
  if (esNavegacion) {
    e.respondWith((async () => {
      try {
        const res = await Promise.race([
          fetch(req).then((r) => { caches.open(CACHE).then((c) => c.put('/', r.clone())).catch(() => {}); return r }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('nav-timeout')), 3500)),
        ])
        return res
      } catch {
        return (await caches.match(req)) || (await caches.match('/')) || fetch(req)
      }
    })())
    return
  }

  // Recursos con hash en /assets/ (JS, CSS, imágenes): son inmutables → CACHÉ primero = instantáneo.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        return res
      }))
    )
    return
  }

  // Resto (API, logos, etc.): red primero; no se cachea /api (datos dinámicos).
  e.respondWith(
    fetch(req).then((res) => {
      if (url.origin === self.location.origin && !url.pathname.startsWith('/api/')) {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
      }
      return res
    }).catch(() => caches.match(req))
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
