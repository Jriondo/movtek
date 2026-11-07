import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listVehiculos, exportVehiculosCsv } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'

// Módulo 4.5 — Consulta de vehículos.
export default function Vehiculos() {
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const [placa, setPlaca] = useState('')
  const [movil, setMovil] = useState('')
  const [estado, setEstado] = useState('activo')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  async function cargar(filtros) {
    setLoading(true)
    try {
      const f = filtros || { estado }
      setRows(await listVehiculos({ empresaId: empresa?.id, ...f }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar({ estado }) }, [empresa?.id])

  function buscar(e) {
    e?.preventDefault()
    cargar({ placa, movil, estado })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Vehículos</h1>
        <p className="mt-1 text-sm text-ink-soft">Flota de la empresa, con su propietario y empresa transportadora.</p>
      </div>

      {/* Filtros */}
      <form onSubmit={buscar} className="card p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="f-placa">Placa</label>
            <input id="f-placa" className="input" value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="Ej. PBA-4471" />
          </div>
          <div>
            <label className="label" htmlFor="f-movil">Móvil (N° interno)</label>
            <input id="f-movil" className="input" value={movil} onChange={(e) => setMovil(e.target.value)} placeholder="Ej. 28" />
          </div>
          <div>
            <label className="label" htmlFor="f-estado">Estado</label>
            <select id="f-estado" className="input" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
              <option value="">Todos</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">🔍 Buscar</button>
          <button type="button" className="btn-accent" onClick={() => navigate('/vehiculos/nuevo')}>+ Nuevo</button>
          <button type="button" className="btn-ghost" onClick={() => exportVehiculosCsv(rows)} disabled={!rows.length}>⭳ Descargar a Excel</button>
        </div>
      </form>

      {/* Resultados */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-cloud-line px-4 py-3">
          <h2 className="font-display text-sm font-bold text-ink">Resultados</h2>
          <span className="rounded-full bg-cloud px-2.5 py-1 text-xs font-bold text-ink-soft">{rows.length} vehículo{rows.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-ink-faint">Cargando…</p>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-ink">Sin resultados</p>
            <p className="mt-1 text-sm text-ink-soft">Registra tu primer vehículo con el botón “Nuevo”.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cloud-line text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3 font-bold">Placa</th>
                  <th className="px-4 py-3 font-bold">Móvil</th>
                  <th className="px-4 py-3 font-bold">Clase</th>
                  <th className="px-4 py-3 font-bold">Marca / Línea</th>
                  <th className="px-4 py-3 font-bold">Modelo</th>
                  <th className="px-4 py-3 font-bold">Servicio</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-b border-cloud-line last:border-0 hover:bg-cloud/60">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-ink">{v.placa || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">{v.numero_interno || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{v.clase || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">{[v.marca, v.linea].filter(Boolean).join(' ') || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">{v.modelo || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="pill bg-brand-50 text-brand-600">{v.vehiculo_servicio || '—'}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {v.estado === 'inactivo'
                        ? <span className="pill bg-coral-400/15 text-coral-500">Inactivo</span>
                        : <span className="pill bg-mint-500/15 text-mint-600">Activo</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => navigate(`/vehiculos/${v.id}`)}>✎ Editar</button>
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
