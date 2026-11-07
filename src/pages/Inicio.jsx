import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEmpresa } from '../context/EmpresaContext'
import { listClientes } from '../lib/db'

export default function Inicio() {
  const { demo } = useAuth()
  const { empresa } = useEmpresa()
  const navigate = useNavigate()
  const [totalClientes, setTotalClientes] = useState(null)

  useEffect(() => {
    listClientes({ empresaId: empresa?.id }).then((r) => setTotalClientes(r.length)).catch(() => setTotalClientes(0))
  }, [empresa?.id])

  const modulos = [
    { label: 'Clientes maestros', icon: '👥', to: '/clientes', desc: 'Consulta y gestión de clientes' },
    { label: 'Conductores', icon: '🧑‍✈️', to: '/conductores', desc: 'Empleados y licencias' },
    { label: 'Propietarios', icon: '🪪', to: '/propietarios', desc: 'Dueños de vehículos' },
    { label: 'Empresas transp.', icon: '🏢', to: '/transportadoras', desc: 'Transportadoras vinculadas' },
    { label: 'Vehículos', icon: '🚚', to: '/vehiculos', desc: 'Flota de la empresa' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Inicio</h1>
        <p className="mt-1 text-sm text-ink-soft">Panel de Movtek. Accede rápido a tus módulos.</p>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={() => navigate('/clientes')} className="card p-4 text-left transition hover:shadow-glow">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Clientes</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-brand-600">{totalClientes ?? '—'}</p>
          <p className="text-xs text-ink-soft">registrados</p>
        </button>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Módulos activos</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-ink">5</p>
          <p className="text-xs text-ink-soft">de varios en camino</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Base de datos</p>
          <p className="mt-1 font-display text-xl font-extrabold text-ink">{demo ? 'Modo demo' : 'Supabase'}</p>
          <p className="text-xs text-ink-soft">{demo ? 'sin conectar' : 'conectada'}</p>
        </div>
        <div className="card flex items-center justify-center bg-gradient-to-br from-brand-500 to-mint-500 p-4 text-white">
          <div className="text-center">
            <p className="font-display text-lg font-extrabold">Movtek</p>
            <p className="text-xs text-white/80">Transporte Conectado</p>
          </div>
        </div>
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
