import { useEffect, useState } from 'react'
import { almacenamientoStats, migrarImagenesAStorage } from '../lib/db'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Almacenamiento() {
  const [stats, setStats] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [migrando, setMigrando] = useState(false)
  const [prog, setProg] = useState(null)
  const [msg, setMsg] = useState('')

  async function cargar() {
    setCargando(true)
    setStats(await almacenamientoStats().catch(() => null))
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  async function migrar() {
    setMigrando(true); setMsg(''); setProg({ firmas: 0, logos: 0 })
    const r = await migrarImagenesAStorage((p) => setProg({ ...p }))
    setMigrando(false)
    if (r.ok) { setMsg(`✅ Migración lista: ${r.firmas} firma(s) y ${r.logos} logo(s) movidos a Storage.`); cargar() }
    else if (r.motivo === 'demo') setMsg('Esto solo aplica con Supabase conectado (en producción).')
    else setMsg('⚠️ Ocurrió un error: ' + (r.error || '') + `. Movidos: ${r.firmas} firmas, ${r.logos} logos.`)
  }

  const pendientes = stats ? stats.firmasBase64 + stats.logosBase64 : 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">💾 Almacenamiento</h1>
        <p className="mt-1 text-sm text-ink-soft">Cuánto espacio ocupan las imágenes (firmas y logos) dentro de la base, y cómo liberarla.</p>
      </div>

      {!isSupabaseConfigured ? (
        <div className="card p-6 text-sm text-ink-soft">
          Estás en <b>modo demo</b> (sin Supabase). El control de almacenamiento y la migración a Storage funcionan cuando conectas tu base de Supabase en producción.
        </div>
      ) : cargando ? (
        <p className="text-ink-faint">Calculando…</p>
      ) : !stats ? (
        <div className="card p-6 text-sm text-coral-500">No se pudo leer el estado. Verifica tu conexión a Supabase.</div>
      ) : (
        <>
          {/* Tarjetas de resumen */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Tarjeta titulo="Ocupado por imágenes (estimado)" valor={`${stats.estMB.toFixed(1)} MB`} nota="dentro de la base" alerta={stats.estMB > 300} />
            <Tarjeta titulo="Imágenes aún en la base" valor={pendientes} nota="firmas + logos en base64" alerta={pendientes > 0} />
            <Tarjeta titulo="Ya en Storage" valor={stats.firmasUrl + stats.logosUrl} nota="solo ocupan una URL" ok />
          </div>

          {/* Detalle */}
          <div className="card p-4 text-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Dato k="Firmas en base" v={stats.firmasBase64} alerta={stats.firmasBase64 > 0} />
              <Dato k="Firmas en Storage" v={stats.firmasUrl} ok />
              <Dato k="Logos en base" v={stats.logosBase64} alerta={stats.logosBase64 > 0} />
              <Dato k="Logos en Storage" v={stats.logosUrl} ok />
            </div>
          </div>

          {/* Acción: migrar */}
          <div className="card p-5">
            <h2 className="font-display text-base font-extrabold text-ink">Liberar espacio</h2>
            {pendientes === 0 ? (
              <p className="mt-1 text-sm text-mint-600">✅ Todo está optimizado: no hay imágenes guardadas dentro de la base.</p>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">
                Hay <b className="text-ink">{pendientes}</b> imagen(es) guardada(s) como base64 dentro de la base. Muévelas a <b>Storage</b> para que la base quede liviana (se guarda solo la URL).
              </p>
            )}
            {prog && migrando && <p className="mt-2 text-sm text-brand-600">Migrando… {prog.firmas} firmas, {prog.logos} logos</p>}
            {msg && <p className="mt-2 rounded-lg bg-cloud px-3 py-2 text-sm font-semibold text-ink">{msg}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={cargar} className="btn-ghost" disabled={migrando}>↻ Recalcular</button>
              <button onClick={migrar} className="btn-primary" disabled={migrando || pendientes === 0}>{migrando ? 'Migrando…' : '📦 Migrar a Storage'}</button>
            </div>
          </div>

          <div className="card p-4 text-xs text-ink-soft">
            <b className="text-ink">Requisito (una sola vez):</b> en Supabase crea un bucket público llamado <b>movtek</b> (Storage → New bucket → Public). Sin eso, la migración no puede subir los archivos y las firmas se quedan en la base.
            <br />Para ver el espacio real de tu plan: Supabase → Settings → Usage.
          </div>
        </>
      )}
    </div>
  )
}

function Tarjeta({ titulo, valor, nota, alerta, ok }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">{titulo}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${alerta ? 'text-coral-500' : ok ? 'text-mint-600' : 'text-ink'}`}>{valor}</p>
      <p className="text-xs text-ink-soft">{nota}</p>
    </div>
  )
}
function Dato({ k, v, alerta, ok }) {
  return (
    <div className="rounded-lg bg-cloud px-3 py-2">
      <p className="text-xs text-ink-soft">{k}</p>
      <p className={`font-display text-lg font-extrabold ${alerta ? 'text-coral-500' : ok ? 'text-mint-600' : 'text-ink'}`}>{v}</p>
    </div>
  )
}
