import { useEmpresa } from '../context/EmpresaContext'
import movtekLogo from '../assets/demo-logo.webp'

// Logo de la empresa activa. Movtek usa su logo oficial; cada empresa el suyo (logo_url);
// si no tiene, una marca con su inicial + color.
export default function Logo({ compact = false, light = false }) {
  const { empresa } = useEmpresa() || {}
  const nombre = empresa?.nombre || 'Movtek'
  const esMovtek = !empresa || empresa.id === 'movtek' || nombre === 'Movtek'
  const logoUrl = empresa?.logo_url || (esMovtek ? movtekLogo : null)

  if (logoUrl) {
    return <img src={logoUrl} alt={nombre} className="h-10 w-auto max-w-[170px] rounded-lg bg-white object-contain p-1 shadow-sm" />
  }

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
