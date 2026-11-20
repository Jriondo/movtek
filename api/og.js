// Genera la vista previa (meta tags) por empresa para los links /e/<slug> y /e/<slug>/app.
// Así, al compartir por WhatsApp, aparece "App <EMPRESA>" en vez del título genérico.
// Devuelve el MISMO index.html de la app, solo con el título y los meta reemplazados.

const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

export default async function handler(req, res) {
  const slug = (req.query.slug || '').toString().trim()
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${host}`

  // 1) Trae el shell de la app (index.html ya construido, con sus scripts).
  let html = ''
  try {
    html = await (await fetch(`${origin}/index.html`)).text()
  } catch {
    res.statusCode = 302
    res.setHeader('Location', `/e/${encodeURIComponent(slug)}`)
    return res.end()
  }

  // 2) Busca el nombre de la empresa (lectura pública con la anon key).
  let nombre = ''
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    if (url && key && slug) {
      const r = await fetch(`${url}/rest/v1/empresas?slug=eq.${encodeURIComponent(slug)}&select=nombre,razon_social&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      })
      const data = await r.json()
      nombre = (Array.isArray(data) && (data[0]?.nombre || data[0]?.razon_social)) || ''
    }
  } catch {}

  const titulo = nombre ? `App ${nombre}` : 'App de preoperacional'
  const desc = nombre
    ? `Preoperacional de conductores · ${nombre}`
    : 'App de preoperacional para conductores'
  const urlApp = `${origin}/e/${esc(slug)}/app`

  const tags = `<title>${esc(titulo)}</title>
    <meta name="description" content="${esc(desc)}" />
    <meta property="og:title" content="${esc(titulo)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${urlApp}" />
    <meta property="og:image" content="${origin}/api/logo?slug=${esc(slug)}" />
    <meta property="og:image:alt" content="${esc(nombre || 'Empresa')}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:image" content="${origin}/api/logo?slug=${esc(slug)}" />
    <meta name="twitter:title" content="${esc(titulo)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <link rel="manifest" href="/api/manifest?slug=${esc(slug)}" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="${esc(nombre || 'App')}" />
    <link rel="apple-touch-icon" href="${origin}/api/logo?slug=${esc(slug)}" />`

  // 3) Quita los meta por defecto (para no duplicar) y pone los de la empresa.
  html = html
    .replace(/<meta name="description"[^>]*>\s*/gi, '')
    .replace(/<meta property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/i, tags)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // La página SIEMPRE se revalida (así la app toma la versión nueva sin reinstalar).
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.status(200).send(html)
}
