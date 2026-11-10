import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listFuec, exportFuecCsv, itinerarioTexto, ocasionalTexto, getFuec, verificarHabilitacionFuec, deleteFuec, registrarCambio } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'
import FechaInput from '../components/FechaInput'

// Rango de fechas según el periodo elegido.
function rango(periodo) {
  const hoy = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  if (periodo === 'hoy') return { desde: iso(hoy), hasta: iso(hoy) }
  if (periodo === '7') { const d = new Date(hoy); d.setDate(d.getDate() - 7); return { desde: iso(d), hasta: iso(hoy) } }
  if (periodo === 'mes') { const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1); return { desde: iso(d), hasta: iso(hoy) } }
  return { desde: '', hasta: '' }
}

export default function Fuec() {
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const { esAdmin } = useAuth()
  const [f, setF] = useState({ placa: '', movil: '', contrato_hijo: '', contrato_maestro: '', periodo: 'todos', desde: '', hasta: '' })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [aviso, setAviso] = useState('')

  async function cargar(filtros = {}) {
    setLoading(true)
    setBuscado(true)
    try {
      const estado = { ...f, ...filtros }
      // Si eliges fechas manuales tienen prioridad; si no, se usa el periodo.
      const rango_ = (estado.desde || estado.hasta) ? { desde: estado.desde, hasta: estado.hasta } : rango(estado.periodo)
      setRows(await listFuec({ empresaId: empresa?.id, placa: estado.placa, movil: estado.movil, contrato_hijo: estado.contrato_hijo, contrato_maestro: estado.contrato_maestro, desde: rango_.desde, hasta: rango_.hasta }))
    } finally { setLoading(false) }
  }

  async function duplicar(id) {
    setAviso('')
    const f = await getFuec(id)
    const avisos = await verificarHabilitacionFuec(f)
    if (avisos.length) { setAviso('No se puede duplicar. ' + avisos.join(' ')); return }
    // Abre el FUEC para editar antes de guardar la copia (no duplica directo).
    navigate(`/fuec/duplicar/${id}`)
  }

  async function eliminar(r) {
    if (!window.confirm(`¿Eliminar el FUEC ${r.no_maestro}-${r.contrato_hijo}? Esta acción no se puede deshacer.`)) return
    registrarCambio({ accion: 'eliminar', entidad: 'FUEC', descripcion: `${r.no_maestro || ''}-${r.contrato_hijo || ''}`, empresa_id: r.empresa_id })
    await deleteFuec(r.id); cargar()
  }

  const totalConductores = rows.reduce((s, r) => s + (r.conductores?.length || 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">FUEC</h1>
        <p className="mt-1 text-sm text-ink-soft">Formato Único de Extracto del Contrato. Genera, consulta e imprime.</p>
      </div>

      {aviso && <div className="rounded-xl bg-coral-400/15 px-4 py-3 text-sm font-medium text-coral-500">⚠️ {aviso}</div>}

      {/* Filtros */}
      <form onSubmit={(e) => { e.preventDefault(); cargar() }} className="card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="label">Placa</label><input className="input" value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value })} /></div>
          <div><label className="label">Móvil</label><input className="input" value={f.movil} onChange={(e) => setF({ ...f, movil: e.target.value })} /></div>
          <div><label className="label">Contrato hijo</label><input className="input" value={f.contrato_hijo} onChange={(e) => setF({ ...f, contrato_hijo: e.target.value })} /></div>
          <div><label className="label">Contrato maestro</label><input className="input" value={f.contrato_maestro} onChange={(e) => setF({ ...f, contrato_maestro: e.target.value })} /></div>
          <div><label className="label">Periodo</label>
            <select className="input" value={f.periodo} disabled={!!(f.desde || f.hasta)}
              onChange={(e) => { setF({ ...f, periodo: e.target.value }); cargar({ periodo: e.target.value }) }}>
              <option value="todos">Todos</option>
              <option value="hoy">Hoy</option>
              <option value="7">Últimos 7 días</option>
              <option value="mes">Este mes</option>
            </select>
          </div>
          <div><label className="label">Fecha inicio</label>
            <FechaInput value={f.desde} onChange={(v) => setF({ ...f, desde: v })} />
          </div>
          <div><label className="label">Fecha final</label>
            <FechaInput value={f.hasta} onChange={(v) => setF({ ...f, hasta: v })} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">🔍 Buscar</button>
          <button type="button" className="btn-accent" onClick={() => navigate('/fuec/nuevo')}>+ Nuevo</button>
          <button type="button" className="btn-ghost" onClick={() => exportFuecCsv(rows)} disabled={!rows.length}>⭳ Descargar</button>
          {(f.desde || f.hasta) && (
            <button type="button" className="btn-ghost" onClick={() => { const n = { ...f, desde: '', hasta: '' }; setF(n); cargar(n) }}>Limpiar fechas</button>
          )}
        </div>
      </form>

      {/* Resultados — solo después de buscar */}
      {buscado && (
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cloud-line px-4 py-3">
          <h2 className="font-display text-sm font-bold text-ink">Resultados</h2>
          <div className="flex gap-2 text-xs font-bold text-ink-soft">
            <span className="rounded-full bg-cloud px-2.5 py-1">FUEC: {rows.length}</span>
            <span className="rounded-full bg-cloud px-2.5 py-1">Conductores: {totalConductores}</span>
          </div>
        </div>

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">Cargando…</p>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-ink">Sin resultados</p>
            <p className="mt-1 text-sm text-ink-soft">Genera tu primer FUEC con el botón “Nuevo”.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cloud-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-3 py-3 font-bold">No. Maestro</th>
                  <th className="px-3 py-3 font-bold">C. Hijo</th>
                  <th className="px-3 py-3 font-bold">Placa</th>
                  <th className="px-3 py-3 font-bold">Móvil</th>
                  <th className="px-3 py-3 font-bold">Tipo de contrato</th>
                  <th className="px-3 py-3 font-bold">Contratante</th>
                  <th className="px-3 py-3 font-bold">Vigencia</th>
                  <th className="px-3 py-3 font-bold">Itinerario</th>
                  <th className="px-3 py-3 font-bold">Fecha</th>
                  <th className="px-3 py-3 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-cloud-line last:border-0 align-top hover:bg-cloud/60">
                    <td className="px-3 py-3 font-semibold tabular-nums text-ink">{r.no_maestro || '—'}</td>
                    <td className="px-3 py-3 font-semibold tabular-nums text-brand-600">{r.contrato_hijo}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-ink">{r.placa}</td>
                    <td className="px-3 py-3 tabular-nums text-ink-soft">{r.movil}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-ink max-w-[200px]">{tipoContratoCorto(r)}</td>
                    <td className="px-3 py-3 text-ink">{r.contratante_nombre || ocasionalTexto(r) || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-soft tabular-nums">{r.vigencia_inicio}<br />{r.vigencia_fin}</td>
                    <td className="px-3 py-3 text-xs text-ink">{itinerarioTexto(r)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-soft tabular-nums">{(r.created_at || '').slice(0, 10)}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex justify-center gap-1.5">
                        <button title="Imprimir" onClick={() => navigate(`/fuec/${r.id}/imprimir`)} className="flex items-center gap-1 rounded-lg border border-cloud-line px-2 py-1.5 text-xs font-semibold text-ink hover:bg-cloud"><span>🖨️</span><span className="hidden lg:inline">Imprimir</span></button>
                        <button title="Editar" onClick={() => navigate(`/fuec/${r.id}`)} className="flex items-center gap-1 rounded-lg border border-cloud-line px-2 py-1.5 text-xs font-semibold text-ink hover:bg-cloud"><span>✏️</span><span className="hidden lg:inline">Editar</span></button>
                        <button title="Duplicar" onClick={() => duplicar(r.id)} className="flex items-center gap-1 rounded-lg border border-cloud-line px-2 py-1.5 text-xs font-semibold text-ink hover:bg-cloud"><span>📑</span><span className="hidden lg:inline">Duplicar</span></button>{/* abre para editar antes de guardar */}
                        {/* ⚠️ SOLO PRUEBAS */}
                        {esAdmin && <button title="Eliminar" onClick={() => eliminar(r)} className="flex items-center gap-1 rounded-lg border border-coral-400/40 px-2 py-1.5 text-xs font-semibold text-coral-500 hover:bg-coral-400/10"><span>🗑️</span><span className="hidden lg:inline">Eliminar</span></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  )
}

// Texto corto para la columna "Tipo de contrato".
function tipoContratoCorto(r) {
  if (r.tipo_contrato) return r.tipo_contrato
  const t = (r.objeto_contrato || '').trim()
  if (!t) return '—'
  return t.length > 60 ? t.slice(0, 60) + '…' : t
}
