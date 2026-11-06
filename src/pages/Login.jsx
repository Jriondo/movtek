import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function Login() {
  const { login, demo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      setError('No pudimos iniciar sesión. Revisa tu correo y contraseña.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-mint-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo light />
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            Tu cooperativa,<br />en la palma de tu mano.
          </h1>
          <p className="mt-4 max-w-sm text-white/80">
            Unidades, aportes, seguros y avisos — todo en un solo lugar, simple y al día.
          </p>
        </div>
        <p className="text-sm text-white/60">Movtek · Transporte Conectado</p>
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-mint-400/30 blur-2xl" />
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="font-display text-2xl font-extrabold text-ink">Bienvenido 👋</h2>
          <p className="mt-1 text-sm text-ink-soft">Ingresa a tu cuenta para continuar.</p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="email">Correo o N° de socio</label>
              <input id="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com" autoComplete="username" required />
            </div>
            <div>
              <label className="label" htmlFor="password">Contraseña</label>
              <input id="password" type="password" className="input" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
            </div>
            {error && <p className="rounded-lg bg-coral-400/15 px-3 py-2 text-sm font-medium text-coral-500">{error}</p>}
            <button className="btn-primary mt-1 w-full" disabled={busy}>
              {busy ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          {demo && (
            <p className="mt-5 rounded-xl border border-dashed border-cloud-line bg-cloud px-3 py-2.5 text-xs text-ink-soft">
              ⚙️ <b>Modo demo:</b> aún no conectas Supabase, así que cualquier correo y contraseña ingresan. Al conectar tu base de datos, el login será real.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
