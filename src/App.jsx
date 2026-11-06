import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Clientes from './pages/Clientes'
import ClienteForm from './pages/ClienteForm'
import Conductores from './pages/Conductores'
import ConductorForm from './pages/ConductorForm'

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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
