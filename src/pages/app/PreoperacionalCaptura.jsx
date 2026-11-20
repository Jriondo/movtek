import { useMemo, useState } from 'react'
import { SECCIONES, SALUD, OPCIONES, requiereObservacion, saludEnRiesgo, estadoGeneral, resumenRespuestas, TIPO } from '../../lib/preoperacional'
import { savePreoperacional, fechaLocalISO } from '../../lib/db'
import SignaturePad from '../../components/SignaturePad'

// Formulario que llena el conductor. NO pide placa/nombre/datos del vehículo
// (se toman de la base). Sí pide kilometraje, salud, checklist y firma.
export default function PreoperacionalCaptura({ empresa, vehiculo, conductor, onDone, onCancel }) {
  const [km, setKm] = useState('')
  const [salud, setSalud] = useState({})
  const [resp, setResp] = useState({})
  const [obs, setObs] = useState({})
  const [firma, setFirma] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const setSalud1 = (k, v) => setSalud((s) => ({ ...s, [k]: v }))
  const setResp1 = (k, v) => setResp((r) => ({ ...r, [k]: v }))
  const setObs1 = (k, v) => setObs((o) => ({ ...o, [k]: v }))

  const nombreCond = `${conductor?.nombres || ''} ${conductor?.apellidos || ''}`.trim()
  const resumen = useMemo(() => resumenRespuestas(resp), [resp])

  function validar() {
    if (!km.trim()) return 'Escribe el kilometraje actual del vehículo.'
    // Salud
    for (const p of SALUD) {
      if (!salud[p.key]) return 'Responde todas las preguntas de la encuesta de salud.'
      if (saludEnRiesgo(p, salud[p.key]) && !(salud['obs_' + p.key] || '').trim())
        return `Explica: "${p.label}"`
    }
    // Checklist: todos respondidos + observación si R o M
    for (const sec of SECCIONES) {
      for (const it of sec.items) {
        if (!resp[it.key]) return `Falta calificar: "${it.label}"`
        if (requiereObservacion(resp[it.key]) && !(obs[it.key] || '').trim())
          return `Como marcaste ${resp[it.key] === 'R' ? 'Regular' : 'Malo'}, explica por qué: "${it.label}"`
      }
    }
    if (!firma) return 'Firma al final para terminar la preoperacional.'
    return ''
  }

  async function enviar() {
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

  return (
    <div className="mx-auto max-w-xl px-4 pb-28 pt-4">
      <button onClick={onCancel} className="text-sm font-semibold text-brand-500">← Volver</button>
      <h1 className="mt-1 font-display text-xl font-extrabold text-ink">Revisión preoperacional</h1>
      <p className="text-sm text-ink-soft">{vehiculo?.placa} · {vehiculo?.marca} {vehiculo?.modelo} · Móvil {vehiculo?.numero_interno || '—'}</p>

      {error && <p className="mt-3 rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-semibold text-coral-500">{error}</p>}

      {/* Kilometraje */}
      <div className="card mt-4 p-4">
        <label className="label">Kilometraje actual *</label>
        <input className="input mt-1" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} placeholder="Ej. 98256" />
      </div>

      {/* Encuesta de salud */}
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

      {/* Checklist por secciones */}
      {SECCIONES.map((sec) => (
        <div key={sec.titulo} className="card mt-4 p-4">
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-brand-600">{sec.titulo}</h2>
          <div className="flex flex-col gap-4">
            {sec.items.map((it) => (
              <div key={it.key}>
                <p className="text-sm font-medium text-ink">{it.label}</p>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {OPCIONES.map((o) => {
                    const sel = resp[it.key] === o.v
                    return (
                      <button key={o.v} type="button" onClick={() => setResp1(it.key, o.v)}
                        className="rounded-lg border px-1 py-2 text-xs font-bold transition"
                        style={sel ? { borderColor: o.color, background: o.color + '22', color: o.color } : { borderColor: '#e2e8f0', color: '#64748b' }}>
                        {o.label}
                      </button>
                    )
                  })}
                </div>
                {requiereObservacion(resp[it.key]) && (
                  <textarea className="input mt-2 h-16 text-sm" value={obs[it.key] || ''} onChange={(e) => setObs1(it.key, e.target.value)}
                    placeholder={`¿Por qué está ${resp[it.key] === 'R' ? 'regular' : 'malo'}? (obligatorio)`} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

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
          <button onClick={enviar} disabled={guardando} className="btn-primary ml-auto">
            {guardando ? 'Guardando…' : '✅ Terminar y firmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
