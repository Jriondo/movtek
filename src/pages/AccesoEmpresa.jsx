import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { getEmpresaPorSlug } from '../lib/db'
import { applyTheme } from '../lib/theme'
import { useAuth } from '../context/AuthContext'
import Login from './Login'

// Página de acceso con la marca de cada empresa: movtek.app/e/<slug>
export default function AccesoEmpresa() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [empresa, setEmpresa] = useState(undefined)

  useEffect(() => {
    getEmpresaPorSlug(slug).then((e) => {
      setEmpresa(e || null)
      if (e?.color_primario) applyTheme({ primary: e.color_primario, accent: e.color_acento })
    }).catch(() => setEmpresa(null))
  }, [slug])

  // Si ya tiene sesión, entra a la app.
  if (user) return <Navigate to="/" replace />

  if (empresa === undefined) return <div className="grid min-h-full place-items-center text-ink-faint">Cargando…</div>
  if (empresa === null) return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="text-4xl">🔎</div>
        <h1 className="mt-3 font-display text-xl font-extrabold text-ink">Empresa no encontrada</h1>
        <p className="mt-2 text-sm text-ink-soft">El link “/e/{slug}” no corresponde a ninguna empresa. Verifica la dirección con tu empresa.</p>
      </div>
    </div>
  )

  return <Login marca={empresa} />
}
