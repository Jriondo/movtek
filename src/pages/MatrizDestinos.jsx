import { useEffect, useRef, useState } from 'react'
import { listDestinos, saveDestino, deleteDestino, contarDestinos, importarCatalogoDestinos, asegurarAreasMetro } from '../lib/db'
import { DEPARTAMENTOS_NOMBRES } from '../lib/colombia'
import { useAuth } from '../context/AuthContext'

// Módulo — Matriz de destinos (ciudades de Colombia por departamento).
export default function MatrizDestinos() {
  const { esAdmin } = useAuth()
  const [departamento, setDepartamento] = useState(DEPARTAMENTOS_NOMBRES[1]) // Antioquia por defecto
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(null)
  const [nuevo, setNuevo] = useState({ nombre: '' })
  const [error, setError] = useState('')
  const prep = useRef(false)

  async function cargar() {
    setLoading(true)
    setError('')
    try {
      // Una sola vez: si la base está vacía carga el catálogo, y asegura las áreas metropolitanas.
      if (!prep.current) {
        prep.current = true
        if ((await contarDestinos()) === 0) await importarCatalogoDestinos()
        await asegurarAreasMetro()
      }
      setTotal(await contarDestinos())
      setRows(await listDestinos({ departamento }))
    } catch (e) {
      prep.current = false
      setError('No se pudo cargar la base de datos. Revisa que la tabla "destinos" exista en Supabase (corre el schema.sql). Detalle: ' + (e?.message || e))
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
    setTotal((t) => (t || 1) - 1)
  }

  async function agregar() {
    if (!nuevo.nombre.trim()) return
    await saveDestino({ departamento, estado: 'activo', nombre: nuevo.nombre.trim() })
    setNuevo({ nombre: '' })
    cargar()
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
      </div>

      {error && (
        <div className="rounded-xl bg-coral-400/15 px-4 py-3 text-sm font-medium text-coral-500">{error}</div>
      )}

      {/* Tabla de ciudades */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-cloud-line px-4 py-3">
          <h2 className="font-display text-sm font-bold text-ink">{departamento}</h2>
          <span className="rounded-full bg-cloud px-2.5 py-1 text-xs font-bold text-ink-soft">{rows.length} ciudad{rows.length !== 1 ? 'es' : ''}</span>
        </div>

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">Cargando ciudades…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cloud-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3 font-bold">Ciudad</th>
                  <th className="px-4 py-3 text-center font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-cloud-line last:border-0">
                    <td className="px-4 py-2.5 font-semibold text-ink">{r.nombre}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <Switch on={r.estado !== 'inactivo'} onClick={() => actualizar(r, { estado: r.estado === 'inactivo' ? 'activo' : 'inactivo' })} />
                        <span className={`w-14 text-xs font-bold ${r.estado === 'inactivo' ? 'text-ink-faint' : 'text-mint-600'}`}>{r.estado === 'inactivo' ? 'Inactivo' : 'Activo'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {esAdmin && <button onClick={() => eliminar(r)} title="Eliminar" className="text-ink-faint hover:text-coral-500">✕</button>}
                    </td>
                  </tr>
                ))}
                {/* Fila para agregar */}
                <tr className="bg-cloud/50">
                  <td className="px-4 py-2.5">
                    <input className="input !py-1.5" placeholder="Nueva ciudad" value={nuevo.nombre}
                      onChange={(e) => setNuevo({ nombre: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && agregar()} />
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

function Switch({ on, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`relative h-6 w-11 flex-none rounded-full transition ${on ? 'bg-mint-500' : 'bg-cloud-line'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}
