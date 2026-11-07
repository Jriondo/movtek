import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPropietarios, exportPropietariosCsv, nombrePropietario, deletePropietario } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'

// Módulo 4.3 — Consulta de propietarios.
export default function Propietarios() {
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const [documento, setDocumento] = useState('')
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState('todos')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)

  async function consultar(e) {
    e?.preventDefault()
    setLoading(true)
    setBuscado(true)
    try {
      setRows(await listPropietarios({ empresaId: empresa?.id, documento, nombre, estado: estado === 'todos' ? '' : estado }))
    } finally {
      setLoading(false)
    }
  }

  // ⚠️ SOLO PRUEBAS — quitar en producción (necesitamos historial)
  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar al propietario ${nombrePropietario(p)}? Esta acción no se puede deshacer.`)) return
    await deletePropietario(p.id); consultar()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Propietarios</h1>
        <p className="mt-1 text-sm text-ink-soft">Administra a los propietarios de los vehículos de la empresa.</p>
      </div>

      {/* Filtros */}
      <form onSubmit={consultar} className="card p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="f-doc">Documento</label>
            <input id="f-doc" className="input" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="N° de documento" />
          </div>
          <div>
            <label className="label" htmlFor="f-nom">Nombre</label>
            <input id="f-nom" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre o compañía" />
          </div>
          <div>
            <label className="label" htmlFor="f-est">Estado</label>
            <select id="f-est" className="input" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">🔍 Consultar</button>
          <button type="button" className="btn-accent" onClick={() => navigate('/propietarios/nuevo')}>+ Nuevo</button>
          <button type="button" className="btn-ghost" onClick={() => exportPropietariosCsv(rows)} disabled={!rows.length}>⭳ Descargar a Excel</button>
        </div>
      </form>

      {/* Resultados — solo después de consultar */}
      {buscado && (
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
              <p className="mt-1 text-sm text-ink-soft">Prueba con otros filtros o registra uno con “Nuevo”.</p>
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
                    <th className="px-4 py-3 font-bold">Correo</th>
                    <th className="px-4 py-3 font-bold">Estado</th>
                    <th className="px-4 py-3 font-bold"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-cloud-line last:border-0 hover:bg-cloud/60">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-ink">{p.documento || '—'}</td>
                      <td className="px-4 py-3 text-ink">{nombrePropietario(p)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="pill bg-brand-50 text-brand-600">{p.tipo_persona === 'juridica' ? 'Jurídica' : 'Natural'}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">{p.celular || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{p.correo || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {p.estado === 'inactivo'
                          ? <span className="pill bg-coral-400/15 text-coral-500">Inactivo</span>
                          : <span className="pill bg-mint-500/15 text-mint-600">Activo</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => navigate(`/propietarios/${p.id}`)}>✎ Editar</button>
                          {/* ⚠️ SOLO PRUEBAS */}
                          <button className="btn-ghost !px-2 !py-1.5 text-xs text-coral-500" title="Eliminar (pruebas)" onClick={() => eliminar(p)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
