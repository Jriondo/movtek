import { useEffect, useMemo, useState } from 'react'
import {
  listVehiculos, listPreoperacionales,
  listMantPlan, saveMantPlan, deleteMantPlan,
  listMantRegistro, saveMantRegistro, deleteMantRegistro,
  estadoMantenimiento, calcularProximo, fechaLocalISO,
  getMantTipos, saveMantTipos, MANT_TIPOS_DEFAULT, propietarioTieneVehiculo,
} from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'
import ListaEditableModal from '../components/ListaEditableModal'
const EST = {
  vencido: { label: '🔴 Vencido', cls: 'bg-coral-400/15 text-coral-500' },
  proximo: { label: '🟠 Próximo', cls: 'bg-amber-100 text-amber-700' },
  ok: { label: '🟢 Al día', cls: 'bg-mint-500/15 text-mint-600' },
}

export default function PlanMantenimiento() {
  const { empresa } = useEmpresa() || {}
  const { esPropietario, propietarioId } = useAuth()
  const [vehiculos, setVehiculos] = useState([])
  const [selId, setSelId] = useState('')
  const [planes, setPlanes] = useState([])
  const [registros, setRegistros] = useState([])
  const [kmPorVeh, setKmPorVeh] = useState({})
  const [cargando, setCargando] = useState(true)
  const [modalTarea, setModalTarea] = useState(null)   // plan a editar/crear
  const [modalReg, setModalReg] = useState(null)       // registro a crear/editar (puede venir de un plan)
  const [tipos, setTipos] = useState(MANT_TIPOS_DEFAULT)
  const [modalTipos, setModalTipos] = useState(false)

  async function cargarBase() {
    setCargando(true)
    const [vsAll, preops] = await Promise.all([
      listVehiculos({ empresaId: empresa?.id }).catch(() => []),
      listPreoperacionales({ empresaId: empresa?.id }).catch(() => []),
    ])
    let vs = vsAll
    if (esPropietario && propietarioId) vs = vs.filter((v) => propietarioTieneVehiculo(v, propietarioId))
    setVehiculos(vs)
    setSelId((prev) => prev || vs[0]?.id || '')
    // Km actual por vehículo = kilometraje de la última preoperacional.
    const km = {}
    for (const r of preops) {
      if (!r.kilometraje) continue
      const k = String(r.vehiculo_id)
      const fh = (r.fecha || '') + (r.hora || '')
      if (!km[k] || fh > km[k].fh) km[k] = { km: r.kilometraje, fh }
    }
    setKmPorVeh(Object.fromEntries(Object.entries(km).map(([k, v]) => [k, v.km])))
    setCargando(false)
  }
  useEffect(() => { cargarBase() }, [empresa?.id])
  useEffect(() => { getMantTipos(empresa?.id).then(setTipos).catch(() => setTipos(MANT_TIPOS_DEFAULT)) }, [empresa?.id])

  async function guardarTipos(lista) {
    const g = await saveMantTipos(empresa?.id, lista).catch(() => null)
    if (g) setTipos(g)
    setModalTipos(false)
  }

  async function cargarVeh() {
    if (!selId) { setPlanes([]); setRegistros([]); return }
    setPlanes(await listMantPlan({ empresaId: empresa?.id, vehiculoId: selId }).catch(() => []))
    setRegistros(await listMantRegistro({ empresaId: empresa?.id, vehiculoId: selId }).catch(() => []))
  }
  useEffect(() => { cargarVeh() }, [selId, empresa?.id])

  const vehiculo = useMemo(() => vehiculos.find((v) => String(v.id) === String(selId)), [vehiculos, selId])
  const kmActual = kmPorVeh[String(selId)] || ''

  // Resumen de alertas (de este vehículo).
  const resumen = useMemo(() => {
    let venc = 0, prox = 0
    for (const p of planes) { const e = estadoMantenimiento(p, kmActual); if (e === 'vencido') venc++; else if (e === 'proximo') prox++ }
    return { venc, prox }
  }, [planes, kmActual])

  async function guardarTarea(data) {
    await saveMantPlan({ ...data, empresa_id: empresa?.id, vehiculo_id: selId, placa: vehiculo?.placa })
    setModalTarea(null); cargarVeh()
  }
  async function borrarTarea(id) {
    if (!confirm('¿Eliminar esta tarea del plan preventivo?')) return
    await deleteMantPlan(id); cargarVeh()
  }
  async function guardarRegistro(data) {
    await saveMantRegistro({ ...data, empresa_id: empresa?.id, vehiculo_id: selId, placa: vehiculo?.placa })
    setModalReg(null); cargarVeh()
  }
  async function borrarRegistro(id) {
    if (!confirm('¿Eliminar este registro de la bitácora?')) return
    await deleteMantRegistro(id); cargarVeh()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold text-ink">🔧 Plan de mantenimiento</h1>
      </div>

      {/* Selector de vehículo */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <label className="text-sm font-bold text-ink">Vehículo:</label>
        <select className="input w-auto" value={selId} onChange={(e) => setSelId(e.target.value)}>
          {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} · Móvil {v.numero_interno || '—'}</option>)}
        </select>
        {kmActual !== '' && <span className="text-sm text-ink-soft">Km actual (última preop.): <b className="text-ink tabular-nums">{kmActual}</b></span>}
        {(resumen.venc > 0 || resumen.prox > 0) && (
          <span className="ml-auto flex gap-2 text-xs font-bold">
            {resumen.venc > 0 && <span className="rounded-full bg-coral-400/15 px-2.5 py-1 text-coral-500">{resumen.venc} vencido(s)</span>}
            {resumen.prox > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">{resumen.prox} próximo(s)</span>}
          </span>
        )}
      </div>

      {cargando ? <p className="text-ink-faint">Cargando…</p> : vehiculos.length === 0 ? (
        <div className="card p-8 text-center text-ink-soft">No hay vehículos.</div>
      ) : (
        <>
          {/* A) PLAN PREVENTIVO */}
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-brand-600">📋 Plan preventivo</h2>
              <div className="flex gap-2">
                <button onClick={() => setModalTipos(true)} className="btn-ghost text-sm">⚙️ Tipos</button>
                <button onClick={() => setModalTarea({})} className="btn-primary text-sm">+ Tarea</button>
              </div>
            </div>
            {planes.length === 0 ? (
              <p className="text-sm text-ink-soft">Sin tareas programadas. Agrega, por ejemplo, “Cambio de aceite cada 5.000 km o 90 días”.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {planes.map((p) => {
                  const est = estadoMantenimiento(p, kmActual)
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-cloud-line p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink">{p.tipo}</p>
                        <p className="text-xs text-ink-soft">
                          {p.cada_km ? `Cada ${Number(p.cada_km).toLocaleString()} km` : ''}{p.cada_km && p.cada_dias ? ' · ' : ''}{p.cada_dias ? `cada ${p.cada_dias} días` : ''}
                        </p>
                        <p className="text-xs text-ink-soft">
                          Próximo: {p.proxima_fecha ? <b className="text-ink">{p.proxima_fecha}</b> : '—'}{p.proximo_km ? <> · <b className="text-ink tabular-nums">{Number(p.proximo_km).toLocaleString()} km</b></> : ''}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${EST[est].cls}`}>{EST[est].label}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => setModalReg({ plan_id: p.id, tipo: p.tipo, km: kmActual, fecha: fechaLocalISO() })} className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-600">✓ Registrar</button>
                        <button onClick={() => setModalTarea(p)} className="rounded-lg bg-cloud px-2.5 py-1.5 text-xs font-bold text-ink">Editar</button>
                        <button onClick={() => borrarTarea(p.id)} className="rounded-lg px-2 py-1.5 text-xs font-bold text-coral-500">✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* B) BITÁCORA */}
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-brand-600">🗒️ Bitácora de mantenimientos</h2>
              <button onClick={() => setModalReg({ fecha: fechaLocalISO(), km: kmActual })} className="btn-ghost text-sm">+ Registrar</button>
            </div>
            {registros.length === 0 ? (
              <p className="text-sm text-ink-soft">Aún no hay mantenimientos registrados para este vehículo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead><tr className="border-b border-cloud-line text-left text-xs uppercase text-ink-faint">
                    <th className="py-2 pr-3">Fecha</th><th className="pr-3">Tipo</th><th className="pr-3">Km</th><th className="pr-3">Descripción</th><th className="pr-3">Taller</th><th className="pr-3">Costo</th><th></th>
                  </tr></thead>
                  <tbody>
                    {registros.map((r) => (
                      <tr key={r.id} className="border-b border-cloud-line/60">
                        <td className="py-2 pr-3 whitespace-nowrap">{r.fecha}</td>
                        <td className="pr-3">{r.tipo || '—'}</td>
                        <td className="pr-3 tabular-nums">{r.km || '—'}</td>
                        <td className="pr-3">{r.descripcion || '—'}</td>
                        <td className="pr-3">{r.taller || '—'}</td>
                        <td className="pr-3 tabular-nums">{r.costo ? `$${Number(r.costo).toLocaleString()}` : '—'}</td>
                        <td className="whitespace-nowrap pr-1 text-right">
                          <button onClick={() => setModalReg(r)} className="mr-2 text-xs font-bold text-brand-600">Editar</button>
                          <button onClick={() => borrarRegistro(r.id)} className="text-xs font-bold text-coral-500">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {modalTarea && <ModalTarea plan={modalTarea} tipos={tipos} onClose={() => setModalTarea(null)} onSave={guardarTarea} />}
      {modalReg && <ModalRegistro base={modalReg} tipos={tipos} onClose={() => setModalReg(null)} onSave={guardarRegistro} />}
      {modalTipos && (
        <ListaEditableModal titulo="Tipos de mantenimiento" descripcion="Personaliza la lista de tipos para este negocio."
          items={tipos} onClose={() => setModalTipos(false)} onSave={guardarTipos} />
      )}
    </div>
  )
}

function ModalTarea({ plan, tipos, onClose, onSave }) {
  const [f, setF] = useState({
    id: plan.id, tipo: plan.tipo || tipos[0] || 'Otro', cada_km: plan.cada_km || '', cada_dias: plan.cada_dias || '',
    ultimo_km: plan.ultimo_km || '', ultima_fecha: plan.ultima_fecha || '',
  })
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  const prox = calcularProximo(f)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">{plan.id ? 'Editar tarea' : 'Nueva tarea preventiva'}</h2>
        <div className="mt-3 flex flex-col gap-3">
          <div><label className="label">Tipo de mantenimiento</label>
            <select className="input mt-1" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {tipos.map((t) => <option key={t}>{t}</option>)}
              {f.tipo && !tipos.includes(f.tipo) && <option>{f.tipo}</option>}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Cada (km)</label><input className="input mt-1" inputMode="numeric" value={f.cada_km} onChange={(e) => set('cada_km', e.target.value)} placeholder="5000" /></div>
            <div><label className="label">Cada (días)</label><input className="input mt-1" inputMode="numeric" value={f.cada_dias} onChange={(e) => set('cada_dias', e.target.value)} placeholder="90" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Último km</label><input className="input mt-1" inputMode="numeric" value={f.ultimo_km} onChange={(e) => set('ultimo_km', e.target.value)} /></div>
            <div><label className="label">Última fecha</label><input type="date" className="input mt-1" value={f.ultima_fecha} onChange={(e) => set('ultima_fecha', e.target.value)} /></div>
          </div>
          <p className="rounded-lg bg-cloud px-3 py-2 text-xs text-ink-soft">
            Próximo calculado: <b className="text-ink">{prox.proxima_fecha || '—'}</b>{prox.proximo_km ? <> · <b className="text-ink">{Number(prox.proximo_km).toLocaleString()} km</b></> : ''}
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost ml-auto">Cancelar</button>
          <button onClick={() => onSave(f)} className="btn-primary">Guardar</button>
        </div>
      </div>
    </div>
  )
}

function ModalRegistro({ base, tipos, onClose, onSave }) {
  const [f, setF] = useState({
    id: base.id, plan_id: base.plan_id || '', fecha: base.fecha || fechaLocalISO(), km: base.km || '',
    tipo: base.tipo || tipos[0] || 'Otro', descripcion: base.descripcion || '', taller: base.taller || '', costo: base.costo || '', nota: base.nota || '',
  })
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">{base.id ? 'Editar mantenimiento' : 'Registrar mantenimiento'}</h2>
        {base.plan_id && !base.id && <p className="mt-1 text-xs text-brand-600">Actualiza el próximo del plan preventivo.</p>}
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Fecha</label><input type="date" className="input mt-1" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
            <div><label className="label">Kilometraje</label><input className="input mt-1" inputMode="numeric" value={f.km} onChange={(e) => set('km', e.target.value)} /></div>
          </div>
          <div><label className="label">Tipo</label>
            <select className="input mt-1" value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {tipos.map((t) => <option key={t}>{t}</option>)}
              {f.tipo && !tipos.includes(f.tipo) && <option>{f.tipo}</option>}
            </select>
          </div>
          <div><label className="label">Descripción</label><textarea className="input mt-1 h-16" value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Qué se hizo…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Taller</label><input className="input mt-1" value={f.taller} onChange={(e) => set('taller', e.target.value)} /></div>
            <div><label className="label">Costo</label><input className="input mt-1" inputMode="numeric" value={f.costo} onChange={(e) => set('costo', e.target.value)} /></div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost ml-auto">Cancelar</button>
          <button onClick={() => onSave(f)} className="btn-primary">Guardar</button>
        </div>
      </div>
    </div>
  )
}
