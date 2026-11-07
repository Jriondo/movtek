import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPropietario, savePropietario } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'

const VACIO = {
  tipo_identificacion: '', documento: '', tipo_persona: 'natural', compania: '',
  nombres: '', apellidos: '', telefono_casa: '', telefono_oficina: '', celular: '',
  correo: '', correo_alterno: '', ciudad: '', barrio: '',
  tipo_cuenta: '', no_cuenta: '', banco: '',
  tipo_direccion: 'catastral', direccion: '', estado: 'activo',
  via_tipo: 'Calle', via_num: '', placa1: '', placa2: '', complemento: '',
}

const TIPOS_ID = ['Cédula', 'Cédula de extranjería', 'Pasaporte', 'RUC', 'NIT']
const CIUDADES = ['Guayaquil', 'Quito', 'Cuenca', 'Manta', 'Durán', 'Machala', 'Ambato', 'Loja']
const CUENTAS = ['Ahorros', 'Corriente']
const BANCOS = ['Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogotá', 'Nequi', 'Pichincha', 'Guayaquil']
const TIPOS_VIA = ['Calle', 'Carrera', 'Avenida', 'Diagonal', 'Transversal', 'Km']

const componerDireccion = (f) => {
  const base = `${f.via_tipo || 'Calle'} ${f.via_num || ''} # ${f.placa1 || ''} - ${f.placa2 || ''}`.replace(/\s+/g, ' ').trim()
  return f.complemento ? `${base}, ${f.complemento}` : base
}

