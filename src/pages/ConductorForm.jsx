import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getConductor, saveConductor, buscarPersonaPorDocumento, datosComunes } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import DocumentoAviso from '../components/DocumentoAviso'

const VACIO = {
  tipo_identificacion: '', documento: '', nombres: '', apellidos: '', celular: '', correo: '',
  licencia_numero: '', licencia_vencimiento: '', categoria_licencia: '', vigencia_seguridad: '',
  estado_habilitacion: 'activo', direccion: '',
  // Seguridad social / pagos
  no_planilla: '', salario_base: '', fecha_ingreso_eps: '', tipo_cotizante: '',
  eps: '', arl: '', afp: '', ccf: '', tipo_cuenta: '', no_cuenta: '', banco: '',
  existen_comparendos: 'NO', ultima_revision_comparendos: '',
}

const TIPOS_ID = ['Cédula de ciudadanía', 'Cédula de extranjería', 'Pasaporte', 'NIT']
const CATEGORIAS = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']
const COTIZANTE = ['Dependiente', 'Independiente']
const EPS = ['Sura', 'Sanitas', 'Nueva EPS', 'Compensar', 'Coomeva', 'Salud Total']
const ARL = ['Sura', 'Positiva', 'Colmena', 'Bolívar']
const AFP = ['Porvenir', 'Protección', 'Colfondos', 'Colpensiones']
const CCF = ['Compensar', 'Colsubsidio', 'Cafam']
const BANCOS = ['Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogotá', 'Nequi']
const CUENTAS = ['Ahorros', 'Corriente']

