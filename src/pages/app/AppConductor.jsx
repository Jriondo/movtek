import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEmpresaPorSlug, vehiculosDeConductor, conductorDeUsuario, preoperacionalHoy, listVehiculos, listFuec, listRodamiento, saveRodamiento, listMantPlan, listMantRegistro, saveMantRegistro, getMantTipos, MANT_TIPOS_DEFAULT, listPreoperacionales, estadoMantenimiento, fechaLocalISO, getPropietario, propietarioTieneVehiculo } from '../../lib/db'

// FUEC se carga solo cuando un propietario/admin entra a generarlo (no pesa para el conductor).
const FuecForm = lazy(() => import('../FuecForm'))
const FuecImprimir = lazy(() => import('../FuecImprimir'))
import { TIPO } from '../../lib/preoperacional'
import { applyTheme } from '../../lib/theme'
import { activarPwaEmpresa, esStandalone, esApk, abrirEnChrome } from '../../lib/pwa'
import { activarPushConductor } from '../../lib/push'
import InstalarApp from '../../components/InstalarApp'
import { useAuth } from '../../context/AuthContext'
import { useEmpresa } from '../../context/EmpresaContext'
import PasswordInput from '../../components/PasswordInput'
import PreoperacionalCaptura from './PreoperacionalCaptura'

// App de conductores (PWA) por empresa: movtek.app/e/<slug>/app
export default function AppConductor() {
  const { slug } = useParams()
  const { user, login, logout, empresaIdUsuario, conductorId, esConductor, esPropietario, esAdmin, esOperativo, esMantenimiento, propietarioId, sinAcceso } = useAuth()
  const { entrarAEmpresa } = useEmpresa() || {}
  // Copia local de la empresa por slug: abre al instante aunque la red esté lenta.
  const cacheKey = `movtek_emp_slug_${slug}`
  const [empresa, setEmpresa] = useState(() => {
    try { const s = localStorage.getItem(cacheKey); return s ? JSON.parse(s) : undefined } catch { return undefined }
  })
  const [tardando, setTardando] = useState(false)

  useEffect(() => {
    // Si no hay copia local, mostramos "Cargando…" con reintento tras 10 s.
    let tieneCache = false
    try { tieneCache = !!localStorage.getItem(cacheKey) } catch {}
    setTardando(false)
    const t = tieneCache ? null : setTimeout(() => setTardando(true), 10000)
    getEmpresaPorSlug(slug).then((e) => {
      if (t) clearTimeout(t)
      if (e) {
        setEmpresa(e)
        try { localStorage.setItem(cacheKey, JSON.stringify(e)) } catch {}
        if (e.color_primario) applyTheme({ primary: e.color_primario, accent: e.color_acento })
        entrarAEmpresa?.(e); activarPwaEmpresa(e, slug)
      } else if (!tieneCache) {
        setEmpresa(null)
      }
    }).catch(() => { if (t) clearTimeout(t); if (!tieneCache) setEmpresa(null) })
    return () => { if (t) clearTimeout(t) }
  }, [slug])

  async function recargarLimpio() {
    try { const regs = (await navigator.serviceWorker?.getRegistrations?.()) || []; await Promise.all(regs.map((r) => r.unregister())) } catch {}
    try { const keys = (await caches?.keys?.()) || []; await Promise.all(keys.map((k) => caches.delete(k))) } catch {}
    window.location.reload()
  }

  if (empresa === undefined) return (
    <Pantalla>
      <div className="text-center">
        <p style={{ color: '#8fb6a3' }}>Cargando…</p>
        {tardando && (
          <div className="mt-4">
            <p className="text-sm" style={{ color: '#8fb6a3' }}>Está tardando más de lo normal.</p>
            <button onClick={recargarLimpio} className="btn-primary mt-3">↻ Reintentar</button>
          </div>
        )}
      </div>
    </Pantalla>
  )
  if (empresa === null) return (
    <Pantalla>
      <div className="text-center">
        <div className="text-4xl">🔎</div>
        <h1 className="mt-3 font-display text-xl font-extrabold" style={{ color: '#eafff3' }}>Empresa no encontrada</h1>
        <p className="mt-1 text-sm" style={{ color: '#8fb6a3' }}>Verifica el enlace con tu empresa.</p>
      </div>
    </Pantalla>
  )

  if (!user) return <LoginConductor empresa={empresa} onLogin={login} />
  // Mantenimiento → app de mantenimientos.
  if (esMantenimiento) {
    return <HomeMantenimiento empresa={empresa} user={user} onLogout={logout} />
  }
  // Propietario / admin / operativo → app de FUEC. Conductor → app de preoperacional.
  if (esPropietario || esAdmin || esOperativo) {
    return <HomeFuec empresa={empresa} user={user} propietarioId={propietarioId} esPropietario={esPropietario} onLogout={logout} />
  }
  if (!esConductor && sinAcceso) {
    return (
      <Pantalla>
        <div className="text-center">
          <div className="text-4xl">🔒</div>
          <h1 className="mt-3 font-display text-xl font-extrabold" style={{ color: '#eafff3' }}>Sin acceso</h1>
          <p className="mt-1 text-sm" style={{ color: '#8fb6a3' }}>Tu usuario no está habilitado en {empresa?.nombre}. Habla con tu empresa.</p>
          <button onClick={logout} className="btn-ghost mt-4">Salir</button>
        </div>
      </Pantalla>
    )
  }
  return <Home empresa={empresa} user={user} conductorId={conductorId} onLogout={logout} />
}

function Pantalla({ children }) {
  // Mismo fondo oscuro que la app, para que no haya parpadeo claro→oscuro al cargar.
  return <div className="grid min-h-screen place-items-center p-6" style={{ background: '#0e1512', color: '#cfeede' }}>{children}</div>
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
    <div className="grid min-h-screen place-items-center p-6" style={{ background: 'linear-gradient(180deg,#0e1512,#13201a)' }}>
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
              <input type="text" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo o nombre de usuario" autoComplete="username" required />
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
const SEEN_KEY = (cid) => `movtek_rutas_vistas_${cid}`
const getSeen = (cid) => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY(cid)) || '[]')) } catch { return new Set() } }
const saveSeen = (cid, ids) => { try { localStorage.setItem(SEEN_KEY(cid), JSON.stringify([...ids])) } catch {} }

