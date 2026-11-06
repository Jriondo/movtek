import { createClient } from '@supabase/supabase-js'

// Lee las credenciales desde variables de entorno (.env).
// La "anon key" está pensada para usarse en el frontend: es pública y segura.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si todavía no has conectado Supabase, la app funciona en "modo demo".
export const isSupabaseConfigured = Boolean(url && key)
export const supabase = isSupabaseConfigured ? createClient(url, key) : null
