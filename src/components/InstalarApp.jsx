import { useInstalar, esStandalone, esIOS } from '../lib/pwa'

// Tarjeta "Instalar aplicación" que aparece al abrir el link.
// - Android: botón que instala con un toque.
// - iPhone: instrucciones para "Agregar a inicio".
// - Ya instalada: no muestra nada.
export default function InstalarApp({ empresa }) {
  const { puedeInstalar, instalar } = useInstalar()

  if (esStandalone()) return null // ya está instalada y abierta como app

  const color = empresa?.color_primario || '#16a34a'
  const ios = esIOS()

  return (
    <div className="mb-4 rounded-2xl border-2 p-4 text-center" style={{ borderColor: color, background: color + '12' }}>
      <div className="flex items-center justify-center gap-2">
        {empresa?.logo_url
          ? <img src={empresa.logo_url} alt="" className="h-9 w-auto max-w-[90px] object-contain" />
          : <span className="text-2xl">📲</span>}
        <p className="font-display text-base font-extrabold text-ink">Instala la app</p>
      </div>

      {ios ? (
        <div className="mt-2 text-sm text-ink-soft">
          <p>Para instalarla en tu iPhone:</p>
          <p className="mt-1">1. Toca <b>Compartir</b> <span className="align-middle">⎙</span> abajo.</p>
          <p>2. Elige <b>“Agregar a pantalla de inicio”</b>.</p>
        </div>
      ) : puedeInstalar ? (
        <button onClick={instalar} className="mt-3 w-full rounded-xl px-4 py-3 text-base font-extrabold text-white shadow-glow" style={{ background: color }}>
          📲 Instalar la aplicación
        </button>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">
          Para instalarla, abre el menú <b>⋮</b> del navegador y elige <b>“Instalar aplicación”</b> o <b>“Agregar a pantalla de inicio”</b>.
        </p>
      )}
      <p className="mt-2 text-xs text-ink-faint">Queda el ícono en tu celular y se abre como una app.</p>
    </div>
  )
}
