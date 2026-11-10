import { useEffect, useMemo, useState } from 'react'
import { listUsuarios, saveUsuario, deleteUsuario, listPropietarios, nombrePropietario, ROLES, rolLabel, registrarCambio } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'

const VACIO = { id: null, rol: 'operativo', nombre: '', email: '', propietario_id: '', estado: 'activo' }

export default function Usuarios() {
  const { empresa, empresas } = useEmpresa()
  const { esAdmin, crearAccesoUsuario } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [propietarios, setPropietarios] = useState([])
  const [form, setForm] = useState(VACIO)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')

  // Movtek es el sistema: ahí se ven los superadministradores. Dentro de una empresa, sus usuarios.
  const esMovtek = !empresa || empresa.es_maestra || empresa.id === 'movtek'
  const editando = !!form.id
  const esProp = form.rol === 'propietario'

  async function cargar() {
    const todos = await listUsuarios().catch(() => [])
    // Cada empresa ve SOLO sus usuarios; Movtek (sistema) ve solo a los administradores.
    const propios = esMovtek
      ? todos.filter((u) => u.rol === 'admin' || !u.empresa_id)
      : todos.filter((u) => String(u.empresa_id) === String(empresa.id))
    setUsuarios(dedupPorCorreo(propios))
    setPropietarios(await listPropietarios({ empresaId: empresa?.id, estado: 'activo' }).catch(() => []))
  }
  useEffect(() => { cargar(); setForm((f) => ({ ...VACIO, rol: esMovtek ? 'admin' : 'operativo' })) }, [empresa?.id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Propietarios que ya tienen usuario (para marcarlos).
  const propConUsuario = useMemo(() => new Set(usuarios.filter((u) => u.propietario_id).map((u) => String(u.propietario_id))), [usuarios])

  function elegirPropietario(id) {
    const p = propietarios.find((x) => String(x.id) === String(id))
    setForm((f) => ({ ...f, propietario_id: id, nombre: p ? nombrePropietario(p) : f.nombre, email: p?.correo || f.email }))
  }

  function nuevo() { setForm({ ...VACIO, rol: esMovtek ? 'admin' : 'operativo' }); setMsg(''); setOk('') }
  function editar(u) {
    setForm({ id: u.id, rol: u.rol || 'operativo', nombre: u.nombre || '', email: u.email || '', propietario_id: u.propietario_id || '', estado: u.estado || 'activo' })
    setMsg(''); setOk(''); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function guardar() {
    setMsg(''); setOk('')
    if (!form.nombre.trim() || !form.email.trim()) { setMsg('Completa el nombre y el correo.'); return }
    if (esProp && !form.propietario_id) { setMsg('Selecciona el propietario al que pertenece este usuario.'); return }
    setBusy(true)
    try {
      // La empresa del usuario es la empresa activa (en Movtek, administrador del sistema).
      const payload = { ...form, empresa_id: esMovtek ? null : empresa.id }
      if (form.rol === 'admin') payload.empresa_id = null
      if (!esProp) payload.propietario_id = null
      const esNuevo = !form.id
      await saveUsuario(payload)
      // Al CREAR, se le envía el correo de verificación para que ponga su contraseña.
      if (esNuevo) {
        const res = await crearAccesoUsuario(payload.email)
        if (res?.demo) setOk('✅ Usuario creado. (En modo demo no se envían correos; con Supabase le llegará la verificación.)')
        else if (res?.ok) setOk(`✅ Usuario creado. Le enviamos un correo a ${payload.email} para verificar su cuenta y crear su contraseña.`)
        else setOk(`✅ Usuario creado, pero no se pudo enviar el correo (${res?.error || 'revisa Supabase'}). Puede usar “¿Olvidaste tu contraseña?” para activarlo.`)
      } else {
        setOk('✅ Cambios guardados.')
      }
      nuevo(); await cargar()
    } catch (e) { setMsg('No se pudo guardar. ' + (e?.message || '')) } finally { setBusy(false) }
  }

  async function eliminar(u) {
    if (!window.confirm(`¿Eliminar el usuario ${u.nombre || u.email}?`)) return
    // Borra TODAS las filas con el mismo correo (por si quedaron duplicadas).
    const todos = await listUsuarios().catch(() => [])
    const mismos = todos.filter((x) => (x.email || '').toLowerCase() === (u.email || '').toLowerCase())
    registrarCambio({ accion: 'eliminar', entidad: 'Usuario', descripcion: `${u.nombre || ''} (${u.email || ''})`, empresa_id: u.empresa_id })
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
        <p className="mt-1 text-sm text-ink-soft">
          {esMovtek
            ? 'Estás en Movtek (sistema): aquí ves a los administradores. Para gestionar los usuarios de una empresa, ingresa a ella desde el módulo Empresas.'
            : <>Usuarios de <b>{empresa.nombre}</b>. Cada empresa tiene sus propios accesos.</>}
        </p>
      </div>

      {/* Crear / editar usuario */}
      <div className="card p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />{editando ? '✎ Editar usuario' : '➕ Crear usuario'}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rol">
            <select className="input" value={form.rol} onChange={(e) => set('rol', e.target.value)}>
              {ROLES.filter((r) => esMovtek ? r.value === 'admin' : r.value !== 'admin').map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-ink-soft">{descripcionRol(form.rol)}</p>
          </Field>
          <Field label="Empresa">
            <input className="input bg-cloud" value={esMovtek ? 'Movtek (sistema)' : empresa.nombre} readOnly />
            <p className="mt-1 text-xs text-ink-soft">El usuario pertenece a esta empresa y solo trabaja dentro de ella.</p>
          </Field>
          {esProp && (
            <Field label="Propietario">
              <select className="input" value={form.propietario_id} onChange={(e) => elegirPropietario(e.target.value)}>
                <option value="">Selecciona el propietario…</option>
                {propietarios.map((p) => (
                  <option key={p.id} value={p.id} disabled={propConUsuario.has(String(p.id)) && String(p.id) !== String(form.propietario_id)}>
                    {nombrePropietario(p)}{p.documento ? ` · ${p.documento}` : ''}{propConUsuario.has(String(p.id)) ? ' (ya tiene usuario)' : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Nombre"><input className="input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
          <Field label="Correo (usuario de acceso)"><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="correo@ejemplo.com" disabled={editando} /></Field>
        </div>
        {ok && <p className="mt-3 rounded-xl bg-mint-500/15 px-4 py-2.5 text-sm font-medium text-mint-600">{ok}</p>}
        {msg && <p className="mt-3 rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={guardar} disabled={busy}>{busy ? 'Guardando…' : (editando ? '💾 Guardar cambios' : '💾 Crear usuario')}</button>
          {editando && <button className="btn-ghost" onClick={nuevo} disabled={busy}>Cancelar</button>}
        </div>
        <p className="mt-2 text-xs text-ink-faint">Al crear el usuario, le llega un correo de verificación para activar su cuenta y crear su propia contraseña.</p>
      </div>

      {/* Usuarios existentes */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-cloud-line px-4 py-3">
          <h2 className="font-display text-sm font-bold text-ink">{esMovtek ? 'Administradores' : `Usuarios de ${empresa.nombre}`} ({usuarios.length})</h2>
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
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => editar(u)}>✎ Editar</button>
                      <button className="btn-ghost !px-2 !py-1.5 text-xs text-coral-500" onClick={() => eliminar(u)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!usuarios.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-soft">Aún no hay usuarios en esta empresa.</td></tr>}
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
