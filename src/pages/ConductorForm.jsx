import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getConductor, saveConductor } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'

const VACIO = {
  tipo_identificacion: '', documento: '', nombres: '', apellidos: '',
  telefono_casa: '', whatsapp: '', celular: '', ciudad: '', fecha_nacimiento: '', rh: '', genero: '',
  telefono_emergencia: '', tipo_direccion: 'catastral', direccion: '',
  licencia_numero: '', licencia_vencimiento: '', categoria_licencia: '', correo: '', estado_habilitacion: 'activo',
  no_planilla: '', salario_base: '', vigencia_seguridad: '', fecha_ingreso_eps: '', tipo_cotizante: '',
  eps: '', arl: '', afp: '', ccf: '', tipo_cuenta: '', no_cuenta: '', banco: '',
  existen_comparendos: 'NO', ultima_revision_comparendos: '',
  via_tipo: 'Calle', via_num: '', placa1: '', placa2: '', complemento: '',
}

const TIPOS_ID = ['Cédula', 'Cédula de extranjería', 'Pasaporte', 'NIT']
const CIUDADES = ['Guayaquil', 'Quito', 'Cuenca', 'Manta', 'Durán', 'Machala', 'Ambato', 'Loja']
const RH = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
const GENEROS = ['Masculino', 'Femenino', 'Otro']
const CATEGORIAS = ['A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']
const COTIZANTE = ['Dependiente', 'Independiente']
const EPS = ['Sura', 'Sanitas', 'Nueva EPS', 'Compensar', 'Coomeva', 'Salud Total']
const ARL = ['Sura', 'Positiva', 'Colmena', 'Bolívar']
const AFP = ['Porvenir', 'Protección', 'Colfondos', 'Colpensiones']
const CCF = ['Compensar', 'Colsubsidio', 'Cafam']
const BANCOS = ['Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogotá', 'Nequi']
const CUENTAS = ['Ahorros', 'Corriente']
const TIPOS_VIA = ['Calle', 'Carrera', 'Avenida', 'Diagonal', 'Transversal', 'Km']
const TABS = ['Datos básicos', 'Documentos', 'Datos adicionales']

const componerDireccion = (f) => {
  const base = `${f.via_tipo || 'Calle'} ${f.via_num || ''} # ${f.placa1 || ''} - ${f.placa2 || ''}`.replace(/\s+/g, ' ').trim()
  return f.complemento ? `${base}, ${f.complemento}` : base
}

export default function ConductorForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(VACIO)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const editando = Boolean(id)

  useEffect(() => {
    if (!id) return
    getConductor(id).then((c) => { if (c) setForm({ ...VACIO, ...c }) })
  }, [id])

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  async function grabar() {
    setBusy(true); setMsg('')
    try {
      const payload = { ...form }
      if (!payload.id && empresa?.id) payload.empresa_id = empresa.id
      if (payload.tipo_direccion === 'catastral' && (payload.via_num || payload.placa1 || payload.placa2 || payload.complemento)) {
        payload.direccion = componerDireccion(payload)
      }
      ;['via_tipo', 'via_num', 'placa1', 'placa2', 'complemento'].forEach((k) => delete payload[k])
      await saveConductor(payload)
      navigate('/conductores')
    } catch (e) {
      setMsg('No se pudo grabar. ' + (e?.message || ''))
      setBusy(false)
    }
  }

  function limpiar() {
    setForm(editando ? { ...VACIO, id: form.id } : VACIO)
    setMsg('')
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={() => navigate('/conductores')} className="text-sm font-semibold text-brand-500 hover:underline">← Conductores</button>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-ink">{editando ? 'Editar conductor' : 'Nuevo conductor'}</h1>
        {(form.nombres || form.apellidos || form.documento) && (
          <p className="mt-0.5 text-sm text-ink-soft">
            {`${form.nombres} ${form.apellidos}`.trim()}{form.documento ? ` · ${form.documento}` : ''}
          </p>
        )}
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 rounded-xl bg-cloud p-1">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${tab === i ? 'bg-white text-brand-600 shadow-card' : 'text-ink-soft hover:text-ink'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="card p-5 sm:p-6">
        {/* ---------- DATOS BÁSICOS ---------- */}
        {tab === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de identificación">
              <Select value={form.tipo_identificacion} onChange={(v) => set('tipo_identificacion', v)} options={TIPOS_ID} />
            </Field>
            <Field label="Documento"><input className="input" value={form.documento} onChange={(e) => set('documento', e.target.value)} /></Field>
            <Field label="Nombres"><input className="input" value={form.nombres} onChange={(e) => set('nombres', e.target.value)} /></Field>
            <Field label="Apellidos"><input className="input" value={form.apellidos} onChange={(e) => set('apellidos', e.target.value)} /></Field>
            <Field label="Teléfono casa"><input className="input" value={form.telefono_casa} onChange={(e) => set('telefono_casa', e.target.value)} /></Field>
            <Field label="WhatsApp"><input className="input" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
            <Field label="Celular"><input className="input" value={form.celular} onChange={(e) => set('celular', e.target.value)} /></Field>
            <Field label="Ciudad"><Select value={form.ciudad} onChange={(v) => set('ciudad', v)} options={CIUDADES} /></Field>
            <Field label="Fecha de nacimiento"><input type="date" className="input" value={form.fecha_nacimiento} onChange={(e) => set('fecha_nacimiento', e.target.value)} /></Field>
            <Field label="RH (tipo de sangre)"><Select value={form.rh} onChange={(v) => set('rh', v)} options={RH} /></Field>
            <Field label="Género"><Select value={form.genero} onChange={(v) => set('genero', v)} options={GENEROS} /></Field>
            <Field label="Teléfono en caso de emergencia"><input className="input" value={form.telefono_emergencia} onChange={(e) => set('telefono_emergencia', e.target.value)} /></Field>

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
          </div>
        )}

        {/* ---------- DOCUMENTOS ---------- */}
        {tab === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Licencia número"><input className="input" value={form.licencia_numero} onChange={(e) => set('licencia_numero', e.target.value)} /></Field>
            <Field label="Fecha de vencimiento"><input type="date" className="input" value={form.licencia_vencimiento} onChange={(e) => set('licencia_vencimiento', e.target.value)} /></Field>
            <Field label="Categoría de licencia"><Select value={form.categoria_licencia} onChange={(v) => set('categoria_licencia', v)} options={CATEGORIAS} /></Field>
            <Field label="Correo electrónico"><input type="email" className="input" value={form.correo} onChange={(e) => set('correo', e.target.value)} /></Field>
            <Field label="Estado de habilitación">
              <div className="flex gap-5 pt-1.5">
                <Radio label="Activo" checked={form.estado_habilitacion === 'activo'} onChange={() => set('estado_habilitacion', 'activo')} />
                <Radio label="Inactivo" checked={form.estado_habilitacion === 'inactivo'} onChange={() => set('estado_habilitacion', 'inactivo')} />
              </div>
            </Field>
          </div>
        )}

        {/* ---------- DATOS ADICIONALES ---------- */}
        {tab === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="N° de planilla"><input className="input" value={form.no_planilla} onChange={(e) => set('no_planilla', e.target.value)} /></Field>
            <Field label="Salario base"><input className="input" value={form.salario_base} onChange={(e) => set('salario_base', e.target.value)} /></Field>
            <Field label="Vigencia seguridad"><input type="date" className="input" value={form.vigencia_seguridad} onChange={(e) => set('vigencia_seguridad', e.target.value)} /></Field>
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
        )}
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
