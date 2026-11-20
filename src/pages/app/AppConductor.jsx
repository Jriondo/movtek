import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEmpresaPorSlug, vehiculosDeConductor, conductorDeUsuario, preoperacionalHoy, savePreoperacional, fechaLocalISO } from '../../lib/db'
import { TIPO } from '../../lib/preoperacional'
import { applyTheme } from '../../lib/theme'
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
      if (e) entrarAEmpresa?.(e)
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

// ---------- LOGIN del conductor (marca de la empresa) ----------
function LoginConductor({ empresa, onLogin }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try { await onLogin(email.trim(), pass) }
    catch (e) { setErr('Correo o contraseña incorrectos.'); setBusy(false) }
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
        <p className="text-center text-sm text-ink-soft">App de preoperacional · Conductores</p>
        <form onSubmit={entrar} className="mt-5 flex flex-col gap-3">
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" autoComplete="username" required />
          <PasswordInput value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" required />
          {err && <p className="text-sm font-semibold text-coral-500">{err}</p>}
          <button className="btn-primary" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        </form>
        <p className="mt-4 text-center text-xs text-ink-faint">¿No tienes acceso? Pídele a tu empresa que te cree el usuario de conductor.</p>
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
