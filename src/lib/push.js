import { supabase, isSupabaseConfigured } from './supabase'

// Llave pública VAPID (es pública, no es secreto). Se puede sobrescribir con una variable de entorno.
export const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY
  || 'BM-l-azrYjPngGEFjh9g18AF7GceZULvDOFw2bQ-FdCqPMCyRUV-0L1lFtWGJYdl8d3_20x4gXRHdBpyDA2WbhY'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Suscribe al conductor a las notificaciones push y guarda la suscripción en Supabase.
// Devuelve { ok, motivo }.
export async function activarPushConductor({ empresa, conductor, email }) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return { ok: false, motivo: 'no-soportado' }
    if (!('Notification' in window)) return { ok: false, motivo: 'no-soportado' }
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return { ok: false, motivo: 'sin-permiso' }
    }
    if (Notification.permission !== 'granted') return { ok: false, motivo: 'sin-permiso' }

    // Asegura que el service worker esté listo (con tiempo límite para no quedar pegado).
    if (!navigator.serviceWorker.controller) { try { await navigator.serviceWorker.register('/sw.js') } catch {} }
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, rej) => setTimeout(() => rej(new Error('sw-timeout')), 8000)),
    ])

    const appKey = urlBase64ToUint8Array(VAPID_PUBLIC)
    let sub = await reg.pushManager.getSubscription()
    // Si ya existe pero con OTRA llave (p. ej. una vieja), se cancela y se vuelve a suscribir.
    if (sub) {
      const prev = new Uint8Array(sub.options?.applicationServerKey || [])
      const igual = prev.length === appKey.length && prev.every((b, i) => b === appKey[i])
      if (!igual) { try { await sub.unsubscribe() } catch {} sub = null }
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey })
    }

    // Sin Supabase (modo demo) no hay servidor que envíe; igual queda suscrito localmente.
    if (!isSupabaseConfigured) return { ok: true, demo: true }

    const json = sub.toJSON()
    const fila = {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      empresa_id: empresa?.id || null,
      conductor_id: conductor?.id || null,
      user_email: email || null,
    }
    const { error } = await supabase.from('push_subscriptions').upsert(fila, { onConflict: 'endpoint' })
    if (error) return { ok: false, motivo: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, motivo: e?.message || 'error' }
  }
}
