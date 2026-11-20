import { useState } from 'react'
import { useInstalar, esStandalone, esIOS } from '../lib/pwa'

// Instala/guarda la app en el celular.
// - Android: intenta el instalador de un toque; si el navegador no lo ofrece, muestra los pasos del menú ⋮.
// - iPhone: Apple solo permite "Compartir → Agregar a inicio"; se muestran esos pasos.
export default function InstalarApp({ empresa }) {
  const { instalar } = useInstalar()
  const [pasos, setPasos] = useState(false)

  if (esStandalone()) return null // ya está instalada

  const color = empresa?.color_primario || '#16a34a'
  const ios = esIOS()

  const onClick = async () => {
    if (ios) { setPasos(true); return }
    const ok = await instalar()      // intenta instalar con un toque
    if (!ok) setPasos(true)          // si el navegador no lo ofreció, muestra los pasos
  }

  return (
    <div className="mb-4">
      <button onClick={onClick}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-extrabold text-white shadow-glow"
        style={{ background: color }}>
        📲 {ios ? 'Instalar en iPhone' : 'Descargar app'}
      </button>

      {pasos && (
        <div className="mt-3 rounded-xl border-2 border-dashed p-3 text-sm" style={{ borderColor: color }}>
          {ios ? (
            <>
              <p className="mb-2 font-bold text-ink">Para guardarla en tu iPhone:</p>
              <ol className="ml-4 list-decimal space-y-1 text-ink-soft">
                <li>Abre este enlace en <b>Safari</b>.</li>
                <li>Toca el botón <b>Compartir</b> <span className="align-middle">⬆️</span> (abajo, al centro).</li>
                <li>Baja y toca <b>“Agregar a inicio”</b>.</li>
                <li>Toca <b>“Agregar”</b>. ¡Listo, queda el ícono!</li>
              </ol>
            </>
          ) : (
            <>
              <p className="mb-2 font-bold text-ink">Para guardarla en tu Android:</p>
              <ol className="ml-4 list-decimal space-y-1 text-ink-soft">
                <li>Toca el menú <b>⋮</b> (arriba a la derecha de Chrome).</li>
                <li>Elige <b>“Instalar aplicación”</b> o <b>“Agregar a la pantalla principal”</b>.</li>
                <li>Confirma <b>“Instalar”</b>. ¡Listo, queda el ícono!</li>
              </ol>
              <p className="mt-2 text-xs text-ink-faint">Consejo: si no ves la opción, recarga la página una vez y vuelve a intentar.</p>
            </>
          )}
        </div>
      )}

      {!pasos && !ios && (
        <p className="mt-2 text-center text-xs text-ink-faint">Si no se abre el instalador, toca el botón y te muestro los pasos.</p>
      )}
    </div>
  )
}
