import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEmpresaPorSlug, vehiculosDeConductor, conductorDeUsuario, preoperacionalHoy, listVehiculos, listFuec, listRodamiento, listMantPlan, estadoMantenimiento, fechaLocalISO } from '../../lib/db'

// FUEC se carga solo cuando un propietario/admin entra a generarlo (no pesa para el conductor).
const FuecForm = lazy(() => import('../FuecForm'))
const FuecImprimir = lazy(() => import('../FuecImprimir'))
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
  const { user, login, logout, empresaIdUsuario, conductorId, esConductor, esPropietario, esAdmin, esOperativo, propietarioId, sinAcceso } = useAuth()
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
  // Propietario / admin / operativo → app de FUEC. Conductor → app de preoperacional.
  if (esPropietario || esAdmin || esOperativo) {
    return <HomeFuec empresa={empresa} user={user} propietarioId={propietarioId} esPropietario={esPropietario} onLogout={logout} />
  }
  if (!esConductor && sinAcceso) {
    return (
      <Pantalla>
        <div className="text-center">
          <div className="text-4xl">🔒</div>
          <h1 className="mt-3 font-display text-xl font-extrabold">Sin acceso</h1>
          <p className="mt-1 text-sm text-ink-soft">Tu usuario no está habilitado en {empresa?.nombre}. Habla con tu empresa.</p>
          <button onClick={logout} className="btn-ghost mt-4">Salir</button>
        </div>
      </Pantalla>
    )
  }
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
  const { actualizarPassword } = useAuth()
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

  // Saludo: primer nombre + primer apellido (bonito), o el correo si aún no hay ficha.
  const titulo = (s) => (s || '').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())
  const primerNombre = titulo((conductor?.nombres || '').trim().split(/\s+/)[0])
  const primerApellido = titulo((conductor?.apellidos || '').trim().split(/\s+/)[0])
  const nombreCond = (primerNombre || primerApellido) ? `${primerNombre} ${primerApellido}`.trim() : (user?.email || 'Conductor')

  const primary = empresa?.color_primario || '#16a34a'
  return (
    <div className="min-h-screen" style={{ background: '#0e1512', color: '#e6f2ec' }}>
      {/* Encabezado con degradado de la marca */}
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
        <h1 className="font-display text-2xl font-extrabold" style={{ color: '#eafff3' }}>{nombreCond || 'Conductor'}</h1>

        <div className="mt-3">
          <InstalarApp empresa={empresa} />
        </div>
        {!avisos && (
          <button onClick={activarAvisos} className="mt-2 w-full rounded-xl border px-4 py-2.5 text-sm font-bold"
            style={{ borderColor: '#2f5a1c', background: '#172a12', color: '#b6f08a' }}>
            🔔 Activar recordatorios de preoperacional
          </button>
        )}

        {!conductor && (
          <p className="mt-2 rounded-xl px-4 py-2.5 text-sm" style={{ background: '#2a2410', color: '#f5d98a' }}>
            Tu usuario no está vinculado a una ficha de conductor. Pídele a tu empresa que la asocie para registrar tus datos.
          </p>
        )}

        {vehiculos.length === 0 ? (
          <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: '#2a1414', color: '#f5a3a3' }}>No tienes vehículos activos asignados. Avisa a tu empresa.</p>
        ) : (
          <>
            {/* Selector de vehículo (puede tener varios y cambiarse) */}
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#5f8a74' }}>Tu vehículo</p>
              <div className="flex flex-wrap gap-2">
                {vehiculos.map((v) => {
                  const sel = String(v.id) === String(selId)
                  return (
                    <button key={v.id} onClick={() => setSelId(v.id)}
                      className="rounded-xl border px-3 py-2 text-left transition"
                      style={sel
                        ? { borderColor: '#22e07a', background: '#132a1e', boxShadow: '0 0 0 1px #22e07a, 0 0 18px -6px #22e07a' }
                        : { borderColor: '#203a2d', background: '#13201a' }}>
                      <span className="block font-display text-base font-extrabold" style={{ color: '#eafff3' }}>{v.placa}</span>
                      <span className="block text-xs" style={{ color: '#8fb6a3' }}>{v.marca} {v.modelo} · Móvil {v.numero_interno || '—'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Estado de hoy */}
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

            {/* Acción principal: dentro se elige Operaciones / Taller / Descanso */}
            <div className="mt-4 flex flex-col gap-3">
              <button onClick={() => setPantalla('captura')} disabled={!conductor}
                className="rounded-2xl px-5 py-4 text-left disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${primary}, #0fb98f)`, color: '#042012', boxShadow: '0 12px 26px -10px #17d36f' }}>
                <span className="block font-display text-lg font-extrabold">📋 Registrar el día</span>
                <span className="block text-sm" style={{ color: '#063' }}>Operaciones (preoperacional), taller o descanso</span>
              </button>
            </div>

            {/* Mis rutas (plan de rodamiento) + alertas de mantenimiento */}
            <MiProgramacion empresa={empresa} conductor={conductor} vehiculos={vehiculos} primary={primary} />
          </>
        )}
      </div>

      {modal === 'pass' && (
        <ModalCambiarPass actualizarPassword={actualizarPassword} onClose={() => setModal('')} />
      )}
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

  useEffect(() => {
    if (!conductor?.id) return
    const starts = [rangos.semana[0], rangos.mes[0]].sort()[0]
    const ends = [rangos.semana[1], rangos.mes[1]].sort().slice(-1)[0]
    listRodamiento({ empresaId: empresa?.id, desde: starts, hasta: ends })
      .then((rs) => setRodas(rs.filter((r) => String(r.conductor_id) === String(conductor.id))))
      .catch(() => setRodas([]))
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
            return (
              <div key={r.id} className="rounded-xl px-3 py-2.5" style={{ background: '#13201a', border: '1px solid #203a2d' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold capitalize" style={{ color: '#8fb6a3' }}>{fechaCorta(r.fecha)}{r.descripcion ? ` · ${r.descripcion}` : ''}</span>
                  {hora && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums" style={{ background: '#172a12', color: '#b6f08a' }}>{hora}{horaF ? `–${horaF}` : ''}</span>}
                </div>
                <p className="font-display text-base font-extrabold" style={{ color: '#eafff3' }}>{r.ruta || 'Sin ruta'}</p>
                {(r.origen || r.destino) && <p className="text-xs" style={{ color: '#8fb6a3' }}>{r.origen || '—'} → {r.destino || '—'}</p>}
                <p className="text-[11px]" style={{ color: '#5f8a74' }}>{[r.placa, r.empresa_cliente].filter(Boolean).join(' · ')}</p>
              </div>
            )
          })}
        </div>
      )}
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
  const primary = empresa?.color_primario || '#16a34a'

  async function cargar() {
    setCargando(true)
    let vs = await listVehiculos({ empresaId: empresa.id }).catch(() => [])
    if (esPropietario && propietarioId) vs = vs.filter((v) => String(v.propietario_id) === String(propietarioId))
    setVehiculos(vs)
    let fs = await listFuec({ empresaId: empresa.id }).catch(() => [])
    if (esPropietario && propietarioId) {
      const mias = new Set(vs.map((v) => String(v.id)))
      fs = fs.filter((f) => mias.has(String(f.vehiculo_id)))
    }
    setFuecs(fs.slice(0, 25))
    setCargando(false)
  }
  useEffect(() => { cargar() }, [empresa?.id])

  function volverHome() { setPantalla('home'); setDupId(null); setVerId(null); cargar() }
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

  // HOME de la app de FUEC.
  return (
    <div className="min-h-screen bg-cloud">
      <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: primary }}>
        {empresa?.logo_url
          ? <img src={empresa.logo_url} alt="" className="h-9 w-auto max-w-[120px] rounded-lg bg-white/90 object-contain p-0.5" />
          : <span className="font-display text-lg font-extrabold">{empresa?.nombre}</span>}
        <button onClick={() => setModal('pass')} className="ml-auto rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold" title="Cambiar contraseña">🔑</button>
        <button onClick={onLogout} className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold">Salir</button>
      </header>

      <div className="mx-auto max-w-xl px-4 py-5">
        <p className="text-sm text-ink-soft">Hola,</p>
        <h1 className="font-display text-2xl font-extrabold text-ink">{user?.email || 'Propietario'}</h1>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <button onClick={() => setPantalla('rapidoPick')}
            className="rounded-2xl px-5 py-4 text-left text-white shadow-glow" style={{ background: primary }}>
            <span className="block font-display text-lg font-extrabold">⚡ FUEC rápido</span>
            <span className="block text-sm text-white/85">Copia el último del vehículo y solo cambia las fechas</span>
          </button>
          <button onClick={() => { setDupId(null); setPantalla('completo') }}
            className="rounded-2xl border-2 border-cloud-line bg-white px-5 py-4 text-left text-ink">
            <span className="block font-display text-lg font-extrabold">📝 FUEC completo</span>
            <span className="block text-sm text-ink-soft">Formulario completo (para el primero o casos nuevos)</span>
          </button>
        </div>

        {/* FUEC recientes */}
        <div className="mt-6">
          <p className="label mb-1.5">Últimos FUEC</p>
          {cargando ? (
            <p className="text-sm text-ink-faint">Cargando…</p>
          ) : fuecs.length === 0 ? (
            <p className="rounded-xl bg-white px-4 py-3 text-sm text-ink-soft">Aún no hay FUEC. Crea el primero con “FUEC completo”.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {fuecs.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-cloud-line bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{f.placa || '—'} · FUEC {f.contrato_hijo || f.numero_fuec || ''}</p>
                    <p className="truncate text-xs text-ink-soft">Vigencia: {f.vigencia_inicio || '—'} a {f.vigencia_fin || '—'}</p>
                  </div>
                  <div className="flex flex-none gap-1.5">
                    <button onClick={() => repetir(f.id)} className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-600">⚡ Repetir</button>
                    <button onClick={() => verGenerado(f.id)} className="rounded-lg bg-cloud px-2.5 py-1.5 text-xs font-bold text-ink">Ver</button>
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
