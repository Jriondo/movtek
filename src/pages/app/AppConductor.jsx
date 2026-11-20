import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEmpresaPorSlug, vehiculosDeConductor, conductorDeUsuario, preoperacionalHoy, savePreoperacional, fechaLocalISO } from '../../lib/db'
import { TIPO } from '../../lib/preoperacional'
import { applyTheme } from '../../lib/theme'
import { activarPwaEmpresa, esStandalone } from '../../lib/pwa'
import { activarPushConductor } from '../../lib/push'
import InstalarApp from '../../components/InstalarApp'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'
import PasswordInput from '../../components/PasswordInput'
import PreoperacionalCaptura from './PreoperacionalCaptura'

// App de conductores (PWA) por empresa: movtek.app/e/<slug>/app
export default function AppConductor() {
  const { slug } = useParams()
  const { user, login, logout, empresaIdUsuario, conductorId } = useAuth()
  const { entrarAEmpresa } = useEmpresa() || {}
  const [empresa, setEmpresa] = useState(undefined)

  useEffect(() => {
    getEmpresaPorSlug(slug).then((e) => {
      setEmpresa(e || null)
      if (e?.color_primario) applyTheme({ primary: e.color_primario, accent: e.color_acento })
      if (e) { entrarAEmpresa?.(e); activarPwaEmpresa(e, slug) }
    }).catch(() => setEmpresa(null))
  }, [slug])

  if (empresa === undefined) return <Pantalla><p className="text-ink-faint">Cargando…</p></Pantalla>
  if (empresa === null) return (
    <Pantalla>
      <div className="text-center">
        <div className="text-4xl">🔎</div>
        <h1 className="mt-3 font-display text-xl font-extrabold">Empresa no encontrada</h1>
        <p className="mt-1 text-sm text-ink-soft">Verifica el enlace con tu empresa.</p>
      </div>
    </Pantalla>
  )

  if (!user) return <LoginConductor empresa={empresa} onLogin={login} />
  return <Home empresa={empresa} user={user} conductorId={conductorId} onLogout={logout} />
}

function Pantalla({ children }) {
  return <div className="grid min-h-screen place-items-center bg-cloud p-6">{children}</div>
}