export default function ConductorForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const [form, setForm] = useState(VACIO)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [dup, setDup] = useState(null)
  const [prefill, setPrefill] = useState(null)
  const [aviso, setAviso] = useState('')
  const editando = Boolean(id)

  useEffect(() => {
    if (!id) return
    getConductor(id).then((c) => { if (c) setForm({ ...VACIO, ...c }) })
  }, [id])

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  async function verificarDocumento() {
    setDup(null); setPrefill(null)
    if (!form.documento?.trim()) return
    const { conductor, propietario } = await buscarPersonaPorDocumento({ empresaId: empresa?.id, documento: form.documento })
    if (conductor && String(conductor.id) !== String(form.id)) setDup(conductor)
    else if (propietario) setPrefill(propietario)
  }

  function usarDatos() {
    setForm((f) => ({ ...f, ...datosComunes(prefill) }))
    setAviso('Datos copiados del propietario.')
    setPrefill(null)
  }

  async function grabar() {
    setBusy(true); setMsg(''); setAviso('')
    try {
      if (!form.id) {
        const { conductor } = await buscarPersonaPorDocumento({ empresaId: empresa?.id, documento: form.documento })
        if (conductor) { setDup(conductor); setMsg('Ya existe un conductor con ese documento. Edita el registro existente.'); setBusy(false); return }
      }
      const payload = { ...form }
      if (!payload.id && empresa?.id) payload.empresa_id = empresa.id
      await saveConductor(payload)
      navigate('/conductores')
    } catch (e) {
      setMsg('No se pudo grabar. ' + (e?.message || ''))
      setBusy(false)
    }
  }

  function limpiar() { setForm(editando ? { ...VACIO, id: form.id } : VACIO); setMsg(''); setAviso('') }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={() => navigate('/conductores')} className="text-sm font-semibold text-brand-500 hover:underline">← Conductores</button>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-ink">{editando ? 'Editar conductor' : 'Nuevo conductor'}</h1>
        {(form.nombres || form.apellidos || form.documento) && (
          <p className="mt-0.5 text-sm text-ink-soft">{`${form.nombres} ${form.apellidos}`.trim()}{form.documento ? ` · ${form.documento}` : ''}</p>
        )}
      </div>

      <DocumentoAviso
        dup={dup} dupLabel="conductor" onEditarDup={() => navigate(`/conductores/${dup.id}`)}
        prefill={prefill} prefillLabel="propietario" onUsar={usarDatos} aviso={aviso}
      />

      {/* Datos del conductor (una sola hoja) */}
      <div className="card p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de identificación"><Select value={form.tipo_identificacion} onChange={(v) => set('tipo_identificacion', v)} options={TIPOS_ID} /></Field>
          <Field label="Documento"><input className="input" value={form.documento} onChange={(e) => set('documento', e.target.value)} onBlur={verificarDocumento} /></Field>
          <Field label="Nombres"><input className="input" value={form.nombres} onChange={(e) => set('nombres', e.target.value)} /></Field>
          <Field label="Apellidos"><input className="input" value={form.apellidos} onChange={(e) => set('apellidos', e.target.value)} /></Field>
          <Field label="Celular"><input className="input" value={form.celular} onChange={(e) => set('celular', e.target.value)} /></Field>
          <Field label="Correo electrónico"><input type="email" className="input" value={form.correo} onChange={(e) => set('correo', e.target.value)} /></Field>
          <Field label="Licencia número"><input className="input" value={form.licencia_numero} onChange={(e) => set('licencia_numero', e.target.value)} /></Field>
          <Field label="Fecha de vencimiento (licencia)"><input type="date" className="input" value={form.licencia_vencimiento} onChange={(e) => set('licencia_vencimiento', e.target.value)} /></Field>
          <Field label="Categoría de licencia"><Select value={form.categoria_licencia} onChange={(v) => set('categoria_licencia', v)} options={CATEGORIAS} /></Field>
          <Field label="Vigencia de la seguridad social"><input type="date" className="input" value={form.vigencia_seguridad} onChange={(e) => set('vigencia_seguridad', e.target.value)} /></Field>

          <Field label="Estado de habilitación" className="sm:col-span-2">
            <div className="flex gap-5 pt-1.5">
              <Radio label="Activo" checked={form.estado_habilitacion === 'activo'} onChange={() => set('estado_habilitacion', 'activo')} />
              <Radio label="Inactivo" checked={form.estado_habilitacion === 'inactivo'} onChange={() => set('estado_habilitacion', 'inactivo')} />
            </div>
          </Field>

          <Field label="Dirección" className="sm:col-span-2">
            <input className="input" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Incluye barrio y ciudad" />
            <p className="mt-1 text-xs text-ink-soft">📍 Recuerda colocar el <b>barrio</b> y la <b>ciudad</b>.</p>
          </Field>
        </div>
      </div>

      {/* Seguridad social y pagos */}
      <div className="card p-5 sm:p-6">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-faint">Seguridad social y pagos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="N° de planilla"><input className="input" value={form.no_planilla} onChange={(e) => set('no_planilla', e.target.value)} /></Field>
          <Field label="Salario base"><input className="input" value={form.salario_base} onChange={(e) => set('salario_base', e.target.value)} /></Field>
          <Field label="Fecha ingreso EPS"><input type="date" className="input" value={form.fecha_ingreso_eps} onChange={(e) => set('fecha_ingreso_eps', e.target.value)} /></Field>
          <Field label="Tipo cotizante"><Select value={form.tipo_cotizante} onChange={(v) => set('tipo_cotizante', v)} options={COTIZANTE} /></Field>
          <Field label="EPS"><Select value={form.eps} onChange={(v) => set('eps', v)} options={EPS} /></Field>
          <Field label="ARL"><Select value={form.arl} onChange={(v) => set('arl', v)} options={ARL} /></Field>
          <Field label="AFP"><Select value={form.afp} onChange={(v) => set('afp', v)} options={AFP} /></Field>
          <Field label="CCF"><Select value={form.ccf} onChange={(v) => set('ccf', v)} options={CCF} /></Field>
          <Field label="Tipo de cuenta"><Select value={form.tipo_cuenta} onChange={(v) => set('tipo_cuenta', v)} options={CUENTAS} /></Field>
          <Field label="N° de cuenta"><input className="input" value={form.no_cuenta} onChange={(e) => set('no_cuenta', e.target.value)} /></Field>
          <Field label="Banco"><Select value={form.banco} onChange={(v) => set('banco', v)} options={BANCOS} /></Field>
          <Field label="¿Existen comparendos?">
            <select className="input" value={form.existen_comparendos} onChange={(e) => set('existen_comparendos', e.target.value)}>
              <option>NO</option><option>SI</option>
            </select>
          </Field>
          <Field label="Última revisión de comparendos"><input type="date" className="input" value={form.ultima_revision_comparendos} onChange={(e) => set('ultima_revision_comparendos', e.target.value)} /></Field>
        </div>
      </div>

      {msg && <p className="rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}

      <div className="flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={grabar} disabled={busy}>{busy ? 'Guardando…' : '💾 Registro completo'}</button>
        <button className="btn-ghost" onClick={limpiar} disabled={busy}>Limpiar</button>
        <button className="btn-ghost" onClick={() => navigate('/conductores')} disabled={busy}>Retornar</button>
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