export default function PropietarioForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const [form, setForm] = useState(VACIO)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [info, setInfo] = useState('')
  const editando = Boolean(id)

  useEffect(() => {
    if (!id) return
    getPropietario(id).then((p) => { if (p) setForm({ ...VACIO, ...p }) })
  }, [id])

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))
  const esJuridica = form.tipo_persona === 'juridica'

  async function grabar() {
    setBusy(true); setMsg('')
    try {
      const payload = { ...form }
      if (!payload.id && empresa?.id) payload.empresa_id = empresa.id
      if (payload.tipo_direccion === 'catastral' && (payload.via_num || payload.placa1 || payload.placa2 || payload.complemento)) {
        payload.direccion = componerDireccion(payload)
      }
      ;['via_tipo', 'via_num', 'placa1', 'placa2', 'complemento'].forEach((k) => delete payload[k])
      await savePropietario(payload)
      navigate('/propietarios')
    } catch (e) {
      setMsg('No se pudo grabar. ' + (e?.message || ''))
      setBusy(false)
    }
  }

  function limpiar() { setForm(editando ? { ...VACIO, id: form.id } : VACIO); setMsg(''); setInfo('') }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={() => navigate('/propietarios')} className="text-sm font-semibold text-brand-500 hover:underline">← Propietarios</button>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-ink">{editando ? 'Editar propietario' : 'Nuevo propietario'}</h1>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de identificación">
            <Select value={form.tipo_identificacion} onChange={(v) => set('tipo_identificacion', v)} options={TIPOS_ID} />
          </Field>
          <Field label="Documento"><input className="input" value={form.documento} onChange={(e) => set('documento', e.target.value)} /></Field>

          <div className="sm:col-span-2 flex flex-wrap gap-5">
            <Radio label="Persona natural" checked={!esJuridica} onChange={() => set('tipo_persona', 'natural')} />
            <Radio label="Persona jurídica" checked={esJuridica} onChange={() => set('tipo_persona', 'juridica')} />
          </div>
          {esJuridica && (
            <Field label="Compañía" className="sm:col-span-2">
              <input className="input" value={form.compania} onChange={(e) => set('compania', e.target.value)} />
            </Field>
          )}

          {!esJuridica && <>
            <Field label="Nombres"><input className="input" value={form.nombres} onChange={(e) => set('nombres', e.target.value)} /></Field>
            <Field label="Apellidos"><input className="input" value={form.apellidos} onChange={(e) => set('apellidos', e.target.value)} /></Field>
          </>}

          <Field label="Teléfono casa"><input className="input" value={form.telefono_casa} onChange={(e) => set('telefono_casa', e.target.value)} /></Field>
          <Field label="Teléfono oficina"><input className="input" value={form.telefono_oficina} onChange={(e) => set('telefono_oficina', e.target.value)} /></Field>
          <Field label="Celular"><input className="input" value={form.celular} onChange={(e) => set('celular', e.target.value)} /></Field>
          <Field label="Correo electrónico"><input type="email" className="input" value={form.correo} onChange={(e) => set('correo', e.target.value)} /></Field>
          <Field label="Correo electrónico alterno"><input type="email" className="input" value={form.correo_alterno} onChange={(e) => set('correo_alterno', e.target.value)} /></Field>
          <Field label="Ciudad"><Select value={form.ciudad} onChange={(v) => set('ciudad', v)} options={CIUDADES} /></Field>
          <Field label="Barrio"><input className="input" value={form.barrio} onChange={(e) => set('barrio', e.target.value)} /></Field>

          {/* Datos bancarios */}
          <Field label="Tipo de cuenta"><Select value={form.tipo_cuenta} onChange={(v) => set('tipo_cuenta', v)} options={CUENTAS} /></Field>
          <Field label="N° de cuenta"><input className="input" value={form.no_cuenta} onChange={(e) => set('no_cuenta', e.target.value)} /></Field>
          <Field label="Banco"><Select value={form.banco} onChange={(v) => set('banco', v)} options={BANCOS} /></Field>

          <div className="sm:col-span-2">
            <button type="button" className="btn-primary" onClick={() => setInfo('La vinculación con vehículos estará disponible cuando creemos el módulo de Vehículos (4.5).')}>
              🔗 Vinculación de vehículos
            </button>
            {info && <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600">{info}</p>}
          </div>

          {/* Dirección */}
          <div className="sm:col-span-2 border-t border-cloud-line pt-4">
            <div className="flex flex-wrap gap-5">
              <Radio label="Nomenclatura catastral" checked={form.tipo_direccion === 'catastral'} onChange={() => set('tipo_direccion', 'catastral')} />
              <Radio label="Tradicional" checked={form.tipo_direccion === 'tradicional'} onChange={() => set('tipo_direccion', 'tradicional')} />
            </div>
            {form.tipo_direccion === 'catastral' ? (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <span className="label">Vía</span>
                    <select className="input w-32" value={form.via_tipo} onChange={(e) => set('via_tipo', e.target.value)}>
                      {TIPOS_VIA.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <input className="input w-20" value={form.via_num} onChange={(e) => set('via_num', e.target.value)} placeholder="9" aria-label="Número de vía" />
                  <span className="pb-2.5 font-bold text-ink-faint">#</span>
                  <input className="input w-20" value={form.placa1} onChange={(e) => set('placa1', e.target.value)} placeholder="34" aria-label="Placa 1" />
                  <span className="pb-2.5 font-bold text-ink-faint">-</span>
                  <input className="input w-20" value={form.placa2} onChange={(e) => set('placa2', e.target.value)} placeholder="56" aria-label="Placa 2" />
                </div>
                <input className="input" value={form.complemento} onChange={(e) => set('complemento', e.target.value)} placeholder="Complemento (ej. Torre 1 Apto 101)" />
                <p className="text-xs text-ink-soft">Vista previa: <span className="font-semibold text-ink">{componerDireccion(form) || '—'}</span></p>
              </div>
            ) : (
              <div className="mt-3">
                <span className="label">Dirección</span>
                <input className="input" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Escribe la dirección completa" />
              </div>
            )}
          </div>

          {/* Estado */}
          <Field label="Estado" className="sm:col-span-2">
            <div className="flex gap-5 pt-1.5">
              <Radio label="Activo" checked={form.estado === 'activo'} onChange={() => set('estado', 'activo')} />
              <Radio label="Inactivo" checked={form.estado === 'inactivo'} onChange={() => set('estado', 'inactivo')} />
            </div>
          </Field>
        </div>
      </div>

      {msg && <p className="rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}

      <div className="flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={grabar} disabled={busy}>{busy ? 'Grabando…' : '💾 Grabar'}</button>
        <button className="btn-ghost" onClick={limpiar} disabled={busy}>Limpiar</button>
        <button className="btn-ghost" onClick={() => navigate('/propietarios')} disabled={busy}>Retornar</button>
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
