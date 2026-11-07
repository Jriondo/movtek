import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
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

// Protege las rutas internas: si no hay sesión, manda al login.
function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid h-full place-items-center text-ink-faint">Cargando…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
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
        <Route path="fuec/:id" element={<FuecForm />} />
        <Route path="fuec/:id/imprimir" element={<FuecImprimir />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
