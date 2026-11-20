import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseAux, isSupabaseConfigured } from '../lib/supabase'
import { getUsuarioPorEmail, conductorRegistrable, saveUsuario, nombreConductor } from '../lib/db'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const DEMO_KEY = 'movtek_demo_user'
const VERCOMO_KEY = 'movtek_ver_como'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rolReal, setRolReal] = useState('admin')       // rol según su usuario registrado
  const [propietarioId, setPropietarioId] = useState(null)
  const [empresaIdUsuario, setEmpresaIdUsuario] = useState(null) // empresa a la que pertenece el usuario
  const [conductorId, setConductorId] = useState(null)   // ficha de conductor (para la app de preoperacional)
  const [sinAcceso, setSinAcceso] = useState(false)     // true si su cuenta no tiene ficha activa
  const [verComo, setVerComoState] = useState(() => { try { return localStorage.getItem(VERCOMO_KEY) || '' } catch { return '' } })

  // Determina el rol del usuario a partir de su correo (si existe en la tabla usuarios).
  // Rol por defecto cuando el usuario no tiene ficha: en demo admin (para probar),
  // en Supabase un rol NO administrativo por seguridad.
  const ROL_DEFECTO = isSupabaseConfigured ? 'propietario' : 'admin'

  async function cargarRol(u) {
    if (!u?.email) { setRolReal(ROL_DEFECTO); setPropietarioId(null); setEmpresaIdUsuario(null); setConductorId(null); setSinAcceso(false); return }
    try {
      const reg = await getUsuarioPorEmail(u.email)
      if (reg && reg.estado !== 'inactivo') {
        setRolReal(reg.rol || 'propietario'); setPropietarioId(reg.propietario_id || null); setEmpresaIdUsuario(reg.empresa_id || null); setConductorId(reg.conductor_id || null); setSinAcceso(false)
      } else if (isSupabaseConfigured) {
        // Con Supabase, sin ficha activa => sin acceso (p. ej. usuario eliminado o inactivado).
        setSinAcceso(true); setRolReal('propietario'); setPropietarioId(null); setEmpresaIdUsuario(null); setConductorId(null)
      } else {
        setSinAcceso(false); setRolReal('admin'); setPropietarioId(null); setEmpresaIdUsuario(null); setConductorId(null) // demo
      }
    } catch {
      // Error de consulta (red/RLS): no bloquear por un fallo temporal.
      setSinAcceso(false); setRolReal(ROL_DEFECTO); setPropietarioId(null); setEmpresaIdUsuario(null); setConductorId(null)
    }
  }

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data }) => {
        const u = data.session?.user ?? null
        setUser(u); cargarRol(u); setLoading(false)
      })
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        const u = session?.user ?? null
        setUser(u); cargarRol(u)
      })
      return () => sub.subscription.unsubscribe()
    } else {
      try {
        const saved = localStorage.getItem(DEMO_KEY)
        if (saved) { const u = JSON.parse(saved); setUser(u); cargarRol(u) }
      } catch {}
      setLoading(false)
    }
  }, [])

  async function login(email, password) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await cargarRol(data.user)
      return data.user
    }
    const demo = { email: email || 'socio@movtek.app', demo: true }
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(demo)) } catch {}
    setUser(demo); await cargarRol(demo)
    return demo
  }

  // Crea la cuenta de acceso (para el autoregistro de propietarios desde el login).
  async function registrar(email, password) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      })
      if (error) throw error
      // Si hay sesión, entra; si no, es porque Supabase pide confirmar el correo.
      if (data.session && data.user) { setUser(data.user); await cargarRol(data.user) }
      return { user: data.user, needsConfirmation: !data.session }
    }
    await login(email, password)
    return { needsConfirmation: false }
  }

  // Crea el acceso (cuenta) de otro usuario y le envía el correo de verificación,
  // SIN cerrar la sesión del administrador (usa un cliente auxiliar).
  async function crearAccesoUsuario(email) {
    if (!isSupabaseConfigured) return { ok: true, demo: true }
    const tempPassword = 'Mv' + Math.random().toString(36).slice(2) + '!A9'
    const { data, error } = await supabaseAux.auth.signUp({
      email, password: tempPassword,
      options: { emailRedirectTo: `${window.location.origin}/nueva-password` },
    })
    // Cierra la sesión auxiliar por si el proyecto no exige confirmación.
    try { await supabaseAux.auth.signOut() } catch {}
    if (error) {
      // Si la cuenta ya existía, enviamos el enlace para que ponga su contraseña.
      if ((error.message || '').toLowerCase().includes('already')) {
        try { await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/nueva-password` }) } catch {}
        return { ok: true, yaExiste: true }
      }
      return { ok: false, error: error.message }
    }
    return { ok: true, needsConfirmation: !data.session }
  }

  // Autoregistro del conductor desde la app: solo si ya existe su ficha Y tiene vehículo activo asignado.
  async function registrarConductor({ empresaId, documento, email, password }) {
    const correoIn = String(email || '').trim()
    if (isSupabaseConfigured) {
      // La validación la hace una función SEGURA en la base (anon no puede leer conductores).
      const { data, error } = await supabase.rpc('registrar_conductor_auto', {
        p_empresa_id: empresaId, p_documento: String(documento || '').trim(), p_email: correoIn,
      })
      if (error) {
        // Si la función aún no existe en la base, avisa claro.
        if (/function .*registrar_conductor_auto.* does not exist|not find/i.test(error.message || '')) {
          return { ok: false, motivo: 'falta-rpc', error: error.message }
        }
        return { ok: false, motivo: 'error', error: error.message }
      }
      if (!data || data.ok === false) return { ok: false, motivo: data?.motivo || 'no-ficha' }
      const correo = data.correo || correoIn
      // Crea la cuenta de acceso (contraseña del conductor).
      const { data: s, error: e2 } = await supabase.auth.signUp({
        email: correo, password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      })
      if (e2 && !(e2.message || '').toLowerCase().includes('already')) {
        return { ok: false, motivo: 'auth', error: e2.message }
      }
      if (s?.session && s?.user) { setUser(s.user); await cargarRol(s.user) }
      return { ok: true, needsConfirmation: !s?.session, email: correo }
    }

    // Modo demo (sin Supabase): validación local.
    const chk = await conductorRegistrable({ empresaId, documento })
    if (!chk.ok) return chk
    const c = chk.conductor
    const correo = String(email || c.correo || '').trim()
    if (!correo) return { ok: false, motivo: 'sin-correo' }
    try {
      await saveUsuario({ empresa_id: empresaId, nombre: nombreConductor(c), email: correo, rol: 'conductor', conductor_id: c.id, estado: 'activo' })
    } catch (e) { return { ok: false, motivo: 'guardar', error: e?.message } }
    const demo = { email: correo, demo: true }
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(demo)) } catch {}
    setUser(demo); await cargarRol(demo)
    return { ok: true, email: correo }
  }

  // Envía el enlace para restablecer la contraseña (olvido de contraseña).
  async function recuperarPassword(email) {
    if (!isSupabaseConfigured) throw new Error('demo: La recuperación de contraseña funciona cuando Supabase está conectado.')
    const redirectTo = `${window.location.origin}/nueva-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }

  // Guarda la nueva contraseña (tras abrir el enlace de recuperación).
  async function actualizarPassword(password) {
    if (!isSupabaseConfigured) throw new Error('demo: Conecta Supabase para cambiar la contraseña.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  async function logout() {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    try { localStorage.removeItem(DEMO_KEY) } catch {}
    setUser(null); setRolReal('admin'); setPropietarioId(null); setEmpresaIdUsuario(null); setConductorId(null); setSinAcceso(false)
  }

  // "Ver como" permite que el admin previsualice la app con otro rol (solo demostración).
  function setVerComo(v) {
    setVerComoState(v || '')
    try { v ? localStorage.setItem(VERCOMO_KEY, v) : localStorage.removeItem(VERCOMO_KEY) } catch {}
  }

  const rol = (rolReal === 'admin' && verComo) ? verComo : rolReal
  const esAdmin = rol === 'admin'
  const esOperativo = rol === 'operativo'
  const esPropietario = rol === 'propietario'
  const esConductor = rol === 'conductor'

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, registrar, registrarConductor, recuperarPassword, actualizarPassword, crearAccesoUsuario, demo: !isSupabaseConfigured,
      rol, rolReal, esAdmin, esOperativo, esPropietario, esConductor, propietarioId, conductorId, empresaIdUsuario, sinAcceso,
      verComo, setVerComo,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
