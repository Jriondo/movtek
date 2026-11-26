import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useEmpresa } from './context/EmpresaContext'
import { slugify } from './lib/db'
import Layout from './components/Layout'

// Si una página (trozo de código) no carga —por un despliegue nuevo o caché vieja en el
// APK/TWA— limpiamos la caché y recargamos UNA sola vez, para no quedar en "Cargando…".
const REINTENTO_KEY = 'mv_reload_chunk'
async function recargarLimpio() {
  try { const regs = (await navigator.serviceWorker?.getRegistrations?.()) || []; await Promise.all(regs.map((r) => r.unregister())) } catch {}
  try { const keys = (await caches?.keys?.()) || []; await Promise.all(keys.map((k) => caches.delete(k))) } catch {}
  window.location.reload()
}
function lazyR(factory) {
  return lazy(() => Promise.race([
    factory(),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout-chunk')), 12000)),
  ]).then((mod) => {
    try { sessionStorage.removeItem(REINTENTO_KEY) } catch {}
    return mod
  }).catch((err) => {
    let ya = null
    try { ya = sessionStorage.getItem(REINTENTO_KEY) } catch {}
    if (!ya) { try { sessionStorage.setItem(REINTENTO_KEY, '1') } catch {}; recargarLimpio(); return new Promise(() => {}) }
    throw err
  }))
}

// Carga diferida: cada página se descarga solo cuando se entra a ella.
// Así la app abre rápido (no baja las 20 pantallas de una).
const Login = lazyR(() => import('./pages/Login'))
const Inicio = lazyR(() => import('./pages/Inicio'))
const Clientes = lazyR(() => import('./pages/Clientes'))
const ClienteForm = lazyR(() => import('./pages/ClienteForm'))
const Conductores = lazyR(() => import('./pages/Conductores'))
const ConductorForm = lazyR(() => import('./pages/ConductorForm'))
const Propietarios = lazyR(() => import('./pages/Propietarios'))
const PropietarioForm = lazyR(() => import('./pages/PropietarioForm'))
const Transportadoras = lazyR(() => import('./pages/Transportadoras'))
const TransportadoraForm = lazyR(() => import('./pages/TransportadoraForm'))
const Vehiculos = lazyR(() => import('./pages/Vehiculos'))
const VehiculoForm = lazyR(() => import('./pages/VehiculoForm'))
const MatrizDestinos = lazyR(() => import('./pages/MatrizDestinos'))
const Fuec = lazyR(() => import('./pages/Fuec'))
const FuecForm = lazyR(() => import('./pages/FuecForm'))
const FuecImprimir = lazyR(() => import('./pages/FuecImprimir'))
const VerificarFuec = lazyR(() => import('./pages/VerificarFuec'))
const Usuarios = lazyR(() => import('./pages/Usuarios'))
const Empresas = lazyR(() => import('./pages/Empresas'))
const Historial = lazyR(() => import('./pages/Historial'))
const NuevaPassword = lazyR(() => import('./pages/NuevaPassword'))
const AccesoEmpresa = lazyR(() => import('./pages/AccesoEmpresa'))
const AppConductor = lazyR(() => import('./pages/app/AppConductor'))
const Preoperacionales = lazyR(() => import('./pages/Preoperacionales'))
const PreoperacionalReportePage = lazyR(() => import('./pages/PreoperacionalReportePage'))
const PreguntasPreop = lazyR(() => import('./pages/PreguntasPreop'))
const PlanRodamiento = lazyR(() => import('./pages/PlanRodamiento'))
const PlanMantenimiento = lazyR(() => import('./pages/PlanMantenimiento'))
const Almacenamiento = lazyR(() => import('./pages/Almacenamiento'))
const Cobros = lazyR(() => import('./pages/Cobros'))

function Cargando() {
  return <div className="grid min-h-screen place-items-center text-ink-faint">Cargando…</div>
}

