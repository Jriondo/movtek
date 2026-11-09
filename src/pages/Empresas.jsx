import { useEffect, useState } from 'react'
import { listEmpresas, saveEmpresa, deleteEmpresa, slugify } from '../lib/db'
import { useAuth } from '../context/AuthContext'
import { useEmpresa } from '../context/EmpresaContext'

const VACIO = {
  nombre: '', slug: '', razon_social: '', nit: '', direccion: '', ciudad: '',
  telefonos: '', email: '', resolucion: '', color_primario: '#10b981', color_acento: '#84cc16',
  logo_url: '', iso_url: '',
}

// Convierte un archivo de imagen a data URI (para guardar el logo sin almacenamiento aparte).
function archivoADataUri(file, maxKB = 400) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('')
    if (file.size > maxKB * 1024) return reject(new Error(`La imagen supera ${maxKB} KB. Usa una más liviana.`))
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function Empresas() {
  const { esAdmin } = useAuth()
  const { recargarEmpresas } = useEmpresa()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(VACIO)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [editando, setEditando] = useState(false)

  async function cargar() { setRows(await listEmpresas().catch(() => [])) }
  useEffect(() => { cargar() }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const slugActual = form.slug || slugify(form.nombre)

  function nuevo() { setForm(VACIO); setEditando(false); setMsg('') }
  function editar(e) { setForm({ ...VACIO, ...e, slug: e.slug || slugify(e.nombre) }); setEditando(true); setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  async function subirLogo(e, campo) {
    const file = e.target.files?.[0]
    if (!file) return
    try { set(campo, await archivoADataUri(file)) } catch (err) { setMsg(err.message) }
  }

  async function guardar() {
    setMsg('')
    if (!form.nombre.trim()) { setMsg('Escribe el nombre de la empresa.'); return }
    setBusy(true)
    try {
      await saveEmpresa({ ...form, slug: slugify(slugActual) })
      await cargar(); recargarEmpresas?.()
      nuevo()
    } catch (err) { setMsg('No se pudo guardar. ' + (err?.message || '')) } finally { setBusy(false) }
  }

  async function eliminar(e) {
    if (e.id === 'movtek') { setMsg('No se puede eliminar la plataforma maestra Movtek.'); return }
    if (!window.confirm(`¿Eliminar la empresa ${e.nombre}? Se perderá su configuración.`)) return
    await deleteEmpresa(e.id); await cargar(); recargarEmpresas?.()
  }

  if (!esAdmin) {
    return <div className="card p-8 text-center"><p className="text-sm font-semibold text-ink">Acceso restringido</p><p className="mt-1 text-sm text-ink-soft">Solo el administrador de Movtek gestiona las empresas.</p></div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Empresas</h1>
        <p className="mt-1 text-sm text-ink-soft">Crea la plataforma de cada empresa: su logo, su información del FUEC y su link de acceso.</p>
      </div>

      {/* Formulario */}
      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />{editando ? '✎ Editar empresa' : '➕ Nueva empresa'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la empresa"><input className="input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej. Transmovilisate Express" /></Field>
          <Field label="Link de acceso (editable)">
            <input className="input" value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder="transmovilisate" />
            <p className="mt-1 break-all text-xs text-ink-soft">{origin}/e/<b>{slugActual || '…'}</b></p>
          </Field>
          <Field label="Razón social"><input className="input" value={form.razon_social} onChange={(e) => set('razon_social', e.target.value)} /></Field>
          <Field label="NIT"><input className="input" value={form.nit} onChange={(e) => set('nit', e.target.value)} /></Field>
          <Field label="Dirección"><input className="input" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} /></Field>
          <Field label="Ciudad"><input className="input" value={form.ciudad} onChange={(e) => set('ciudad', e.target.value)} /></Field>
          <Field label="Teléfonos"><input className="input" value={form.telefonos} onChange={(e) => set('telefonos', e.target.value)} /></Field>
          <Field label="Correo"><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Resolución"><input className="input" value={form.resolucion} onChange={(e) => set('resolucion', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color principal"><input type="color" className="input h-11 p-1" value={form.color_primario} onChange={(e) => set('color_primario', e.target.value)} /></Field>
            <Field label="Color acento"><input type="color" className="input h-11 p-1" value={form.color_acento} onChange={(e) => set('color_acento', e.target.value)} /></Field>
          </div>
          <Field label="Logo de la empresa">
            <input type="file" accept="image/*" className="input" onChange={(e) => subirLogo(e, 'logo_url')} />
            {form.logo_url && <img src={form.logo_url} alt="logo" className="mt-2 h-14 object-contain" />}
          </Field>
          <Field label="Sello ISO (opcional)">
            <input type="file" accept="image/*" className="input" onChange={(e) => subirLogo(e, 'iso_url')} />
            {form.iso_url && <img src={form.iso_url} alt="iso" className="mt-2 h-14 object-contain" />}
          </Field>
        </div>
        {msg && <p className="mt-3 rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={guardar} disabled={busy}>{busy ? 'Guardando…' : (editando ? '💾 Guardar cambios' : '💾 Crear empresa')}</button>
          {editando && <button className="btn-ghost" onClick={nuevo} disabled={busy}>Cancelar</button>}
        </div>
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        <div className="border-b border-cloud-line px-4 py-3"><h2 className="font-display text-sm font-bold text-ink">Empresas ({rows.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-cloud-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-3 font-bold">Empresa</th><th className="px-4 py-3 font-bold">Link de acceso</th><th className="px-4 py-3 font-bold">NIT</th><th className="px-4 py-3 font-bold"></th>
            </tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-cloud-line last:border-0 hover:bg-cloud/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {e.logo_url ? <img src={e.logo_url} alt="" className="h-7 w-7 rounded object-contain" /> : <span className="grid h-7 w-7 place-items-center rounded bg-brand-100 text-xs font-bold text-brand-600">{(e.nombre || '?')[0]}</span>}
                      <span className="font-semibold text-ink">{e.nombre}{e.es_maestra || e.id === 'movtek' ? ' · maestra' : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {e.id === 'movtek' ? <span className="text-ink-faint">—</span> : (
                      <a href={`${origin}/e/${e.slug || slugify(e.nombre)}`} target="_blank" rel="noreferrer" className="break-all text-brand-600 hover:underline">/e/{e.slug || slugify(e.nombre)}</a>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">{e.nit || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => editar(e)}>✎ Editar</button>
                      {e.id !== 'movtek' && <button className="btn-ghost !px-2 !py-1.5 text-xs text-coral-500" onClick={() => eliminar(e)}>🗑️</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) { return <div><span className="label">{label}</span>{children}</div> }
