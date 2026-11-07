import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPropietarios, listUsuarios, nombrePropietario } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'

const MODULOS = [
  { label: 'Clientes maestros', icon: '👥', to: '/clientes', desc: 'Consulta y gestión de clientes', roles: ['admin', 'operativo'] },
  { label: 'Conductores', icon: '🧑‍✈️', to: '/conductores', desc: 'Empleados y licencias', roles: ['admin', 'operativo', 'propietario'] },
  { label: 'Propietarios', icon: '🪪', to: '/propietarios', desc: 'Dueños de vehículos', roles: ['admin', 'operativo'] },
  { label: 'Empresas transp.', icon: '🏢', to: '/transportadoras', desc: 'Transportadoras vinculadas', roles: ['admin', 'operativo'] },
  { label: 'Vehículos', icon: '🚚', to: '/vehiculos', desc: 'Flota de la empresa', roles: ['admin', 'operativo', 'propietario'] },
  { label: 'Matriz destinos', icon: '🗺️', to: '/destinos', desc: 'Ciudades de Colombia', roles: ['admin', 'operativo'] },
  { label: 'FUEC', icon: '📄', to: '/fuec', desc: 'Extracto del contrato', roles: ['admin', 'operativo', 'propietario'] },
  { label: 'Usuarios', icon: '🔑', to: '/usuarios', desc: 'Accesos y roles', roles: ['admin'] },
]

export default function Inicio() {
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const { rol, esAdmin, esPropietario } = useAuth()
  const [propietarios, setPropietarios] = useState([])
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => {
    if (esPropietario) return
    listPropietarios({ empresaId: empresa?.id, estado: 'activo' }).then(setPropietarios).catch(() => {})
    listUsuarios({ empresaId: empresa?.id }).then(setUsuarios).catch(() => {})
  }, [empresa?.id, esPropietario])

  const propConUsuario = useMemo(() => new Set(usuarios.filter((u) => u.propietario_id).map((u) => String(u.propietario_id))), [usuarios])
  const modulos = MODULOS.filter((m) => m.roles.includes(rol))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Inicio</h1>
        <p className="mt-1 text-sm text-ink-soft">Panel de Movtek. Accede rápido a tus módulos.</p>
      </div>

      {/* Módulos */}
      <div>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-faint">Módulos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modulos.map((m) => (
            <button key={m.label} onClick={() => navigate(m.to)} className="card p-5 text-left transition hover:shadow-glow">
              <div className="text-2xl">{m.icon}</div>
              <p className="mt-2 font-display font-bold text-ink">{m.label}</p>
              <p className="text-xs text-ink-soft">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Usuarios de los propietarios (admin y operativo) */}
      {!esPropietario && (
        <div>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-faint">Usuarios de los propietarios</h2>
          <div className="card p-5">
            <p className="mb-3 text-xs text-ink-soft">
              Para crear el usuario de un propietario, primero el operativo debe tener registrado en el sistema al propietario y sus vehículos.
              {esAdmin ? ' Luego crea aquí su acceso.' : ' Luego el administrador crea su acceso.'}
            </p>
            {propietarios.length === 0 ? (
              <p className="text-sm text-ink-soft">Aún no hay propietarios registrados.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {propietarios.map((p) => {
                  const tiene = propConUsuario.has(String(p.id))
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cloud px-3 py-2 text-sm">
                      <span className="font-semibold text-ink">{nombrePropietario(p)}{p.documento ? ` · ${p.documento}` : ''}</span>
                      {tiene ? (
                        <span className="pill bg-mint-500/15 text-mint-600">✅ Ya tiene usuario</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="pill bg-amber-100 text-amber-700">⚠️ No ha creado su usuario</span>
                          {esAdmin && <button className="btn-accent !px-3 !py-1.5 text-xs" onClick={() => navigate('/usuarios')}>Crear usuario</button>}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
