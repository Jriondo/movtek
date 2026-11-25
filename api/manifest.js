// Manifest de la app (PWA) por empresa, servido como archivo real.
// Esto permite que el navegador ofrezca "Instalar aplicación" de forma confiable.
export default async function handler(req, res) {
  const slug = (req.query.slug || '').toString().trim()

  let nombre = '', color = '#16a34a'
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    if (url && key && slug) {
      const r = await fetch(`${url}/rest/v1/empresas?slug=eq.${encodeURIComponent(slug)}&select=nombre,color_primario&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
      const data = await r.json()
      if (Array.isArray(data) && data[0]) {
        nombre = data[0].nombre || ''
        color = data[0].color_primario || color
      }
    }
  } catch {}

  const icon192 = slug ? `/api/icon?slug=${encodeURIComponent(slug)}&size=192` : '/icon-192.png'
  const icon512 = slug ? `/api/icon?slug=${encodeURIComponent(slug)}&size=512` : '/icon-512.png'
  const manifest = {
    name: nombre ? `${nombre} · Preoperacional` : 'App de preoperacional',
    short_name: nombre ? nombre.slice(0, 20) : 'Preop',
    start_url: `/e/${slug}/app`,
    scope: `/e/${slug}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: color,
    icons: [
      // Ícono con el logo de la empresa GRANDE (compuesto en /api/icon). 'maskable' para
      // que Android llene el ícono (sin el borde blanco que lo hacía ver chiquito).
      { src: icon192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      // Respaldo PNG al final (solo si falla el logo; garantiza que se pueda instalar).
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')
  res.status(200).send(JSON.stringify(manifest))
}
