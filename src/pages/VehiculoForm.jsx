import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getVehiculo, saveVehiculo, buscarVehiculoPorPlaca, contarFuecVehiculo,
  listPropietarios, listTransportadoras, nombrePropietario, nombreTransportadora,
} from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import {
  modelosDisponibles, CLASES, MARCAS, MARCAS_LINEAS, COLORES, CARROCERIAS,
  COMBUSTIBLES, PESO_UNIDADES, SERVICIO, ASEGURADORAS,
} from '../lib/vehiculoOpciones'

const VACIO = {
  // Datos básicos
  modelo: '', clase: '', numero_interno: '', marca: '', linea: '', placa: '', cilindraje: '', vehiculo_servicio: 'PUBLICO',
  // Datos complementarios
  capacidad: '', peso: '', peso_unidad: 'KILOGRAMO', registro_motor: '', serie_chasis: '',
  color: '', carroceria: '', tipo_combustible: '', porcentaje_cobro: '',
  // Datos operacionales
  aseguradora_soat: '', fecha_venc_soat: '', fecha_venc_rcc: '', fecha_venc_rce: '',
  fecha_venc_preventiva: '', fecha_venc_tecnomecanica: '', tarjeta_operacion: '', fecha_venc_toperacion: '',
  propietario_id: '', tenedor_id: '', transportadora_id: '', aseguradora_rcc_rce: '',
  estado: 'activo', desvinculacion: 'NO',
  // Datos adicionales / convenio
  tiene_convenio: 'NO', ciudad_matricula: '', fecha_matricula: '', inicio_convenio: '', caducidad_convenio: '',
  // Datos kilometraje
  kilometraje_actual: '', fecha_kilometraje: '', observaciones_km: '',
}

const TABS = ['Datos básicos', 'Datos complementarios', 'Datos operacionales', 'Datos adicionales', 'Datos kilometraje']

