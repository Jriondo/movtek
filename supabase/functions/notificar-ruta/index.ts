// Edge Function: avisa por push a UN conductor que le asignaron ruta(s) nueva(s).
// La llama la plataforma (al generar el cronograma). Reutiliza las mismas llaves VAPID.
//
// Secrets necesarios (ya configurados): VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase solo.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { conductor_id, empresa_id, cantidad, fecha } = await req.json().catch(() => ({}))
    if (!conductor_id) return new Response(JSON.stringify({ ok: false, error: 'falta conductor_id' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })

    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT') || 'mailto:soporte@movtek.app',
      Deno.env.get('VAPID_PUBLIC')!,
      Deno.env.get('VAPID_PRIVATE')!,
    )
    const supabase = createClient(url, key)

    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('conductor_id', conductor_id)
    let slug = ''
    if (empresa_id) {
      const { data: e } = await supabase.from('empresas').select('slug').eq('id', empresa_id).single()
      slug = e?.slug || ''
    }

    const n = Number(cantidad) || 1
    const payload = JSON.stringify({
      title: n > 1 ? `${n} rutas nuevas` : 'Nueva ruta asignada',
      body: `Te asignaron ${n} ruta${n > 1 ? 's' : ''}${fecha ? ` para el ${fecha}` : ''}. Abre la app para verla.`,
      url: slug ? `/e/${slug}/app` : '/',
    })

    let enviados = 0, limpiados = 0
    for (const s of subs || []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        enviados++
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          limpiados++
        }
      }
    }
    return new Response(JSON.stringify({ ok: true, enviados, limpiados }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
