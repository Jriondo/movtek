import { useEffect, useMemo, useState } from 'react'
import { SALUD, OPCIONES, requiereObservacion, saludEnRiesgo, estadoGeneral, resumenRespuestas, TIPO } from '../../lib/preoperacional'
import { savePreoperacional, fechaLocalISO, getPreguntasPreop } from '../../lib/db'
import SignaturePad from '../../components/SignaturePad'

// Formulario que llena el conductor. NO pide placa/nombre/datos del vehículo (se toman de la base).
// Paso 1: elegir estado del día → Operaciones / Taller / Descanso.
//   - Operaciones: kilometraje → checklist (preguntas de la empresa) → encuesta de salud → firma.
//   - Taller / Descanso: solo una nota opcional y Enviar.
export default function PreoperacionalCaptura({ empresa, vehiculo, conductor, onDone, onCancel }) {
  const [estado, setEstado] = useState('')   // '' | 'operaciones' | 'taller' | 'descanso'
  const [preguntas, setPreguntas] = useState([])
  const [km, setKm] = useState('')
  const [salud, setSalud] = useState({})
  const [resp, setResp] = useState({})
  const [obs, setObs] = useState({})
  const [firma, setFirma] = useState('')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { getPreguntasPreop(empresa?.id).then(setPreguntas).catch(() => setPreguntas([])) }, [empresa?.id])

  const setSalud1 = (k, v) => setSalud((s) => ({ ...s, [k]: v }))
  const setResp1 = (k, v) => setResp((r) => ({ ...r, [k]: v }))
  const setObs1 = (k, v) => setObs((o) => ({ ...o, [k]: v }))

  const nombreCond = `${conductor?.nombres || ''} ${conductor?.apellidos || ''}`.trim()
  const resumen = useMemo(() => resumenRespuestas(resp), [resp])

  function validar() {
    if (!km.trim()) return 'Escribe el kilometraje actual del vehículo.'
    // Checklist: todos respondidos + observación si R o M
    for (const p of preguntas) {
      if (!resp[p.key]) return `Falta calificar: "${p.titulo}"`
      if (requiereObservacion(resp[p.key]) && !(obs[p.key] || '').trim())
        return `Como marcaste ${resp[p.key] === 'R' ? 'Regular' : 'Malo'}, explica por qué: "${p.titulo}"`
    }
    // Salud
    for (const p of SALUD) {
      if (!salud[p.key]) return 'Responde todas las preguntas de la encuesta de salud.'
      if (saludEnRiesgo(p, salud[p.key]) && !(salud['obs_' + p.key] || '').trim())
        return `Explica: "${p.label}"`
    }
    if (!firma) return 'Firma al final para terminar la preoperacional.'
    return ''
  }

  // Guardar OPERACIONES (preoperacional completa).
  async function enviarOperaciones() {
    const err = validar()
    if (err) { setError(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    setError(''); setGuardando(true)
    try {
      const ahora = new Date()
      await savePreoperacional({
        empresa_id: empresa?.id,
        vehiculo_id: vehiculo?.id,
        conductor_id: conductor?.id,
        tipo: TIPO.PREOP,
        fecha: fechaLocalISO(ahora),
        hora: ahora.toTimeString().slice(0, 5),
        kilometraje: km.trim(),
        placa: vehiculo?.placa,
        numero_interno: vehiculo?.numero_interno,
        marca: vehiculo?.marca,
        modelo: vehiculo?.modelo,
        clase: vehiculo?.clase,
        propietario: vehiculo?.propietario_nombre || vehiculo?.propietario || '',
        tarjeta_operacion: vehiculo?.tarjeta_operacion || '',
        conductor_nombre: nombreCond,
        conductor_doc: conductor?.documento || '',
        preguntas,                 // "foto" de las preguntas usadas (para el reporte)
        respuestas: resp,
        observaciones: obs,
        salud,
        estado_general: estadoGeneral(resp),
        firma_url: firma,
      })
      onDone?.()
    } catch (e) {
      setError('No se pudo guardar. ' + (e?.message || ''))
      setGuardando(false)
    }
  }

  // Guardar TALLER / DESCANSO (solo una nota opcional).
  async function enviarEstado(tipo) {
    setError(''); setGuardando(true)
    try {
      const ahora = new Date()
      await savePreoperacional({
        empresa_id: empresa?.id, vehiculo_id: vehiculo?.id, conductor_id: conductor?.id,
        tipo, fecha: fechaLocalISO(ahora), hora: ahora.toTimeString().slice(0, 5),
        placa: vehiculo?.placa, numero_interno: vehiculo?.numero_interno,
        conductor_nombre: nombreCond, conductor_doc: conductor?.documento || '', nota,
      })
      onDone?.()
    } catch (e) {
      setError('No se pudo guardar. ' + (e?.message || ''))
      setGuardando(false)
    }
  }

  // ---------- PASO 1: elegir estado del día ----------
  if (!estado) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-10 pt-4">
        <button onClick={onCancel} className="text-sm font-semibold text-brand-500">← Volver</button>
        <h1 className="mt-1 font-display text-xl font-extrabold text-ink">¿Cómo está el vehículo hoy?</h1>
        <p className="text-sm text-ink-soft">{vehiculo?.placa} · {vehiculo?.marca} {vehiculo?.modelo} · Móvil {vehiculo?.numero_interno || '—'}</p>

        <div className="mt-5 flex flex-col gap-3">
          <button onClick={() => setEstado('operaciones')}
            className="rounded-2xl bg-brand-500 px-5 py-4 text-left text-white shadow-glow">
            <span className="block font-display text-lg font-extrabold">🚍 En operaciones</span>
            <span className="block text-sm text-white/80">Hacer la revisión preoperacional y firmar</span>
          </button>
          <button onClick={() => setEstado('taller')}
            className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-left text-amber-800">
            <span className="block font-display text-lg font-extrabold">🔧 En taller</span>
            <span className="block text-sm text-amber-700/80">Hoy no opera por mantenimiento. Solo enviar.</span>
          </button>
          <button onClick={() => setEstado('descanso')}
            className="rounded-2xl border-2 border-cloud-line bg-white px-5 py-4 text-left text-ink">
            <span className="block font-display text-lg font-extrabold">🛌 En descanso</span>
            <span className="block text-sm text-ink-soft">Hoy no opera (descanso del vehículo). Solo enviar.</span>
          </button>
        </div>
      </div>
    )
  }

  // ---------- PASO 2a: TALLER / DESCANSO (solo enviar) ----------
  if (estado === 'taller' || estado === 'descanso') {
    const esTaller = estado === 'taller'
    return (
      <div className="mx-auto max-w-xl px-4 pb-10 pt-4">
        <button onClick={() => { setEstado(''); setError('') }} className="text-sm font-semibold text-brand-500">← Cambiar estado</button>
        <h1 className="mt-1 font-display text-xl font-extrabold text-ink">{esTaller ? '🔧 Vehículo en taller' : '🛌 Vehículo en descanso'}</h1>
        <p className="text-sm text-ink-soft">{vehiculo?.placa} · {vehiculo?.marca} {vehiculo?.modelo} · Móvil {vehiculo?.numero_interno || '—'}</p>

        {error && <p className="mt-3 rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-semibold text-coral-500">{error}</p>}

        <div className="card mt-4 p-4">
          <label className="label">Nota (opcional)</label>
          <textarea className="input mt-1 h-24" value={nota} onChange={(e) => setNota(e.target.value)}
            placeholder={esTaller ? 'Motivo o taller donde está…' : 'Observación del descanso…'} />
        </div>

        <button onClick={() => enviarEstado(esTaller ? TIPO.TALLER : TIPO.DESCANSO)} disabled={guardando}
          className="btn-primary mt-4 w-full py-3.5 text-base">
          {guardando ? 'Enviando…' : '✅ Enviar'}
        </button>
      </div>
    )
  }

  // ---------- PASO 2b: OPERACIONES (preoperacional completa) ----------
  return (
    <div className="mx-auto max-w-xl px-4 pb-28 pt-4">
      <button onClick={() => { setEstado(''); setError('') }} className="text-sm font-semibold text-brand-500">← Cambiar estado</button>
      <h1 className="mt-1 font-display text-xl font-extrabold text-ink">Revisión preoperacional</h1>
      <p className="text-sm text-ink-soft">{vehiculo?.placa} · {vehiculo?.marca} {vehiculo?.modelo} · Móvil {vehiculo?.numero_interno || '—'}</p>

      {error && <p className="mt-3 rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-semibold text-coral-500">{error}</p>}

      {/* Kilometraje */}
      <div className="card mt-4 p-4">
        <label className="label">Kilometraje actual *</label>
        <input className="input mt-1" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder="Ej. 98256" />
      </div>

      {/* Checklist (preguntas de la empresa) */}
      <div className="card mt-4 p-4">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-brand-600">📋 Revisión del vehículo</h2>
        <div className="flex flex-col gap-4">
          {preguntas.map((p, i) => (
            <div key={p.key} className="border-b border-cloud-line pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-bold text-ink">{i + 1}. {p.titulo}</p>
              {p.descripcion && <p className="mt-0.5 text-xs text-ink-soft">{p.descripcion}</p>}
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {OPCIONES.map((o) => {
                  const sel = resp[p.key] === o.v
                  return (
                    <button key={o.v} type="button" onClick={() => setResp1(p.key, o.v)}
                      className="rounded-lg border px-1 py-2 text-xs font-bold transition"
                      style={sel ? { borderColor: o.color, background: o.color + '22', color: o.color } : { borderColor: '#e2e8f0', color: '#64748b' }}>
                      {o.label}
                    </button>
                  )
                })}
              </div>
              {requiereObservacion(resp[p.key]) && (
                <textarea className="input mt-2 h-16 text-sm" value={obs[p.key] || ''} onChange={(e) => setObs1(p.key, e.target.value)}
                  placeholder={`¿Por qué está ${resp[p.key] === 'R' ? 'regular' : 'malo'}? (obligatorio)`} />
              )}
            </div>
          ))}
          {preguntas.length === 0 && <p className="text-sm text-ink-soft">Cargando preguntas…</p>}
        </div>
      </div>

      {/* Encuesta de salud (AL FINAL) */}
      <div className="card mt-4 p-4">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-brand-600">🩺 Encuesta de salud</h2>
        <div className="flex flex-col gap-3">
          {SALUD.map((p) => (
            <div key={p.key}>
              <p className="text-sm font-medium text-ink">{p.label}</p>
              <div className="mt-1.5 flex gap-2">
                {['si', 'no'].map((v) => (
                  <button key={v} type="button" onClick={() => setSalud1(p.key, v)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition ${salud[p.key] === v
                      ? (saludEnRiesgo(p, v) ? 'border-coral-400 bg-coral-400/15 text-coral-500' : 'border-brand-500 bg-brand-50 text-brand-600')
                      : 'border-cloud-line text-ink-soft'}`}>
                    {v === 'si' ? 'Sí' : 'No'}
                  </button>
                ))}
              </div>
              {saludEnRiesgo(p, salud[p.key]) && (
                <textarea className="input mt-2 h-16 text-sm" value={salud['obs_' + p.key] || ''} onChange={(e) => setSalud1('obs_' + p.key, e.target.value)} placeholder="Explica brevemente (obligatorio)…" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Firma */}
      <div className="card mt-4 p-4">
        <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600">✍️ Firma del conductor</h2>
        <p className="mb-2 text-xs text-ink-soft">Yo, <b>{nombreCond || 'conductor'}</b>, declaro que la información es verídica.</p>
        <SignaturePad onChange={setFirma} />
      </div>

      {/* Resumen + enviar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-cloud-line bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="text-xs text-ink-soft">
            <span className="font-bold text-brand-600">{resumen.B}</span> buenos ·{' '}
            <span className="font-bold text-amber-600">{resumen.R}</span> reg ·{' '}
            <span className="font-bold text-coral-500">{resumen.M}</span> malos
          </div>
          <button onClick={enviarOperaciones} disabled={guardando} className="btn-primary ml-auto">
            {guardando ? 'Guardando…' : '✅ Terminar y firmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
