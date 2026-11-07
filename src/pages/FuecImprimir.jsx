import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFuec, itinerarioTexto } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'

// Vista imprimible del FUEC (Guardar como PDF desde el navegador).
export default function FuecImprimir() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const [f, setF] = useState(null)

  useEffect(() => { getFuec(id).then(setF) }, [id])

  if (!f) return <div className="grid min-h-full place-items-center text-ink-faint">Cargando…</div>

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-ink sm:p-10">
      {/* Barra de acciones (no se imprime) */}
      <div className="mb-6 flex gap-2 print:hidden">
        <button onClick={() => window.print()} className="btn-primary">🖨️ Imprimir / Guardar PDF</button>
        <button onClick={() => navigate('/fuec')} className="btn-ghost">Retornar</button>
      </div>

      <div className="border border-ink/20 p-6">
        <div className="flex items-start justify-between border-b border-ink/20 pb-4">
          <div>
            <h1 className="font-display text-xl font-extrabold">{empresa?.nombre || 'Empresa transportadora'}</h1>
            <p className="text-sm text-ink-soft">Formato Único de Extracto del Contrato (FUEC)</p>
          </div>
          <div className="text-right text-sm">
            <p><b>N° Maestro:</b> {f.no_maestro || '—'}</p>
            <p><b>Contrato hijo:</b> {f.contrato_hijo}</p>
            <p><b>Fecha:</b> {(f.created_at || '').slice(0, 10)}</p>
          </div>
        </div>

        <Seccion titulo="Contratante">
          <p className="font-semibold">{(f.contratantes || []).map((c) => c.nombre).join(', ')}</p>
          {f.objeto_contrato && <p className="mt-1 text-sm"><b>Objeto:</b> {f.objeto_contrato}</p>}
        </Seccion>

        <Seccion titulo="Vehículo">
          <Grid datos={[['Placa', f.placa], ['Móvil', f.movil]]} />
        </Seccion>

        <Seccion titulo="Conductores">
          <ul className="list-disc pl-5 text-sm">
            {(f.conductores || []).map((c, i) => <li key={i}>{c.nombre} {c.documento ? `· ${c.documento}` : ''}</li>)}
            {!(f.conductores || []).length && <li className="list-none text-ink-faint">Sin conductores</li>}
          </ul>
        </Seccion>

        <Seccion titulo="Itinerario">
          <p className="text-sm font-semibold">{itinerarioTexto(f) || '—'}</p>
          {f.descripcion_recorrido && <p className="mt-1 text-sm text-ink-soft">{f.descripcion_recorrido}</p>}
        </Seccion>

        <Seccion titulo="Vigencia y estrategia">
          <Grid datos={[['Desde', f.vigencia_inicio], ['Hasta', f.vigencia_fin], ['Estrategia', f.estrategia_comercial], ['Con', f.estrategia_con]]} />
        </Seccion>

        <div className="mt-10 flex justify-between text-xs text-ink-soft">
          <div className="border-t border-ink/40 pt-1" style={{ width: '45%' }}>Firma empresa transportadora</div>
          <div className="border-t border-ink/40 pt-1" style={{ width: '45%' }}>Firma contratante</div>
        </div>
        <p className="mt-4 text-center text-[11px] text-ink-faint">Generado con Movtek · Usuario: {f.usuario}</p>
      </div>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div className="mt-4 border-b border-ink/10 pb-3">
      <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-faint">{titulo}</h2>
      {children}
    </div>
  )
}
function Grid({ datos }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
      {datos.map(([k, v]) => <div key={k}><span className="text-ink-faint">{k}: </span><b>{v || '—'}</b></div>)}
    </div>
  )
}
