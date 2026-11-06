import { useEmpresa } from '../context/EmpresaContext'

// Logo de la empresa activa: marca con su inicial + color, y su nombre.
export default function Logo({ compact = false, light = false }) {
  const { empresa } = useEmpresa() || {}
  const nombre = empresa?.nombre || 'Movtek'
  const inicial = nombre.trim()[0]?.toUpperCase() || 'M'
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-mint-500 text-white font-display font-extrabold text-lg shadow-glow">
        {inicial}
      </div>
      {!compact && (
        <span className={`font-display font-extrabold text-lg tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
          {nombre}
        </span>
      )}
    </div>
  )
}
