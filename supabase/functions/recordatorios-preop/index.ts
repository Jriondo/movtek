// Edge Function: envía el recordatorio push a los conductores que NO han hecho
// la preoperacional hoy. Se programa con cron (ver supabase/recordatorios.sql).
//
// Variables de entorno necesarias (Supabase -> Edge Functions -> Secrets):
//   SUPABASE_URL                (lo pone Supabase)
//   SUPABASE_SERVICE_ROLE_KEY   (lo pone Supabase)
//   VAPID_PUBLIC                (la llave pública VAPID)
//   VAPID_PRIVATE              (la llave privada VAPID)
//   VAPID_SUBJECT              (mailto:tucorreo@empresa.com)

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Fecha de HOY en hora Colombia (UTC-5), formato YYYY-MM-DD.
function hoyColombia(): string {
  const ahora = new Date()
  const col = new Date(ahora.getTime() - 5 * 60 * 60 * 1000)
  return col.toISOString().slice(0, 10)
}

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublic = Deno.env.get('VAPID_PUBLIC')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE')!
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:soporte@movtek.app'

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  const supabase = createClient(url, key)

  const hoy = hoyColombia()

  // Conductores que YA hicieron algo hoy (preoperacional, taller o descanso).
  const { data: hechos } = await supabase.from('preoperacionales').select('conductor_id').eq('fecha', hoy)
  const yaHicieron = new Set((hechos || []).map((r: any) => String(r.conductor_id)))

  // Suscripciones + nombre de la empresa (para el texto).
  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  const { data: empresas } = await supabase.from('empresas').select('id,nombre,slug')
  const nombreEmpresa: Record<string, any> = {}
  for (const e of empresas || []) nombreEmpresa[String(e.id)] = e

  let enviados = 0, pendientes = 0, limpiados = 0
  for (const s of subs || []) {
    if (s.conductor_id && yaHicieron.has(String(s.conductor_id))) continue // ya la hizo
    pendientes++
    const emp = nombreEmpresa[String(s.empresa_id)]
    const slug = emp?.slug || ''
    const payload = JSON.stringify({
      title: 'Preoperacional pendiente',
      body: `Recuerda hacer la preoperacional de hoy en ${emp?.nombre || 'tu empresa'}.`,
      url: slug ? `/e/${slug}/app` : '/',
    })
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      )
      enviados++
    } catch (err: any) {
      // Suscripción vencida o inválida -> se borra.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        limpiados++
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, fecha: hoy, pendientes, enviados, limpiados }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
