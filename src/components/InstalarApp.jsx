import { useState } from 'react'
import { useInstalar, esStandalone, esIOS } from '../lib/pwa'

// Botón directo para instalar/descargar la app en el celular.
// - Android: un toque y se instala.
// - iPhone: muestra los 2 pasos para agregarla a inicio.
export default function InstalarApp({ empresa }) {
  const { instalar } = useInstalar()
  const [ayuda, setAyuda] = useState(false)

  if (esStandalone()) return null // ya está instalada

  const color = empresa?.color_primario || '#16a34a'
  const ios = esIOS()

  const onClick = async () => {
    if (ios) { setAyuda((a) => !a); return }
    const ok = await instalar()      // intenta instalar con un toque
    if (!ok) setAyuda(true)          // si el navegador no lo permitió, muestra los pasos
  }

  return (
    <div className="mb-4">
      <button onClick={onClick}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-extrabold text-white shadow-glow"
        style={{ background: color }}>
        📲 Descargar app
      </button>
      {(ayuda || ios) && (
        <p className="mt-2 text-center text-xs text-ink-soft">
          {ios
            ? <>En iPhone: toca <b>Compartir</b> <span className="align-middle">⬆️</span> y luego <b>“Agregar a pantalla de inicio”</b>.</>
            : <>Si no se abrió el instalador, abre el menú <b>⋮</b> del navegador y elige <b>“Instalar aplicación”</b>.</>}
        </p>
      )}
    </div>
  )
}
