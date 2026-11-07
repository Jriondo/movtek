import { useNavigate } from 'react-router-dom'

export default function Inicio() {
  const navigate = useNavigate()

  const modulos = [
    { label: 'Clientes maestros', icon: '👥', to: '/clientes', desc: 'Consulta y gestión de clientes' },
    { label: 'Conductores', icon: '🧑‍✈️', to: '/conductores', desc: 'Empleados y licencias' },
    { label: 'Propietarios', icon: '🪪', to: '/propietarios', desc: 'Dueños de vehículos' },
    { label: 'Empresas transp.', icon: '🏢', to: '/transportadoras', desc: 'Transportadoras vinculadas' },
    { label: 'Vehículos', icon: '🚚', to: '/vehiculos', desc: 'Flota de la empresa' },
    { label: 'Matriz destinos', icon: '🗺️', to: '/destinos', desc: 'Ciudades de Colombia' },
    { label: 'FUEC', icon: '📄', to: '/fuec', desc: 'Extracto del contrato' },
  ]

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
            <button key={m.label} disabled={m.soon} onClick={() => m.to && navigate(m.to)}
              className={`card p-5 text-left transition ${m.soon ? 'opacity-60' : 'hover:shadow-glow'}`}>
              <div className="text-2xl">{m.icon}</div>
              <p className="mt-2 font-display font-bold text-ink">{m.label}</p>
              <p className="text-xs text-ink-soft">{m.desc}</p>
              {m.soon && <span className="mt-2 inline-block rounded-full bg-cloud px-2 py-0.5 text-[10px] font-bold text-ink-faint">pronto</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