// ---------- LOGIN / REGISTRO del conductor (marca de la empresa) ----------
function LoginConductor({ empresa, onLogin }) {
  const { registrarConductor, recuperarPassword } = useAuth()
  const [modo, setModo] = useState('login')   // 'login' | 'registro'
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [doc, setDoc] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  // En el navegador se muestra solo el aviso de descargar; el login está dentro de la app ya instalada.
  const [verLogin, setVerLogin] = useState(esStandalone())

  async function entrar(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try { await onLogin(email.trim(), pass) }
    catch (e) { setErr('Correo o contraseña incorrectos.'); setBusy(false) }
  }

  async function recuperar() {
    setErr(''); setInfo('')
    const correo = email.trim()
    if (!correo) { setErr('Escribe tu correo arriba y vuelve a tocar “¿Olvidaste tu contraseña?”.'); return }
    setBusy(true)
    try {
      await recuperarPassword(correo)
      setInfo('📧 Te enviamos un correo para restablecer tu contraseña. Ábrelo, crea la nueva y vuelve a ingresar.')
    } catch (e) {
      setErr('No se pudo enviar el correo. Verifica que esté bien escrito.')
    }
    setBusy(false)
  }

  async function crearAcceso(e) {
    e.preventDefault()
    setErr(''); setInfo(''); setBusy(true)
    const r = await registrarConductor({ empresaId: empresa.id, documento: doc.trim(), email: email.trim(), password: pass })
    setBusy(false)
    if (r.ok) {
      if (r.needsConfirmation) setInfo('✅ ¡Acceso creado! Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa aquí con tu correo y contraseña.')
      // si no requiere confirmación, la sesión ya entra sola.
      return
    }
    if (r.motivo === 'no-ficha') setErr(`No encontramos tu documento en ${empresa?.nombre}. Debes estar registrado por tu empresa. Habla con ellos para tu creación.`)
    else if (r.motivo === 'sin-vehiculo') setErr('Estás registrado pero aún no tienes un vehículo asignado. Habla con tu empresa para que te asignen uno.')
    else if (r.motivo === 'sin-documento') setErr('Escribe tu número de documento.')
    else if (r.motivo === 'sin-correo') setErr('Escribe un correo para tu acceso.')
    else if (r.motivo === 'auth') setErr('No se pudo crear el acceso: ' + (r.error || '') + '. Si ya tienes cuenta, usa "Ingresar".')
    else if (r.motivo === 'falta-rpc') setErr('El autoregistro aún no está habilitado en el sistema. Avísale a tu empresa (falta activar la función en la base de datos).')
    else setErr('No se pudo crear el acceso. Intenta de nuevo o habla con tu empresa.')
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-brand-500/10 to-cloud p-6">
      <div className="card w-full max-w-sm p-7">
        <div className="flex justify-center">
          {empresa?.logo_url
            ? <img src={empresa.logo_url} alt={empresa.nombre} className="h-16 w-auto max-w-[220px] object-contain" />
            : <div className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-extrabold text-white" style={{ background: empresa?.color_primario || '#16a34a' }}>{(empresa?.nombre || 'E')[0]}</div>}
        </div>
        <h1 className="mt-4 text-center font-display text-lg font-extrabold text-ink">{empresa?.nombre}</h1>
        <p className="mb-4 text-center text-sm text-ink-soft">App de preoperacional · Conductores</p>

        <InstalarApp empresa={empresa} />

        {!verLogin ? (
          <button onClick={() => setVerLogin(true)} className="mt-1 w-full text-center text-xs font-semibold text-ink-faint hover:text-brand-500">
            Ya instalé la app · Ingresar
          </button>
        ) : modo === 'login' ? (
          <>
            <form onSubmit={entrar} className="flex flex-col gap-3">
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" autoComplete="username" required />
              <PasswordInput value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" required />
              {err && <p className="rounded-lg bg-coral-400/15 px-3 py-2 text-sm font-semibold text-coral-500">{err}</p>}
              {info && <p className="rounded-lg bg-mint-500/15 px-3 py-2 text-sm font-semibold text-mint-600">{info}</p>}
              <button className="btn-primary" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
            </form>
            <button type="button" onClick={recuperar} disabled={busy} className="mt-3 w-full text-center text-sm font-semibold text-ink-soft hover:text-brand-500">
              ¿Olvidaste tu contraseña?
            </button>
            <button onClick={() => { setModo('registro'); setErr(''); setInfo('') }} className="mt-2 w-full text-center text-sm font-bold text-brand-600">
              ¿Primera vez? Crear mi acceso
            </button>
          </>
        ) : (
          <>
            <form onSubmit={crearAcceso} className="flex flex-col gap-3">
              <p className="text-xs text-ink-soft">Crea tu acceso con tu <b>documento</b> (debes estar registrado por tu empresa y tener un vehículo asignado).</p>
              <input className="input" inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="Número de documento" required />
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu correo" autoComplete="email" required />
              <PasswordInput value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Crea una contraseña" autoComplete="new-password" required />
              {err && <p className="rounded-lg bg-coral-400/15 px-3 py-2 text-sm font-semibold text-coral-500">{err}</p>}
              {info && <p className="rounded-lg bg-mint-500/15 px-3 py-2 text-sm font-semibold text-mint-600">{info}</p>}
              <button className="btn-primary" disabled={busy}>{busy ? 'Creando…' : 'Crear mi acceso'}</button>
            </form>
            <button onClick={() => { setModo('login'); setErr(''); setInfo('') }} className="mt-4 w-full text-center text-sm font-bold text-ink-soft">
              ← Ya tengo acceso · Ingresar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ---------- INICIO del conductor ----------
function Home({ empresa, user, conductorId, onLogout }) {
  const [vehiculos, setVehiculos] = useState([])
  const [conductor, setConductor] = useState(null)
  const [selId, setSelId] = useState('')
  const [pantalla, setPantalla] = useState('home') // 'home' | 'captura'
  const [hoy, setHoy] = useState(null)             // registro de hoy del vehículo seleccionado
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState('')           // 'taller' | 'descanso' | ''
  const vehiculo = useMemo(() => vehiculos.find((v) => String(v.id) === String(selId)), [vehiculos, selId])
  const [avisos, setAvisos] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted')

  async function activarAvisos() {
    const r = await activarPushConductor({ empresa, conductor, email: user?.email })
    if (r.ok) setAvisos(true)
    else if (r.motivo === 'sin-permiso') alert('Activa las notificaciones en tu navegador para recibir el recordatorio.')
    else if (r.motivo === 'no-soportado') alert('Tu teléfono o navegador no soporta notificaciones. Usa Chrome en Android.')
  }
  // Si ya dio permiso antes, renueva la suscripción al entrar.
  useEffect(() => {
    if (conductor && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      activarPushConductor({ empresa, conductor, email: user?.email }).catch(() => {})
    }
  }, [conductor?.id])

  async function cargar() {
    setCargando(true)
    const cond = await conductorDeUsuario({ empresaId: empresa.id, conductorId, email: user?.email }).catch(() => null)
    setConductor(cond)
    const vs = await vehiculosDeConductor({ empresaId: empresa.id, conductorId: cond?.id }).catch(() => [])
    setVehiculos(vs)
    setSelId((prev) => prev || vs[0]?.id || '')
    setCargando(false)
  }
  useEffect(() => { cargar() }, [empresa?.id])

  // Estado de hoy del vehículo seleccionado.
  async function refrescarHoy() {
    if (!vehiculo) { setHoy(null); return }
    const r = await preoperacionalHoy({ empresaId: empresa.id, vehiculoId: vehiculo.id, conductorId: conductor?.id }).catch(() => null)
    setHoy(r)
  }
  useEffect(() => { refrescarHoy() }, [selId, conductor?.id])

  // Recordatorio: pide permiso y avisa si falta la preoperacional (y cada 2h mientras la app esté abierta).
  useRecordatorio({ pendiente: !hoy && !!vehiculo, empresa })

  if (cargando) return <Pantalla><p className="text-ink-faint">Cargando tu información…</p></Pantalla>

  if (pantalla === 'captura' && vehiculo && conductor) {
    return <PreoperacionalCaptura empresa={empresa} vehiculo={vehiculo} conductor={conductor}
      onCancel={() => setPantalla('home')}
      onDone={() => { setPantalla('home'); refrescarHoy() }} />
  }

  const nombreCond = conductor ? `${conductor.nombres || ''} ${conductor.apellidos || ''}`.trim() : (user?.email || '')

  return (
    <div className="min-h-screen bg-cloud">
      {/* Encabezado con la marca */}
      <header className="flex items-center gap-3 px-4 py-3 text-white shadow" style={{ background: empresa?.color_primario || '#16a34a' }}>
        {empresa?.logo_url
          ? <img src={empresa.logo_url} alt="" className="h-9 w-auto max-w-[120px] object-contain drop-shadow" />
          : <span className="font-display text-lg font-extrabold">{empresa?.nombre}</span>}
        <button onClick={onLogout} className="ml-auto rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold">Salir</button>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        <p className="text-sm text-ink-soft">Hola,</p>
        <h1 className="font-display text-2xl font-extrabold text-ink">{nombreCond || 'Conductor'}</h1>

        <div className="mt-3">
          <InstalarApp empresa={empresa} />
        </div>
        {!avisos && (
          <button onClick={activarAvisos} className="mt-2 w-full rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700">
            🔔 Activar recordatorios de preoperacional
          </button>
        )}

        {!conductor && (
          <p className="mt-2 rounded-xl bg-amber-100 px-4 py-2.5 text-sm text-amber-700">
            Tu usuario no está vinculado a una ficha de conductor. Pídele a tu empresa que la asocie para registrar tus datos.
          </p>
        )}

        {vehiculos.length === 0 ? (
          <p className="mt-4 rounded-xl bg-coral-400/15 px-4 py-3 text-sm text-coral-500">No tienes vehículos activos asignados. Avisa a tu empresa.</p>
        ) : (
          <>
            {/* Selector de vehículo (puede tener varios y cambiarse) */}
            <div className="mt-4">
              <p className="label mb-1.5">Tu vehículo</p>
              <div className="flex flex-wrap gap-2">
                {vehiculos.map((v) => {
                  const sel = String(v.id) === String(selId)
                  return (
                    <button key={v.id} onClick={() => setSelId(v.id)}
                      className={`rounded-xl border-2 px-3 py-2 text-left transition ${sel ? 'border-brand-500 bg-brand-50' : 'border-cloud-line bg-white'}`}>
                      <span className="block font-display text-base font-extrabold text-ink">{v.placa}</span>
                      <span className="block text-xs text-ink-soft">{v.marca} {v.modelo} · Móvil {v.numero_interno || '—'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Estado de hoy */}
            {hoy ? (
              <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${hoy.tipo === TIPO.PREOP ? 'bg-mint-500/15 text-mint-600' : 'bg-slate-200 text-slate-700'}`}>
                {hoy.tipo === TIPO.PREOP && `✅ Ya hiciste la preoperacional hoy (${hoy.hora || ''}).`}
                {hoy.tipo === TIPO.TALLER && '🔧 Reportaste este vehículo EN TALLER hoy.'}
                {hoy.tipo === TIPO.DESCANSO && '🛌 Reportaste este vehículo EN DESCANSO hoy.'}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-700">
                ⏰ Aún no has hecho la preoperacional de hoy.
              </div>
            )}

            {/* Acciones */}
            <div className="mt-4 flex flex-col gap-3">
              <button onClick={() => setPantalla('captura')} disabled={!conductor}
                className="rounded-2xl bg-brand-500 px-5 py-4 text-left text-white shadow-glow disabled:opacity-50">
                <span className="block font-display text-lg font-extrabold">📋 Hacer preoperacional</span>
                <span className="block text-sm text-white/80">{hoy?.tipo === TIPO.PREOP ? 'Puedes registrar otra si lo necesitas' : 'Revisa el vehículo y firma'}</span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setModal('taller')} className="rounded-2xl border-2 border-cloud-line bg-white px-4 py-4 font-bold text-ink">🔧 En taller</button>
                <button onClick={() => setModal('descanso')} className="rounded-2xl border-2 border-cloud-line bg-white px-4 py-4 font-bold text-ink">🛌 En descanso</button>
              </div>
            </div>
          </>
        )}
      </div>

      {modal && (
        <ModalEstado tipo={modal} empresa={empresa} vehiculo={vehiculo} conductor={conductor}
          onClose={() => setModal('')} onSaved={() => { setModal(''); refrescarHoy() }} />
      )}
    </div>
  )
}

// Modal para reportar el vehículo en taller o en descanso (con nota opcional).
function ModalEstado({ tipo, empresa, vehiculo, conductor, onClose, onSaved }) {
  const [nota, setNota] = useState('')
  const [busy, setBusy] = useState(false)
  const titulo = tipo === TIPO.TALLER ? '🔧 Vehículo en taller' : '🛌 Vehículo en descanso'

  async function guardar() {
    setBusy(true)
    try {
      const ahora = new Date()
      await savePreoperacional({
        empresa_id: empresa.id, vehiculo_id: vehiculo?.id, conductor_id: conductor?.id,
        tipo, fecha: fechaLocalISO(ahora), hora: ahora.toTimeString().slice(0, 5),
        placa: vehiculo?.placa, numero_interno: vehiculo?.numero_interno,
        conductor_nombre: conductor ? `${conductor.nombres || ''} ${conductor.apellidos || ''}`.trim() : '',
        conductor_doc: conductor?.documento || '', nota,
      })
      onSaved()
    } catch (e) { alert('No se pudo guardar. ' + (e?.message || '')); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-white p-5 sm:max-w-sm sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">{titulo}</h2>
        <p className="mt-1 text-sm text-ink-soft">{vehiculo?.placa} · {vehiculo?.marca} {vehiculo?.modelo}</p>
        <textarea className="input mt-3 h-20" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (opcional): motivo, taller, etc." />
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={guardar} disabled={busy} className="btn-primary flex-1">{busy ? 'Guardando…' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}

// Hook de recordatorio: pide permiso de notificaciones y avisa mientras falte la preoperacional.
function useRecordatorio({ pendiente, empresa }) {
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') { Notification.requestPermission().catch(() => {}) }
  }, [])

  useEffect(() => {
    if (!pendiente) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const avisar = () => {
      try { new Notification('Preoperacional pendiente', { body: `Recuerda hacer la preoperacional en ${empresa?.nombre || 'tu empresa'}.`, icon: empresa?.logo_url || undefined }) } catch {}
    }
    avisar() // aviso inmediato al abrir con pendiente
    const t = setInterval(avisar, 2 * 60 * 60 * 1000) // cada 2 horas mientras la app esté abierta
    return () => clearInterval(t)
  }, [pendiente, empresa?.nombre])
}
