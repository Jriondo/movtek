import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listClientes, exportClientesCsv, nombreMostrar } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'

// Consulta de clientes maestros: búsqueda, lista, nuevo y descargar a Excel.
export default function Clientes() {
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const [documento, setDocumento] = useState('')
  const [nombre, setNombre] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  async function cargar(filtros = {}) {
    setLoading(true)
    try {
      setRows(await listClientes({ empresaId: empresa?.id, ...filtros }))
    } finally {
      setLoading(false)
    }
  }

  // Recarga al entrar y cuando cambia la empresa activa.
  useEffect(() => { cargar() }, [empresa?.id])

  function buscar(e) {
    e?.preventDefault()
    cargar({ documento, nombre })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Clientes maestros</h1>
        <p className="mt-1 text-sm text-ink-soft">Consulta, crea y administra los clientes de la cooperativa.</p>
      </div>

      {/* Filtros */}
      <form onSubmit={buscar} className="card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="f-doc">Documento</label>
            <input id="f-doc" className="input" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="N° de documento" />
          </div>
          <div>
            <label className="label" htmlFor="f-nom">Nombre</label>
            <input id="f-nom" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre o compañía" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">🔍 Buscar</button>
          <button type="button" className="btn-accent" onClick={() => navigate('/clientes/nuevo')}>+ Nuevo</button>
          <button type="button" className="btn-ghost" onClick={() => exportClientesCsv(rows)} disabled={!rows.length}>⭳ Descargar a Excel</button>
          {(documento || nombre) && (
            <button type="button" className="btn-ghost" onClick={() => { setDocumento(''); setNombre(''); cargar() }}>Limpiar</button>
          )}
        </div>
      </form>

      {/* Resultados */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-cloud-line px-4 py-3">
          <h2 className="font-display text-sm font-bold text-ink">Resultados</h2>
          <span className="rounded-full bg-cloud px-2.5 py-1 text-xs font-bold text-ink-soft">{rows.length} registro{rows.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">Cargando…</p>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-ink">Sin resultados</p>
            <p className="mt-1 text-sm text-ink-soft">Crea tu primer cliente con el botón “Nuevo”.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cloud-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3 font-bold">Documento</th>
                  <th className="px-4 py-3 font-bold">Nombre / Compañía</th>
                  <th className="px-4 py-3 font-bold">Tipo</th>
                  <th className="px-4 py-3 font-bold">Celular</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-cloud-line last:border-0 hover:bg-cloud/60">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-ink">{c.documento || '—'}</td>
                    <td className="px-4 py-3 text-ink">{nombreMostrar(c)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="pill bg-brand-50 text-brand-600">{c.tipo_persona === 'juridica' ? 'Jurídica' : 'Natural'}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">{c.celular || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {c.estado === 'inactivo'
                        ? <span className="pill bg-coral-400/15 text-coral-500">Inactivo</span>
                        : <span className="pill bg-mint-500/15 text-mint-600">Activo</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => navigate(`/clientes/${c.id}`)}>✎ Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
