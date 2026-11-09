import { useEffect, useMemo, useState } from 'react'
import { listUsuarios, saveUsuario, deleteUsuario, listPropietarios, nombrePropietario, ROLES, rolLabel } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'

const VACIO = { rol: 'operativo', nombre: '', email: '', propietario_id: '', estado: 'activo' }

export default function Usuarios() {
  const { empresa } = useEmpresa()
  const { esAdmin } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [propietarios, setPropietarios] = useState([])
  const [form, setForm] = useState(VACIO)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function cargar() {
    // El admin ve TODOS los usuarios del sistema (sin filtrar por empresa),
    // para que no se "escondan" los creados bajo otra empresa.
    setUsuarios(await listUsuarios().catch(() => []))
    setPropietarios(await listPropietarios({ empresaId: empresa?.id, estado: 'activo' }).catch(() => []))
  }
  useEffect(() => { cargar() }, [empresa?.id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const esProp = form.rol === 'propietario'

  // Propietarios que ya tienen usuario (para marcarlos).
  const propConUsuario = useMemo(() => new Set(usuarios.filter((u) => u.propietario_id).map((u) => String(u.propietario_id))), [usuarios])

  function elegirPropietario(id) {
    const p = propietarios.find((x) => String(x.id) === String(id))
    setForm((f) => ({ ...f, propietario_id: id, nombre: p ? nombrePropietario(p) : f.nombre, email: p?.correo || f.email }))
  }

  async function crear() {
    setMsg('')
    if (!form.nombre.trim() || !form.email.trim()) { setMsg('Completa el nombre y el correo.'); return }
    if (esProp && !form.propietario_id) { setMsg('Selecciona el propietario al que pertenece este usuario.'); return }
    setBusy(true)
    try {
      const payload = { ...form, empresa_id: empresa?.id }
      if (!esProp) payload.propietario_id = null
      await saveUsuario(payload)
      setForm(VACIO); await cargar()
    } catch (e) { setMsg('No se pudo crear. ' + (e?.message || '')) } finally { setBusy(false) }
  }

  async function eliminar(u) {
    if (!window.confirm(`¿Eliminar el usuario ${u.nombre || u.email}?`)) return
    await deleteUsuario(u.id); cargar()
  }

  if (!esAdmin) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-semibold text-ink">Acceso restringido</p>
        <p className="mt-1 text-sm text-ink-soft">Solo el administrador puede gestionar los usuarios.</p>
      </div>
    )
  }

  const propSinUsuario = propietarios.filter((p) => !propConUsuario.has(String(p.id)))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Usuarios y roles</h1>
        <p className="mt-1 text-sm text-ink-soft">Crea los accesos y define qué puede hacer cada persona.</p>
      </div>

      {/* Crear usuario */}
      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />➕ Crear usuario</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rol">
            <select className="input" value={form.rol} onChange={(e) => set('rol', e.target.value)}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-ink-soft">{descripcionRol(form.rol)}</p>
          </Field>
          {esProp && (
            <Field label="Propietario">
              <select className="input" value={form.propietario_id} onChange={(e) => elegirPropietario(e.target.value)}>
                <option value="">Selecciona el propietario…</option>
                {propietarios.map((p) => (
                  <option key={p.id} value={p.id} disabled={propConUsuario.has(String(p.id))}>
                    {nombrePropietario(p)}{p.documento ? ` · ${p.documento}` : ''}{propConUsuario.has(String(p.id)) ? ' (ya tiene usuario)' : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Nombre"><input className="input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
          <Field label="Correo (usuario de acceso)"><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="correo@ejemplo.com" /></Field>
        </div>
        {msg && <p className="mt-3 rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}
        <div className="mt-4"><button className="btn-primary" onClick={crear} disabled={busy}>{busy ? 'Creando…' : '💾 Crear usuario'}</button></div>
        <p className="mt-2 text-xs text-ink-faint">El correo es el que usará la persona para iniciar sesión. Con Supabase, además debe existir la cuenta de acceso con ese mismo correo.</p>
      </div>

      {/* Usuarios existentes */}
      <div className="card overflow-hidden">
        <div className="border-b border-cloud-line px-4 py-3"><h2 className="font-display text-sm font-bold text-ink">Usuarios del sistema ({usuarios.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-cloud-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-3 font-bold">Nombre</th><th className="px-4 py-3 font-bold">Correo</th><th className="px-4 py-3 font-bold">Rol</th><th className="px-4 py-3 font-bold">Propietario</th><th className="px-4 py-3 font-bold"></th>
            </tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-cloud-line last:border-0 hover:bg-cloud/60">
                  <td className="px-4 py-3 font-semibold text-ink">{u.nombre || '—'}</td>
                  <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-4 py-3"><span className="pill bg-brand-50 text-brand-600">{rolLabel(u.rol)}</span></td>
                  <td className="px-4 py-3 text-ink-soft">{u.propietario_id ? (propietarios.find((p) => String(p.id) === String(u.propietario_id)) ? nombrePropietario(propietarios.find((p) => String(p.id) === String(u.propietario_id))) : 'Propietario') : '—'}</td>
                  <td className="px-4 py-3 text-right"><button className="btn-ghost !px-2 !py-1.5 text-xs text-coral-500" onClick={() => eliminar(u)}>🗑️</button></td>
                </tr>
              ))}
              {!usuarios.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-soft">Aún no hay usuarios.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Propietarios sin usuario */}
      <div className="card p-5">
        <h2 className="mb-1 font-display text-sm font-bold text-ink">Propietarios sin usuario ({propSinUsuario.length})</h2>
        <p className="mb-3 text-xs text-ink-soft">Cada propietario ya registrado puede crear su propio usuario desde el login (opción “Crear usuario”), sin que tú lo apruebes. Aquí puedes crearlo manualmente si lo prefieres.</p>
        {propSinUsuario.length === 0 ? (
          <p className="text-sm text-ink-soft">Todos los propietarios activos ya tienen su usuario. ✅</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {propSinUsuario.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-cloud px-3 py-2 text-sm">
                <span className="font-semibold text-ink">{nombrePropietario(p)}{p.documento ? ` · ${p.documento}` : ''}</span>
                <button className="btn-accent !px-3 !py-1.5 text-xs" onClick={() => { setForm({ ...VACIO, rol: 'propietario' }); elegirPropietario(p.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>+ Crear su usuario</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function descripcionRol(rol) {
  if (rol === 'admin') return 'Acceso total. Puede crear y gestionar usuarios.'
  if (rol === 'operativo') return 'Crea y edita toda la información, pero no gestiona usuarios.'
  return 'Solo ve su vehículo y conductores, crea FUEC con sus vehículos y edita sus datos.'
}

function Field({ label, children }) {
  return <div><span className="label">{label}</span>{children}</div>
}