// Protege las rutas internas: si no hay sesión, manda al login.
function Protected({ children }) {
  const { user, loading, sinAcceso, logout, esConductor } = useAuth()
  const { empresa } = useEmpresa() || {}
  if (loading) return <div className="grid h-full place-items-center text-ink-faint">Cargando…</div>
  // El conductor solo usa la app de preoperacional (no la plataforma administrativa).
  if (user && esConductor && empresa) {
    return <Navigate to={`/e/${empresa.slug || slugify(empresa.nombre)}/app`} replace />
  }
  if (!user) {
    // Si estabas dentro de una empresa, el login es el de esa empresa (/e/slug); si no, el de Movtek.
    const esEmpresa = empresa && !(empresa.es_maestra || empresa.id === 'movtek' || (empresa.nombre || '').toLowerCase() === 'movtek')
    const destino = esEmpresa ? `/e/${empresa.slug || slugify(empresa.nombre)}` : '/login'
    return <Navigate to={destino} replace />
  }
  if (sinAcceso) return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 font-display text-xl font-extrabold text-ink">Sin acceso</h1>
        <p className="mt-2 text-sm text-ink-soft">Tu correo <b className="break-all text-ink">{user?.email}</b> no tiene un usuario activo en ninguna empresa.</p>
        <p className="mt-2 text-sm text-ink-soft">Pídele al administrador de tu empresa (o al operativo) que cree tu usuario con <b>este mismo correo</b>. No necesitas estar en Movtek.</p>
        <button className="btn-primary mt-5" onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  )
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <Suspense fallback={<Cargando />}>
    <Routes>
      {/* Verificación pública del FUEC (QR) — sin login */}
      <Route path="/verificar/:id" element={<VerificarFuec />} />
      <Route path="/nueva-password" element={<NuevaPassword />} />
      <Route path="/e/:slug/app" element={<AppConductor />} />
      <Route path="/e/:slug" element={<AccesoEmpresa />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Inicio />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/nuevo" element={<ClienteForm />} />
        <Route path="clientes/:id" element={<ClienteForm />} />
        <Route path="conductores" element={<Conductores />} />
        <Route path="conductores/nuevo" element={<ConductorForm />} />
        <Route path="conductores/:id" element={<ConductorForm />} />
        <Route path="propietarios" element={<Propietarios />} />
        <Route path="propietarios/nuevo" element={<PropietarioForm />} />
        <Route path="propietarios/:id" element={<PropietarioForm />} />
        <Route path="transportadoras" element={<Transportadoras />} />
        <Route path="transportadoras/nuevo" element={<TransportadoraForm />} />
        <Route path="transportadoras/:id" element={<TransportadoraForm />} />
        <Route path="vehiculos" element={<Vehiculos />} />
        <Route path="vehiculos/nuevo" element={<VehiculoForm />} />
        <Route path="vehiculos/:id" element={<VehiculoForm />} />
        <Route path="destinos" element={<MatrizDestinos />} />
        <Route path="fuec" element={<Fuec />} />
        <Route path="fuec/nuevo" element={<FuecForm />} />
        <Route path="fuec/duplicar/:id" element={<FuecForm duplicar />} />
        <Route path="fuec/:id" element={<FuecForm />} />
        <Route path="fuec/:id/imprimir" element={<FuecImprimir />} />
        <Route path="preoperacionales" element={<Preoperacionales />} />
        <Route path="preoperacionales/reporte" element={<PreoperacionalReportePage />} />
        <Route path="preoperacionales/preguntas" element={<PreguntasPreop />} />
        <Route path="rodamiento" element={<PlanRodamiento />} />
        <Route path="mantenimiento" element={<PlanMantenimiento />} />
        <Route path="cobros" element={<Cobros />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="almacenamiento" element={<Almacenamiento />} />
        <Route path="empresas" element={<Empresas />} />
        <Route path="historial" element={<Historial />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}
