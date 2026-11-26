import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEmpresa } from '../context/EmpresaContext'
import { listCobros, listVehiculos, cobroVencido, propietarioTieneVehiculo, autoGenerarCobrosSiToca } from '../lib/db'
import Icon from '../components/Icon'

const MODULOS = [
  { label: 'Clientes maestros', icon: 'clientes', to: '/clientes', desc: 'Consulta y gestión de clientes', roles: ['admin', 'operativo'] },
  { label: 'Conductores', icon: 'conductor', to: '/conductores', desc: 'Empleados y licencias', roles: ['admin', 'operativo', 'propietario'] },
  { label: 'Propietarios', icon: 'propietario', to: '/propietarios', desc: 'Dueños de vehículos', roles: ['admin', 'operativo'] },
  { label: 'Empresas transp.', icon: 'transportadora', to: '/transportadoras', desc: 'Transportadoras vinculadas', roles: ['admin', 'operativo'] },
  { label: 'Vehículos', icon: 'vehiculo', to: '/vehiculos', desc: 'Flota de la empresa', roles: ['admin', 'operativo', 'propietario', 'mantenimiento'] },
  { label: 'Matriz destinos', icon: 'mapa', to: '/destinos', desc: 'Ciudades de Colombia', roles: ['admin', 'operativo'] },
  { label: 'FUEC', icon: 'fuec', to: '/fuec', desc: 'Extracto del contrato', roles: ['admin', 'operativo', 'propietario'] },
  { label: 'Preoperacionales', icon: 'checklist', to: '/preoperacionales', desc: 'Revisiones diarias', roles: ['admin', 'operativo', 'propietario', 'mantenimiento'] },
  { label: 'Plan de rodamiento', icon: 'rodamiento', to: '/rodamiento', desc: 'Programación por días', roles: ['admin', 'operativo', 'propietario'] },
  { label: 'Plan de mantenimiento', icon: 'mantenimiento', to: '/mantenimiento', desc: 'Preventivo y bitácora', roles: ['admin', 'operativo', 'propietario', 'mantenimiento'] },
  { label: 'Cobros', icon: 'fuec', to: '/cobros', desc: 'Cuotas mensuales por vehículo', roles: ['admin', 'propietario'] },
  { label: 'Empresas', icon: 'empresa', to: '/empresas', desc: 'Plataforma de cada empresa', roles: ['admin'] },
  { label: 'Usuarios', icon: 'usuarios', to: '/usuarios', desc: 'Accesos y roles', roles: ['admin'] },
  { label: 'Almacenamiento', icon: 'almacenamiento', to: '/almacenamiento', desc: 'Espacio y optimización', roles: ['admin'] },
]

export default function Inicio() {
  const navigate = useNavigate()
  const { rol, esAdmin, esPropietario, propietarioId } = useAuth()
  const { empresa } = useEmpresa() || {}
  const verCobros = esAdmin || rol === 'admin_empresa' || esPropietario

  // Avisos de cobros vencidos (pendientes después del día 10 del mes).
  const [vencidos, setVencidos] = useState([])
  useEffect(() => {
    if (!verCobros || !empresa?.id) { setVencidos([]); return }
    (async () => {
      // Genera automáticamente los cobros del mes (solo admin) antes de revisar vencidos.
      if (esAdmin || rol === 'admin_empresa') await autoGenerarCobrosSiToca(empresa).catch(() => {})
      const cs = await listCobros({ empresaId: empresa.id, estado: 'pendiente' }).catch(() => [])
      let pend = cs.filter((c) => cobroVencido(c))
      if (esPropietario && propietarioId) {
        const vs = await listVehiculos({ empresaId: empresa.id }).catch(() => [])
        const mios = new Set(vs.filter((v) => propietarioTieneVehiculo(v, propietarioId)).map((v) => String(v.id)))
        pend = pend.filter((c) => mios.has(String(c.vehiculo_id)))
      }
      setVencidos(pend)
    })().catch(() => setVencidos([]))
  }, [empresa?.id, verCobros, esPropietario, propietarioId])
  const totalVencido = useMemo(() => vencidos.reduce((s, c) => s + (Number(c.monto) || 0), 0), [vencidos])
  // El Administrador de empresa ve los módulos de nivel admin, salvo los del sistema (Movtek).
  const SISTEMA_SOLO = ['/empresas', '/almacenamiento']
  const modulos = MODULOS.filter((m) =>
    m.roles.includes(rol) ||
    (rol === 'admin_empresa' && m.roles.includes('admin') && !SISTEMA_SOLO.includes(m.to))
  )
  const nombreEmp = empresa?.nombre || 'Movtek'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Inicio</h1>
        <p className="mt-1 text-sm text-ink-soft">Panel de {nombreEmp}. Accede rápido a tus módulos.</p>
      </div>

      {vencidos.length > 0 && (
        <button onClick={() => navigate('/cobros')} className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-coral-400/50 bg-coral-400/10 px-4 py-3 text-left">
          <span className="text-xl">🔴</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-coral-600">
              {esPropietario
                ? `Tienes ${vencidos.length} cobro(s) pendiente(s) vencido(s)`
                : `Hay ${vencidos.length} cobro(s) vencido(s) sin pagar`}
            </p>
            <p className="text-xs text-ink-soft">Total pendiente vencido: <b>${totalVencido.toLocaleString('es-CO')}</b>. Se pasó el día 10 del mes. Toca para ver el detalle.</p>
          </div>
          <span className="rounded-lg bg-coral-500 px-3 py-1.5 text-xs font-bold text-white">Ver cobros</span>
        </button>
      )}

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
