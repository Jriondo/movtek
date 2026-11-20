import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPreoperacionales, listVehiculos, fechaLocalISO, slugify } from '../lib/db'
import { descargarExcel } from '../lib/excel'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'
import { normalizarPreguntas, LEYENDA, TIPO, SALUD, saludEnRiesgo } from '../lib/preoperacional'

const PERIODOS = [
  { v: 'dia', label: 'Día' },
  { v: 'semana', label: 'Semana' },
  { v: 'mes', label: 'Mes' },
  { v: 'anio', label: 'Año' },
]

// Calcula el rango [desde, hasta] (YYYY-MM-DD) según el periodo y una fecha ancla.
function rango(periodo, anclaISO) {
  const d = new Date(anclaISO + 'T12:00:00')
  const iso = (x) => fechaLocalISO(x)
  if (periodo === 'dia') return [iso(d), iso(d)]
  if (periodo === 'semana') {
    const dia = (d.getDay() + 6) % 7 // lunes=0
    const lun = new Date(d); lun.setDate(d.getDate() - dia)
    const dom = new Date(lun); dom.setDate(lun.getDate() + 6)
    return [iso(lun), iso(dom)]
  }
  if (periodo === 'mes') {
    const a = new Date(d.getFullYear(), d.getMonth(), 1)
    const b = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return [iso(a), iso(b)]
  }
  return [`${d.getFullYear()}-01-01`, `${d.getFullYear()}-12-31`]
}

const nombreTipo = (t) => t === TIPO.TALLER ? '🔧 En taller' : t === TIPO.DESCANSO ? '🛌 En descanso' : '📋 Preoperacional'
const nombreEstado = (r) => (r.tipo && r.tipo !== TIPO.PREOP) ? '—' : (r.estado_general === 'novedad' ? '⚠️ Con novedad' : '✅ OK')

