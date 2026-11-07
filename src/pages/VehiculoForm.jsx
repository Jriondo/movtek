import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getVehiculo, saveVehiculo, buscarVehiculoPorPlaca,
  listPropietarios, listTransportadoras, nombrePropietario, nombreTransportadora,
  listConductores, nombreConductor,
} from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'
import {
  modelosDisponibles, CLASES, MARCAS, MARCAS_LINEAS, COLORES, CARROCERIAS,
  COMBUSTIBLES, PESO_UNIDADES, SERVICIO, ASEGURADORAS,
} from '../lib/vehiculoOpciones'
import { DEPARTAMENTOS, DEPARTAMENTOS_NOMBRES } from '../lib/colombia'
import { faltantes, mensajeFaltantes } from '../lib/validar'
import FechaInput from '../components/FechaInput'

const VACIO = {
  // básicos
  modelo: '', clase: '', numero_interno: '', marca: '', linea: '', placa: '', cilindraje: '', vehiculo_servicio: 'PUBLICO',
  // complementarios
  capacidad: '', peso: '', peso_unidad: 'KILOGRAMO', registro_motor: '', serie_chasis: '',
  color: '', carroceria: '', tipo_combustible: '',
  // operacionales
  aseguradora_soat: '', fecha_venc_soat: '', fecha_venc_rcc_rce: '', aseguradora_rcc_rce: '',
  fecha_venc_preventiva: '', fecha_venc_tecnomecanica: '', tarjeta_operacion: '', fecha_venc_toperacion: '',
  propietario_id: '', tenedor_id: '', transportadora_id: '',
  estado: 'activo', desvinculacion: 'NO',
  // adicionales / convenio
  tiene_convenio: 'NO', depto_matricula: '', ciudad_matricula: '', fecha_matricula: '', inicio_convenio: '', caducidad_convenio: '',
  // conductores asignados a esta placa (para el FUEC)
  conductores_asignados: [],
}

const TABS = ['Datos básicos', 'Datos complementarios', 'Datos operacionales', 'Datos adicionales']
const REQUERIDOS = [['placa', 'Placa'], ['clase', 'Clase'], ['marca', 'Marca'], ['linea', 'Línea'], ['modelo', 'Modelo']]
const ciudadesDeDepto = (dep) => DEPARTAMENTOS.find((d) => d.nombre === dep)?.ciudades || []

