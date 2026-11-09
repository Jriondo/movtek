import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const MODULOS = [
  { label: 'Clientes maestros', icon: 'clientes', to: '/clientes', desc: 'Consulta y gestión de clientes', roles: ['admin', 'operativo'] },
  { label: 'Conductores', icon: 'conductor', to: '/conductores', desc: 'Empleados y licencias', roles: ['admin', 'operativo', 'propietario'] },
  { label: 'Propietarios', icon: 'propietario', to: '/propietarios', desc: 'Dueños de vehículos', roles: ['admin', 'operativo'] },
  { label: 'Empresas transp.', icon: 'transportadora', to: '/transportadoras', desc: 'Transportadoras vinculadas', roles: ['admin', 'operativo'] },
  { label: 'Vehículos', icon: 'vehiculo', to: '/vehiculos', desc: 'Flota de la empresa', roles: ['admin', 'operativo', 'propietario'] },
  { label: 'Matriz destinos', icon: 'mapa', to: '/destinos', desc: 'Ciudades de Colombia', roles: ['admin', 'operativo'] },
  { label: 'FUEC', icon: 'fuec', to: '/fuec', desc: 'Extracto del contrato', roles: ['admin', 'operativo', 'propietario'] },
  { label: 'Empresas', icon: 'empresa', to: '/empresas', desc: 'Plataforma de cada empresa', roles: ['admin'] },
  { label: 'Usuarios', icon: 'usuarios', to: '/usuarios', desc: 'Accesos y roles', roles: ['admin'] },
]

export default function Inicio() {
  const navigate = useNavigate()
  const { rol } = useAuth()
  const modulos = MODULOS.filter((m) => m.roles.includes(rol))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Inicio</h1>
        <p className="mt-1 text-sm text-ink-soft">Panel de Movtek. Accede rápido a tus módulos.</p>
      </div>

      <div>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-faint">Módulos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modulos.map((m) => (
            <button key={m.label} onClick={() => navigate(m.to)} className="card p-5 text-left transition hover:shadow-glow">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon name={m.icon} className="h-6 w-6" /></div>
              <p className="mt-3 font-display font-bold text-ink">{m.label}</p>
              <p className="text-xs text-ink-soft">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
