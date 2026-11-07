import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function NuevaPassword() {
  const { actualizarPassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return }
    setBusy(true)
    try {
      await actualizarPassword(password)
      setOk(true)
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError((err?.message || '').replace('demo: ', '') || 'No se pudo cambiar la contraseña.')
    } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6"><Logo /></div>
        <h2 className="font-display text-2xl font-extrabold text-ink">Nueva contraseña</h2>
        <p className="mt-1 text-sm text-ink-soft">Crea tu nueva contraseña para ingresar.</p>
        {ok ? (
          <p className="mt-6 rounded-xl bg-mint-500/15 px-4 py-3 text-sm font-medium text-mint-600">✅ Contraseña actualizada. Entrando…</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <div><label className="label">Nueva contraseña</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></div>
            <div><label className="label">Repite la contraseña</label><input type="password" className="input" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" required /></div>
            {error && <p className="rounded-lg bg-coral-400/15 px-3 py-2 text-sm font-medium text-coral-500">{error}</p>}
            <button className="btn-primary mt-1 w-full" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
