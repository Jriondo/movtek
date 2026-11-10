import { useEffect, useMemo, useState } from 'react'
import { listUsuarios, saveUsuario, deleteUsuario, listPropietarios, nombrePropietario, ROLES, rolLabel } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'

const VACIO = { rol: 'operativo', nombre: '', email: '', propietario_id: '', empresa_id: '', estado: 'activo' }

export default function Usuarios() {
  const { empresa, empresas } = useEmpresa()
  const { esAdmin } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [propietarios, setPropietarios] = useState([])
  const [form, setForm] = useState({ ...VACIO, empresa_id: empresa?.id || '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  // Empresas reales (sin la maestra Movtek) a las que se puede asignar un usuario.
  const empresasAsignables = (empresas || []).filter((e) => e.id !== 'movtek' && !e.es_maestra)
  const esProp = form.rol === 'propietario'
  // La empresa efectiva: la elegida en el formulario, o la activa.
  const empresaSel = form.empresa_id || empresa?.id || ''

  async function cargar() {
    // El admin ve TODOS los usuarios del sistema (sin filtrar por empresa),
    // para que no se "escondan" los creados bajo otra empresa.
    const todos = await listUsuarios().catch(() => [])
    setUsuarios(dedupPorCorreo(todos))
    // Los propietarios disponibles son los de la empresa seleccionada en el formulario.
    setPropietarios(await listPropietarios({ empresaId: empresaSel, estado: 'activo' }).catch(() => []))
  }
  useEffect(() => { cargar() }, [empresaSel])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Propietarios que ya tienen usuario (para marcarlos).
  const propConUsuario = useMemo(() => new Set(usuarios.filter((u) => u.propietario_id).map((u) => String(u.propietario_id))), [usuarios])

  function elegirPropietario(id) {
    const p = propietarios.find((x) => String(x.id) === String(id))
    setForm((f) => ({ ...f, propietario_id: id, nombre: p ? nombrePropietario(p) : f.nombre, email: p?.correo || f.email, empresa_id: p?.empresa_id || f.empresa_id }))
  }

  async function crear() {
    setMsg('')
    if (!form.nombre.trim() || !form.email.trim()) { setMsg('Completa el nombre y el correo.'); return }
    const esAdminRol = form.rol === 'admin'
    if (!esAdminRol && !empresaSel) { setMsg('Selecciona la empresa a la que pertenece este usuario.'); return }
    if (esProp && !form.propietario_id) { setMsg('Selecciona el propietario al que pertenece este usuario.'); return }
    setBusy(true)
    try {
      // El admin (Movtek) no pertenece a una empresa; los demás quedan fijados a su empresa.
      const payload = { ...form, empresa_id: esAdminRol ? null : empresaSel }
      if (!esProp) payload.propietario_id = null
      await saveUsuario(payload)
      setForm({ ...VACIO, empresa_id: empresaSel }); await cargar()
    } catch (e) { setMsg('No se pudo crear. ' + (e?.message || '')) } finally { setBusy(false) }
  }

  async function eliminar(u) {
    if (!window.confirm(`¿Eliminar el usuario ${u.nombre || u.email}?`)) return
    // Borra TODAS las filas con el mismo correo (por si quedaron duplicadas).
    const todos = await listUsuarios().catch(() => [])
    const mismos = todos.filter((x) => (x.email || '').toLowerCase() === (u.email || '').toLowerCase())
    for (const x of (mismos.length ? mismos : [u])) { await deleteUsuario(x.id).catch(() => {}) }
    cargar()
  }

  // Quita la duplicación: una fila por correo, conservando la de mayor rango (admin > operativo > propietario) y activa.
  async function limpiarDuplicados() {
    const todos = await listUsuarios().catch(() => [])
    const porCorreo = {}
    for (const u of todos) { const k = (u.email || '').toLowerCase(); (porCorreo[k] = porCorreo[k] || []).push(u) }
    let borrados = 0
    for (const k of Object.keys(porCorreo)) {
      const grupo = porCorreo[k]
      if (grupo.length < 2) continue
      const peso = (u) => (u.rol === 'admin' ? 3 : u.rol === 'operativo' ? 2 : 1) + (u.estado !== 'inactivo' ? 0.5 : 0)
      const ordenado = [...grupo].sort((a, b) => peso(b) - peso(a))
      for (const x of ordenado.slice(1)) { await deleteUsuario(x.id).catch(() => {}); borrados++ }
    }
    setMsg(borrados ? `✅ Se quitaron ${borrados} usuario(s) duplicado(s).` : 'No había usuarios duplicados.')
    cargar()
  }

  if (!esAdmin) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-semibold text-ink">Acceso restringido</p>
        <p className="mt-1 text-sm text-ink-soft">Solo el administrador puede gestionar los usuarios.</p>
      </div>
    )
  }

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
          {form.rol !== 'admin' && (
            <Field label="Empresa">
              <select className="input" value={empresaSel} onChange={(e) => set('empresa_id', e.target.value)}>
                <option value="">Selecciona la empresa…</option>
                {empresasAsignables.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <p className="mt-1 text-xs text-ink-soft">El usuario solo verá y trabajará dentro de esta empresa.</p>
            </Field>
          )}
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
        <div className="flex items-center justify-between border-b border-cloud-line px-4 py-3">
          <h2 className="font-display text-sm font-bold text-ink">Usuarios del sistema ({usuarios.length})</h2>
          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={limpiarDuplicados}>🧹 Quitar duplicados</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-cloud-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-3 font-bold">Nombre</th><th className="px-4 py-3 font-bold">Correo</th><th className="px-4 py-3 font-bold">Rol</th><th className="px-4 py-3 font-bold">Empresa</th><th className="px-4 py-3 font-bold">Propietario</th><th className="px-4 py-3 font-bold"></th>
            </tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-cloud-line last:border-0 hover:bg-cloud/60">
                  <td className="px-4 py-3 font-semibold text-ink">{u.nombre || '—'}</td>
                  <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-4 py-3"><span className="pill bg-brand-50 text-brand-600">{u.rol === 'admin' ? 'Superadministrador' : rolLabel(u.rol)}</span></td>
                  <td className="px-4 py-3 text-ink-soft">{u.rol === 'admin' ? 'Movtek (sistema)' : (empresas.find((e) => e.id === u.empresa_id)?.nombre || '—')}</td>
                  <td className="px-4 py-3 text-ink-soft">{u.propietario_id ? (propietarios.find((p) => String(p.id) === String(u.propietario_id)) ? nombrePropietario(propietarios.find((p) => String(p.id) === String(u.propietario_id))) : 'Propietario') : '—'}</td>
                  <td className="px-4 py-3 text-right"><button className="btn-ghost !px-2 !py-1.5 text-xs text-coral-500" onClick={() => eliminar(u)}>🗑️</button></td>
                </tr>
              ))}
              {!usuarios.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-soft">Aún no hay usuarios.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

// Una fila por correo (conserva la de mayor rango y activa).
function dedupPorCorreo(lista) {
  const peso = (u) => (u.rol === 'admin' ? 3 : u.rol === 'operativo' ? 2 : 1) + (u.estado !== 'inactivo' ? 0.5 : 0)
  const porCorreo = {}
  for (const u of lista) {
    const k = (u.email || u.id || '').toLowerCase()
    if (!porCorreo[k] || peso(u) > peso(porCorreo[k])) porCorreo[k] = u
  }
  return Object.values(porCorreo)
}

function descripcionRol(rol) {
  if (rol === 'admin') return 'Acceso total. Puede crear y gestionar usuarios.'
  if (rol === 'operativo') return 'Crea y edita toda la información, pero no gestiona usuarios.'
  return 'Solo ve su vehículo y conductores, crea FUEC con sus vehículos y edita sus datos.'
}

function Field({ label, children }) {
  return <div><span className="label">{label}</span>{children}</div>
}
