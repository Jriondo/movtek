import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPreguntasPreop, savePreguntasPreop } from '../lib/db'
import { PREGUNTAS_DEFAULT, nuevaPreguntaKey } from '../lib/preoperacional'
import { useEmpresa } from '../context/EmpresaContext'

// Administración de las preguntas de la preoperacional (por empresa).
export default function PreguntasPreop() {
  const navigate = useNavigate()
  const { empresa } = useEmpresa() || {}
  const [preguntas, setPreguntas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!empresa?.id) return
    getPreguntasPreop(empresa.id).then((p) => { setPreguntas(p); setCargando(false) }).catch(() => setCargando(false))
  }, [empresa?.id])

  const set = (i, campo, valor) => setPreguntas((arr) => arr.map((p, idx) => idx === i ? { ...p, [campo]: valor } : p))
  const agregar = () => setPreguntas((arr) => [...arr, { key: nuevaPreguntaKey(), titulo: '', descripcion: '' }])
  const eliminar = (i) => setPreguntas((arr) => arr.filter((_, idx) => idx !== i))
  const mover = (i, dir) => setPreguntas((arr) => {
    const j = i + dir
    if (j < 0 || j >= arr.length) return arr
    const c = [...arr];[c[i], c[j]] = [c[j], c[i]]; return c
  })

  async function guardar() {
    const limpias = preguntas.filter((p) => (p.titulo || '').trim())
    if (!limpias.length) { setMsg('Debe haber al menos una pregunta con título.'); return }
    setGuardando(true); setMsg('')
    try {
      const g = await savePreguntasPreop(empresa.id, limpias)
      setPreguntas(g); setMsg('✅ Preguntas guardadas. Los conductores las verán en su próxima preoperacional.')
    } catch (e) { setMsg('No se pudo guardar. ' + (e?.message || '')) }
    setGuardando(false)
  }

  function restaurar() {
    if (window.confirm('¿Restaurar las 15 preguntas por defecto? Se reemplazará lo que tengas en pantalla (se guarda al presionar Guardar).')) {
      setPreguntas(PREGUNTAS_DEFAULT.map((p) => ({ ...p })))
    }
  }

  if (cargando) return <div className="grid min-h-full place-items-center text-ink-faint">Cargando…</div>

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={() => navigate('/preoperacionales')} className="text-sm font-semibold text-brand-500 hover:underline">← Preoperacionales</button>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-ink">⚙️ Preguntas de la preoperacional</h1>
        <p className="text-sm text-ink-soft">Personaliza las preguntas que responde el conductor. Cada una se califica Bueno / Regular / Malo / N/A.</p>
      </div>

      {msg && <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-600">{msg}</p>}

      <div className="flex flex-col gap-3">
        {preguntas.map((p, i) => (
          <div key={p.key} className="card flex gap-3 p-4">
            <div className="flex flex-col items-center gap-1 pt-1">
              <button onClick={() => mover(i, -1)} disabled={i === 0} className="text-ink-faint hover:text-brand-500 disabled:opacity-30" title="Subir">▲</button>
              <span className="text-xs font-bold text-ink-faint">{i + 1}</span>
              <button onClick={() => mover(i, 1)} disabled={i === preguntas.length - 1} className="text-ink-faint hover:text-brand-500 disabled:opacity-30" title="Bajar">▼</button>
            </div>
            <div className="min-w-0 flex-1">
              <input className="input font-bold" value={p.titulo} onChange={(e) => set(i, 'titulo', e.target.value)} placeholder="Título (ej. DOCUMENTOS)" />
              <textarea className="input mt-2 h-16 text-sm" value={p.descripcion} onChange={(e) => set(i, 'descripcion', e.target.value)} placeholder="Descripción / qué revisar (ej. SOAT, Tarjeta de propiedad, …)" />
            </div>
            <button onClick={() => eliminar(i)} className="self-start text-coral-500 hover:text-coral-600" title="Eliminar">🗑️</button>
          </div>
        ))}
      </div>

      <button onClick={agregar} className="btn-ghost self-start">➕ Agregar pregunta</button>

      <div className="flex flex-wrap justify-center gap-2 border-t border-cloud-line pt-4">
        <button onClick={guardar} disabled={guardando} className="btn-primary">{guardando ? 'Guardando…' : '💾 Guardar preguntas'}</button>
        <button onClick={restaurar} className="btn-ghost">↩️ Restaurar las 15 por defecto</button>
        <button onClick={() => navigate('/preoperacionales')} className="btn-ghost">Retornar</button>
      </div>
    </div>
  )
}
