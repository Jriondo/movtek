import { useEffect, useMemo, useState } from 'react'
import { listVehiculos, listConductores, listRodamiento, saveRodamiento, nombreConductor, fechaLocalISO, getRodTurnos, saveRodTurnos, ROD_TURNOS_DEFAULT } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'
import ListaEditableModal from '../components/ListaEditableModal'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Lunes de la semana de una fecha.
function lunesDe(iso) {
  const d = new Date(iso + 'T12:00:00')
  const off = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - off)
  return d
}
const iso = (d) => fechaLocalISO(d)

export default function PlanRodamiento() {
  const { empresa } = useEmpresa() || {}
  const { esPropietario, propietarioId } = useAuth()
  const [ancla, setAncla] = useState(fechaLocalISO())
  const [vehiculos, setVehiculos] = useState([])
  const [conductores, setConductores] = useState([])
  const [asign, setAsign] = useState({})   // clave `${vehId}|${fecha}` -> registro
  const [cargando, setCargando] = useState(true)
  const [edit, setEdit] = useState(null)   // { vehiculo, fecha, registro }
  const [turnos, setTurnos] = useState(ROD_TURNOS_DEFAULT)
  const [modalTurnos, setModalTurnos] = useState(false)

  const lun = useMemo(() => lunesDe(ancla), [ancla])
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(lun); d.setDate(lun.getDate() + i); return d }), [lun])
  const desde = iso(dias[0]), hasta = iso(dias[6])

  async function cargar() {
    setCargando(true)
    let vs = await listVehiculos({ empresaId: empresa?.id }).catch(() => [])
    vs = vs.filter((v) => v.estado !== 'inactivo')
    if (esPropietario && propietarioId) vs = vs.filter((v) => String(v.propietario_id) === String(propietarioId))
    setVehiculos(vs)
    setConductores(await listConductores({ empresaId: empresa?.id }).catch(() => []))
    const regs = await listRodamiento({ empresaId: empresa?.id, desde, hasta }).catch(() => [])
    const m = {}
    for (const r of regs) m[`${r.vehiculo_id}|${r.fecha}`] = r
    setAsign(m)
    setCargando(false)
  }
  useEffect(() => { cargar() }, [empresa?.id, desde])
  useEffect(() => { getRodTurnos(empresa?.id).then(setTurnos).catch(() => setTurnos(ROD_TURNOS_DEFAULT)) }, [empresa?.id])

  async function guardarTurnos(lista) {
    const g = await saveRodTurnos(empresa?.id, lista).catch(() => null)
    if (g) setTurnos(g)
    setModalTurnos(false)
  }

  function moverSemana(n) { const d = new Date(lun); d.setDate(lun.getDate() + n * 7); setAncla(iso(d)) }

  async function guardarCelda(reg) {
    const saved = await saveRodamiento(reg)
    setAsign((m) => {
      const n = { ...m }; const k = `${reg.vehiculo_id}|${reg.fecha}`
      if (saved) n[k] = saved; else delete n[k]
      return n
    })
    setEdit(null)
  }

  const nombreCorto = (id) => {
    const c = conductores.find((x) => String(x.id) === String(id))
    return c ? `${(c.nombres || '').split(' ')[0]} ${(c.apellidos || '').split(' ')[0]}`.trim() : ''
  }
  const rango = `${dias[0].toLocaleDateString('es', { day: '2-digit', month: 'short' })} – ${dias[6].toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}`
  const hoyISO = fechaLocalISO()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold text-ink">🗓️ Plan de rodamiento</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalTurnos(true)} className="btn-ghost">⚙️ Turnos</button>
          <button onClick={() => moverSemana(-1)} className="btn-ghost">← Semana</button>
          <button onClick={() => setAncla(fechaLocalISO())} className="btn-ghost">Hoy</button>
          <button onClick={() => moverSemana(1)} className="btn-ghost">Semana →</button>
        </div>
      </div>
      <p className="-mt-3 text-sm text-ink-soft">Semana del <b className="text-ink">{rango}</b>. Toca una casilla para asignar conductor y ruta.</p>

      {cargando ? (
        <p className="text-ink-faint">Cargando…</p>
      ) : vehiculos.length === 0 ? (
        <div className="card p-8 text-center text-ink-soft">No hay vehículos activos.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-cloud">
                <th className="sticky left-0 z-10 bg-cloud px-3 py-2 text-left font-bold text-ink">Vehículo</th>
                {dias.map((d, i) => {
                  const es = iso(d)
                  return <th key={i} className={`px-2 py-2 text-center font-bold ${es === hoyISO ? 'text-brand-600' : 'text-ink'}`}>
                    {DIAS[i]}<br /><span className="text-xs font-normal text-ink-soft">{d.getDate()}</span>
                  </th>
                })}
              </tr>
            </thead>
            <tbody>
              {vehiculos.map((v) => (
                <tr key={v.id} className="border-t border-cloud-line">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2">
                    <span className="block font-bold text-ink">{v.placa}</span>
                    <span className="block text-xs text-ink-soft">Móvil {v.numero_interno || '—'}</span>
                  </td>
                  {dias.map((d, i) => {
                    const fecha = iso(d)
                    const reg = asign[`${v.id}|${fecha}`]
                    return (
                      <td key={i} className="p-1 align-top">
                        <button onClick={() => setEdit({ vehiculo: v, fecha, registro: reg })}
                          className={`h-full min-h-[52px] w-full rounded-lg border px-1.5 py-1 text-left text-xs transition ${reg ? 'border-brand-200 bg-brand-50' : 'border-dashed border-cloud-line hover:border-brand-300'}`}>
                          {reg ? (
                            <>
                              <span className="block font-bold text-brand-700">{nombreCorto(reg.conductor_id) || 'Asignado'}</span>
                              {reg.ruta && <span className="block truncate text-ink-soft">{reg.ruta}</span>}
                              {reg.turno && <span className="block text-[10px] text-ink-faint">{reg.turno}</span>}
                            </>
                          ) : <span className="text-ink-faint">+ asignar</span>}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <ModalAsignar empresa={empresa} conductores={conductores} turnos={turnos} {...edit}
          onClose={() => setEdit(null)} onSave={guardarCelda} nombreCorto={nombreCorto} />
      )}
      {modalTurnos && (
        <ListaEditableModal titulo="Turnos" descripcion="Personaliza los turnos para la programación."
          items={turnos} onClose={() => setModalTurnos(false)} onSave={guardarTurnos} />
      )}
    </div>
  )
}

function ModalAsignar({ empresa, conductores, turnos = [], vehiculo, fecha, registro, onClose, onSave }) {
  const [conductorId, setConductorId] = useState(registro?.conductor_id || '')
  const [ruta, setRuta] = useState(registro?.ruta || '')
  const [turno, setTurno] = useState(registro?.turno || '')
  const [nota, setNota] = useState(registro?.nota || '')
  const fechaBonita = new Date(fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: '2-digit', month: 'long' })

  function guardar(vaciar = false) {
    const c = conductores.find((x) => String(x.id) === String(conductorId))
    onSave({
      id: registro?.id, empresa_id: empresa?.id, vehiculo_id: vehiculo.id, placa: vehiculo.placa, fecha,
      conductor_id: vaciar ? '' : conductorId, conductor_nombre: vaciar ? '' : (c ? nombreConductor(c) : ''),
      ruta: vaciar ? '' : ruta, turno: vaciar ? '' : turno, nota: vaciar ? '' : nota,
    })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">{vehiculo.placa} · Móvil {vehiculo.numero_interno || '—'}</h2>
        <p className="mb-3 text-sm capitalize text-ink-soft">{fechaBonita}</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="label">Conductor</label>
            <select className="input mt-1" value={conductorId} onChange={(e) => setConductorId(e.target.value)}>
              <option value="">— Sin asignar —</option>
              {conductores.filter((c) => c.estado_habilitacion !== 'inactivo').map((c) => <option key={c.id} value={c.id}>{nombreConductor(c)}</option>)}
            </select>
          </div>
          <div><label className="label">Ruta / recorrido</label><input className="input mt-1" value={ruta} onChange={(e) => setRuta(e.target.value)} placeholder="Ej. Medellín – Rionegro" /></div>
          <div>
            <label className="label">Turno (opcional)</label>
            <select className="input mt-1" value={turno} onChange={(e) => setTurno(e.target.value)}>
              <option value="">—</option>
              {turnos.map((t) => <option key={t}>{t}</option>)}
              {turno && !turnos.includes(turno) && <option>{turno}</option>}
            </select>
          </div>
          <div><label className="label">Nota (opcional)</label><input className="input mt-1" value={nota} onChange={(e) => setNota(e.target.value)} /></div>
        </div>
        <div className="mt-4 flex gap-2">
          {registro && <button onClick={() => guardar(true)} className="btn-ghost text-coral-500">Quitar</button>}
          <button onClick={onClose} className="btn-ghost ml-auto">Cancelar</button>
          <button onClick={() => guardar(false)} className="btn-primary">Guardar</button>
        </div>
      </div>
    </div>
  )
}
