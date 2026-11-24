import { supabase, isSupabaseConfigured } from './supabase'

export const BUCKET = 'movtek'
export const esDataUrl = (s) => typeof s === 'string' && s.startsWith('data:')

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',')
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || 'image/png'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return { blob: new Blob([arr], { type: mime }), mime }
}

// Sube una imagen dataURL a Supabase Storage y devuelve la URL pública.
// Si no hay Supabase o algo falla, devuelve el dataURL original (no rompe el guardado).
export async function subirDataUrl(dataUrl, ruta) {
  if (!isSupabaseConfigured || !esDataUrl(dataUrl)) return dataUrl
  try {
    const { blob, mime } = dataUrlToBlob(dataUrl)
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, blob, { upsert: true, contentType: mime })
    if (error) throw error
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta)
    return data?.publicUrl || dataUrl
  } catch (e) {
    console.warn('No se pudo subir a Storage (' + ruta + '):', e?.message || e)
    return dataUrl   // se queda como estaba; el guardado no falla
  }
}

const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
export const subirFirma = (dataUrl, empresaId) => subirDataUrl(dataUrl, `firmas/${empresaId || 'gen'}/${rid()}.png`)
export const subirLogo = (dataUrl, clave) => subirDataUrl(dataUrl, `logos/${(clave || rid()).toString().replace(/[^a-z0-9_-]/gi, '')}.png`)
