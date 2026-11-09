import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { buscarPropietarioGlobalPorDocumento, registrarUsuarioPropietario, nombrePropietario } from '../lib/db'
import Logo from '../components/Logo'
import PasswordInput from '../components/PasswordInput'

// Traduce los errores comunes de Supabase a mensajes claros en español.
function traducirError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('email not confirmed')) return 'El correo no está confirmado. Créalo en Supabase marcando “Auto Confirm User”.'
  if (m.includes('email logins are disabled') || m.includes('provider')) return 'El inicio con correo/contraseña está deshabilitado en Supabase (Authentication → Providers → Email).'
  if (m.includes('fetch') || m.includes('network')) return 'No hay conexión con el servidor. Revisa la URL de Supabase.'
  if (m.includes('invalid api key') || m.includes('api key')) return 'La clave de Supabase no es válida. Revisa VITE_SUPABASE_ANON_KEY en Vercel.'
  return msg || 'No pudimos iniciar sesión. Revisa tu correo y contraseña.'
}

export default function Login() {
  const { login, registrar, recuperarPassword, demo } = useAuth()
  const [modo, setModo] = useState('login') // 'login' | 'registro' | 'recuperar'
  const [recuperarEmail, setRecuperarEmail] = useState('')
  const [recuperarMsg, setRecuperarMsg] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Registro de propietario
  const [reg, setReg] = useState({ documento: '', nombre: '', telefono: '', direccion: '', correo: '', password: '' })
  const [propEncontrado, setPropEncontrado] = useState(null)
  const [nota, setNota] = useState('')
  const setR = (k, v) => setReg((r) => ({ ...r, [k]: v }))

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(traducirError(err?.message))
    } finally {
      setBusy(false)
    }
  }

  async function onRecuperar(e) {
    e.preventDefault()
    setError(''); setRecuperarMsg('')
    if (!recuperarEmail.trim()) { setError('Escribe tu correo.'); return }
    setBusy(true)
    try {
      await recuperarPassword(recuperarEmail)
      setRecuperarMsg('✅ Te enviamos un enlace a tu correo para crear una nueva contraseña. Revisa tu bandeja (y la carpeta de spam).')
    } catch (err) {
      setError((err?.message || '').startsWith('demo:') ? err.message.replace('demo: ', '') : traducirError(err?.message))
    } finally { setBusy(false) }
  }

  // Al salir del campo de cédula: verifica si está registrado como propietario.
  async function verificarCedula() {
    setNota(''); setPropEncontrado(null)
    if (!reg.documento.trim()) return
    const p = await buscarPropietarioGlobalPorDocumento(reg.documento)
    if (p) {
      setPropEncontrado(p)
      setReg((r) => ({ ...r, nombre: r.nombre || nombrePropietario(p), telefono: r.telefono || p.celular || '', direccion: r.direccion || p.direccion || '', correo: r.correo || p.correo || '' }))
    } else {
      setNota('⚠️ Aún no apareces en nuestra base de datos. Pídele a la empresa (rol operativo) que registre primero tu información de propietario y tus vehículos.')
    }
  }

  async function onRegistrar(e) {
    e.preventDefault()
    setError(''); setNota('')
    if (!reg.documento.trim() || !reg.correo.trim() || !reg.password.trim()) { setError('Completa cédula, correo y contraseña.'); return }
    setBusy(true)
    try {
      const res = await registrarUsuarioPropietario({ documento: reg.documento, nombre: reg.nombre, telefono: reg.telefono, direccion: reg.direccion, email: reg.correo })
      if (!res.ok) {
        if (res.motivo === 'no-propietario') { setNota('⚠️ Aún no apareces en nuestra base de datos. Pídele a la empresa (rol operativo) que registre primero tu información.'); setBusy(false); return }
        if (res.motivo === 'ya-existe') { setError('Ya existe un usuario para este propietario. Inicia sesión.'); setBusy(false); return }
      }
      await registrar(reg.correo, reg.password) // crea la cuenta e inicia sesión
    } catch (err) {
      setError(traducirError(err?.message))
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

          {modo === 'login' ? (
            <>
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
                  <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                </div>
                {error && <p className="rounded-lg bg-coral-400/15 px-3 py-2 text-sm font-medium text-coral-500">{error}</p>}
                <button className="btn-primary mt-1 w-full" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
              </form>

              <div className="mt-4 text-center text-sm text-ink-soft">
                <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => { setModo('recuperar'); setError(''); setRecuperarMsg('') }}>¿Olvidaste tu contraseña?</button>
              </div>
              <p className="mt-3 text-center text-sm text-ink-soft">
                ¿Eres propietario y es tu primera vez?{' '}
                <button type="button" className="font-bold text-brand-600 hover:underline" onClick={() => { setModo('registro'); setError('') }}>Crear usuario</button>
              </p>
            </>
          ) : modo === 'recuperar' ? (
            <>
              <h2 className="font-display text-2xl font-extrabold text-ink">Recuperar contraseña</h2>
              <p className="mt-1 text-sm text-ink-soft">Te enviaremos un enlace a tu correo para crear una nueva.</p>
              <form onSubmit={onRecuperar} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="label">Correo</label>
                  <input type="email" className="input" value={recuperarEmail} onChange={(e) => setRecuperarEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" required />
                </div>
                {recuperarMsg && <p className="rounded-lg bg-mint-500/15 px-3 py-2.5 text-sm font-medium text-mint-600">{recuperarMsg}</p>}
                {error && <p className="rounded-lg bg-coral-400/15 px-3 py-2 text-sm font-medium text-coral-500">{error}</p>}
                <button className="btn-primary mt-1 w-full" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
              </form>
              <p className="mt-5 text-center text-sm text-ink-soft">
                <button type="button" className="font-bold text-brand-600 hover:underline" onClick={() => { setModo('login'); setError('') }}>Volver a iniciar sesión</button>
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-extrabold text-ink">Crear usuario</h2>
              <p className="mt-1 text-sm text-ink-soft">Registro de propietario. Escribe tu cédula para empezar.</p>

              <form onSubmit={onRegistrar} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="label">Cédula / Documento</label>
                  <input className="input" value={reg.documento} onChange={(e) => setR('documento', e.target.value)} onBlur={verificarCedula} placeholder="N° de documento" required />
                </div>
                {nota && <p className="rounded-lg bg-amber-100 px-3 py-2.5 text-sm font-medium text-amber-700">{nota}</p>}
                {propEncontrado && <p className="rounded-lg bg-mint-500/15 px-3 py-2 text-sm font-medium text-mint-600">✅ Propietario encontrado: {nombrePropietario(propEncontrado)}</p>}
                <div><label className="label">Nombre</label><input className="input" value={reg.nombre} onChange={(e) => setR('nombre', e.target.value)} /></div>
                <div><label className="label">Teléfono</label><input className="input" value={reg.telefono} onChange={(e) => setR('telefono', e.target.value)} /></div>
                <div><label className="label">Dirección</label><input className="input" value={reg.direccion} onChange={(e) => setR('direccion', e.target.value)} /></div>
                <div><label className="label">Correo</label><input type="email" className="input" value={reg.correo} onChange={(e) => setR('correo', e.target.value)} placeholder="tucorreo@ejemplo.com" required /></div>
                <div><label className="label">Contraseña</label><PasswordInput value={reg.password} onChange={(e) => setR('password', e.target.value)} placeholder="Crea tu contraseña" required /></div>
                {error && <p className="rounded-lg bg-coral-400/15 px-3 py-2 text-sm font-medium text-coral-500">{error}</p>}
                <button className="btn-primary mt-1 w-full" disabled={busy || !propEncontrado}>{busy ? 'Creando…' : 'Aceptar y crear usuario'}</button>
              </form>

              <p className="mt-5 text-center text-sm text-ink-soft">
                ¿Ya tienes cuenta?{' '}
                <button type="button" className="font-bold text-brand-600 hover:underline" onClick={() => { setModo('login'); setError(''); setNota('') }}>Iniciar sesión</button>
              </p>
            </>
          )}

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
