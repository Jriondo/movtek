import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { nivelAlmacenamiento } from '../lib/db'
import { isSupabaseConfigured } from '../lib/supabase'

// Aviso (solo para el superadministrador) cuando el almacenamiento está por llenarse,
// para poder liberar espacio o comprar más capacidad antes de que el sistema colapse.
const CACHE_KEY = 'movtek_alm_nivel'
const CERRADA_KEY = 'movtek_alm_cerrada'
const SEIS_HORAS = 6 * 60 * 60 * 1000

export default function AlertaAlmacenamiento() {
  const [info, setInfo] = useState(null)
  const [oculto, setOculto] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    // No recalculamos en cada pantalla: usamos el valor guardado si es reciente (< 6 h).
    let guardada = null
    try { guardada = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') } catch {}
    if (guardada && Date.now() - guardada.ts < SEIS_HORAS) { setInfo(guardada.info); return }
    nivelAlmacenamiento().then((r) => {
      if (!r) return
      setInfo(r)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), info: r })) } catch {}
    }).catch(() => {})
  }, [])

  if (!info || info.nivel === 'ok' || oculto) return null
  const critico = info.nivel === 'critico'

  function cerrar() {
    setOculto(true)
    try { sessionStorage.setItem(CERRADA_KEY, '1') } catch {}
  }
  // Si ya la cerró en esta sesión, no molestar de nuevo (salvo que sea crítico).
  try { if (!critico && sessionStorage.getItem(CERRADA_KEY) === '1') return null } catch {}

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${critico ? 'border-coral-400/50 bg-coral-400/10' : 'border-amber-300 bg-amber-50'}`}>
      <span className="text-xl">{critico ? '🚨' : '⚠️'}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${critico ? 'text-coral-600' : 'text-amber-700'}`}>
          {critico ? 'Almacenamiento casi lleno' : 'El almacenamiento se está llenando'}
        </p>
        <p className="text-xs text-ink-soft">
          Uso estimado: <b>{info.estMB.toFixed(1)} MB</b> de ~{info.limiteMB} MB ({info.pct}%).
          {info.pendientes > 0
            ? <> Libera espacio moviendo {info.pendientes} imagen(es) a Storage, o amplía el plan en Supabase.</>
            : <> Considera ampliar la capacidad en Supabase para que el sistema no se detenga.</>}
        </p>
      </div>
      <Link to="/almacenamiento" className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white ${critico ? 'bg-coral-500' : 'bg-amber-500'}`}>Ver almacenamiento</Link>
      <button onClick={cerrar} className="rounded-lg px-2 py-1.5 text-xs font-bold text-ink-soft hover:text-ink" title="Ocultar">✕</button>
    </div>
  )
}
