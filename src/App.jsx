import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useEmpresa } from './context/EmpresaContext'
import { slugify } from './lib/db'
import Login from './pages/Login'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Clientes from './pages/Clientes'
import ClienteForm from './pages/ClienteForm'
import Conductores from './pages/Conductores'
import ConductorForm from './pages/ConductorForm'
import Propietarios from './pages/Propietarios'
import PropietarioForm from './pages/PropietarioForm'
import Transportadoras from './pages/Transportadoras'
import TransportadoraForm from './pages/TransportadoraForm'
import Vehiculos from './pages/Vehiculos'
import VehiculoForm from './pages/VehiculoForm'
import MatrizDestinos from './pages/MatrizDestinos'
import Fuec from './pages/Fuec'
import FuecForm from './pages/FuecForm'
import FuecImprimir from './pages/FuecImprimir'
import VerificarFuec from './pages/VerificarFuec'
import Usuarios from './pages/Usuarios'
import Empresas from './pages/Empresas'
import Historial from './pages/Historial'
import NuevaPassword from './pages/NuevaPassword'
import AccesoEmpresa from './pages/AccesoEmpresa'

// Protege las rutas internas: si no hay sesión, manda al login.
function Protected({ children }) {
  const { user, loading, sinAcceso, logout } = useAuth()
  const { empresa } = useEmpresa() || {}
  if (loading) return <div className="grid h-full place-items-center text-ink-faint">Cargando…</div>
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
        <p className="mt-2 text-sm text-ink-soft">Tu cuenta no está habilitada (no tiene un usuario activo en el sistema). Comunícate con el administrador de tu empresa.</p>
        <button className="btn-primary mt-5" onClick={logout}>Cerrar sesión</button>
      </div>
    </div>
  )
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* Verificación pública del FUEC (QR) — sin login */}
      <Route path="/verificar/:id" element={<VerificarFuec />} />
      <Route path="/nueva-password" element={<NuevaPassword />} />
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
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="empresas" element={<Empresas />} />
        <Route path="historial" element={<Historial />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
