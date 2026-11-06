import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const DEMO_KEY = 'movtek_demo_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSupabaseConfigured) {
      // Sesión real de Supabase
      supabase.auth.getSession().then(({ data }) => {
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ?? null)
      })
      return () => sub.subscription.unsubscribe()
    } else {
      // Modo demo: recordamos al usuario en el navegador
      try {
        const saved = localStorage.getItem(DEMO_KEY)
        if (saved) setUser(JSON.parse(saved))
      } catch {}
      setLoading(false)
    }
  }, [])

  async function login(email, password) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data.user
    }
    // Modo demo: cualquier credencial entra
    const demo = { email: email || 'socio@movtek.app', demo: true }
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(demo)) } catch {}
    setUser(demo)
    return demo
  }

  async function logout() {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    try { localStorage.removeItem(DEMO_KEY) } catch {}
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, demo: !isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}
