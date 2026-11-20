import { useState, useEffect } from 'react'
import { useInstalar, esStandalone, esIOS } from '../lib/pwa'

// Instala la app en el celular.
// - Android: descarga el APK de la empresa (lo más confiable).
// - iPhone: Apple solo permite "Compartir → Agregar a inicio".
export default function InstalarApp({ empresa }) {
  const { instalar } = useInstalar()
  const [pasos, setPasos] = useState(false)
  const [apkListo, setApkListo] = useState(null) // null=comprobando, true/false

  const color = empresa?.color_primario || '#16a34a'
  const ios = esIOS()
  // Slug de la empresa (para el nombre del APK): de la ficha o de la URL /e/<slug>/app.
  const slug = empresa?.slug || (typeof location !== 'undefined' ? (location.pathname.match(/\/e\/([^/]+)/)?.[1] || '') : '')
  const apkUrl = `/apk/${slug}.apk`

  // Comprueba si el APK de esta empresa ya está publicado (se genera solo tras crear la empresa).
  useEffect(() => {
    if (ios || !slug) return
    let vivo = true
    fetch(apkUrl, { method: 'HEAD' })
      .then((r) => { if (vivo) setApkListo(r.ok) })
      .catch(() => { if (vivo) setApkListo(false) })
    return () => { vivo = false }
  }, [slug, ios])

  if (esStandalone()) return null // ya está instalada / dentro del APK

  const instalarNavegador = async () => {
    const ok = await instalar()
    if (!ok) setPasos(true)
  }

  if (ios) {
    return (
      <div className="mb-4">
        <button onClick={() => setPasos((p) => !p)}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-extrabold text-white shadow-glow"
          style={{ background: color }}>
          📲 Instalar en iPhone
        </button>
        {pasos && (
          <div className="mt-3 rounded-xl border-2 border-dashed p-3 text-sm" style={{ borderColor: color }}>
            <ol className="ml-4 list-decimal space-y-1 text-ink-soft">
              <li>Abre este enlace en <b>Safari</b>.</li>
              <li>Toca <b>Compartir</b> <span className="align-middle">⬆️</span> (abajo, al centro).</li>
              <li>Baja y toca <b>“Agregar a inicio”</b> → <b>“Agregar”</b>. ✅</li>
            </ol>
          </div>
        )}
      </div>
    )
  }

  // Android: se ofrecen LAS DOS opciones; el usuario elige la que le funcione.
  return (
    <div className="mb-4 rounded-2xl border-2 p-3" style={{ borderColor: color, background: color + '0d' }}>
      <p className="mb-2 text-center text-sm font-bold text-ink">Instala la app (elige una opción)</p>

      {/* Opción 1: descargar el APK */}
      {apkListo === false ? (
        <div className="rounded-xl border border-dashed p-2.5 text-center text-xs text-ink-soft" style={{ borderColor: color }}>
          ⏳ <b>Opción 1 — Descargar APK:</b> se está preparando el instalador de tu empresa. Intenta en un momento, o usa la Opción 2.
        </div>
      ) : (
        <a href={apkUrl} download
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-extrabold text-white shadow-glow"
          style={{ background: color }}>
          ⬇️ Opción 1 · Descargar APK
        </a>
      )}

      <div className="my-2 text-center text-xs font-bold text-ink-faint">— o —</div>

      {/* Opción 2: instalar como app (PWA) */}
      <button onClick={instalarNavegador}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-base font-extrabold"
        style={{ borderColor: color, color }}>
        📲 Opción 2 · Instalar como app
      </button>

      {pasos && (
        <p className="mt-2 text-center text-xs text-ink-soft">
          Si no se abrió el instalador, usa el menú <b>⋮</b> de Chrome → <b>“Instalar aplicación”</b>.
        </p>
      )}
      <p className="mt-2 text-center text-[11px] text-ink-faint">
        Con la <b>Opción 1</b>, al abrir el archivo activa <b>“Permitir de esta fuente”</b> y toca Instalar.
      </p>
    </div>
  )
}
