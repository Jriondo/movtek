import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTransportadora, saveTransportadora, buscarTransportadoraPorDocumento } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import DocumentoAviso from '../components/DocumentoAviso'

const VACIO = {
  tipo_identificacion: '', documento: '', tipo_persona: 'natural', compania: '',
  nombres: '', apellidos: '', telefono_casa: '', telefono_oficina: '', celular: '', correo: '',
  tipo_direccion: 'catastral', direccion: '', estado: 'activo',
  doc_responsable: '', nombre_responsable: '', resolucion: '',
  via_tipo: 'Calle', via_num: '', placa1: '', placa2: '', complemento: '',
}

const TIPOS_ID = ['Cédula', 'RUC', 'Pasaporte', 'Cédula de extranjería', 'NIT']
const TIPOS_VIA = ['Calle', 'Carrera', 'Avenida', 'Diagonal', 'Transversal', 'Km']
const TABS = ['Datos básicos', 'Datos responsable']

const componerDireccion = (f) => {
  const base = `${f.via_tipo || 'Calle'} ${f.via_num || ''} # ${f.placa1 || ''} - ${f.placa2 || ''}`.replace(/\s+/g, ' ').trim()
  return f.complemento ? `${base}, ${f.complemento}` : base
}

export default function TransportadoraForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(VACIO)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [dup, setDup] = useState(null)
  const editando = Boolean(id)

  useEffect(() => {
    if (!id) return
    getTransportadora(id).then((t) => { if (t) setForm({ ...VACIO, ...t }) })
  }, [id])

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))
  const esJuridica = form.tipo_persona === 'juridica'

  async function verificarDocumento() {
    setDup(null)
    if (!form.documento?.trim()) return
    const t = await buscarTransportadoraPorDocumento({ empresaId: empresa?.id, documento: form.documento })
    if (t && String(t.id) !== String(form.id)) setDup(t)
  }

  async function grabar() {
    setBusy(true); setMsg('')
    try {
      if (!form.id) {
        const t = await buscarTransportadoraPorDocumento({ empresaId: empresa?.id, documento: form.documento })
        if (t) { setDup(t); setMsg('Ya existe una empresa transportadora con ese documento. Edita el registro existente.'); setBusy(false); return }
      }
      const payload = { ...form }
      if (!payload.id && empresa?.id) payload.empresa_id = empresa.id
      if (payload.tipo_direccion === 'catastral' && (payload.via_num || payload.placa1 || payload.placa2 || payload.complemento)) {
        payload.direccion = componerDireccion(payload)
      }
      ;['via_tipo', 'via_num', 'placa1', 'placa2', 'complemento'].forEach((k) => delete payload[k])
      await saveTransportadora(payload)
      navigate('/transportadoras')
    } catch (e) {
      setMsg('No se pudo grabar. ' + (e?.message || ''))
      setBusy(false)
    }
  }

  function limpiar() { setForm(editando ? { ...VACIO, id: form.id } : VACIO); setMsg(''); setDup(null) }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={() => navigate('/transportadoras')} className="text-sm font-semibold text-brand-500 hover:underline">← Empresas transportadoras</button>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-ink">{editando ? 'Editar empresa transportadora' : 'Nueva empresa transportadora'}</h1>
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

      <DocumentoAviso dup={dup} dupLabel="empresa transportadora" onEditarDup={() => navigate(`/transportadoras/${dup.id}`)} />

      <div className="card p-5 sm:p-6">
        {/* ---------- DATOS BÁSICOS ---------- */}
        {tab === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de identificación">
              <select className="input" value={form.tipo_identificacion} onChange={(e) => set('tipo_identificacion', e.target.value)}>
                <option value="">Seleccione…</option>
                {TIPOS_ID.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Documento"><input className="input" value={form.documento} onChange={(e) => set('documento', e.target.value)} onBlur={verificarDocumento} /></Field>

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

            <Field label="Estado" className="sm:col-span-2">
              <div className="flex gap-5 pt-1.5">
                <Radio label="Activo" checked={form.estado === 'activo'} onChange={() => set('estado', 'activo')} />
                <Radio label="Inactivo" checked={form.estado === 'inactivo'} onChange={() => set('estado', 'inactivo')} />
              </div>
            </Field>
          </div>
        )}

        {/* ---------- DATOS RESPONSABLE ---------- */}
        {tab === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Documento responsable N°"><input className="input" value={form.doc_responsable} onChange={(e) => set('doc_responsable', e.target.value)} /></Field>
            <Field label="Nombre responsable"><input className="input" value={form.nombre_responsable} onChange={(e) => set('nombre_responsable', e.target.value)} /></Field>
            <Field label="Resolución" className="sm:col-span-2"><input className="input" value={form.resolucion} onChange={(e) => set('resolucion', e.target.value)} placeholder="N° de resolución / permiso" /></Field>
          </div>
        )}
      </div>

      {msg && <p className="rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}

      <div className="flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={grabar} disabled={busy}>{busy ? 'Grabando…' : '💾 Grabar'}</button>
        <button className="btn-ghost" onClick={limpiar} disabled={busy}>Limpiar</button>
        <button className="btn-ghost" onClick={() => navigate('/transportadoras')} disabled={busy}>Retornar</button>
      </div>
    </div>
  )
}

function Field({ label, children, className = '' }) {
  return <div className={className}><span className="label">{label}</span>{children}</div>
}
function Radio({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
      <input type="radio" className="h-4 w-4 accent-brand-500" checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}
