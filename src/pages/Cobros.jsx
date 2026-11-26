import { useEffect, useMemo, useState } from 'react'
import {
  listCobros, saveCobro, deleteCobro, generarCobrosMes,
  listVehiculos, listPropietarios, nombrePropietario,
  periodoActual, periodoLabel, cobroVencido, fechaLocalISO, propietarioTieneVehiculo,
} from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'

const money = (n) => '$' + (Number(n) || 0).toLocaleString('es-CO')
const METODOS = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Otro']

export default function Cobros() {
  const { empresa } = useEmpresa() || {}
  const { esAdmin, rol, esPropietario, propietarioId } = useAuth()
  const puedeGestionar = esAdmin || rol === 'admin_empresa'

  const [periodo, setPeriodo] = useState(periodoActual())
  const [estado, setEstado] = useState('')      // '' | pendiente | pagado
  const [cobros, setCobros] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [propietarios, setPropietarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [modal, setModal] = useState(null)      // cobro a crear/editar

  async function cargar() {
    setCargando(true)
    const vs = await listVehiculos({ empresaId: empresa?.id }).catch(() => [])
    setVehiculos(vs)
    setPropietarios(await listPropietarios({ empresaId: empresa?.id }).catch(() => []))
    let cs = await listCobros({ empresaId: empresa?.id, periodo, estado }).catch(() => [])
    // El propietario/tenedor solo ve los cobros de SUS vehículos.
    if (esPropietario && propietarioId) {
      const mios = new Set(vs.filter((v) => propietarioTieneVehiculo(v, propietarioId)).map((v) => String(v.id)))
      cs = cs.filter((c) => mios.has(String(c.vehiculo_id)))
    }
    setCobros(cs)
    setCargando(false)
  }
  useEffect(() => { cargar() }, [empresa?.id, periodo, estado])

  const nombreProp = (id) => {
    const p = propietarios.find((x) => String(x.id) === String(id))
    return p ? nombrePropietario(p) : '—'
  }

  const resumen = useMemo(() => {
    let pend = 0, pagado = 0, venc = 0
    for (const c of cobros) {
      if ((c.estado || 'pendiente') === 'pagado') pagado += Number(c.monto) || 0
      else { pend += Number(c.monto) || 0; if (cobroVencido(c)) venc++ }
    }
    return { pend, pagado, venc }
  }, [cobros])

  async function generar() {
    if (!puedeGestionar) return
    setBusy(true); setMsg('')
    const r = await generarCobrosMes({ empresaId: empresa?.id, periodo }).catch(() => null)
    setBusy(false)
    if (r) { setMsg(`✅ Se generaron ${r.creados} cobro(s) para ${periodoLabel(periodo)}.`); cargar() }
    else setMsg('⚠️ No se pudieron generar los cobros.')
  }

  async function marcarPagado(c) {
    await saveCobro({ ...c, estado: 'pagado', fecha_pago: c.fecha_pago || fechaLocalISO() }).catch(() => {})
    cargar()
  }
  async function marcarPendiente(c) {
    await saveCobro({ ...c, estado: 'pendiente', fecha_pago: null }).catch(() => {})
    cargar()
  }
  async function borrar(c) {
    if (!confirm(`¿Eliminar el cobro de ${c.placa} (${periodoLabel(c.periodo)})?`)) return
    await deleteCobro(c.id); cargar()
  }
  async function guardar(data) {
    await saveCobro({ ...data, empresa_id: empresa?.id }).catch((e) => alert('No se pudo guardar. ' + (e?.message || '')))
    setModal(null); cargar()
  }

  const estadoBadge = (c) => {
    if ((c.estado || 'pendiente') === 'pagado') return <span className="rounded-full bg-mint-500/15 px-2.5 py-1 text-xs font-bold text-mint-600">🟢 Pagado</span>
    if (cobroVencido(c)) return <span className="rounded-full bg-coral-400/15 px-2.5 py-1 text-xs font-bold text-coral-500">🔴 Vencido</span>
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">🟠 Pendiente</span>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">💵 Cobros</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {puedeGestionar ? 'Cuotas mensuales por vehículo. Genera, registra pagos y controla los pendientes.' : 'Tus cuotas mensuales: lo que has pagado y lo que está pendiente.'}
          </p>
        </div>
        {puedeGestionar && (
          <div className="flex gap-2">
            <button onClick={() => setModal({ periodo })} className="btn-ghost">+ Nuevo cobro</button>
            <button onClick={generar} disabled={busy} className="btn-primary">{busy ? 'Generando…' : `📅 Generar cobros de ${periodoLabel(periodo)}`}</button>
          </div>
        )}
      </div>

      {msg && <p className="rounded-xl bg-cloud px-4 py-2.5 text-sm font-semibold text-ink">{msg}</p>}

      {/* Filtros */}
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="label">Mes</label>
          <input type="month" className="input mt-1 w-auto" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input mt-1 w-auto" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="pagado">Pagados</option>
          </select>
        </div>
        <div className="ml-auto flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Pendiente: {money(resumen.pend)}</span>
          <span className="rounded-full bg-mint-500/15 px-2.5 py-1 text-mint-600">Pagado: {money(resumen.pagado)}</span>
          {resumen.venc > 0 && <span className="rounded-full bg-coral-400/15 px-2.5 py-1 text-coral-500">{resumen.venc} vencido(s)</span>}
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-cloud text-left text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2.5">Placa</th>
              <th className="px-3 py-2.5">Propietario</th>
              <th className="px-3 py-2.5">Mes</th>
              <th className="px-3 py-2.5">Concepto</th>
              <th className="px-3 py-2.5">Monto</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5">Pago</th>
              {puedeGestionar && <th className="px-3 py-2.5"></th>}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={puedeGestionar ? 8 : 7} className="px-3 py-8 text-center text-ink-faint">Cargando…</td></tr>
            ) : cobros.length === 0 ? (
              <tr><td colSpan={puedeGestionar ? 8 : 7} className="px-3 py-8 text-center text-ink-faint">No hay cobros en {periodoLabel(periodo)}.{puedeGestionar ? ' Usa “Generar cobros”.' : ''}</td></tr>
            ) : cobros.map((c) => (
              <tr key={c.id} className="border-t border-cloud-line">
                <td className="px-3 py-2.5 font-semibold">{c.placa || '—'}</td>
                <td className="px-3 py-2.5">{nombreProp(c.propietario_id)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{periodoLabel(c.periodo)}</td>
                <td className="px-3 py-2.5">{c.concepto || 'Mensualidad'}</td>
                <td className="px-3 py-2.5 tabular-nums font-semibold">{money(c.monto)}</td>
                <td className="px-3 py-2.5">{estadoBadge(c)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">{c.estado === 'pagado' ? `${c.fecha_pago || ''}${c.metodo ? ` · ${c.metodo}` : ''}` : '—'}</td>
                {puedeGestionar && (
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {(c.estado || 'pendiente') === 'pagado'
                      ? <button onClick={() => marcarPendiente(c)} className="mr-2 text-xs font-bold text-amber-600">Marcar pendiente</button>
                      : <button onClick={() => setModal(c)} className="mr-2 text-xs font-bold text-mint-600">✓ Registrar pago</button>}
                    <button onClick={() => setModal(c)} className="mr-2 text-xs font-bold text-brand-600">Editar</button>
                    <button onClick={() => borrar(c)} className="text-xs font-bold text-coral-500">✕</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && puedeGestionar && (
        <ModalCobro base={modal} vehiculos={vehiculos} propietarios={propietarios} nombreProp={nombreProp} onClose={() => setModal(null)} onSave={guardar} />
      )}
    </div>
  )
}

function ModalCobro({ base, vehiculos, propietarios, nombreProp, onClose, onSave }) {
  const [f, setF] = useState({
    id: base.id, vehiculo_id: base.vehiculo_id || '', placa: base.placa || '',
    propietario_id: base.propietario_id || '', tenedor_id: base.tenedor_id || '',
    periodo: base.periodo || periodoActual(), concepto: base.concepto || 'Mensualidad',
    monto: base.monto || '', estado: base.estado || 'pendiente',
    fecha_pago: base.fecha_pago || fechaLocalISO(), metodo: base.metodo || 'Efectivo', nota: base.nota || '',
  })
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  function elegirVehiculo(id) {
    const v = vehiculos.find((x) => String(x.id) === String(id))
    setF((o) => ({ ...o, vehiculo_id: id, placa: v?.placa || '', propietario_id: v?.propietario_id || '', tenedor_id: v?.tenedor_id || '', monto: o.monto || v?.valor_cobro || '' }))
  }
  const puede = f.vehiculo_id && f.periodo && (Number(f.monto) >= 0)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[88vh] w-full max-w-sm overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">{base.id ? 'Editar cobro' : 'Nuevo cobro'}</h2>
        <div className="mt-3 flex flex-col gap-3">
          <div><label className="label">Vehículo</label>
            <select className="input mt-1" value={f.vehiculo_id} onChange={(e) => elegirVehiculo(e.target.value)}>
              <option value="">Elige…</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} · {nombreProp(v.propietario_id)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Mes</label><input type="month" className="input mt-1" value={f.periodo} onChange={(e) => set('periodo', e.target.value)} /></div>
            <div><label className="label">Monto</label><input inputMode="numeric" className="input mt-1" value={f.monto} onChange={(e) => set('monto', e.target.value.replace(/[^\d]/g, ''))} /></div>
          </div>
          <div><label className="label">Concepto</label><input className="input mt-1" value={f.concepto} onChange={(e) => set('concepto', e.target.value)} /></div>
          <div><label className="label">Estado</label>
            <select className="input mt-1" value={f.estado} onChange={(e) => set('estado', e.target.value)}>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
          {f.estado === 'pagado' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Fecha de pago</label><input type="date" className="input mt-1" value={f.fecha_pago} onChange={(e) => set('fecha_pago', e.target.value)} /></div>
              <div><label className="label">Método</label>
                <select className="input mt-1" value={f.metodo} onChange={(e) => set('metodo', e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select>
              </div>
            </div>
          )}
          <div><label className="label">Nota (opcional)</label><input className="input mt-1" value={f.nota} onChange={(e) => set('nota', e.target.value)} /></div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost ml-auto">Cancelar</button>
          <button onClick={() => puede && onSave({ ...f, fecha_pago: f.estado === 'pagado' ? f.fecha_pago : null })} disabled={!puede} className="btn-primary">Guardar</button>
        </div>
      </div>
    </div>
  )
}