export default function Preoperacionales() {
  const navigate = useNavigate()
  const { empresa } = useEmpresa() || {}
  const { esPropietario, propietarioId } = useAuth()
  const [copiado, setCopiado] = useState(false)
  const [periodo, setPeriodo] = useState('mes')
  const [ancla, setAncla] = useState(fechaLocalISO())
  const [placa, setPlaca] = useState('')
  const [conductor, setConductor] = useState('')
  const [rows, setRows] = useState([])
  const [cargando, setCargando] = useState(false)
  const [buscado, setBuscado] = useState(false)
  const [detalle, setDetalle] = useState(null)

  const [desde, hasta] = useMemo(() => rango(periodo, ancla), [periodo, ancla])

  // Trae los datos filtrados (incluye preoperacional, taller y descanso).
  async function obtenerDatos() {
    let data = await listPreoperacionales({ empresaId: empresa?.id, placa, conductor, desde, hasta })
    if (esPropietario && propietarioId) {
      const vs = await listVehiculos({ empresaId: empresa?.id })
      const mias = new Set(vs.filter((v) => String(v.propietario_id) === String(propietarioId)).map((v) => String(v.id)))
      data = data.filter((r) => mias.has(String(r.vehiculo_id)))
    }
    return data
  }

  async function cargar() {
    setCargando(true); setBuscado(true)
    try { setRows(await obtenerDatos()) } catch { setRows([]) }
    setCargando(false)
  }
  // Al cambiar de empresa se limpia el resultado (hay que volver a buscar).
  useEffect(() => { setRows([]); setBuscado(false) }, [empresa?.id])

  async function exportarExcel() {
    const cols = [
      { label: 'Fecha', get: (r) => r.fecha }, { label: 'Hora', get: (r) => r.hora || '' },
      { label: 'Placa', get: (r) => r.placa || '' }, { label: 'Móvil', get: (r) => r.numero_interno || '' },
      { label: 'Conductor', get: (r) => r.conductor_nombre || '' }, { label: 'Documento', get: (r) => r.conductor_doc || '' },
      { label: 'Kilometraje', get: (r) => r.kilometraje || '' }, { label: 'Tipo', get: (r) => nombreTipo(r.tipo) },
      { label: 'Estado', get: (r) => nombreEstado(r) },
      { label: 'Novedades', get: (r) => Object.values(r.respuestas || {}).filter((v) => v === 'R' || v === 'M').length },
      { label: 'Nota', get: (r) => r.nota || '' },
    ]
    let datos = rows
    try { datos = await obtenerDatos() } catch {}       // siempre trae lo más reciente
    if (!datos.length) { alert('No hay registros en este periodo para exportar.'); return }
    descargarExcel(`Preoperacionales_${desde}_a_${hasta}`, cols, datos, `Preoperacionales ${empresa?.nombre || ''} (${desde} a ${hasta})`)
  }

  const mesActual = ancla.slice(0, 7)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const slug = empresa?.slug || slugify(empresa?.nombre || '')
  const linkApp = `${origin}/e/${slug}/app`
  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(linkApp); setCopiado(true); setTimeout(() => setCopiado(false), 1800) } catch {}
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold text-ink">📋 Preoperacionales</h1>
        <div className="flex flex-wrap gap-2">
          {!esPropietario && <button onClick={() => navigate('/preoperacionales/preguntas')} className="btn-ghost">⚙️ Preguntas</button>}
          <button onClick={exportarExcel} className="btn-ghost">⬇️ Excel</button>
          <button onClick={() => navigate(`/preoperacionales/reporte?placa=${encodeURIComponent(placa)}&mes=${mesActual}`)} className="btn-primary">🖨️ Reporte mensual (PDF)</button>
        </div>
      </div>

      {/* Link de la app de conductores para compartir */}
      {!esPropietario && empresa && (
        <div className="card flex flex-wrap items-center gap-3 p-3">
          <span className="text-sm font-bold text-brand-600">📲 App de conductores:</span>
          <input readOnly value={linkApp} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg bg-cloud px-3 py-2 text-sm text-ink outline-none" />
          <button onClick={copiarLink} className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-bold text-white hover:bg-brand-600">
            {copiado ? '✓ Copiado' : '📋 Copiar link'}
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Periodo</label>
            <div className="mt-1 flex gap-1 rounded-xl bg-cloud p-1">
              {PERIODOS.map((p) => (
                <button key={p.v} onClick={() => setPeriodo(p.v)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition ${periodo === p.v ? 'bg-white text-brand-600 shadow-card' : 'text-ink-soft'}`}>{p.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input mt-1" value={ancla} onChange={(e) => setAncla(e.target.value)} />
          </div>
          <div>
            <label className="label">Buscar placa</label>
            <input className="input mt-1" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="Ej. GQZ874" />
          </div>
          <div>
            <label className="label">Buscar conductor</label>
            <input className="input mt-1" value={conductor} onChange={(e) => setConductor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cargar()} placeholder="Nombre o documento" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={cargar} disabled={cargando} className="btn-primary">{cargando ? 'Buscando…' : '🔍 Buscar'}</button>
          {buscado && <p className="text-xs text-ink-soft">Mostrando del <b>{desde}</b> al <b>{hasta}</b> · {rows.length} registro(s).</p>}
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-cloud text-left text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">Placa</th>
              <th className="px-3 py-2.5">Conductor</th><th className="px-3 py-2.5">Km</th>
              <th className="px-3 py-2.5">Tipo</th><th className="px-3 py-2.5">Estado</th><th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-faint">Buscando…</td></tr>
            ) : !buscado ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-faint">Elige el periodo y los filtros, luego presiona <b>🔍 Buscar</b>.</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-ink-faint">No hay preoperacionales en este periodo.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-cloud-line">
                <td className="whitespace-nowrap px-3 py-2.5">{r.fecha} <span className="text-ink-faint">{r.hora}</span></td>
                <td className="px-3 py-2.5 font-semibold">{r.placa}</td>
                <td className="px-3 py-2.5">{r.conductor_nombre}</td>
                <td className="px-3 py-2.5 tabular-nums">{r.kilometraje || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{nombreTipo(r.tipo)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{nombreEstado(r)}</td>
                <td className="px-3 py-2.5 text-right">
                  {(!r.tipo || r.tipo === TIPO.PREOP) && <button onClick={() => setDetalle(r)} className="text-xs font-semibold text-brand-500 hover:underline">Ver</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalle && <DetalleModal r={detalle} onClose={() => setDetalle(null)} />}
    </div>
  )
}

function DetalleModal({ r, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-extrabold text-ink">{r.placa} · {r.fecha}</h2>
            <p className="text-sm text-ink-soft">{r.conductor_nombre} · Km {r.kilometraje || '—'} · {r.hora}</p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">✕</button>
        </div>

        {r.salud && Object.keys(r.salud).length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            <p className="mb-1 font-bold text-brand-600">Encuesta de salud</p>
            {SALUD.filter((p) => r.salud[p.key]).map((p) => {
              const v = r.salud[p.key]
              const mal = saludEnRiesgo(p, v)
              return (
                <div key={p.key}>
                  <div className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1 text-xs ${mal ? 'bg-coral-400/10' : ''}`}>
                    <span className="text-ink">{p.label}</span>
                    <span className={`whitespace-nowrap font-bold ${mal ? 'text-coral-500' : 'text-ink-soft'}`}>{v === 'si' ? 'Sí' : 'No'}</span>
                  </div>
                  {r.salud['obs_' + p.key] && <p className="px-2 text-xs italic text-coral-500">• {r.salud['obs_' + p.key]}</p>}
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-1">
          <p className="mb-1 font-bold text-brand-600">Revisión del vehículo</p>
          {normalizarPreguntas(r.preguntas).map((p, i) => {
            const v = r.respuestas?.[p.key]
            const mal = v === 'R' || v === 'M'
            return (
              <div key={p.key}>
                <div className={`flex items-start justify-between gap-2 rounded-lg px-2 py-1 text-xs ${mal ? 'bg-coral-400/10' : ''}`}>
                  <span className="text-ink">{i + 1}. {p.titulo}</span>
                  <span className={`whitespace-nowrap font-bold ${mal ? 'text-coral-500' : 'text-ink-soft'}`}>{LEYENDA[v] || '—'}</span>
                </div>
                {r.observaciones?.[p.key] && <p className="px-2 text-xs italic text-coral-500">• {r.observaciones[p.key]}</p>}
              </div>
            )
          })}
        </div>

        {r.firma_url && (
          <div className="mt-3">
            <p className="mb-1 font-bold text-ink">Firma</p>
            <img src={r.firma_url} alt="firma" className="h-20 rounded-lg border border-cloud-line bg-white object-contain" />
          </div>
        )}
      </div>
    </div>
  )
}