function Home({ empresa, user, conductorId, onLogout }) {
  const { actualizarPassword } = useAuth()
  const [vehiculos, setVehiculos] = useState([])
  const [conductor, setConductor] = useState(null)
  const [selId, setSelId] = useState('')
  const [pantalla, setPantalla] = useState('home') // 'home' | 'captura'
  const [seccion, setSeccion] = useState('preop')  // 'preop' | 'rutas'
  const [hoy, setHoy] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState('')
  const [nuevas, setNuevas] = useState(0)
  const [permiso, setPermiso] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  const [suscrito, setSuscrito] = useState(null)   // null=desconocido, true/false
  const [avisoMsg, setAvisoMsg] = useState('')

  // Comprueba el estado REAL de los avisos (permiso + suscripción activa).
  // Se re-chequea al volver a la app (p. ej. tras cambiar Ajustes del teléfono).
  // Si el permiso ya está concedido pero falta la suscripción, la crea sola.
  async function revisarAvisos() {
    const p = typeof Notification !== 'undefined' ? Notification.permission : 'denied'
    setPermiso(p)
    if (p === 'granted') setAvisoMsg('')   // limpia mensajes viejos de "bloqueadas"
    try {
      const reg = await navigator.serviceWorker?.ready
      let sub = await reg?.pushManager?.getSubscription()
      if (p === 'granted' && !sub && conductor) {
        // Permiso concedido pero sin suscripción → la creamos automáticamente.
        await activarPushConductor({ empresa, conductor, email: user?.email }).catch(() => {})
        sub = await reg?.pushManager?.getSubscription().catch(() => null)
      }
      setSuscrito(!!sub)
    } catch { setSuscrito(false) }
  }
  useEffect(() => {
    revisarAvisos()
    const onVis = () => { if (document.visibilityState === 'visible') revisarAvisos() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [conductor?.id])
  const avisosOk = permiso === 'granted' && suscrito === true
  const [enlaceCopiado, setEnlaceCopiado] = useState(false)
  async function copiarEnlaceApp() {
    const url = `${window.location.origin}/e/${empresa?.slug || ''}/app`
    try { await navigator.clipboard.writeText(url); setEnlaceCopiado(true); setTimeout(() => setEnlaceCopiado(false), 5000) }
    catch { window.prompt('Copia este enlace y ábrelo en Chrome:', url) }
  }
  const rutasIdsRef = useRef([])
  const vehiculo = useMemo(() => vehiculos.find((v) => String(v.id) === String(selId)), [vehiculos, selId])

  // Activación con un toque. Muestra el resultado EN PANTALLA (no solo alert).
  async function activarAvisos() {
    setAvisoMsg('⏳ Activando avisos…')
    try {
      if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setAvisoMsg('⚠️ Este navegador no soporta notificaciones aquí. En iPhone: Compartir → Agregar a inicio y abre desde el ícono.')
        return
      }
      const r = await Promise.race([
        activarPushConductor({ empresa, conductor, email: user?.email }),
        new Promise((res) => setTimeout(() => res({ ok: false, motivo: 'timeout' }), 20000)),
      ])
      setPermiso(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
      if (r.ok) setSuscrito(true); else revisarAvisos()
      if (r.motivo === 'timeout') { setAvisoMsg('⚠️ Tardó demasiado. Si saliste del permiso, vuelve a tocar el botón. Si ya diste "Permitir", reintenta.'); return }
      if (r.ok) setAvisoMsg('✅ ¡Avisos activados! Ya puedes recibir notificaciones.')
      else if (r.motivo === 'sin-permiso') setAvisoMsg(
        esStandalone()
          ? '⚠️ Las notificaciones están bloqueadas. Abre los Ajustes del teléfono → Aplicaciones → esta app → Notificaciones (o Permisos) → actívalas. Luego vuelve y toca el botón otra vez.'
          : '⚠️ Permiso bloqueado. Toca el candado 🔒 de la barra → Notificaciones → Permitir, y vuelve a intentar.')
      else if (r.motivo === 'no-soportado') setAvisoMsg('⚠️ No soportado aquí. En iPhone instala la app en inicio primero.')
      else setAvisoMsg('⚠️ No se pudo activar. Detalle: ' + (r.motivo || 'desconocido'))
    } catch (e) {
      setAvisoMsg('⚠️ Error: ' + (e?.message || 'desconocido'))
    }
  }

  async function cargar() {
    setCargando(true)
    const cond = await conductorDeUsuario({ empresaId: empresa.id, conductorId, email: user?.email }).catch(() => null)
    setConductor(cond)
    const vs = await vehiculosDeConductor({ empresaId: empresa.id, conductorId: cond?.id }).catch(() => [])
    setVehiculos(vs)
    // Recuerda el vehículo elegido la última vez (si sigue disponible).
    let guardado = ''
    try { guardado = localStorage.getItem(`movtek_veh_sel_${empresa.id}_${cond?.id || conductorId || ''}`) || '' } catch {}
    const valido = vs.some((v) => String(v.id) === String(guardado)) ? guardado : ''
    setSelId((prev) => prev || valido || (vs.length === 1 ? vs[0].id : ''))
    setCargando(false)
  }
  useEffect(() => { cargar() }, [empresa?.id])

  // Guarda/olvida el vehículo elegido para recordarlo al refrescar.
  function elegirVehiculo(id) {
    setSelId(id)
    try { localStorage.setItem(`movtek_veh_sel_${empresa?.id}_${conductor?.id || conductorId || ''}`, id || '') } catch {}
  }

  async function refrescarHoy() {
    if (!vehiculo) { setHoy(null); return }
    const r = await preoperacionalHoy({ empresaId: empresa.id, vehiculoId: vehiculo.id, conductorId: conductor?.id }).catch(() => null)
    setHoy(r)
  }
  useEffect(() => { refrescarHoy() }, [selId, conductor?.id])

  // Rutas nuevas asignadas (badge/aviso).
  useEffect(() => {
    if (!conductor?.id) return
    const h = fechaLocalISO()
    const fin = new Date(h + 'T12:00:00'); fin.setDate(fin.getDate() + 45)
    listRodamiento({ empresaId: empresa.id, desde: h, hasta: fin.toISOString().slice(0, 10) })
      .then((rs) => {
        const mine = rs.filter((r) => String(r.conductor_id) === String(conductor.id) && r.estado !== 'cancelado')
        rutasIdsRef.current = mine.map((r) => String(r.id))
        const seen = getSeen(conductor.id)
        setNuevas(mine.filter((r) => !seen.has(String(r.id))).length)
      }).catch(() => {})
  }, [conductor?.id, selId])

  function verRutas() {
    setSeccion('rutas')
    if (conductor?.id) { saveSeen(conductor.id, rutasIdsRef.current); setNuevas(0) }
  }

  useRecordatorio({ pendiente: !hoy && !!vehiculo, empresa })

  if (cargando) return <Pantalla><p style={{ color: '#8fb6a3' }}>Cargando tu información…</p></Pantalla>

  if (pantalla === 'captura' && vehiculo && conductor) {
    return <PreoperacionalCaptura empresa={empresa} vehiculo={vehiculo} conductor={conductor}
      onCancel={() => setPantalla('home')}
      onDone={() => { setPantalla('home'); refrescarHoy() }} />
  }

  const titulo = (s) => (s || '').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())
  const primerNombre = titulo((conductor?.nombres || '').trim().split(/\s+/)[0])
  const primerApellido = titulo((conductor?.apellidos || '').trim().split(/\s+/)[0])
  const nombreCond = (primerNombre || primerApellido) ? `${primerNombre} ${primerApellido}`.trim() : (user?.email || 'Conductor')
  const primary = empresa?.color_primario || '#16a34a'

  const Header = () => (
    <header className="flex items-center gap-3 px-4 pb-6 pt-3 text-white"
      style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary} 45%, #0e9488 100%)`, borderRadius: '0 0 24px 24px', boxShadow: '0 10px 30px -14px #0e9488' }}>
      {empresa?.logo_url
        ? <img src={empresa.logo_url} alt="" className="h-9 w-auto max-w-[120px] rounded-lg bg-white/90 object-contain p-0.5 drop-shadow" />
        : <span className="font-display text-lg font-extrabold">{empresa?.nombre}</span>}
      <button onClick={() => setModal('pass')} className="ml-auto rounded-lg bg-white/25 px-3 py-1.5 text-sm font-semibold backdrop-blur" title="Cambiar contraseña">🔑</button>
      <button onClick={onLogout} className="rounded-lg bg-white/25 px-3 py-1.5 text-sm font-semibold backdrop-blur">Salir</button>
    </header>
  )

  // --- Pantalla: elegir vehículo antes de entrar ---
  if (vehiculos.length > 0 && !selId) {
    return (
      <div className="min-h-screen" style={{ background: '#0e1512', color: '#e6f2ec' }}>
        <Header />
        <div className="mx-auto -mt-2 max-w-xl px-4 py-5">
          <p className="text-sm" style={{ color: '#8fb6a3' }}>Hola, {nombreCond}</p>
          <h1 className="mb-1 font-display text-2xl font-extrabold" style={{ color: '#eafff3' }}>Elige tu vehículo</h1>
          <p className="mb-4 text-sm" style={{ color: '#8fb6a3' }}>Selecciona con cuál vas a trabajar hoy.</p>
          <div className="flex flex-col gap-3">
            {vehiculos.map((v) => (
              <button key={v.id} onClick={() => elegirVehiculo(v.id)} className="rounded-2xl border px-5 py-4 text-left"
                style={{ borderColor: '#203a2d', background: '#13201a' }}>
                <span className="block font-display text-xl font-extrabold" style={{ color: '#eafff3' }}>{v.placa}</span>
                <span className="block text-sm" style={{ color: '#8fb6a3' }}>{v.marca} {v.modelo} · Móvil {v.numero_interno || '—'}</span>
              </button>
            ))}
          </div>
          <div className="mt-4"><InstalarApp empresa={empresa} /></div>
        </div>
        {modal === 'pass' && <ModalCambiarPass actualizarPassword={actualizarPassword} onClose={() => setModal('')} />}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0e1512', color: '#e6f2ec' }}>
      <Header />
      <div className="mx-auto -mt-2 max-w-xl px-4 py-5">
        <p className="text-sm" style={{ color: '#8fb6a3' }}>Hola,</p>
        <h1 className="font-display text-2xl font-extrabold" style={{ color: '#eafff3' }}>{nombreCond}</h1>

        {!conductor && (
          <p className="mt-2 rounded-xl px-4 py-2.5 text-sm" style={{ background: '#2a2410', color: '#f5d98a' }}>
            Tu usuario no está vinculado a una ficha de conductor. Pídele a tu empresa que la asocie.
          </p>
        )}

        {vehiculos.length === 0 ? (
          <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: '#2a1414', color: '#f5a3a3' }}>No tienes vehículos activos asignados. Avisa a tu empresa.</p>
        ) : (
          <>
            {/* Vehículo activo + cambiar */}
            {vehiculo && (
              <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: '#132a1e', border: '1px solid #22e07a' }}>
                <span className="font-display text-base font-extrabold" style={{ color: '#eafff3' }}>🚍 {vehiculo.placa}</span>
                <span className="text-xs" style={{ color: '#8fb6a3' }}>Móvil {vehiculo.numero_interno || '—'}</span>
                {vehiculos.length > 1 && <button onClick={() => elegirVehiculo('')} className="ml-auto rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: '#0e9488', color: '#042012' }}>Cambiar</button>}
              </div>
            )}

            {/* Estado de avisos: SIEMPRE visible, para saber si están activados o no. */}
            {esApk() && !avisosOk ? (
              <div className="mt-3 rounded-xl border px-4 py-3" style={{ borderColor: '#5a4a1c', background: '#2a2410' }}>
                <p className="text-sm font-bold" style={{ color: '#f5d98a' }}>🔔 Para recibir notificaciones</p>
                <p className="mt-0.5 text-xs" style={{ color: '#d9c48a' }}>Esta versión (APK) no puede enviar avisos. Copia el enlace, ábrelo en <b>Chrome</b> y activa los avisos ahí (solo una vez).</p>
                <button onClick={copiarEnlaceApp} className="mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-extrabold text-white" style={{ background: '#15803d' }}>
                  {enlaceCopiado ? '✅ Enlace copiado — pégalo en Chrome' : '📋 Copiar enlace para Chrome'}
                </button>
              </div>
            ) : avisosOk ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border px-4 py-2.5" style={{ borderColor: '#1e5a34', background: '#102a1b' }}>
                <span className="text-sm font-bold" style={{ color: '#9ff0c2' }}>🔔 Avisos activados</span>
                <button onClick={revisarAvisos} className="ml-auto text-xs font-semibold" style={{ color: '#8fb6a3' }}>Revisar</button>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border px-4 py-3" style={{ borderColor: '#5a4a1c', background: '#2a2410' }}>
                <p className="text-sm font-bold" style={{ color: '#f5d98a' }}>🔔 Avisos desactivados</p>
                <p className="mt-0.5 text-xs" style={{ color: '#d9c48a' }}>No recibirás preoperacional ni rutas. Toca para activarlos{permiso === 'denied' ? '; si no aparece el permiso, actívalos en Ajustes del teléfono → Notificaciones' : ''}.</p>
                <button onClick={activarAvisos} className="mt-2 w-full rounded-lg px-4 py-2.5 text-center text-sm font-extrabold"
                  style={{ background: '#16a34a', color: '#042012' }}>🔔 Activar avisos</button>
              </div>
            )}
            {avisoMsg && !esApk() && (
              <p className="mt-2 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: '#13201a', color: '#e6f2ec' }}>{avisoMsg}</p>
            )}

            {/* Pestañas / carpetas */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setSeccion('preop')} className="rounded-xl py-2.5 text-sm font-extrabold"
                style={seccion === 'preop' ? { background: primary, color: '#042012' } : { background: '#13201a', color: '#8fb6a3' }}>📋 Preoperacional</button>
              <button onClick={verRutas} className="relative rounded-xl py-2.5 text-sm font-extrabold"
                style={seccion === 'rutas' ? { background: primary, color: '#042012' } : { background: '#13201a', color: '#8fb6a3' }}>
                🗓️ Mis rutas
                {nuevas > 0 && <span className="absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold text-white" style={{ background: '#ef4444' }}>{nuevas}</span>}
              </button>
            </div>

            {seccion === 'preop' ? (
              <>
                {hoy ? (
                  <div className="mt-4 rounded-xl px-4 py-3 text-sm font-semibold"
                    style={hoy.tipo === TIPO.PREOP ? { background: '#132a1e', color: '#8ff0bd' } : { background: '#17221d', color: '#9fc3b2' }}>
                    {hoy.tipo === TIPO.PREOP && `✅ Ya hiciste la preoperacional hoy (${hoy.hora || ''}).`}
                    {hoy.tipo === TIPO.TALLER && '🔧 Reportaste este vehículo EN TALLER hoy.'}
                    {hoy.tipo === TIPO.DESCANSO && '🛌 Reportaste este vehículo EN DESCANSO hoy.'}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: '#2a2410', color: '#f5d98a' }}>
                    ⏰ Aún no has registrado el día.
                  </div>
                )}
                <button onClick={() => setPantalla('captura')} disabled={!conductor}
                  className="mt-4 w-full rounded-2xl px-5 py-4 text-left disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${primary}, #0fb98f)`, color: '#042012', boxShadow: '0 12px 26px -10px #17d36f' }}>
                  <span className="block font-display text-lg font-extrabold">📋 Registrar el día</span>
                  <span className="block text-sm" style={{ color: '#063' }}>Operaciones (preoperacional), taller o descanso</span>
                </button>
                <div className="mt-4"><InstalarApp empresa={empresa} /></div>
              </>
            ) : (
              <MiProgramacion empresa={empresa} conductor={conductor} vehiculos={vehiculos} primary={primary} />
            )}
          </>
        )}
      </div>

      {modal === 'pass' && <ModalCambiarPass actualizarPassword={actualizarPassword} onClose={() => setModal('')} />}
    </div>
  )
}

