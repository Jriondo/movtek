import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listEmpresas, saveEmpresa, deleteEmpresa, slugify, getLogosSistema, saveLogosSistema } from '../lib/db'
import { useAuth } from '../context/AuthContext'
import { useEmpresa } from '../context/EmpresaContext'
import { DIRECCIONES_TERRITORIALES } from '../lib/fuecNumero'
import { extraerColoresDeImagen } from '../lib/imagenColores'
import isoSello from '../assets/iso9001.png'
import mintransporteImg from '../assets/mintransporte.webp'
import supertransporteImg from '../assets/supertransporte.webp'

const VACIO = {
  nombre: '', slug: '', razon_social: '', nit: '', direccion: '', ciudad: '',
  telefonos: '', email: '', resolucion: '', dir_territorial: '', anio_habilitacion: '',
  color_primario: '#10b981', color_acento: '#84cc16', logo_url: '',
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
  const navigate = useNavigate()
  const { esAdmin } = useAuth()
  const { recargarEmpresas, cambiarEmpresa, irAMovtek, empresa: empresaActiva } = useEmpresa()
  const [copiado, setCopiado] = useState('')

  // Ingresar a la plataforma de una empresa (cambia la empresa activa y va al inicio).
  function ingresar(e) { cambiarEmpresa?.(e.id); navigate('/') }
  function volverAMovtek() { irAMovtek?.(); navigate('/') }

  async function copiarLink(link, id) {
    try { await navigator.clipboard.writeText(link); setCopiado(id); setTimeout(() => setCopiado(''), 1800) }
    catch { setCopiado('') }
  }
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(VACIO)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [editando, setEditando] = useState(false)
  const [colorAuto, setColorAuto] = useState(false)

  // Logos del sistema (solo administrador)
  const [sistema, setSistema] = useState({})
  const [sistemaMsg, setSistemaMsg] = useState('')
  const [sistemaBusy, setSistemaBusy] = useState(false)

  async function cargar() { setRows(await listEmpresas().catch(() => [])) }
  useEffect(() => { cargar(); getLogosSistema().then(setSistema).catch(() => {}) }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const slugActual = form.slug || slugify(form.nombre)
  // Solo empresas de transporte en la lista; Movtek es el sistema, no una empresa.
  const empresasTransporte = rows.filter((e) => !(e.es_maestra || e.id === 'movtek' || (e.nombre || '').toLowerCase() === 'movtek'))

  function nuevo() { setForm(VACIO); setEditando(false); setMsg('') }
  function editar(e) { setForm({ ...VACIO, ...e, slug: e.slug || slugify(e.nombre) }); setEditando(true); setMsg(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  async function subirLogo(e, campo) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const uri = await archivoADataUri(file)
      set(campo, uri)
      // Al subir el logo de la empresa, saca los colores del logo automáticamente.
      if (campo === 'logo_url') {
        const col = await extraerColoresDeImagen(uri)
        if (col) { setForm((f) => ({ ...f, logo_url: uri, color_primario: col.primary, color_acento: col.accent })); setColorAuto(true) }
      }
    } catch (err) { setMsg(err.message) }
  }

  // Logos del sistema (ISO / Ministerio / Vigilado) — solo administrador.
  async function subirLogoSistema(e, campo) {
    const file = e.target.files?.[0]
    if (!file) return
    try { const uri = await archivoADataUri(file, 600); setSistema((s) => ({ ...s, [campo]: uri })) }
    catch (err) { setSistemaMsg(err.message) }
  }
  async function guardarSistema() {
    setSistemaBusy(true); setSistemaMsg('')
    try { await saveLogosSistema(sistema); setSistemaMsg('✅ Logos del sistema guardados. Se usarán en todos los FUEC.') }
    catch (err) { setSistemaMsg('No se pudo guardar. ' + (err?.message || '')) } finally { setSistemaBusy(false) }
  }
  function quitarLogoSistema(campo) { setSistema((s) => ({ ...s, [campo]: '' })) }

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Empresas</h1>
          <p className="mt-1 text-sm text-ink-soft">Movtek es el sistema que administra a las empresas. Aquí creas la plataforma de cada una: su logo, su información del FUEC y su link de acceso.</p>
        </div>
        {empresaActiva && !(empresaActiva.es_maestra || empresaActiva.id === 'movtek') && (
          <button className="btn-ghost text-sm" onClick={volverAMovtek}>↩︎ Volver a Movtek (sistema)</button>
        )}
      </div>

      {/* Logos del sistema — solo el administrador los cambia. Se usan en TODOS los FUEC. */}
      <div className="card border-2 border-dashed border-brand-300 p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />🛡️ Logos del sistema (solo administrador)</h2>
        <p className="mb-4 text-xs text-ink-soft">Estos sellos salen en todos los FUEC de todas las empresas. Solo tú (administrador) puedes cambiarlos. Si no subes nada, se usan los que trae la plataforma.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <LogoSistema label="Sello ISO" def={isoSello} val={sistema.iso_url} onFile={(e) => subirLogoSistema(e, 'iso_url')} onQuitar={() => quitarLogoSistema('iso_url')} />
          <LogoSistema label="Ministerio de Transporte" def={mintransporteImg} val={sistema.mintransporte_url} onFile={(e) => subirLogoSistema(e, 'mintransporte_url')} onQuitar={() => quitarLogoSistema('mintransporte_url')} />
          <LogoSistema label="Vigilado SuperTransporte" def={supertransporteImg} val={sistema.vigilado_url} onFile={(e) => subirLogoSistema(e, 'vigilado_url')} onQuitar={() => quitarLogoSistema('vigilado_url')} />
        </div>
        {sistemaMsg && <p className="mt-3 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-600">{sistemaMsg}</p>}
        <div className="mt-4"><button className="btn-primary" onClick={guardarSistema} disabled={sistemaBusy}>{sistemaBusy ? 'Guardando…' : '💾 Guardar logos del sistema'}</button></div>
      </div>

      {/* Formulario */}
      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />{editando ? '✎ Editar empresa' : '➕ Nueva empresa'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la empresa"><input className="input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
          <Field label="Link de acceso (editable)">
            <input className="input" value={`${origin}/e/${slugActual}`} onChange={(e) => set('slug', slugify(e.target.value.split('/e/').pop()))} placeholder={`${origin}/e/mi-empresa`} />
            <p className="mt-1 text-xs text-ink-soft">Este es el link para que la empresa entre a su plataforma. Puedes editar la parte final.</p>
          </Field>
          <Field label="Razón social"><input className="input" value={form.razon_social} onChange={(e) => set('razon_social', e.target.value)} /></Field>
          <Field label="NIT"><input className="input" value={form.nit} onChange={(e) => set('nit', e.target.value)} /></Field>
          <Field label="Dirección"><input className="input" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} /></Field>
          <Field label="Ciudad"><input className="input" value={form.ciudad} onChange={(e) => set('ciudad', e.target.value)} /></Field>
          <Field label="Teléfonos"><input className="input" value={form.telefonos} onChange={(e) => set('telefonos', e.target.value)} /></Field>
          <Field label="Correo"><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>

          {/* Datos para la numeración oficial del FUEC */}
          <div className="sm:col-span-2 mt-1 rounded-xl bg-brand-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-600">Numeración del FUEC (habilitación de la empresa)</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Dirección Territorial (a)">
                <select className="input" value={form.dir_territorial} onChange={(e) => set('dir_territorial', e.target.value)}>
                  <option value="">Seleccione…</option>
                  {DIRECCIONES_TERRITORIALES.map((d) => <option key={d.codigo} value={d.codigo}>{d.nombre} ({d.codigo})</option>)}
                </select>
              </Field>
              <Field label="N° de resolución (b)"><input className="input" value={form.resolucion} onChange={(e) => set('resolucion', e.target.value)} placeholder="Ej: 0155" /></Field>
              <Field label="Año de habilitación (c)"><input className="input" inputMode="numeric" maxLength={4} value={form.anio_habilitacion} onChange={(e) => set('anio_habilitacion', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Ej: 2012" /></Field>
            </div>
            <p className="mt-2 text-xs text-ink-soft">El número del FUEC se arma solo: {form.dir_territorial || 'DT'}·{(form.resolucion || 'RES')}·{form.anio_habilitacion ? form.anio_habilitacion.slice(-2) : 'AA'}·(año actual)·(contrato)·(extracto). El año del extracto y los números de contrato se piden al generar cada FUEC.</p>
          </div>
          <Field label="Logo de la empresa">
            <input type="file" accept="image/*" className="input" onChange={(e) => subirLogo(e, 'logo_url')} />
            {form.logo_url && <img src={form.logo_url} alt="logo" className="mt-2 h-14 object-contain" />}
            <p className="mt-1 text-xs text-ink-soft">Al subir el logo, los colores de la empresa se toman <b>automáticamente</b> del logo.</p>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color principal"><input type="color" className="input h-11 p-1" value={form.color_primario} onChange={(e) => { set('color_primario', e.target.value); setColorAuto(false) }} /></Field>
            <Field label="Color acento"><input type="color" className="input h-11 p-1" value={form.color_acento} onChange={(e) => { set('color_acento', e.target.value); setColorAuto(false) }} /></Field>
            <p className="col-span-2 text-xs text-ink-soft">{colorAuto ? '🎨 Colores tomados del logo. Puedes ajustarlos a mano si quieres.' : 'Se toman del logo al subirlo; también puedes elegirlos a mano.'}</p>
          </div>
          <Field label="Sello ISO">
            <div className="flex items-center gap-3 rounded-xl border border-cloud-line bg-cloud px-3 py-2.5">
              <img src={isoSello} alt="ISO 9001" className="h-10 object-contain" />
              <p className="text-xs text-ink-soft">El sello ISO 9001 se coloca <b>automáticamente</b> en todos los FUEC. No necesitas subirlo.</p>
            </div>
          </Field>
        </div>
        {msg && <p className="mt-3 rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={guardar} disabled={busy}>{busy ? 'Guardando…' : (editando ? '💾 Guardar cambios' : '💾 Crear empresa')}</button>
          {editando && <button className="btn-ghost" onClick={nuevo} disabled={busy}>Cancelar</button>}
        </div>
      </div>

      {/* Lista en tarjetas (solo empresas de transporte; Movtek es el sistema) */}
      <div>
        <h2 className="mb-3 font-display text-sm font-bold text-ink">Empresas de transporte ({empresasTransporte.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {empresasTransporte.map((e) => {
            const color = e.color_primario || '#1d4ed8'
            const slug = e.slug || slugify(e.nombre)
            const link = `${origin}/e/${slug}`
            return (
              <div key={e.id} className="flex flex-col overflow-hidden rounded-2xl border border-cloud-line bg-white shadow-sm transition hover:shadow-md">
                <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    {e.logo_url
                      ? <img src={e.logo_url} alt="" className="h-11 w-11 flex-none rounded-lg border border-cloud-line bg-white object-contain p-0.5" />
                      : <span className="grid h-11 w-11 flex-none place-items-center rounded-lg text-sm font-extrabold text-white" style={{ backgroundColor: color }}>{(e.nombre || '?')[0]?.toUpperCase()}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-extrabold leading-snug text-ink">{e.nombre}</p>
                      {e.nit && <p className="text-xs font-semibold tabular-nums text-ink-soft">NIT {e.nit}</p>}
                    </div>
                  </div>
                  {(e.direccion || e.telefonos) && <p className="truncate text-xs text-ink-soft">{[e.direccion, e.telefonos].filter(Boolean).join(' · ')}</p>}

                  {/* Link de acceso completo + copiar */}
                  <div className="rounded-lg bg-cloud px-2.5 py-2">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink-faint">Link de acceso</p>
                    <div className="flex items-center gap-2">
                      <input readOnly value={link} onFocus={(ev) => ev.target.select()} className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none" />
                      <button className="flex-none rounded-md bg-white px-2 py-1 text-[11px] font-bold text-brand-600 shadow-sm hover:bg-brand-50" onClick={() => copiarLink(link, e.id)}>
                        {copiado === e.id ? '✓ Copiado' : '📋 Copiar'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => ingresar(e)} style={{ backgroundColor: color }}>
                      {empresaActiva?.id === e.id ? '✓ Estás aquí' : '➜ Ingresar'}
                    </button>
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => editar(e)}>✎ Editar</button>
                    <button className="btn-ghost !px-2.5 !py-1.5 text-xs text-coral-500" onClick={() => eliminar(e)}>🗑️</button>
                  </div>
                </div>
              </div>
            )
          })}
          {!empresasTransporte.length && <p className="text-sm text-ink-soft">Aún no has creado ninguna empresa. Usa “Nueva empresa” arriba.</p>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) { return <div><span className="label">{label}</span>{children}</div> }

function LogoSistema({ label, def, val, onFile, onQuitar }) {
  return (
    <div className="rounded-xl border border-cloud-line p-3">
      <p className="mb-2 text-xs font-bold text-ink">{label}</p>
      <div className="mb-2 grid h-16 place-items-center rounded-lg bg-white">
        <img src={val || def} alt={label} className="max-h-14 max-w-full object-contain" />
      </div>
      {val ? (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-mint-600">Personalizado</span>
          <button type="button" className="text-[11px] font-semibold text-coral-500 hover:underline" onClick={onQuitar}>Usar el de la app</button>
        </div>
      ) : <span className="text-[11px] text-ink-faint">Por defecto (de la app)</span>}
      <input type="file" accept="image/*" className="input mt-2 text-xs" onChange={onFile} />
    </div>
  )
}
