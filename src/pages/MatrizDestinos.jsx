import { useEffect, useState } from 'react'
import { listDestinos, saveDestino, deleteDestino, contarDestinos, importarCatalogoDestinos } from '../lib/db'
import { DEPARTAMENTOS_NOMBRES } from '../lib/colombia'

// Módulo — Matriz de destinos (ciudades de Colombia por departamento).
export default function MatrizDestinos() {
  const [departamento, setDepartamento] = useState(DEPARTAMENTOS_NOMBRES[1]) // Antioquia por defecto
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(null)
  const [importing, setImporting] = useState(false)
  const [nuevo, setNuevo] = useState({ nombre: '', codigo_postal: '', area_metropolitana: false })

  async function cargar() {
    setLoading(true)
    try {
      setRows(await listDestinos({ departamento }))
      setTotal(await contarDestinos())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [departamento])

  async function actualizar(row, cambios) {
    const actualizado = { ...row, ...cambios }
    setRows((rs) => rs.map((r) => (r.id === row.id ? actualizado : r)))
    await saveDestino(actualizado)
  }

  async function eliminar(row) {
    setRows((rs) => rs.filter((r) => r.id !== row.id))
    await deleteDestino(row.id)
  }

  async function agregar() {
    if (!nuevo.nombre.trim()) return
    await saveDestino({ departamento, estado: 'activo', ...nuevo })
    setNuevo({ nombre: '', codigo_postal: '', area_metropolitana: false })
    cargar()
  }

  async function importar() {
    setImporting(true)
    try { await importarCatalogoDestinos(); await cargar() } finally { setImporting(false) }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Matriz de destinos</h1>
        <p className="mt-1 text-sm text-ink-soft">Ciudades de Colombia por departamento. {total != null && <span className="font-semibold">{total} destinos en total.</span>}</p>
      </div>

      {/* Selección */}
      <div className="card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pais">País</label>
            <select id="pais" className="input" disabled><option>Colombia</option></select>
          </div>
          <div>
            <label className="label" htmlFor="dep">Departamento</label>
            <select id="dep" className="input" value={departamento} onChange={(e) => setDepartamento(e.target.value)}>
              {DEPARTAMENTOS_NOMBRES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        {total === 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-600">
            <span>Aún no hay destinos cargados en la base de datos.</span>
            <button className="btn-primary !py-1.5" onClick={importar} disabled={importing}>{importing ? 'Importando…' : 'Importar ciudades de Colombia'}</button>
          </div>
        )}
      </div>

      {/* Tabla de ciudades */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-cloud-line px-4 py-3">
          <h2 className="font-display text-sm font-bold text-ink">{departamento}</h2>
          <span className="rounded-full bg-cloud px-2.5 py-1 text-xs font-bold text-ink-soft">{rows.length} ciudad{rows.length !== 1 ? 'es' : ''}</span>
        </div>

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cloud-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3 font-bold">Ciudad</th>
                  <th className="px-4 py-3 font-bold">Código postal</th>
                  <th className="px-4 py-3 text-center font-bold">Área metropolitana</th>
                  <th className="px-4 py-3 text-center font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-cloud-line last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-ink">{r.nombre}</td>
                    <td className="px-4 py-2.5">
                      <input className="input !py-1.5 w-32" defaultValue={r.codigo_postal || ''}
                        onBlur={(e) => e.target.value !== (r.codigo_postal || '') && actualizar(r, { codigo_postal: e.target.value })} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={!!r.area_metropolitana}
                        onChange={(e) => actualizar(r, { area_metropolitana: e.target.checked })} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => actualizar(r, { estado: r.estado === 'activo' ? 'inactivo' : 'activo' })}
                        className={r.estado === 'inactivo' ? 'pill bg-coral-400/15 text-coral-500' : 'pill bg-mint-500/15 text-mint-600'}>
                        {r.estado === 'inactivo' ? 'Inactivo' : 'Activo'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => eliminar(r)} title="Eliminar" className="text-ink-faint hover:text-coral-500">✕</button>
                    </td>
                  </tr>
                ))}
                {/* Fila para agregar */}
                <tr className="bg-cloud/50">
                  <td className="px-4 py-2.5">
                    <input className="input !py-1.5" placeholder="Nueva ciudad" value={nuevo.nombre}
                      onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && agregar()} />
                  </td>
                  <td className="px-4 py-2.5">
                    <input className="input !py-1.5 w-32" placeholder="C. postal" value={nuevo.codigo_postal}
                      onChange={(e) => setNuevo((n) => ({ ...n, codigo_postal: e.target.value }))} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={nuevo.area_metropolitana}
                      onChange={(e) => setNuevo((n) => ({ ...n, area_metropolitana: e.target.checked }))} />
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-ink-faint">Activo</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={agregar} className="btn-accent !px-3 !py-1.5 text-xs">+ Agregar</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
