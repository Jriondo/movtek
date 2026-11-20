// Sirve el logo de una empresa como imagen real (URL), para la vista previa de WhatsApp.
// Los logos se guardan incrustados (data URI) en la base; aquí se decodifican y se entregan
// como PNG/JPG. Si la empresa no tiene logo, cae al ícono genérico.

export default async function handler(req, res) {
  const slug = (req.query.slug || '').toString().trim()
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    if (url && key && slug) {
      const r = await fetch(`${url}/rest/v1/empresas?slug=eq.${encodeURIComponent(slug)}&select=logo_url&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
      const data = await r.json()
      const logo = Array.isArray(data) && data[0] && data[0].logo_url
      if (logo && typeof logo === 'string') {
        if (logo.startsWith('data:')) {
          const m = logo.match(/^data:([^;]+);base64,(.*)$/)
          if (m) {
            const buf = Buffer.from(m[2], 'base64')
            res.statusCode = 200
            res.setHeader('Content-Type', m[1])
            res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
            return res.end(buf)
          }
        } else if (/^https?:\/\//.test(logo)) {
          res.statusCode = 302
          res.setHeader('Location', logo)
          return res.end()
        }
      }
    }
  } catch {}
  // Respaldo: ícono genérico.
  res.statusCode = 302
  res.setHeader('Location', '/icon-192.png')
  return res.end()
}
