import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getUsuarioPorEmail } from '../lib/db'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const DEMO_KEY = 'movtek_demo_user'
const VERCOMO_KEY = 'movtek_ver_como'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rolReal, setRolReal] = useState('admin')       // rol según su usuario registrado
  const [propietarioId, setPropietarioId] = useState(null)
  const [verComo, setVerComoState] = useState(() => { try { return localStorage.getItem(VERCOMO_KEY) || '' } catch { return '' } })

  // Determina el rol del usuario a partir de su correo (si existe en la tabla usuarios).
  // Rol por defecto cuando el usuario no tiene ficha: en demo admin (para probar),
  // en Supabase un rol NO administrativo por seguridad.
  const ROL_DEFECTO = isSupabaseConfigured ? 'propietario' : 'admin'

  async function cargarRol(u) {
    if (!u?.email) { setRolReal(ROL_DEFECTO); setPropietarioId(null); return }
    try {
      const reg = await getUsuarioPorEmail(u.email)
      if (reg) { setRolReal(reg.rol || 'propietario'); setPropietarioId(reg.propietario_id || null) }
      else { setRolReal(ROL_DEFECTO); setPropietarioId(null) }
    } catch { setRolReal(ROL_DEFECTO); setPropietarioId(null) }
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
    setUser(null); setRolReal('admin'); setPropietarioId(null)
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

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, registrar, recuperarPassword, actualizarPassword, demo: !isSupabaseConfigured,
      rol, rolReal, esAdmin, esOperativo, esPropietario, propietarioId,
      verComo, setVerComo,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
