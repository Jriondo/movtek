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

export default function Login({ marca = null }) {
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
  const [registroOk, setRegistroOk] = useState('')
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
        // Cualquier otro error: NO creamos la cuenta a medias, avisamos.
        setError('No se pudo crear tu usuario' + (res.error ? `: ${res.error}` : '') + '. Comunícate con la empresa.'); setBusy(false); return
      }
      const r = await registrar(reg.correo, reg.password) // crea la cuenta
      if (r?.needsConfirmation) {
        setRegistroOk('✅ ¡Cuenta creada! Te enviamos un correo a ' + reg.correo + ' para verificar y activar tu cuenta. Ábrelo y confirma; luego podrás iniciar sesión.')
      }
      // Si no requiere confirmación, ya quedó con sesión y entra solo.
    } catch (err) {
      setError(traducirError(err?.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Panel de marca — centrado, moderno */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-12 text-center text-white lg:flex lg:flex-col lg:items-center lg:justify-center">
        {/* Formas decorativas */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-96 w-96 rounded-full bg-mint-500/25 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-mint-400/20 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center rounded-3xl bg-white px-8 py-6 shadow-2xl ring-1 ring-white/40">
            {marca ? (
              marca.logo_url
                ? <img src={marca.logo_url} alt={marca.nombre} className="h-20 w-auto max-w-[260px] object-contain" />
                : <span className="font-display text-3xl font-extrabold text-ink">{marca.nombre}</span>
            ) : <Logo />}
          </div>

          <h1 className="mt-10 font-display text-4xl font-extrabold leading-tight">
            {marca ? <>{marca.nombre}</> : <>Tu empresa,<br />en la palma de tu mano.</>}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-white/85">
            {marca ? 'Accede con tu usuario para gestionar tus FUEC, vehículos y conductores.' : 'Tu flota, tus FUEC y tu equipo, todo a tu alcance — simple, rápido y siempre contigo.'}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-white/90">
            <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">FUEC en segundos</span>
            <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">Multiempresa</span>
            <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">100% en la nube</span>
          </div>
        </div>

        <p className="absolute bottom-8 text-sm text-white/60">{marca ? `${marca.nombre} · Tecnología Movtek` : 'Tecnología Movtek'}</p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            {marca ? (
              marca.logo_url
                ? <img src={marca.logo_url} alt={marca.nombre} className="h-10 w-auto object-contain" />
                : <span className="font-display text-xl font-extrabold text-ink">{marca.nombre}</span>
            ) : <Logo />}
          </div>

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

              {registroOk ? (
                <div className="mt-6">
                  <p className="rounded-xl bg-mint-500/15 px-4 py-3 text-sm font-medium text-mint-600">{registroOk}</p>
                  <button type="button" className="btn-primary mt-4 w-full" onClick={() => { setModo('login'); setRegistroOk(''); setError('') }}>Ir a iniciar sesión</button>
                </div>
              ) : (
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
              )}

              {!registroOk && (
                <p className="mt-5 text-center text-sm text-ink-soft">
                  ¿Ya tienes cuenta?{' '}
                  <button type="button" className="font-bold text-brand-600 hover:underline" onClick={() => { setModo('login'); setError(''); setNota('') }}>Iniciar sesión</button>
                </p>
              )}
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
