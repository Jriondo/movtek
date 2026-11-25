// Genera el ÍCONO de la app (home screen / PWA) con el logo de la empresa MÁS GRANDE,
// centrado sobre un cuadro, para que no se vea chiquito con borde blanco.
import sharp from 'sharp'

async function bufferDeLogo(logo) {
  if (typeof logo !== 'string') return null
  if (logo.startsWith('data:')) {
    const m = logo.match(/^data:([^;]+);base64,(.*)$/)
    if (m) return Buffer.from(m[2], 'base64')
    return null
  }
  if (/^https?:\/\//.test(logo)) {
    const r = await fetch(logo)
    if (!r.ok) return null
    return Buffer.from(await r.arrayBuffer())
  }
  return null
}

export default async function handler(req, res) {
  const slug = (req.query.slug || '').toString().trim()
  const size = Math.min(1024, Math.max(96, parseInt(req.query.size) || 512))
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    if (url && key && slug) {
      const r = await fetch(`${url}/rest/v1/empresas?slug=eq.${encodeURIComponent(slug)}&select=logo_url&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
      const data = await r.json()
      const logo = Array.isArray(data) && data[0] && data[0].logo_url
      const buf = await bufferDeLogo(logo)
      if (buf) {
        // El logo ocupa ~92% del cuadro (borde mínimo), centrado, fondo blanco.
        const pad = Math.round(size * 0.04)
        const inner = size - pad * 2
        const logoPng = await sharp(buf)
          .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png().toBuffer()
        const out = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
          .composite([{ input: logoPng, gravity: 'center' }])
          .png().toBuffer()
        res.statusCode = 200
        res.setHeader('Content-Type', 'image/png')
        res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
        return res.end(out)
      }
    }
  } catch {}
  // Respaldo: ícono genérico.
  res.statusCode = 302
  res.setHeader('Location', size <= 256 ? '/icon-192.png' : '/icon-512.png')
  return res.end()
}
