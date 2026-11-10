import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEmpresa } from '../context/EmpresaContext'
import Logo from './Logo'
import Icon from './Icon'

// Menú lateral. Cada item define qué roles lo ven (roles: admin, operativo, propietario).
const nav = [
  { to: '/', label: 'Inicio', icon: 'home', end: true, roles: ['admin', 'operativo', 'propietario'] },
  { to: '/clientes', label: 'Clientes maestros', icon: 'clientes', roles: ['admin', 'operativo'] },
  { to: '/conductores', label: 'Conductores', icon: 'conductor', roles: ['admin', 'operativo', 'propietario'] },
  { to: '/propietarios', label: 'Propietarios', icon: 'propietario', roles: ['admin', 'operativo'] },
  { to: '/transportadoras', label: 'Empresas transp.', icon: 'transportadora', roles: ['admin', 'operativo'] },
  { to: '/vehiculos', label: 'Vehículos', icon: 'vehiculo', roles: ['admin', 'operativo', 'propietario'] },
  { to: '/destinos', label: 'Matriz destinos', icon: 'mapa', roles: ['admin', 'operativo'] },
  { to: '/fuec', label: 'FUEC', icon: 'fuec', roles: ['admin', 'operativo', 'propietario'] },
  { to: '/empresas', label: 'Empresas', icon: 'empresa', roles: ['admin'] },
  { to: '/usuarios', label: 'Usuarios', icon: 'usuarios', roles: ['admin'] },
  { label: 'Reportes', icon: 'reportes', soon: true, roles: ['admin', 'operativo'] },
]

const ROLES_UI = [
  { value: '', label: 'Administrador (tú)' },
  { value: 'operativo', label: 'Operativo' },
  { value: 'propietario', label: 'Propietario' },
]

export default function Layout() {
  const { user, logout, demo, rol, rolReal, verComo, setVerComo } = useAuth()
  const { empresa, empresas, cambiarEmpresa } = useEmpresa()
  const email = user?.email || 'socio@movtek.app'
  const initial = email[0]?.toUpperCase() || 'M'
  const navVisible = nav.filter((item) => !item.roles || item.roles.includes(rol))

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] md:grid-cols-[250px_1fr] md:grid-rows-1">
      {/* Barra superior (móvil) */}
      <header className="col-span-full flex items-center gap-3 border-b border-cloud-line bg-white px-4 py-3 md:hidden print:hidden">
        <Logo />
      </header>

      {/* Menú lateral */}
      <aside className="hidden border-r border-cloud-line bg-white p-4 md:flex md:flex-col print:hidden">
        <div className="px-2 py-2"><Logo /></div>

        {/* Selector de empresa — solo el administrador de Movtek puede cambiar de empresa */}
        {rolReal === 'admin' && empresas?.length > 1 && (
          <label className="mt-3 block">
            <span className="mb-1 block px-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Empresa</span>
            <select
              className="w-full rounded-xl border border-cloud-line bg-cloud px-3 py-2 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand-400"
              value={empresa?.id || ''}
              onChange={(e) => cambiarEmpresa(e.target.value)}
            >
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
        )}

        <nav className="mt-4 flex flex-col gap-1">
          {navVisible.map((item) =>
            item.soon ? (
              <span key={item.label} className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-faint">
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <span className="ml-auto rounded-full bg-cloud px-2 py-0.5 text-[10px] font-bold text-ink-faint">pronto</span>
              </span>
            ) : (
              <NavLink key={item.label} to={item.to} end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive ? 'bg-brand-500 text-white shadow-glow' : 'text-ink-soft hover:bg-cloud hover:text-ink'
                  }`}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>

        {/* Ver como (solo para el administrador real, para probar los roles) */}
        {rolReal === 'admin' && (
          <label className="mt-4 block">
            <span className="mb-1 block px-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Ver como</span>
            <select className="w-full rounded-xl border border-cloud-line bg-cloud px-3 py-2 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand-400"
              value={verComo} onChange={(e) => setVerComo(e.target.value)}>
              {ROLES_UI.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
        )}

        <div className="mt-auto flex items-center gap-3 rounded-xl border border-cloud-line p-3">
          <div className="grid h-9 w-9 flex-none place-items-center rounded-full bg-brand-100 font-bold text-brand-600">{initial}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">{email}</p>
            <p className="text-[11px] text-ink-faint">{rol === 'admin' ? 'Administrador' : rol === 'operativo' ? 'Operativo' : 'Propietario'}{demo ? ' · demo' : ''}</p>
          </div>
          <button onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión" className="flex-none text-ink-faint hover:text-coral-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] font-semibold text-ink-faint">con tecnología de Movtek</p>
      </aside>

      {/* Contenido */}
      <main className="overflow-x-hidden px-4 py-6 md:px-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