export default function VehiculoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(VACIO)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [dupPlaca, setDupPlaca] = useState(null)
  const [fuecCount, setFuecCount] = useState(0)
  const [propietarios, setPropietarios] = useState([])
  const [transportadoras, setTransportadoras] = useState([])
  const editando = Boolean(id)
  const modelos = useMemo(() => modelosDisponibles(), [])
  const lineas = MARCAS_LINEAS[form.marca] || []
  const conConvenio = form.tiene_convenio === 'SI'

  useEffect(() => {
    listPropietarios({ empresaId: empresa?.id }).then(setPropietarios).catch(() => {})
    listTransportadoras({ empresaId: empresa?.id }).then(setTransportadoras).catch(() => {})
  }, [empresa?.id])

  useEffect(() => {
    if (!id) return
    getVehiculo(id).then((v) => { if (v) setForm({ ...VACIO, ...v }) })
    contarFuecVehiculo(id).then(setFuecCount).catch(() => setFuecCount(0))
  }, [id])

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))
  function setMarca(m) { setForm((f) => ({ ...f, marca: m, linea: '' })) }

  async function verificarPlaca() {
    setDupPlaca(null)
    if (!form.placa?.trim()) return
    const v = await buscarVehiculoPorPlaca({ empresaId: empresa?.id, placa: form.placa })
    if (v && String(v.id) !== String(form.id)) setDupPlaca(v)
  }

  async function grabar() {
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

      {/* Pestañas */}
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
            <Field label="Porcentaje de cobro"><input className="input" value={form.porcentaje_cobro} onChange={(e) => set('porcentaje_cobro', e.target.value)} placeholder="Ej. 10%" /></Field>
            <Field label="Cantidad de FUEC">
              <input className="input bg-cloud" value={editando ? String(fuecCount) : '0'} readOnly />
              <p className="mt-1 text-xs text-ink-soft">Se cuenta según los FUEC del vehículo (módulo 4.6).</p>
            </Field>
          </div>
        )}

        {/* ---------- 2. DATOS OPERACIONALES ---------- */}
        {tab === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Aseguradora SOAT"><Select value={form.aseguradora_soat} onChange={(v) => set('aseguradora_soat', v)} options={ASEGURADORAS} /></Field>
            <Field label="Fecha vencimiento SOAT"><input type="date" className="input" value={form.fecha_venc_soat} onChange={(e) => set('fecha_venc_soat', e.target.value)} /></Field>
            <Field label="Fecha vencimiento RCC"><input type="date" className="input" value={form.fecha_venc_rcc} onChange={(e) => set('fecha_venc_rcc', e.target.value)} /></Field>
            <Field label="Fecha vencimiento RCE"><input type="date" className="input" value={form.fecha_venc_rce} onChange={(e) => set('fecha_venc_rce', e.target.value)} /></Field>
            <Field label="Fecha vencimiento preventiva"><input type="date" className="input" value={form.fecha_venc_preventiva} onChange={(e) => set('fecha_venc_preventiva', e.target.value)} /></Field>
            <Field label="Fecha venc. revisión tecnicomecánica"><input type="date" className="input" value={form.fecha_venc_tecnomecanica} onChange={(e) => set('fecha_venc_tecnomecanica', e.target.value)} /></Field>
            <Field label="Tarjeta de operación"><input className="input" value={form.tarjeta_operacion} onChange={(e) => set('tarjeta_operacion', e.target.value)} /></Field>
            <Field label="Fecha venc. tarjeta de operación"><input type="date" className="input" value={form.fecha_venc_toperacion} onChange={(e) => set('fecha_venc_toperacion', e.target.value)} /></Field>
            <Field label="Propietario">
              <PersonaSelect value={form.propietario_id} onChange={(v) => set('propietario_id', v)} items={propietarios} label={nombrePropietario} />
            </Field>
            <Field label="Tenedor">
              <PersonaSelect value={form.tenedor_id} onChange={(v) => set('tenedor_id', v)} items={propietarios} label={nombrePropietario} />
            </Field>
            <Field label="Empresa transportadora">
              <PersonaSelect value={form.transportadora_id} onChange={(v) => set('transportadora_id', v)} items={transportadoras} label={nombreTransportadora} />
            </Field>
            <Field label="Aseguradora RCC/RCE"><Select value={form.aseguradora_rcc_rce} onChange={(v) => set('aseguradora_rcc_rce', v)} options={ASEGURADORAS} /></Field>
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
            <Field label="Ciudad de matrícula"><input className="input" value={form.ciudad_matricula} onChange={(e) => set('ciudad_matricula', e.target.value)} /></Field>
            <Field label="Fecha de matrícula"><input type="date" className="input" value={form.fecha_matricula} onChange={(e) => set('fecha_matricula', e.target.value)} /></Field>
            <Field label="¿Tiene convenio?" className="sm:col-span-2">
              <div className="flex gap-5 pt-1.5">
                <Radio label="Sí" checked={conConvenio} onChange={() => set('tiene_convenio', 'SI')} />
                <Radio label="No" checked={!conConvenio} onChange={() => set('tiene_convenio', 'NO')} />
              </div>
            </Field>
            {conConvenio && <>
              <Field label="Inicio del convenio"><input type="date" className="input" value={form.inicio_convenio} onChange={(e) => set('inicio_convenio', e.target.value)} /></Field>
              <Field label="Caducidad del convenio"><input type="date" className="input" value={form.caducidad_convenio} onChange={(e) => set('caducidad_convenio', e.target.value)} /></Field>
            </>}
          </div>
        )}

        {/* ---------- 4. DATOS KILOMETRAJE ---------- */}
        {tab === 4 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kilometraje actual"><input className="input" value={form.kilometraje_actual} onChange={(e) => set('kilometraje_actual', e.target.value)} placeholder="Km" /></Field>
            <Field label="Fecha de lectura"><input type="date" className="input" value={form.fecha_kilometraje} onChange={(e) => set('fecha_kilometraje', e.target.value)} /></Field>
            <Field label="Observaciones" className="sm:col-span-2">
              <textarea className="input h-24" value={form.observaciones_km} onChange={(e) => set('observaciones_km', e.target.value)} />
            </Field>
          </div>
        )}
      </div>

      {msg && <p className="rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}

      <div className="flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={grabar} disabled={busy}>{busy ? 'Grabando…' : '💾 Grabar'}</button>
        <button className="btn-ghost" onClick={limpiar} disabled={busy}>Limpiar</button>
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
function PersonaSelect({ value, onChange, items, label }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Seleccione…</option>
      {items.map((it) => <option key={it.id} value={it.id}>{label(it)}{it.documento ? ` · ${it.documento}` : ''}</option>)}
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