export default function VehiculoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const { esPropietario } = useAuth()
  const soloLectura = esPropietario
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(VACIO)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [dupPlaca, setDupPlaca] = useState(null)
  const [propietarios, setPropietarios] = useState([])
  const [transportadoras, setTransportadoras] = useState([])
  const [conductores, setConductores] = useState([])
  const [selCond, setSelCond] = useState('')
  const editando = Boolean(id)
  const modelos = useMemo(() => modelosDisponibles(), [])
  const lineas = MARCAS_LINEAS[form.marca] || []
  const conConvenio = form.tiene_convenio === 'SI'

  useEffect(() => {
    listPropietarios({ empresaId: empresa?.id }).then(setPropietarios).catch(() => {})
    listTransportadoras({ empresaId: empresa?.id }).then(setTransportadoras).catch(() => {})
    listConductores({ empresaId: empresa?.id }).then(setConductores).catch(() => {})
  }, [empresa?.id])

  useEffect(() => {
    if (!id) return
    getVehiculo(id).then((v) => { if (v) setForm({ ...VACIO, ...v, conductores_asignados: v.conductores_asignados || [] }) })
  }, [id])

  function agregarConductor() {
    const c = conductores.find((x) => String(x.id) === String(selCond))
    if (!c || form.conductores_asignados.some((x) => String(x.id) === String(c.id))) return
    set('conductores_asignados', [...form.conductores_asignados, { id: c.id, nombre: nombreConductor(c), documento: c.documento || '' }])
    setSelCond('')
  }
  function quitarConductor(i) { set('conductores_asignados', form.conductores_asignados.filter((_, idx) => idx !== i)) }

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))
  function setMarca(m) { setForm((f) => ({ ...f, marca: m, linea: '' })) }

  async function verificarPlaca() {
    setDupPlaca(null)
    if (!form.placa?.trim()) return
    const v = await buscarVehiculoPorPlaca({ empresaId: empresa?.id, placa: form.placa })
    if (v && String(v.id) !== String(form.id)) setDupPlaca(v)
  }

  async function grabar() {
    if (soloLectura) { setMsg('Tu rol solo permite ver la información del vehículo, no modificarla.'); return }
    const falt = faltantes(form, REQUERIDOS)
    if (falt.length) { setMsg(mensajeFaltantes(falt)); return }
    if (editando && !window.confirm('¿Estás seguro de guardar los cambios?')) return
    setBusy(true); setMsg('')
    try {
      if (!form.id) {
        const v = await buscarVehiculoPorPlaca({ empresaId: empresa?.id, placa: form.placa })
        if (v) { setDupPlaca(v); setMsg('Ya existe un vehículo con esa placa. Edita el registro existente.'); setBusy(false); return }
      }
      const payload = { ...form }
      if (!payload.id && empresa?.id) payload.empresa_id = empresa.id
      await saveVehiculo(payload)
      navigate('/vehiculos')
    } catch (e) {
      setMsg('No se pudo grabar. ' + (e?.message || ''))
      setBusy(false)
    }
  }

  function limpiar() { setForm(editando ? { ...VACIO, id: form.id } : VACIO); setMsg(''); setDupPlaca(null) }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={() => navigate('/vehiculos')} className="text-sm font-semibold text-brand-500 hover:underline">← Vehículos</button>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-ink">{editando ? 'Editar vehículo' : 'Nuevo vehículo'}</h1>
        {form.placa && <p className="mt-0.5 text-sm text-ink-soft">Placa: {form.placa}</p>}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-cloud p-1">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-none whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition sm:flex-1 ${tab === i ? 'bg-white text-brand-600 shadow-card' : 'text-ink-soft hover:text-ink'}`}>
            {t}
          </button>
        ))}
      </div>

      {dupPlaca && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm text-coral-500">
          <span>⚠️ Ya existe un vehículo con la placa <b>{dupPlaca.placa}</b>.</span>
          <button type="button" onClick={() => navigate(`/vehiculos/${dupPlaca.id}`)} className="font-bold underline">Editar ese registro</button>
        </div>
      )}

      <div className="card p-5 sm:p-6">
        {/* ---------- 0. DATOS BÁSICOS ---------- */}
        {tab === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Modelo"><Select value={form.modelo} onChange={(v) => set('modelo', v)} options={modelos} /></Field>
            <Field label="Clase de vehículo"><Select value={form.clase} onChange={(v) => set('clase', v)} options={CLASES} /></Field>
            <Field label="Número interno (móvil)"><input className="input" value={form.numero_interno} onChange={(e) => set('numero_interno', e.target.value)} /></Field>
            <Field label="Marca"><Select value={form.marca} onChange={setMarca} options={MARCAS} /></Field>
            <Field label="Línea">
              <select className="input" value={form.linea} onChange={(e) => set('linea', e.target.value)} disabled={!form.marca}>
                <option value="">{form.marca ? 'Seleccione…' : 'Elige una marca primero'}</option>
                {lineas.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Placa"><input className="input uppercase" value={form.placa} onChange={(e) => set('placa', e.target.value.toUpperCase())} onBlur={verificarPlaca} placeholder="ABC-1234" /></Field>
            <Field label="Cilindraje (cm³)"><input className="input" value={form.cilindraje} onChange={(e) => set('cilindraje', e.target.value)} /></Field>
            <Field label="Vehículo de servicio">
              <div className="flex flex-wrap gap-4 pt-1.5">
                {SERVICIO.map((s) => <Radio key={s} label={s} checked={form.vehiculo_servicio === s} onChange={() => set('vehiculo_servicio', s)} />)}
              </div>
            </Field>
          </div>
        )}

        {/* ---------- 1. DATOS COMPLEMENTARIOS ---------- */}
        {tab === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Capacidad (pasajeros)"><input className="input" value={form.capacidad} onChange={(e) => set('capacidad', e.target.value)} /></Field>
            <Field label="Peso">
              <div className="flex gap-2">
                <input className="input" value={form.peso} onChange={(e) => set('peso', e.target.value)} />
                <select className="input w-40" value={form.peso_unidad} onChange={(e) => set('peso_unidad', e.target.value)}>
                  {PESO_UNIDADES.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </Field>
            <Field label="Registro motor"><input className="input" value={form.registro_motor} onChange={(e) => set('registro_motor', e.target.value)} /></Field>
            <Field label="Serie chasis"><input className="input" value={form.serie_chasis} onChange={(e) => set('serie_chasis', e.target.value)} /></Field>
            <Field label="Color"><Select value={form.color} onChange={(v) => set('color', v)} options={COLORES} /></Field>
            <Field label="Carrocería"><Select value={form.carroceria} onChange={(v) => set('carroceria', v)} options={CARROCERIAS} /></Field>
            <Field label="Tipo de combustible"><Select value={form.tipo_combustible} onChange={(v) => set('tipo_combustible', v)} options={COMBUSTIBLES} /></Field>
          </div>
        )}

        {/* ---------- 2. DATOS OPERACIONALES ---------- */}
        {tab === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Aseguradora SOAT"><Select value={form.aseguradora_soat} onChange={(v) => set('aseguradora_soat', v)} options={ASEGURADORAS} /></Field>
            <Field label="Fecha vencimiento SOAT"><FechaInput value={form.fecha_venc_soat} onChange={(v) => set('fecha_venc_soat', v)} /></Field>

            {/* Póliza RCC/RCE unificada (contractual y extracontractual) */}
            <Field label="Vencimiento póliza RCC/RCE"><FechaInput value={form.fecha_venc_rcc_rce} onChange={(v) => set('fecha_venc_rcc_rce', v)} /></Field>
            <Field label="Aseguradora de la póliza RCC/RCE"><Select value={form.aseguradora_rcc_rce} onChange={(v) => set('aseguradora_rcc_rce', v)} options={ASEGURADORAS} /></Field>

            <Field label="Fecha vencimiento preventiva"><FechaInput value={form.fecha_venc_preventiva} onChange={(v) => set('fecha_venc_preventiva', v)} /></Field>
            <Field label="Fecha venc. revisión tecnicomecánica"><FechaInput value={form.fecha_venc_tecnomecanica} onChange={(v) => set('fecha_venc_tecnomecanica', v)} /></Field>
            <Field label="Tarjeta de operación"><input className="input" value={form.tarjeta_operacion} onChange={(e) => set('tarjeta_operacion', e.target.value)} /></Field>
            <Field label="Fecha venc. tarjeta de operación"><FechaInput value={form.fecha_venc_toperacion} onChange={(v) => set('fecha_venc_toperacion', v)} /></Field>

            <Field label="Propietario"><BuscarSelect value={form.propietario_id} onChange={(v) => set('propietario_id', v)} items={propietarios} label={nombrePropietario} placeholder="Busca por nombre o documento…" /></Field>
            <Field label="Tenedor"><BuscarSelect value={form.tenedor_id} onChange={(v) => set('tenedor_id', v)} items={propietarios} label={nombrePropietario} placeholder="Busca por nombre o documento…" /></Field>
            <Field label="Empresa transportadora" className="sm:col-span-2"><BuscarSelect value={form.transportadora_id} onChange={(v) => set('transportadora_id', v)} items={transportadoras} label={nombreTransportadora} placeholder="Busca por nombre o documento…" /></Field>

            <Field label="Estado">
              <div className="flex gap-5 pt-1.5">
                <Radio label="Activo" checked={form.estado === 'activo'} onChange={() => set('estado', 'activo')} />
                <Radio label="Inactivo" checked={form.estado === 'inactivo'} onChange={() => set('estado', 'inactivo')} />
              </div>
            </Field>
            <Field label="Desvinculación">
              <div className="flex gap-5 pt-1.5">
                <Radio label="Sí" checked={form.desvinculacion === 'SI'} onChange={() => set('desvinculacion', 'SI')} />
                <Radio label="No" checked={form.desvinculacion === 'NO'} onChange={() => set('desvinculacion', 'NO')} />
              </div>
            </Field>
          </div>
        )}

        {/* ---------- 3. DATOS ADICIONALES (matrícula / convenio) ---------- */}
        {tab === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Departamento de matrícula">
              <select className="input" value={form.depto_matricula} onChange={(e) => setForm((f) => ({ ...f, depto_matricula: e.target.value, ciudad_matricula: '' }))}>
                <option value="">Seleccione…</option>
                {DEPARTAMENTOS_NOMBRES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Ciudad de matrícula">
              <select className="input" value={form.ciudad_matricula} onChange={(e) => set('ciudad_matricula', e.target.value)} disabled={!form.depto_matricula}>
                <option value="">{form.depto_matricula ? 'Seleccione…' : 'Elige un departamento primero'}</option>
                {ciudadesDeDepto(form.depto_matricula).map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Fecha de matrícula"><FechaInput value={form.fecha_matricula} onChange={(v) => set('fecha_matricula', v)} /></Field>
            <Field label="¿Tiene convenio?">
              <div className="flex gap-5 pt-1.5">
                <Radio label="Sí" checked={conConvenio} onChange={() => set('tiene_convenio', 'SI')} />
                <Radio label="No" checked={!conConvenio} onChange={() => set('tiene_convenio', 'NO')} />
              </div>
            </Field>
            {conConvenio && <>
              <Field label="Inicio del convenio"><FechaInput value={form.inicio_convenio} onChange={(v) => set('inicio_convenio', v)} /></Field>
              <Field label="Caducidad del convenio"><FechaInput value={form.caducidad_convenio} onChange={(v) => set('caducidad_convenio', v)} /></Field>
            </>}
          </div>
        )}
      </div>

      {/* Conductores asignados a esta placa */}
      <div className="card p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />🧑‍✈️ Conductores asignados</h2>
        <p className="mb-3 text-xs text-ink-soft">Al generar un FUEC con esta placa, solo aparecerán los conductores que asignes aquí.</p>
        <div className="flex gap-2">
          <select className="input" value={selCond} onChange={(e) => setSelCond(e.target.value)}>
            <option value="">Selecciona un conductor…</option>
            {conductores.filter((c) => !form.conductores_asignados.some((x) => String(x.id) === String(c.id))).map((c) => (
              <option key={c.id} value={c.id}>{nombreConductor(c)}{c.documento ? ` · ${c.documento}` : ''}</option>
            ))}
          </select>
          <button type="button" className="btn-accent !px-3" onClick={agregarConductor}>+ Agregar</button>
        </div>
        {form.conductores_asignados.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1">
            {form.conductores_asignados.map((c, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-cloud px-3 py-2 text-sm">
                <span className="font-semibold text-ink">{c.nombre}{c.documento ? ` · ${c.documento}` : ''}</span>
                <button onClick={() => quitarConductor(i)} className="text-ink-faint hover:text-coral-500">✕</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-ink-soft">Aún no has asignado conductores a esta placa.</p>
        )}
      </div>

      {msg && <p className="rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}

      {soloLectura && <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-center text-sm font-medium text-brand-600">👁️ Solo lectura: tu rol permite ver la información del vehículo, no modificarla.</p>}

      <div className="flex flex-wrap justify-center gap-2">
        {!soloLectura && <button className="btn-primary" onClick={grabar} disabled={busy}>{busy ? 'Grabando…' : '💾 Grabar'}</button>}
        {!soloLectura && <button className="btn-ghost" onClick={limpiar} disabled={busy}>Limpiar</button>}
        <button className="btn-ghost" onClick={() => navigate('/vehiculos')} disabled={busy}>Retornar</button>
      </div>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return <div className={className}><span className="label">{label}</span>{children}</div>
}
function Select({ value, onChange, options }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Seleccione…</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  )
}
function Radio({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
      <input type="radio" className="h-4 w-4 accent-brand-500" checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}

// Selector con búsqueda por nombre o documento.
function BuscarSelect({ value, onChange, items, label, placeholder }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const sel = items.find((i) => String(i.id) === String(value))
  const texto = sel ? `${label(sel)}${sel.documento ? ' · ' + sel.documento : ''}` : ''
  const filtered = items.filter((i) => `${label(i)} ${i.documento || ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 25)
  return (
    <div className="relative">
      <input className="input" value={open ? q : texto} placeholder={placeholder}
        onFocus={() => { setOpen(true); setQ('') }}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-cloud-line bg-white shadow-card">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-ink-faint">Sin resultados</li>}
          {filtered.map((i) => (
            <li key={i.id}>
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-cloud"
                onMouseDown={() => { onChange(String(i.id)); setOpen(false) }}>
                {label(i)}{i.documento ? ` · ${i.documento}` : ''}
              </button>
            </li>
          ))}
          {value && (
            <li><button type="button" className="block w-full px-3 py-2 text-left text-xs text-coral-500 hover:bg-cloud"
              onMouseDown={() => { onChange(''); setOpen(false) }}>Quitar selección</button></li>
          )}
        </ul>
      )}
    </div>
  )
}
