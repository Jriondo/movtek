import { useEffect, useMemo, useState } from 'react'
import {
  listVehiculos, listConductores, nombreConductor, fechaLocalISO,
  listRodamiento, saveRodamiento, deleteRodamiento,
  listRutasMaestras, saveRutaMaestra, deleteRutaMaestra,
  tiempoRecorrido, DESCRIPCIONES_ROD,
} from '../lib/db'
import { descargarExcel } from '../lib/excel'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const hhmm = (t) => (t ? String(t).slice(0, 5) : '')

export default function PlanRodamiento() {
  const { empresa } = useEmpresa() || {}
  const { esPropietario, propietarioId } = useAuth()
  const [tab, setTab] = useState('crono')
  const [mes, setMes] = useState(fechaLocalISO().slice(0, 7))
  const [q, setQ] = useState('')
  const [vehiculos, setVehiculos] = useState([])
  const [conductores, setConductores] = useState([])
  const [rutas, setRutas] = useState([])
  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalGen, setModalGen] = useState(false)
  const [modalServ, setModalServ] = useState(null)   // servicio a crear/editar
  const [modalRuta, setModalRuta] = useState(null)   // ruta maestra a crear/editar

  const [anio, mesNum] = mes.split('-').map(Number)
  const desde = `${mes}-01`
  const hasta = `${mes}-${String(new Date(anio, mesNum, 0).getDate()).padStart(2, '0')}`

  async function cargarBase() {
    let vs = await listVehiculos({ empresaId: empresa?.id }).catch(() => [])
    if (esPropietario && propietarioId) vs = vs.filter((v) => String(v.propietario_id) === String(propietarioId))
    setVehiculos(vs)
    setConductores(await listConductores({ empresaId: empresa?.id }).catch(() => []))
    setRutas(await listRutasMaestras({ empresaId: empresa?.id }).catch(() => []))
  }
  async function cargarServicios() {
    setCargando(true)
    setServicios(await listRodamiento({ empresaId: empresa?.id, desde, hasta }).catch(() => []))
    setCargando(false)
  }
  useEffect(() => { cargarBase() }, [empresa?.id])
  useEffect(() => { cargarServicios() }, [empresa?.id, mes])

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return servicios
    return servicios.filter((s) => [s.placa, s.conductor_nombre, s.ruta, s.empresa_cliente, s.origen, s.destino].some((x) => (x || '').toLowerCase().includes(t)))
  }, [servicios, q])

  async function borrarServicio(id) {
    if (!confirm('¿Eliminar este servicio del cronograma?')) return
    await deleteRodamiento(id); cargarServicios()
  }

  function exportarExcel() {
    if (!filtrados.length) { alert('No hay servicios en este mes para exportar.'); return }
    const cols = [
      { label: 'Fecha de ejecución del servicio', get: (r) => r.fecha },
      { label: 'PLACA', get: (r) => r.placa || '' },
      { label: 'NOMBRE CONDUCTOR', get: (r) => r.conductor_nombre || '' },
      { label: 'Descripción del recorrido', get: (r) => r.descripcion || '' },
      { label: 'hora inicial recorrido', get: (r) => hhmm(r.hora_inicial) },
      { label: 'Hora final recorrido', get: (r) => hhmm(r.hora_final) },
      { label: 'Tiempo de recorrido', get: (r) => r.tiempo || tiempoRecorrido(r.hora_inicial, r.hora_final) },
      { label: 'Ruta', get: (r) => r.ruta || '' },
      { label: 'Origen', get: (r) => r.origen || '' },
      { label: 'Destino', get: (r) => r.destino || '' },
      { label: 'EMPRESA', get: (r) => r.empresa_cliente || '' },
      { label: 'Clase', get: (r) => r.clase || '' },
    ]
    descargarExcel(`Plan_rodamiento_${mes}`, cols, filtrados, `PLAN DE RODAMIENTO · ${MESES[mesNum - 1]} ${anio} · ${empresa?.nombre || ''}`)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold text-ink">🗓️ Plan de rodamiento</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTab(tab === 'crono' ? 'rutas' : 'crono')} className="btn-ghost">
            {tab === 'crono' ? '⚙️ Rutas maestras' : '← Cronograma'}
          </button>
          {tab === 'crono' && <>
            <button onClick={exportarExcel} className="btn-ghost">⬇️ Excel</button>
            <button onClick={() => setModalServ({})} className="btn-ghost">+ Servicio</button>
            <button onClick={() => setModalGen(true)} className="btn-primary">⚡ Generar día</button>
          </>}
          {tab === 'rutas' && <button onClick={() => setModalRuta({})} className="btn-primary">+ Ruta</button>}
        </div>
      </div>

      {tab === 'rutas' ? (
        <RutasMaestras rutas={rutas} onNew={() => setModalRuta({})} onEdit={(r) => setModalRuta(r)}
          onDelete={async (id) => { if (confirm('¿Eliminar esta ruta maestra?')) { await deleteRutaMaestra(id); cargarBase() } }} />
      ) : (
        <>
          {/* Filtros */}
          <div className="card flex flex-wrap items-center gap-3 p-3">
            <label className="text-sm font-bold text-ink">Mes:</label>
            <input type="month" className="input w-auto" value={mes} onChange={(e) => setMes(e.target.value)} />
            <input className="input w-auto flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar placa, conductor, ruta, empresa…" />
            <span className="text-sm text-ink-soft">{filtrados.length} servicio(s)</span>
          </div>

          {cargando ? <p className="text-ink-faint">Cargando…</p> : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full min-w-[1100px] text-xs">
                <thead>
                  <tr className="bg-cloud text-left">
                    {['Fecha', 'Placa', 'Conductor', 'Descripción', 'H. inicial', 'H. final', 'Tiempo', 'Ruta', 'Origen', 'Destino', 'Empresa', 'Clase', ''].map((h) => (
                      <th key={h} className="whitespace-nowrap px-2 py-2 font-bold text-ink">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((s) => (
                    <tr key={s.id} className="border-t border-cloud-line align-top hover:bg-cloud/50">
                      <td className="whitespace-nowrap px-2 py-1.5">{s.fecha}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 font-bold">{s.placa || '—'}</td>
                      <td className="px-2 py-1.5">{s.conductor_nombre || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{s.descripcion || ''}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{hhmm(s.hora_inicial)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{hhmm(s.hora_final)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                        {s.estado === 'cancelado'
                          ? <span className="font-bold text-coral-500" title={s.motivo_cancelacion || ''}>✕ Cancelado</span>
                          : s.hora_final ? (s.tiempo || '') : <span className="text-amber-600">⏳ pendiente</span>}
                      </td>
                      <td className="px-2 py-1.5">{s.ruta || ''}</td>
                      <td className="px-2 py-1.5">{s.origen || ''}</td>
                      <td className="px-2 py-1.5">{s.destino || ''}</td>
                      <td className="px-2 py-1.5">{s.empresa_cliente || ''}</td>
                      <td className="whitespace-nowrap px-2 py-1.5">{s.clase || ''}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right">
                        <button onClick={() => setModalServ(s)} className="mr-1.5 font-bold text-brand-600">Editar</button>
                        <button onClick={() => borrarServicio(s.id)} className="font-bold text-coral-500">✕</button>
                      </td>
                    </tr>
                  ))}
                  {filtrados.length === 0 && <tr><td colSpan={13} className="px-3 py-8 text-center text-ink-soft">Sin servicios. Usa “⚡ Generar día” para crear el cronograma.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {modalGen && (
        <ModalGenerarDia empresa={empresa} rutas={rutas} vehiculos={vehiculos} conductores={conductores}
          onClose={() => setModalGen(false)} onDone={() => { setModalGen(false); cargarServicios() }} />
      )}
      {modalServ && (
        <ModalServicio empresa={empresa} base={modalServ} rutas={rutas} vehiculos={vehiculos} conductores={conductores}
          onClose={() => setModalServ(null)} onSaved={() => { setModalServ(null); cargarServicios() }} />
      )}
      {modalRuta && (
        <ModalRuta empresa={empresa} base={modalRuta}
          onClose={() => setModalRuta(null)} onSaved={() => { setModalRuta(null); cargarBase() }} />
      )}
    </div>
  )
}

// ---------- Rutas maestras (catálogo) ----------
function RutasMaestras({ rutas, onNew, onEdit, onDelete }) {
  return (
    <div className="card p-4">
      <p className="mb-3 text-sm text-ink-soft">Define una vez cada ruta con sus datos fijos (empresa, origen, destino, clase, horas). Luego el cronograma se genera en segundos.</p>
      {rutas.length === 0 ? (
        <div className="py-8 text-center text-ink-soft">Aún no hay rutas. <button onClick={onNew} className="font-bold text-brand-600">+ Crear la primera</button></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-cloud-line text-left text-xs uppercase text-ink-faint">
              <th className="py-2 pr-3">Ruta</th><th className="pr-3">Empresa</th><th className="pr-3">Tipo</th><th className="pr-3">Origen → Destino</th><th></th>
            </tr></thead>
            <tbody>
              {rutas.map((r) => (
                <tr key={r.id} className="border-b border-cloud-line/60">
                  <td className="py-2 pr-3 font-bold text-ink">{r.nombre}</td>
                  <td className="pr-3">{r.empresa_cliente || '—'}</td>
                  <td className="pr-3">{r.descripcion || '—'}</td>
                  <td className="pr-3 text-ink-soft">{r.origen || '—'} → {r.destino || '—'}</td>
                  <td className="whitespace-nowrap pr-1 text-right">
                    <button onClick={() => onEdit(r)} className="mr-2 text-xs font-bold text-brand-600">Editar</button>
                    <button onClick={() => onDelete(r.id)} className="text-xs font-bold text-coral-500">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ModalRuta({ empresa, base, onClose, onSaved }) {
  const [f, setF] = useState({
    id: base.id, nombre: base.nombre || '', empresa_cliente: base.empresa_cliente || '', descripcion: base.descripcion || 'Ingreso Personal',
    origen: base.origen || '', destino: base.destino || '',
  })
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  const [busy, setBusy] = useState(false)
  async function guardar() {
    if (!f.nombre.trim()) { alert('Escribe el nombre de la ruta.'); return }
    setBusy(true)
    await saveRutaMaestra({ ...f, empresa_id: empresa?.id }).catch((e) => alert('No se pudo guardar. ' + (e?.message || '')))
    setBusy(false); onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[88vh] w-full max-w-md overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">{base.id ? 'Editar ruta' : 'Nueva ruta maestra'}</h2>
        <div className="mt-3 flex flex-col gap-3">
          <div><label className="label">Nombre de la ruta *</label><input className="input mt-1" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Empresa (cliente)</label><input className="input mt-1" value={f.empresa_cliente} onChange={(e) => set('empresa_cliente', e.target.value)} /></div>
            <div><label className="label">Tipo</label>
              <select className="input mt-1" value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)}>{DESCRIPCIONES_ROD.map((d) => <option key={d}>{d}</option>)}</select>
            </div>
          </div>
          <div><label className="label">Origen</label><input className="input mt-1" value={f.origen} onChange={(e) => set('origen', e.target.value)} /></div>
          <div><label className="label">Destino</label><input className="input mt-1" value={f.destino} onChange={(e) => set('destino', e.target.value)} /></div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost ml-auto">Cancelar</button>
          <button onClick={guardar} disabled={busy} className="btn-primary">{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

// ---------- Modal: Generar día (rutas maestras + asignar) ----------
function ModalGenerarDia({ empresa, rutas, vehiculos, conductores, onClose, onDone }) {
  const [fecha, setFecha] = useState(fechaLocalISO())
  const [sel, setSel] = useState({})   // rutaId -> { on, placa, conductor_id, hora_inicial, hora_final }
  const [busy, setBusy] = useState(false)
  const toggle = (r) => setSel((s) => s[r.id]?.on
    ? { ...s, [r.id]: { ...s[r.id], on: false } }
    : { ...s, [r.id]: { on: true, placa: s[r.id]?.placa || '', conductor_id: s[r.id]?.conductor_id || '', hora_inicial: s[r.id]?.hora_inicial || '' } })
  const setv = (id, k, v) => setSel((s) => ({ ...s, [id]: { ...s[id], [k]: v } }))
  const marcadas = rutas.filter((r) => sel[r.id]?.on)

  async function generar() {
    if (!marcadas.length) { alert('Marca al menos una ruta.'); return }
    setBusy(true)
    for (const r of marcadas) {
      const v = sel[r.id]
      const veh = vehiculos.find((x) => (x.placa || '') === v.placa)
      const cond = conductores.find((x) => String(x.id) === String(v.conductor_id))
      await saveRodamiento({
        empresa_id: empresa?.id, fecha, ruta_id: r.id, ruta: r.nombre,
        placa: v.placa || '', vehiculo_id: veh?.id || null, clase: veh?.clase || '',
        conductor_id: v.conductor_id || null, conductor_nombre: cond ? nombreConductor(cond) : '',
        descripcion: r.descripcion || '', origen: r.origen || '', destino: r.destino || '', empresa_cliente: r.empresa_cliente || '',
        hora_inicial: v.hora_inicial || '', hora_final: '', estado: 'programado',
      }).catch(() => {})
    }
    setBusy(false); onDone()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card flex max-h-[88vh] w-full max-w-lg flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">⚡ Generar cronograma del día</h2>
        <div className="mt-2 flex items-center gap-2">
          <label className="label">Fecha:</label>
          <input type="date" className="input w-auto" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <span className="ml-auto text-xs text-ink-soft">{marcadas.length} marcada(s)</span>
        </div>
        {rutas.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">No hay rutas maestras. Crea primero las rutas en “⚙️ Rutas maestras”.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2 overflow-y-auto">
            {rutas.map((r) => {
              const v = sel[r.id] || {}
              return (
                <div key={r.id} className={`rounded-xl border p-2.5 ${v.on ? 'border-brand-300 bg-brand-50' : 'border-cloud-line'}`}>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!v.on} onChange={() => toggle(r)} className="h-4 w-4" />
                    <span className="font-bold text-ink">{r.nombre}</span>
                    <span className="text-xs text-ink-soft">{r.empresa_cliente} · {r.descripcion}</span>
                  </label>
                  {v.on && (
                    <div className="mt-2 grid grid-cols-1 gap-2 pl-6 sm:grid-cols-3">
                      <select className="input" value={v.placa} onChange={(e) => setv(r.id, 'placa', e.target.value)}>
                        <option value="">Placa…</option>
                        {vehiculos.map((x) => <option key={x.id} value={x.placa}>{x.placa}</option>)}
                      </select>
                      <select className="input" value={v.conductor_id} onChange={(e) => setv(r.id, 'conductor_id', e.target.value)}>
                        <option value="">Conductor…</option>
                        {conductores.filter((c) => c.estado_habilitacion !== 'inactivo').map((c) => <option key={c.id} value={c.id}>{nombreConductor(c)}</option>)}
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-ink-soft">H. inicio
                        <input type="time" className="input" value={v.hora_inicial} onChange={(e) => setv(r.id, 'hora_inicial', e.target.value)} /></label>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost ml-auto">Cancelar</button>
          <button onClick={generar} disabled={busy || !marcadas.length} className="btn-primary">{busy ? 'Generando…' : `Generar ${marcadas.length || ''}`}</button>
        </div>
      </div>
    </div>
  )
}

// ---------- Modal: un servicio (crear/editar) ----------
function ModalServicio({ empresa, base, rutas, vehiculos, conductores, onClose, onSaved }) {
  const [f, setF] = useState({
    id: base.id, fecha: base.fecha || fechaLocalISO(), placa: base.placa || '', clase: base.clase || '',
    conductor_id: base.conductor_id || '', conductor_nombre: base.conductor_nombre || '', descripcion: base.descripcion || 'Ingreso Personal',
    hora_inicial: hhmm(base.hora_inicial), hora_final: hhmm(base.hora_final), ruta: base.ruta || '', ruta_id: base.ruta_id || '',
    origen: base.origen || '', destino: base.destino || '', empresa_cliente: base.empresa_cliente || '', estado: base.estado || 'programado',
    motivo_cancelacion: base.motivo_cancelacion || '',
  })
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  const [busy, setBusy] = useState(false)

  function aplicarRuta(id) {
    const r = rutas.find((x) => String(x.id) === String(id))
    if (!r) { set('ruta_id', ''); return }
    setF((o) => ({ ...o, ruta_id: r.id, ruta: r.nombre, descripcion: r.descripcion || o.descripcion, origen: r.origen || '', destino: r.destino || '', empresa_cliente: r.empresa_cliente || '', clase: o.clase || r.clase || '', hora_inicial: o.hora_inicial || hhmm(r.hora_inicial), hora_final: o.hora_final || hhmm(r.hora_final) }))
  }
  function aplicarPlaca(placa) {
    const v = vehiculos.find((x) => (x.placa || '') === placa)
    setF((o) => ({ ...o, placa, clase: v?.clase || o.clase }))
  }
  async function guardar() {
    setBusy(true)
    const cond = conductores.find((x) => String(x.id) === String(f.conductor_id))
    await saveRodamiento({ ...f, empresa_id: empresa?.id, conductor_nombre: cond ? nombreConductor(cond) : f.conductor_nombre, vehiculo_id: (vehiculos.find((x) => x.placa === f.placa) || {}).id || null })
      .catch((e) => alert('No se pudo guardar. ' + (e?.message || '')))
    setBusy(false); onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[88vh] w-full max-w-md overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">{base.id ? 'Editar servicio' : 'Nuevo servicio'}</h2>
        <div className="mt-3 flex flex-col gap-3">
          {rutas.length > 0 && (
            <div><label className="label">Usar ruta maestra</label>
              <select className="input mt-1" value={f.ruta_id} onChange={(e) => aplicarRuta(e.target.value)}>
                <option value="">— (manual) —</option>
                {rutas.map((r) => <option key={r.id} value={r.id}>{r.nombre} · {r.empresa_cliente}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Fecha</label><input type="date" className="input mt-1" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} /></div>
            <div><label className="label">Tipo</label>
              <select className="input mt-1" value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)}>{DESCRIPCIONES_ROD.map((d) => <option key={d}>{d}</option>)}</select>
            </div>
          </div>
          <div><label className="label">Placa</label>
            <select className="input mt-1" value={f.placa} onChange={(e) => aplicarPlaca(e.target.value)}>
              <option value="">—</option>{vehiculos.map((x) => <option key={x.id} value={x.placa}>{x.placa}</option>)}
            </select>
            {f.clase && <p className="mt-1 text-xs text-ink-faint">Clase: {f.clase}</p>}
          </div>
          <div><label className="label">Conductor</label>
            <select className="input mt-1" value={f.conductor_id} onChange={(e) => set('conductor_id', e.target.value)}>
              <option value="">—</option>{conductores.map((c) => <option key={c.id} value={c.id}>{nombreConductor(c)}</option>)}
            </select>
          </div>
          <div><label className="label">Ruta</label><input className="input mt-1" value={f.ruta} onChange={(e) => set('ruta', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Origen</label><input className="input mt-1" value={f.origen} onChange={(e) => set('origen', e.target.value)} /></div>
            <div><label className="label">Destino</label><input className="input mt-1" value={f.destino} onChange={(e) => set('destino', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Empresa</label><input className="input mt-1" value={f.empresa_cliente} onChange={(e) => set('empresa_cliente', e.target.value)} /></div>
            <div><label className="label">Hora inicio</label><input type="time" className="input mt-1" value={f.hora_inicial} onChange={(e) => set('hora_inicial', e.target.value)} /></div>
          </div>
          <p className="rounded-lg bg-cloud px-3 py-2 text-xs text-ink-soft">La <b>hora final</b> y el tiempo los registra el conductor desde su app al terminar el servicio.{f.hora_final ? <> · Hora final: <b className="text-ink">{hhmm(f.hora_final)}</b> · Tiempo: <b className="text-ink">{tiempoRecorrido(f.hora_inicial, f.hora_final) || '—'}</b></> : ''}</p>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost ml-auto">Cancelar</button>
          <button onClick={guardar} disabled={busy} className="btn-primary">{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
