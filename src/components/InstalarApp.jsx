import { useState } from 'react'
import { useInstalar, esStandalone, esIOS } from '../lib/pwa'

// Instala la app en el celular.
// - Android: descarga el APK de la empresa (lo más confiable).
// - iPhone: Apple solo permite "Compartir → Agregar a inicio".
export default function InstalarApp({ empresa }) {
  const { instalar } = useInstalar()
  const [pasos, setPasos] = useState(false)

  if (esStandalone()) return null // ya está instalada / dentro del APK

  const color = empresa?.color_primario || '#16a34a'
  const ios = esIOS()
  // Slug de la empresa (para el nombre del APK): de la ficha o de la URL /e/<slug>/app.
  const slug = empresa?.slug || (typeof location !== 'undefined' ? (location.pathname.match(/\/e\/([^/]+)/)?.[1] || '') : '')
  const apkUrl = `/apk/${slug}.apk`

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

  // Android
  return (
    <div className="mb-4">
      <a href={apkUrl} download
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-extrabold text-white shadow-glow"
        style={{ background: color }}>
        ⬇️ Descargar app (Android)
      </a>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Al abrir el archivo, si el teléfono lo pide, activa <b>“Permitir de esta fuente”</b> y toca <b>Instalar</b>.
      </p>
      <button onClick={instalarNavegador} className="mt-2 w-full text-center text-xs font-semibold text-ink-faint hover:text-brand-500">
        o instalar sin descargar archivo
      </button>
      {pasos && (
        <p className="mt-2 text-center text-xs text-ink-soft">
          Para instalar sin archivo: menú <b>⋮</b> de Chrome → <b>“Instalar aplicación”</b>.
        </p>
      )}
    </div>
  )
}
