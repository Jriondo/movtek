import { useEffect, useState } from 'react'
import { APP_VERSION, NOVEDADES } from '../lib/version'

const KEY = 'movtek_version_vista'

// Muestra un aviso cuando hay una nueva versión de la plataforma (como "nueva actualización").
export default function AvisoActualizacion() {
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    try {
      const vista = localStorage.getItem(KEY)
      if (vista !== APP_VERSION) setMostrar(true)
    } catch { setMostrar(true) }
  }, [])

  function cerrar() {
    try { localStorage.setItem(KEY, APP_VERSION) } catch {}
    setMostrar(false)
  }

  if (!mostrar) return null

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 shadow-sm print:hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brand-500 text-white text-lg shadow-glow">✨</div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold text-ink">¡Nueva actualización disponible!</p>
          <p className="text-xs text-ink-soft">Versión {APP_VERSION} · Esto es lo nuevo:</p>
          <ul className="mt-2 flex flex-col gap-1">
            {NOVEDADES.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-ink">
                <span className="mt-0.5 flex-none text-brand-500">✓</span><span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
        <button onClick={cerrar} className="flex-none rounded-lg px-2 py-1 text-xs font-bold text-ink-soft hover:bg-white/60" aria-label="Cerrar">✕</button>
      </div>
      <div className="flex justify-end border-t border-brand-200/60 bg-white/50 px-4 py-2">
        <button onClick={cerrar} className="btn-primary !px-4 !py-1.5 text-xs">Entendido</button>
      </div>
    </div>
  )
}
