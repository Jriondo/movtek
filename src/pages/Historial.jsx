import { useEffect, useMemo, useState } from 'react'
import { listHistorial, listEmpresas } from '../lib/db'
import { descargarExcel } from '../lib/excel'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'

// Rango de fechas según el período elegido.
function rango(periodo) {
  const hoy = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  if (periodo === 'hoy') return { desde: iso(hoy), hasta: iso(hoy) }
  if (periodo === 'semana') { const d = new Date(hoy); d.setDate(d.getDate() - 6); return { desde: iso(d), hasta: iso(hoy) } }
  if (periodo === 'mes') { const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1); return { desde: iso(d), hasta: iso(hoy) } }
  if (periodo === 'anio') { const d = new Date(hoy.getFullYear(), 0, 1); return { desde: iso(d), hasta: iso(hoy) } }
  return { desde: '', hasta: '' }
}

const ACCION_PILL = {
  crear: 'bg-mint-500/15 text-mint-600',
  editar: 'bg-brand-50 text-brand-600',
  eliminar: 'bg-coral-400/15 text-coral-500',
}

export default function Historial() {
  const { empresa } = useEmpresa()
  const { esAdmin } = useAuth()
  const esMovtek = !empresa || empresa.es_maestra || empresa.id === 'movtek'
  const [periodo, setPeriodo] = useState('mes')
  const [rows, setRows] = useState([])
  const [empresasMap, setEmpresasMap] = useState({})
  const [loading, setLoading] = useState(true)

  async function cargar() {
    setLoading(true)
    try {
      const r = rango(periodo)
      // En Movtek (sistema) se ve todo; dentro de una empresa, solo lo suyo.
      const data = await listHistorial({ empresaId: esMovtek ? null : empresa.id, desde: r.desde, hasta: r.hasta })
      setRows(data)
    } finally { setLoading(false) }
  }
  useEffect(() => { cargar() }, [periodo, empresa?.id])
  useEffect(() => { listEmpresas().then((l) => setEmpresasMap(Object.fromEntries(l.map((e) => [e.id, e.nombre])))).catch(() => {}) }, [])

  const nombreEmpresa = (id) => (id ? (empresasMap[id] || '—') : 'Movtek (sistema)')
  const fmtFecha = (iso) => { try { return new Date(iso).toLocaleString('es-CO') } catch { return iso } }

  const titulo = useMemo(() => ({ hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes', anio: 'Este año', todo: 'Todo' }[periodo]), [periodo])

  function exportar() {
    const columnas = [
      { label: 'Fecha y hora', get: (r) => fmtFecha(r.created_at) },
      { label: 'Usuario', key: 'usuario' },
      { label: 'Acción', get: (r) => (r.accion || '').toUpperCase() },
      { label: 'Módulo', key: 'entidad' },
      { label: 'Detalle', key: 'descripcion' },
      { label: 'Empresa', get: (r) => nombreEmpresa(r.empresa_id) },
    ]
    descargarExcel(`historial-${periodo}-${new Date().toISOString().slice(0, 10)}`, columnas, rows, `Historial de cambios — ${titulo}`)
  }

  if (!esAdmin) {
    return <div className="card p-8 text-center"><p className="text-sm font-semibold text-ink">Acceso restringido</p><p className="mt-1 text-sm text-ink-soft">Solo el administrador puede ver el historial.</p></div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Historial de cambios</h1>
        <p className="mt-1 text-sm text-ink-soft">{esMovtek ? 'Todos los cambios del sistema.' : <>Cambios de <b>{empresa.nombre}</b>.</>} Filtra por período y descárgalo en Excel.</p>
      </div>

      {/* Filtros + descarga */}
      <div className="card flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {[['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año'], ['todo', 'Todo']].map(([v, label]) => (
            <button key={v} onClick={() => setPeriodo(v)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${periodo === v ? 'bg-brand-500 text-white shadow-glow' : 'bg-cloud text-ink-soft hover:bg-cloud-line'}`}>
              {label}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={exportar} disabled={!rows.length}>⭳ Descargar a Excel</button>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-cloud-line px-4 py-3">
          <h2 className="font-display text-sm font-bold text-ink">{titulo}</h2>
          <span className="rounded-full bg-cloud px-2.5 py-1 text-xs font-bold text-ink-soft">{rows.length} cambio{rows.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">Cargando…</p>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-ink">Sin movimientos</p>
            <p className="mt-1 text-sm text-ink-soft">No hay cambios registrados en este período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-cloud-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-bold">Fecha y hora</th>
                <th className="px-4 py-3 font-bold">Usuario</th>
                <th className="px-4 py-3 font-bold">Acción</th>
                <th className="px-4 py-3 font-bold">Módulo</th>
                <th className="px-4 py-3 font-bold">Detalle</th>
                {esMovtek && <th className="px-4 py-3 font-bold">Empresa</th>}
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id || i} className="border-b border-cloud-line last:border-0 hover:bg-cloud/60">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">{fmtFecha(r.created_at)}</td>
                    <td className="px-4 py-3 text-ink">{r.usuario || '—'}</td>
                    <td className="px-4 py-3"><span className={`pill ${ACCION_PILL[r.accion] || 'bg-cloud text-ink-soft'}`}>{(r.accion || '').toUpperCase()}</span></td>
                    <td className="px-4 py-3 font-semibold text-ink">{r.entidad}</td>
                    <td className="px-4 py-3 text-ink-soft">{r.descripcion || '—'}</td>
                    {esMovtek && <td className="px-4 py-3 text-ink-soft">{nombreEmpresa(r.empresa_id)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