// Modal para que el conductor cambie su contraseña (ya está dentro de la app).
function ModalCambiarPass({ actualizarPassword, onClose }) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setErr('')
    if (p1.length < 6) { setErr('La contraseña debe tener al menos 6 caracteres.'); return }
    if (p1 !== p2) { setErr('Las contraseñas no coinciden.'); return }
    setBusy(true)
    try { await actualizarPassword(p1); setOk(true) }
    catch (e) { setErr('No se pudo cambiar: ' + (e?.message || '')) }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 sm:place-items-center" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-white p-5 sm:max-w-sm sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">🔑 Cambiar contraseña</h2>
        {ok ? (
          <>
            <p className="mt-2 rounded-lg bg-mint-500/15 px-3 py-2 text-sm font-semibold text-mint-600">✅ Tu contraseña se cambió. Úsala la próxima vez que ingreses.</p>
            <button onClick={onClose} className="btn-primary mt-4 w-full">Listo</button>
          </>
        ) : (
          <form onSubmit={guardar} className="mt-3 flex flex-col gap-3">
            <PasswordInput value={p1} onChange={(e) => setP1(e.target.value)} placeholder="Nueva contraseña" autoComplete="new-password" />
            <PasswordInput value={p2} onChange={(e) => setP2(e.target.value)} placeholder="Repite la nueva contraseña" autoComplete="new-password" />
            {err && <p className="rounded-lg bg-coral-400/15 px-3 py-2 text-sm font-semibold text-coral-500">{err}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
              <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// Rutas del conductor (plan de rodamiento) Hoy/Semana/Mes + alertas de mantenimiento de sus vehículos.
function MiProgramacion({ empresa, conductor, vehiculos, primary }) {
  const [vista, setVista] = useState('hoy')
  const [rodas, setRodas] = useState([])
  const [alertas, setAlertas] = useState([])
  const [accion, setAccion] = useState(null)   // { tipo:'terminar'|'cancelar', servicio }
  const hoyISO = fechaLocalISO()

  const rangos = useMemo(() => {
    const d = new Date(hoyISO + 'T12:00:00')
    const isod = (x) => fechaLocalISO(x)
    const off = (d.getDay() + 6) % 7
    const lun = new Date(d); lun.setDate(d.getDate() - off)
    const dom = new Date(lun); dom.setDate(lun.getDate() + 6)
    const m1 = new Date(d.getFullYear(), d.getMonth(), 1)
    const m2 = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return { hoy: [hoyISO, hoyISO], semana: [isod(lun), isod(dom)], mes: [isod(m1), isod(m2)] }
  }, [hoyISO])

  async function cargarRodas() {
    if (!conductor?.id) return
    const starts = [rangos.semana[0], rangos.mes[0]].sort()[0]
    const ends = [rangos.semana[1], rangos.mes[1]].sort().slice(-1)[0]
    const rs = await listRodamiento({ empresaId: empresa?.id, desde: starts, hasta: ends }).catch(() => [])
    setRodas(rs.filter((r) => String(r.conductor_id) === String(conductor.id)))
  }
  useEffect(() => {
    cargarRodas()
    const ids = new Set(vehiculos.map((v) => String(v.id)))
    listMantPlan({ empresaId: empresa?.id })
      .then((ps) => setAlertas(ps.filter((p) => ids.has(String(p.vehiculo_id))).map((p) => ({ ...p, _est: estadoMantenimiento(p) })).filter((p) => p._est !== 'ok')))
      .catch(() => setAlertas([]))
  }, [conductor?.id, empresa?.id])

  if (!conductor?.id) return null
  const [d1, d2] = rangos[vista]
  const items = rodas.filter((r) => r.fecha >= d1 && r.fecha <= d2).sort((a, b) => (a.fecha + (a.turno || '')).localeCompare(b.fecha + (b.turno || '')))
  const fechaCorta = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short' })
  const nVenc = alertas.filter((a) => a._est === 'vencido').length
  const nProx = alertas.filter((a) => a._est === 'proximo').length

  async function guardarAccion({ hora_final, motivo }) {
    const s = accion.servicio
    if (accion.tipo === 'terminar') {
      if (!hora_final) return
      await saveRodamiento({ ...s, hora_final, estado: 'completado' }).catch(() => {})
    } else {
      await saveRodamiento({ ...s, estado: 'cancelado', motivo_cancelacion: motivo || '' }).catch(() => {})
    }
    setAccion(null); cargarRodas()
  }

  return (
    <div className="mt-6">
      {alertas.length > 0 && (
        <div className="mb-3 rounded-xl px-4 py-3 text-sm" style={{ background: '#2a2410', color: '#f5d98a' }}>
          🔧 <b>Mantenimiento:</b> {nVenc} vencido(s){nProx ? `, ${nProx} próximo(s)` : ''}.
          <ul className="mt-1 list-disc pl-5 text-xs">
            {alertas.slice(0, 4).map((a) => <li key={a.id}>{a.placa}: {a.tipo}{a.proxima_fecha ? ` (${a.proxima_fecha})` : ''}</li>)}
          </ul>
        </div>
      )}

      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#5f8a74' }}>Mis rutas</p>
      <div className="mb-2 flex gap-1.5">
        {[['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes']].map(([v, l]) => (
          <button key={v} onClick={() => setVista(v)} className="rounded-lg px-3 py-1.5 text-xs font-bold"
            style={vista === v ? { background: primary, color: '#042012' } : { background: '#13201a', color: '#8fb6a3' }}>{l}</button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#13201a', color: '#8fb6a3' }}>
          No tienes rutas asignadas {vista === 'hoy' ? 'para hoy' : vista === 'semana' ? 'esta semana' : 'este mes'}.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((r) => {
            const hora = (r.hora_inicial || '').slice(0, 5)
            const horaF = (r.hora_final || '').slice(0, 5)
            const cancelado = r.estado === 'cancelado'
            const completado = !!horaF && !cancelado
            const pendiente = !completado && !cancelado
            return (
              <div key={r.id} className="rounded-xl px-3 py-2.5" style={{ background: cancelado ? '#241515' : '#13201a', border: `1px solid ${cancelado ? '#4a2a2a' : '#203a2d'}` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold capitalize" style={{ color: '#8fb6a3' }}>{fechaCorta(r.fecha)}{r.descripcion ? ` · ${r.descripcion}` : ''}</span>
                  {hora && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums" style={{ background: '#172a12', color: '#b6f08a' }}>{hora}{horaF ? `–${horaF}` : ''}</span>}
                </div>
                <p className="font-display text-base font-extrabold" style={{ color: '#eafff3' }}>{r.ruta || 'Sin ruta'}</p>
                {(r.origen || r.destino) && <p className="text-xs" style={{ color: '#8fb6a3' }}>{r.origen || '—'} → {r.destino || '—'}</p>}
                <p className="text-[11px]" style={{ color: '#5f8a74' }}>{[r.placa, r.empresa_cliente].filter(Boolean).join(' · ')}</p>

                {completado && <p className="mt-1 text-xs font-bold" style={{ color: '#7dffb9' }}>✓ Terminado{r.tiempo ? ` · ${r.tiempo}` : ''}</p>}
                {cancelado && <p className="mt-1 text-xs font-bold" style={{ color: '#f5a3a3' }}>✕ No realizado{r.motivo_cancelacion ? ` · ${r.motivo_cancelacion}` : ''}</p>}
                {pendiente && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setAccion({ tipo: 'terminar', servicio: r })} className="flex-1 rounded-lg py-2 text-xs font-extrabold" style={{ background: 'linear-gradient(135deg,#17d36f,#0fb98f)', color: '#042012' }}>✓ Terminé</button>
                    <button onClick={() => setAccion({ tipo: 'cancelar', servicio: r })} className="flex-1 rounded-lg py-2 text-xs font-extrabold text-white" style={{ background: '#7a2e2e' }}>✕ No pude</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {accion && <ModalAccionServicio accion={accion} onClose={() => setAccion(null)} onSave={guardarAccion} />}
    </div>
  )
}

// Modal del conductor: terminar servicio (hora fin) o cancelar con motivo.
function ModalAccionServicio({ accion, onClose, onSave }) {
  const esTerminar = accion.tipo === 'terminar'
  const ahora = new Date().toTimeString().slice(0, 5)
  const [horaFin, setHoraFin] = useState(esTerminar ? ahora : '')
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)
  const s = accion.servicio

  async function confirmar() {
    if (esTerminar && !horaFin) return
    if (!esTerminar && !motivo.trim()) return
    setBusy(true)
    await onSave({ hora_final: horaFin, motivo })
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 sm:place-items-center" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-white p-5 sm:max-w-sm sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">{esTerminar ? '✓ Terminar servicio' : '✕ No pude terminar'}</h2>
        <p className="mt-0.5 text-sm text-ink-soft">{s.ruta}{s.hora_inicial ? ` · inició ${(s.hora_inicial || '').slice(0, 5)}` : ''}</p>
        {esTerminar ? (
          <div className="mt-4">
            <label className="label">¿A qué hora terminó?</label>
            <input type="time" className="input mt-1" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
          </div>
        ) : (
          <div className="mt-4">
            <label className="label">Motivo (por qué no se pudo terminar)</label>
            <textarea className="input mt-1 h-24" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. daño mecánico, accidente, novedad…" />
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={confirmar} disabled={busy} className="btn-primary flex-1">{busy ? 'Guardando…' : esTerminar ? 'Terminar' : 'Enviar'}</button>
        </div>
      </div>
    </div>
  )
}

// ---------- APP DE FUEC (propietarios / admin / operativo) ----------
function HomeFuec({ empresa, user, propietarioId, esPropietario, onLogout }) {
  const { actualizarPassword } = useAuth()
  const [pantalla, setPantalla] = useState('home') // home | completo | form | ver | rapidoPick
  const [dupId, setDupId] = useState(null)
  const [verId, setVerId] = useState(null)
  const [vehiculos, setVehiculos] = useState([])
  const [fuecs, setFuecs] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState('')
  const [condProp, setCondProp] = useState(null)   // propietario como "conductor" para la preoperacional
  const [vehSel, setVehSel] = useState(null)       // vehículo elegido para preoperacional
  const primary = empresa?.color_primario || '#16a34a'

  async function cargar() {
    setCargando(true)
    // Vehículos, FUEC y propietario en paralelo.
    const [vsAll, fsAll, pr] = await Promise.all([
      listVehiculos({ empresaId: empresa.id }).catch(() => []),
      listFuec({ empresaId: empresa.id }).catch(() => []),
      propietarioId ? getPropietario(propietarioId).catch(() => null) : Promise.resolve(null),
    ])
    let vs = vsAll
    if (esPropietario && propietarioId) vs = vs.filter((v) => propietarioTieneVehiculo(v, propietarioId))
    setVehiculos(vs)
    let fs = fsAll
    if (esPropietario && propietarioId) {
      const mias = new Set(vs.map((v) => String(v.id)))
      fs = fs.filter((f) => mias.has(String(f.vehiculo_id)))
    }
    setFuecs(fs.slice(0, 25))
    if (pr) setCondProp({ id: pr.id, nombres: pr.nombres || pr.compania || '', apellidos: pr.apellidos || '', documento: pr.documento || '' })
    else if (!propietarioId) setCondProp({ id: null, nombres: (user?.email || 'Responsable'), apellidos: '', documento: '' })
    setCargando(false)
  }
  useEffect(() => { cargar() }, [empresa?.id])

  function volverHome() { setPantalla('home'); setDupId(null); setVerId(null); setVehSel(null); cargar() }
  function verGenerado(id) { setVerId(id); setPantalla('ver') }
  function repetir(id) { setDupId(id); setPantalla('form') }
  function elegirVehiculoRapido(veh) {
    const ultimo = fuecs.find((f) => String(f.vehiculo_id) === String(veh.id))
    if (!ultimo) { alert(`${veh.placa} no tiene un FUEC previo para copiar. Usa "FUEC completo" la primera vez.`); return }
    setDupId(ultimo.id); setPantalla('form')
  }

  // Formulario FUEC (reutiliza el de la plataforma; tema claro para leer bien).
  if (pantalla === 'completo' || pantalla === 'form') {
    return (
      <div className="min-h-screen bg-cloud">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Suspense fallback={<p className="text-ink-faint">Cargando FUEC…</p>}>
            <FuecForm duplicar={pantalla === 'form'} idProp={pantalla === 'form' ? dupId : null}
              onDone={(id) => verGenerado(id)} onCancel={volverHome} />
          </Suspense>
        </div>
      </div>
    )
  }
  if (pantalla === 'ver') {
    return (
      <div className="min-h-screen bg-cloud">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Suspense fallback={<p className="text-ink-faint">Cargando…</p>}>
            <FuecImprimir idProp={verId} onBack={volverHome} />
          </Suspense>
        </div>
      </div>
    )
  }

  // Selector de vehículo para "FUEC rápido".
  if (pantalla === 'rapidoPick') {
    return (
      <div className="min-h-screen bg-cloud">
        <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: primary }}>
          <button onClick={() => setPantalla('home')} className="text-sm font-semibold">← Volver</button>
          <span className="font-display text-base font-extrabold">⚡ FUEC rápido</span>
        </header>
        <div className="mx-auto max-w-xl px-4 py-5">
          <p className="mb-3 text-sm text-ink-soft">Elige el vehículo. Se copiará su <b>último FUEC</b> y solo cambias las fechas (y conductor si quieres).</p>
          <div className="flex flex-col gap-2">
            {vehiculos.map((v) => {
              const tiene = fuecs.some((f) => String(f.vehiculo_id) === String(v.id))
              return (
                <button key={v.id} onClick={() => elegirVehiculoRapido(v)}
                  className="flex items-center justify-between rounded-xl border-2 border-cloud-line bg-white px-4 py-3 text-left">
                  <span>
                    <span className="block font-display text-base font-extrabold text-ink">{v.placa}</span>
                    <span className="block text-xs text-ink-soft">{v.marca} {v.modelo} · Móvil {v.numero_interno || '—'}</span>
                  </span>
                  <span className={`text-xs font-bold ${tiene ? 'text-brand-600' : 'text-ink-faint'}`}>{tiene ? 'Copiar último →' : 'Sin FUEC previo'}</span>
                </button>
              )
            })}
            {vehiculos.length === 0 && <p className="rounded-xl bg-coral-400/15 px-4 py-3 text-sm text-coral-500">No tienes vehículos asignados.</p>}
          </div>
        </div>
      </div>
    )
  }

  // Preoperacional (propietario): elegir vehículo.
  if (pantalla === 'preopPick') {
    return (
      <div className="min-h-screen bg-cloud">
        <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: primary }}>
          <button onClick={() => setPantalla('home')} className="text-sm font-semibold">← Volver</button>
          <span className="font-display text-base font-extrabold">📋 Preoperacional</span>
        </header>
        <div className="mx-auto max-w-xl px-4 py-5">
          <p className="mb-3 text-sm text-ink-soft">Elige el vehículo para hacer la revisión preoperacional.</p>
          <div className="flex flex-col gap-2">
            {vehiculos.map((v) => (
              <button key={v.id} onClick={() => { setVehSel(v); setPantalla('preopCaptura') }}
                className="rounded-xl border-2 border-cloud-line bg-white px-4 py-3 text-left">
                <span className="block font-display text-base font-extrabold text-ink">{v.placa}</span>
                <span className="block text-xs text-ink-soft">{v.marca} {v.modelo} · Móvil {v.numero_interno || '—'}</span>
              </button>
            ))}
            {vehiculos.length === 0 && <p className="rounded-xl bg-white px-4 py-3 text-sm text-coral-500">No tienes vehículos asignados.</p>}
          </div>
        </div>
        {modal === 'pass' && <ModalCambiarPass actualizarPassword={actualizarPassword} onClose={() => setModal('')} />}
      </div>
    )
  }
  if (pantalla === 'preopCaptura' && vehSel) {
    return <PreoperacionalCaptura empresa={empresa} vehiculo={vehSel} conductor={condProp}
      onCancel={() => setPantalla('preopPick')} onDone={() => volverHome()} />
  }
  if (pantalla === 'rutas') {
    return <RegistroRutas empresa={empresa} vehiculos={vehiculos} primary={primary} onBack={() => setPantalla('home')} />
  }

  // HOME de la app de FUEC (mismo diseño oscuro que el conductor).
  return (
    <div className="min-h-screen" style={{ background: '#0e1512', color: '#e6f2ec' }}>
      <header className="flex items-center gap-3 px-4 pb-6 pt-3 text-white"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary} 45%, #0e9488 100%)`, borderRadius: '0 0 24px 24px', boxShadow: '0 10px 30px -14px #0e9488' }}>
        {empresa?.logo_url
          ? <img src={empresa.logo_url} alt="" className="h-9 w-auto max-w-[120px] rounded-lg bg-white/90 object-contain p-0.5 drop-shadow" />
          : <span className="font-display text-lg font-extrabold">{empresa?.nombre}</span>}
        <button onClick={() => setModal('pass')} className="ml-auto rounded-lg bg-white/25 px-3 py-1.5 text-sm font-semibold backdrop-blur" title="Cambiar contraseña">🔑</button>
        <button onClick={onLogout} className="rounded-lg bg-white/25 px-3 py-1.5 text-sm font-semibold backdrop-blur">Salir</button>
      </header>

      <div className="mx-auto -mt-2 max-w-xl px-4 py-5">
        <p className="text-sm" style={{ color: '#8fb6a3' }}>Hola,</p>
        <h1 className="font-display text-2xl font-extrabold" style={{ color: '#eafff3', wordBreak: 'break-word' }}>
          {(condProp && `${condProp.nombres || ''} ${condProp.apellidos || ''}`.trim()) || user?.email || 'Propietario'}
        </h1>
        {condProp && `${condProp.nombres || ''} ${condProp.apellidos || ''}`.trim() && (
          <p className="text-xs" style={{ color: '#5f7d6e', wordBreak: 'break-word' }}>{user?.email}</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3">
          <button onClick={() => setPantalla('rapidoPick')}
            className="rounded-2xl px-5 py-4 text-left text-white shadow-glow" style={{ background: primary }}>
            <span className="block font-display text-lg font-extrabold">⚡ FUEC rápido</span>
            <span className="block text-sm text-white/85">Copia el último del vehículo y solo cambia las fechas</span>
          </button>
          <button onClick={() => { setDupId(null); setPantalla('completo') }}
            className="rounded-2xl border px-5 py-4 text-left" style={{ borderColor: '#203a2d', background: '#13201a', color: '#eafff3' }}>
            <span className="block font-display text-lg font-extrabold">📝 FUEC completo</span>
            <span className="block text-sm" style={{ color: '#8fb6a3' }}>Formulario completo (para el primero o casos nuevos)</span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPantalla('preopPick')} className="rounded-2xl border px-4 py-4 text-left" style={{ borderColor: '#203a2d', background: '#13201a', color: '#eafff3' }}>
              <span className="block font-display text-base font-extrabold">📋 Preoperacional</span>
              <span className="block text-xs" style={{ color: '#8fb6a3' }}>Revisar un vehículo</span>
            </button>
            <button onClick={() => setPantalla('rutas')} className="rounded-2xl border px-4 py-4 text-left" style={{ borderColor: '#203a2d', background: '#13201a', color: '#eafff3' }}>
              <span className="block font-display text-base font-extrabold">🗓️ Rutas</span>
              <span className="block text-xs" style={{ color: '#8fb6a3' }}>Registro de recorridos</span>
            </button>
          </div>
        </div>

        {/* FUEC recientes */}
        <div className="mt-6">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: '#8fb6a3' }}>Últimos FUEC</p>
          {cargando ? (
            <p className="text-sm" style={{ color: '#5f7d6e' }}>Cargando…</p>
          ) : fuecs.length === 0 ? (
            <p className="rounded-xl px-4 py-3 text-sm" style={{ background: '#13201a', color: '#8fb6a3' }}>Aún no hay FUEC. Crea el primero con “FUEC completo”.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {fuecs.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: '#203a2d', background: '#13201a' }}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold" style={{ color: '#eafff3' }}>{f.placa || '—'} · FUEC {f.contrato_hijo || f.numero_fuec || ''}</p>
                    <p className="truncate text-xs" style={{ color: '#8fb6a3' }}>Vigencia: {f.vigencia_inicio || '—'} a {f.vigencia_fin || '—'}</p>
                  </div>
                  <div className="flex flex-none gap-1.5">
                    <button onClick={() => repetir(f.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={{ background: primary, color: '#042012' }}>⚡ Repetir</button>
                    <button onClick={() => verGenerado(f.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={{ background: '#1c2f26', color: '#cfeede' }}>Ver</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal === 'pass' && <ModalCambiarPass actualizarPassword={actualizarPassword} onClose={() => setModal('')} />}
    </div>
  )
}

// App del usuario de MANTENIMIENTO: ve pendientes de todos los vehículos, quién hizo la
// preoperacional del día y puede registrar un mantenimiento. Mismo diseño oscuro.
function HomeMantenimiento({ empresa, user, onLogout }) {
  const { actualizarPassword } = useAuth()
  const primary = empresa?.color_primario || '#16a34a'
  const hoy = fechaLocalISO()
  const [seccion, setSeccion] = useState('mant')   // mant | preop
  const [vehiculos, setVehiculos] = useState([])
  const [planes, setPlanes] = useState([])
  const [registros, setRegistros] = useState([])
  const [kmPorVeh, setKmPorVeh] = useState({})
  const [preopsHoy, setPreopsHoy] = useState([])
  const [tipos, setTipos] = useState(MANT_TIPOS_DEFAULT)
  const [cargando, setCargando] = useState(true)
  const [modalReg, setModalReg] = useState(null)
  const [modal, setModal] = useState('')

  async function cargar() {
    setCargando(true)
    // Todas las consultas en paralelo (más rápido que una tras otra).
    const [vs, planes, registros, preops] = await Promise.all([
      listVehiculos({ empresaId: empresa.id }).catch(() => []),
      listMantPlan({ empresaId: empresa.id }).catch(() => []),
      listMantRegistro({ empresaId: empresa.id }).catch(() => []),
      listPreoperacionales({ empresaId: empresa.id }).catch(() => []),
    ])
    setVehiculos(vs)
    setPlanes(planes)
    setRegistros(registros.slice(0, 30))
    const km = {}
    for (const r of preops) {
      if (!r.kilometraje) continue
      const k = String(r.vehiculo_id)
      const fh = (r.fecha || '') + (r.hora || '')
      if (!km[k] || fh > km[k].fh) km[k] = { km: r.kilometraje, fh }
    }
    setKmPorVeh(Object.fromEntries(Object.entries(km).map(([k, v]) => [k, v.km])))
    setPreopsHoy(preops.filter((r) => (r.fecha || '') === hoy))
    getMantTipos(empresa.id).then(setTipos).catch(() => {})
    setCargando(false)
  }
  useEffect(() => { cargar() }, [empresa?.id])

  const EST = {
    vencido: { label: '🔴 Vencido', bg: '#3a1510', color: '#ffb4a2' },
    proximo: { label: '🟠 Próximo', bg: '#33280d', color: '#ffd98a' },
    ok: { label: '🟢 Al día', bg: '#12271b', color: '#9ff0c2' },
  }

  const pendientes = useMemo(() => {
    const out = []
    for (const p of planes) {
      const km = kmPorVeh[String(p.vehiculo_id)] || ''
      const est = estadoMantenimiento(p, km)
      if (est === 'ok') continue
      const veh = vehiculos.find((v) => String(v.id) === String(p.vehiculo_id))
      out.push({ plan: p, veh, est, km })
    }
    return out.sort((a, b) => (a.est === b.est ? 0 : a.est === 'vencido' ? -1 : 1))
  }, [planes, kmPorVeh, vehiculos])

  const vehConPreop = useMemo(() => new Set(preopsHoy.map((r) => String(r.vehiculo_id))), [preopsHoy])
  const sinPreop = useMemo(() => vehiculos.filter((v) => !vehConPreop.has(String(v.id))), [vehiculos, vehConPreop])

  async function guardarRegistro(data) {
    const veh = vehiculos.find((v) => String(v.id) === String(data.vehiculo_id))
    await saveMantRegistro({ ...data, empresa_id: empresa.id, placa: veh?.placa })
    setModalReg(null); cargar()
  }

  const nombreTipoPreop = (t) => t === TIPO.TALLER ? '🔧 En taller' : t === TIPO.DESCANSO ? '🛌 En descanso' : '📋 Preoperacional'

  return (
    <div className="min-h-screen" style={{ background: '#0e1512', color: '#e6f2ec' }}>
      <header className="flex items-center gap-3 px-4 pb-6 pt-3 text-white"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary} 45%, #0e9488 100%)`, borderRadius: '0 0 24px 24px', boxShadow: '0 10px 30px -14px #0e9488' }}>
        {empresa?.logo_url
          ? <img src={empresa.logo_url} alt="" className="h-9 w-auto max-w-[120px] rounded-lg bg-white/90 object-contain p-0.5 drop-shadow" />
          : <span className="font-display text-lg font-extrabold">{empresa?.nombre}</span>}
        <button onClick={() => setModal('pass')} className="ml-auto rounded-lg bg-white/25 px-3 py-1.5 text-sm font-semibold backdrop-blur" title="Cambiar contraseña">🔑</button>
        <button onClick={onLogout} className="rounded-lg bg-white/25 px-3 py-1.5 text-sm font-semibold backdrop-blur">Salir</button>
      </header>

      <div className="mx-auto -mt-2 max-w-xl px-4 py-5">
        <p className="text-sm" style={{ color: '#8fb6a3' }}>Hola,</p>
        <h1 className="font-display text-2xl font-extrabold" style={{ color: '#eafff3', wordBreak: 'break-word' }}>{user?.email || 'Mantenimiento'}</h1>

        <button onClick={() => setModalReg({ fecha: hoy, vehiculo_id: vehiculos[0]?.id || '' })}
          className="mt-4 w-full rounded-2xl px-5 py-4 text-left text-white shadow-glow" style={{ background: primary }}>
          <span className="block font-display text-lg font-extrabold">🔧 Registrar mantenimiento</span>
          <span className="block text-sm text-white/85">Anota un mantenimiento hecho a un vehículo</span>
        </button>

        {/* Pestañas */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setSeccion('mant')} className="rounded-xl py-2.5 text-sm font-extrabold"
            style={seccion === 'mant' ? { background: primary, color: '#042012' } : { background: '#13201a', color: '#8fb6a3' }}>
            🔧 Pendientes{pendientes.length ? ` (${pendientes.length})` : ''}
          </button>
          <button onClick={() => setSeccion('preop')} className="rounded-xl py-2.5 text-sm font-extrabold"
            style={seccion === 'preop' ? { background: primary, color: '#042012' } : { background: '#13201a', color: '#8fb6a3' }}>
            📋 Preop. de hoy
          </button>
        </div>

        {cargando ? (
          <p className="mt-5 text-sm" style={{ color: '#5f7d6e' }}>Cargando…</p>
        ) : seccion === 'mant' ? (
          <div className="mt-4 flex flex-col gap-2">
            {pendientes.length === 0 ? (
              <p className="rounded-xl px-4 py-3 text-sm" style={{ background: '#12271b', color: '#9ff0c2' }}>✅ No hay mantenimientos pendientes. Todo al día.</p>
            ) : pendientes.map(({ plan, veh, est, km }) => (
              <div key={plan.id} className="rounded-xl border px-3 py-3" style={{ borderColor: '#203a2d', background: '#13201a' }}>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-extrabold" style={{ color: '#eafff3' }}>{veh?.placa || plan.placa || '—'}</span>
                  <span className="text-xs" style={{ color: '#8fb6a3' }}>Móvil {veh?.numero_interno || '—'}</span>
                  <span className="ml-auto rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: EST[est].bg, color: EST[est].color }}>{EST[est].label}</span>
                </div>
                <p className="mt-1 text-sm font-bold" style={{ color: '#cfeede' }}>{plan.tipo}</p>
                <p className="text-xs" style={{ color: '#8fb6a3' }}>
                  Próximo: {plan.proxima_fecha ? <b style={{ color: '#eafff3' }}>{plan.proxima_fecha}</b> : '—'}
                  {plan.proximo_km ? <> · <b style={{ color: '#eafff3' }}>{Number(plan.proximo_km).toLocaleString()} km</b></> : ''}
                  {km !== '' ? <> · actual {Number(km).toLocaleString()} km</> : ''}
                </p>
                <button onClick={() => setModalReg({ fecha: hoy, vehiculo_id: plan.vehiculo_id, plan_id: plan.id, tipo: plan.tipo, km })}
                  className="mt-2 w-full rounded-lg px-3 py-2 text-xs font-extrabold" style={{ background: primary, color: '#042012' }}>✓ Registrar este mantenimiento</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: '#9ff0c2' }}>✅ Ya hicieron la del día ({preopsHoy.length})</p>
              {preopsHoy.length === 0 ? (
                <p className="rounded-xl px-4 py-3 text-sm" style={{ background: '#13201a', color: '#8fb6a3' }}>Nadie ha registrado el día todavía.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {preopsHoy.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: '#203a2d', background: '#13201a' }}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold" style={{ color: '#eafff3' }}>{r.placa || '—'} · {r.conductor_nombre || '—'}</p>
                        <p className="truncate text-xs" style={{ color: '#8fb6a3' }}>{nombreTipoPreop(r.tipo)} · {r.hora || ''}{r.kilometraje ? ` · ${Number(r.kilometraje).toLocaleString()} km` : ''}</p>
                      </div>
                      {(!r.tipo || r.tipo === TIPO.PREOP) && r.estado_general === 'novedad' && (
                        <span className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: '#3a1510', color: '#ffb4a2' }}>⚠️ Novedad</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: '#ffd98a' }}>⏳ Falta la del día ({sinPreop.length})</p>
              {sinPreop.length === 0 ? (
                <p className="rounded-xl px-4 py-3 text-sm" style={{ background: '#12271b', color: '#9ff0c2' }}>Todos los vehículos registraron el día. 👏</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sinPreop.map((v) => (
                    <span key={v.id} className="rounded-lg px-3 py-1.5 text-sm font-bold" style={{ background: '#13201a', color: '#cfeede', border: '1px solid #203a2d' }}>{v.placa}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Últimos mantenimientos registrados */}
        {seccion === 'mant' && !cargando && registros.length > 0 && (
          <div className="mt-6">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide" style={{ color: '#8fb6a3' }}>Últimos registrados</p>
            <div className="flex flex-col gap-2">
              {registros.slice(0, 10).map((r) => (
                <div key={r.id} className="rounded-xl border px-3 py-2.5" style={{ borderColor: '#203a2d', background: '#13201a' }}>
                  <p className="text-sm font-bold" style={{ color: '#eafff3' }}>{r.placa || '—'} · {r.tipo || '—'}</p>
                  <p className="truncate text-xs" style={{ color: '#8fb6a3' }}>{r.fecha}{r.km ? ` · ${Number(r.km).toLocaleString()} km` : ''}{r.taller ? ` · ${r.taller}` : ''}{r.descripcion ? ` · ${r.descripcion}` : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalReg && <ModalMantApp base={modalReg} vehiculos={vehiculos} tipos={tipos} onClose={() => setModalReg(null)} onSave={guardarRegistro} />}
      {modal === 'pass' && <ModalCambiarPass actualizarPassword={actualizarPassword} onClose={() => setModal('')} />}
    </div>
  )
}

// Modal para registrar un mantenimiento desde la app (tema oscuro).
function ModalMantApp({ base, vehiculos, tipos, onClose, onSave }) {
  const [f, setF] = useState({
    id: base.id, plan_id: base.plan_id || '', vehiculo_id: base.vehiculo_id || vehiculos[0]?.id || '',
    fecha: base.fecha || fechaLocalISO(), km: base.km || '', tipo: base.tipo || tipos[0] || 'Otro',
    descripcion: base.descripcion || '', taller: base.taller || '', costo: base.costo || '',
  })
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }))
  const inputDark = { background: '#0e1512', borderColor: '#203a2d', color: '#eafff3' }
  const puede = f.vehiculo_id && f.fecha && f.tipo
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.6)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: '#13201a', border: '1px solid #203a2d', color: '#e6f2ec' }} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold" style={{ color: '#eafff3' }}>{base.id ? 'Editar mantenimiento' : 'Registrar mantenimiento'}</h2>
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold" style={{ color: '#8fb6a3' }}>Vehículo</label>
            <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={inputDark} value={f.vehiculo_id} onChange={(e) => set('vehiculo_id', e.target.value)}>
              <option value="">Elige…</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} · Móvil {v.numero_interno || '—'}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold" style={{ color: '#8fb6a3' }}>Fecha</label>
              <input type="date" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={inputDark} value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold" style={{ color: '#8fb6a3' }}>Kilometraje</label>
              <input inputMode="numeric" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={inputDark} value={f.km} onChange={(e) => set('km', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold" style={{ color: '#8fb6a3' }}>Tipo</label>
            <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={inputDark} value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {tipos.map((t) => <option key={t}>{t}</option>)}
              {f.tipo && !tipos.includes(f.tipo) && <option>{f.tipo}</option>}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold" style={{ color: '#8fb6a3' }}>Descripción</label>
            <textarea className="mt-1 h-16 w-full rounded-xl border px-3 py-2 text-sm" style={inputDark} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Qué se hizo…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold" style={{ color: '#8fb6a3' }}>Taller</label>
              <input className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={inputDark} value={f.taller} onChange={(e) => set('taller', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold" style={{ color: '#8fb6a3' }}>Costo</label>
              <input inputMode="numeric" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={inputDark} value={f.costo} onChange={(e) => set('costo', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="ml-auto rounded-xl px-4 py-2 text-sm font-bold" style={{ background: '#1c2f26', color: '#cfeede' }}>Cancelar</button>
          <button onClick={() => puede && onSave(f)} disabled={!puede} className="rounded-xl px-4 py-2 text-sm font-extrabold" style={{ background: puede ? '#16a34a' : '#20352a', color: puede ? '#042012' : '#5f7d6e' }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// Registro de rutas del propietario (lectura): recorridos de SUS vehículos por día/semana/mes.
function RegistroRutas({ empresa, vehiculos, primary, onBack }) {
  const [vista, setVista] = useState('hoy')
  const [rodas, setRodas] = useState([])
  const hoyISO = fechaLocalISO()
  const placas = useMemo(() => new Set(vehiculos.map((v) => (v.placa || '').toUpperCase())), [vehiculos])

  const rangos = useMemo(() => {
    const d = new Date(hoyISO + 'T12:00:00'); const iso = (x) => fechaLocalISO(x)
    const off = (d.getDay() + 6) % 7; const lun = new Date(d); lun.setDate(d.getDate() - off)
    const dom = new Date(lun); dom.setDate(lun.getDate() + 6)
    const m1 = new Date(d.getFullYear(), d.getMonth(), 1); const m2 = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return { hoy: [hoyISO, hoyISO], semana: [iso(lun), iso(dom)], mes: [iso(m1), iso(m2)] }
  }, [hoyISO])

  useEffect(() => {
    const starts = [rangos.semana[0], rangos.mes[0]].sort()[0]
    const ends = [rangos.semana[1], rangos.mes[1]].sort().slice(-1)[0]
    listRodamiento({ empresaId: empresa?.id, desde: starts, hasta: ends })
      .then((rs) => setRodas(rs.filter((r) => placas.has((r.placa || '').toUpperCase()))))
      .catch(() => setRodas([]))
  }, [empresa?.id, vehiculos.length])

  const [d1, d2] = rangos[vista]
  const items = rodas.filter((r) => r.fecha >= d1 && r.fecha <= d2).sort((a, b) => (a.fecha + (a.hora_inicial || '')).localeCompare(b.fecha + (b.hora_inicial || '')))
  const fechaCorta = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short' })

  return (
    <div className="min-h-screen bg-cloud">
      <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: primary }}>
        <button onClick={onBack} className="text-sm font-semibold">← Volver</button>
        <span className="font-display text-base font-extrabold">🗓️ Registro de rutas</span>
      </header>
      <div className="mx-auto max-w-xl px-4 py-5">
        <div className="mb-3 flex gap-1.5">
          {[['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes']].map(([v, l]) => (
            <button key={v} onClick={() => setVista(v)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${vista === v ? 'bg-brand-500 text-white' : 'bg-white text-ink-soft'}`}>{l}</button>
          ))}
        </div>
        {items.length === 0 ? (
          <p className="rounded-xl bg-white px-4 py-3 text-sm text-ink-soft">No hay recorridos de tus vehículos {vista === 'hoy' ? 'hoy' : 'en este ' + vista}.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((r) => {
              const cancelado = r.estado === 'cancelado'
              return (
                <div key={r.id} className="rounded-xl border border-cloud-line bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold capitalize text-ink-soft">{fechaCorta(r.fecha)} · {r.placa}</span>
                    <span className="text-xs tabular-nums text-ink-soft">{(r.hora_inicial || '').slice(0, 5)}{r.hora_final ? `–${(r.hora_final || '').slice(0, 5)}` : ''}</span>
                  </div>
                  <p className="font-bold text-ink">{r.ruta || 'Sin ruta'}</p>
                  {(r.origen || r.destino) && <p className="text-xs text-ink-soft">{r.origen || '—'} → {r.destino || '—'}</p>}
                  <p className="text-xs text-ink-faint">
                    {r.conductor_nombre || 'Sin conductor'}
                    {cancelado ? <span className="ml-1 font-bold text-coral-500">· ✕ {r.motivo_cancelacion || 'Cancelado'}</span>
                      : r.hora_final ? <span className="ml-1 font-bold text-brand-600">· ✓ {r.tiempo || 'Terminado'}</span>
                        : <span className="ml-1 text-amber-600">· ⏳ pendiente</span>}
                  </p>
                </div>
              )
            })}
          </div>
        )}
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
