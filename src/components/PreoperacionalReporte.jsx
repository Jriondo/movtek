import { normalizarPreguntas, TIPO } from '../lib/preoperacional'

// Reporte MENSUAL de revisión preoperacional, con el formato oficial (grilla por días).
// Recibe la empresa, el mes (YYYY-MM) y los registros de ese mes para UNA placa.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const LETRA = { B: 'B', R: 'R', M: 'M', NA: 'N/A' }

export default function PreoperacionalReporte({ empresa, mes, registros = [], vehiculo = null, propietarioNombre = '' }) {
  const [anio, mesNum] = (mes || '').split('-').map(Number)
  const diasMes = new Date(anio, mesNum, 0).getDate() || 31
  const dias = Array.from({ length: diasMes }, (_, i) => i + 1)

  // Preoperacionales (no taller/descanso) para la grilla.
  const preops = registros.filter((r) => (r.tipo || TIPO.PREOP) === TIPO.PREOP)
  // Índice por día -> registro (el más reciente de cada día).
  const porDia = {}
  for (const r of preops) {
    const d = Number((r.fecha || '').slice(8, 10))
    if (!porDia[d] || (r.hora || '') > (porDia[d].hora || '')) porDia[d] = r
  }
  const ultimo = preops.slice().sort((a, b) => (b.fecha + (b.hora || '')).localeCompare(a.fecha + (a.hora || '')))[0] || registros[0] || {}
  const info = ultimo // datos "foto" del vehículo
  // Preguntas usadas (de la foto del registro, o las de defecto).
  const preguntas = normalizarPreguntas((registros.find((r) => Array.isArray(r.preguntas) && r.preguntas.length) || {}).preguntas)
  // Alto de cada fila del checklist para que el reporte LLENE la hoja horizontal (menos preguntas = filas más altas).
  const filaAlto = Math.max(20, Math.round(560 / Math.max(1, preguntas.length)))
  // Datos del vehículo: de la "foto" del registro; si falta, del vehículo actual.
  const v = vehiculo || {}
  const dato = {
    placa: info.placa || v.placa || '',
    modelo: info.modelo || v.modelo || '',
    marca: info.marca || v.marca || '',
    clase: info.clase || v.clase || '',
    numero_interno: info.numero_interno || v.numero_interno || '',
    tarjeta_operacion: info.tarjeta_operacion || v.tarjeta_operacion || '',
    propietario: propietarioNombre || info.propietario || v.propietario_nombre || v.propietario || '',
    kilometraje: info.kilometraje || '',
  }

  const cel = (itemKey, d) => {
    const r = porDia[d]
    if (!r) return ''
    return LETRA[r.respuestas?.[itemKey]] || ''
  }
  const colorCel = (itemKey, d) => {
    const v = porDia[d]?.respuestas?.[itemKey]
    return v === 'M' ? '#dc2626' : v === 'R' ? '#d97706' : '#111827'
  }

  // Novedades del mes (ítems R/M con su observación).
  const novedades = []
  for (const r of preops) {
    for (const it of preguntas) {
      const v = r.respuestas?.[it.key]
      if (v === 'R' || v === 'M') novedades.push(`${(r.fecha || '').slice(8, 10)}: ${it.titulo} (${v === 'R' ? 'Regular' : 'Malo'})${r.observaciones?.[it.key] ? ' - ' + r.observaciones[it.key] : ''}`)
    }
  }

  return (
    <div className="preop-rep">
      <style>{`
        .preop-rep { width: 1056px; background:#fff; color:#111827; font-family: Arial, Helvetica, sans-serif; font-size:8px; }
        .preop-rep table { border-collapse: collapse; width:100%; }
        .preop-rep td, .preop-rep th { border:0.6px solid #475569; padding:1px 2px; }
        .pr-head { display:flex; align-items:center; border:1px solid #475569; border-bottom:0; }
        .pr-head .lg { width:150px; padding:4px; text-align:center; border-right:1px solid #475569; }
        .pr-head .lg img { max-height:48px; max-width:140px; object-fit:contain; }
        .pr-head .ti { flex:1; text-align:center; padding:4px; }
        .pr-head .sl { width:170px; text-align:center; padding:4px; border-left:1px solid #475569; font-style:italic; color:#166534; font-weight:bold; }
        .pr-title { font-size:12px; font-weight:bold; }
        .pr-sub { font-size:10px; font-weight:bold; }
        .pr-band { background:#e2e8f0; font-weight:bold; text-align:center; }
        .pr-sec { background:#cbd5e1; font-weight:bold; text-align:center; }
        .preop-rep table.pr-grid { table-layout: fixed; width: 1056px; }
        .pr-itm { text-align:left; white-space:normal; word-break:break-word; vertical-align:top; line-height:1.12; }
        .pr-itm .pr-desc { font-weight:normal; color:#475569; font-size:7px; }
        .pr-c { text-align:center; }
        .pr-k { font-weight:bold; }
      `}</style>

      {/* Encabezado */}
      <div className="pr-head">
        <div className="lg">
          {empresa?.logo_url ? <img src={empresa.logo_url} alt="" /> : <b>{empresa?.nombre}</b>}
        </div>
        <div className="ti">
          <div className="pr-title">REPORTE MENSUAL REVISIÓN PREOPERACIONAL</div>
          <div className="pr-sub">{empresa?.razon_social || empresa?.nombre}</div>
          <div className="pr-sub">NIT: {empresa?.nit || ''}</div>
        </div>
        <div className="sl">{empresa?.eslogan || ''}</div>
      </div>

      {/* Información general */}
      <table>
        <tbody>
          <tr><td className="pr-band" colSpan={8}>INFORMACIÓN GENERAL</td></tr>
          <tr>
            <td><span className="pr-k">Fecha:</span> 01/{String(mesNum).padStart(2, '0')}/{anio} - {diasMes}/{String(mesNum).padStart(2, '0')}/{anio}</td>
            <td colSpan={2}><span className="pr-k">Placa:</span> {dato.placa}</td>
            <td><span className="pr-k">Modelo:</span> {dato.modelo}</td>
            <td><span className="pr-k">Clase:</span> {dato.clase}</td>
            <td colSpan={3}><span className="pr-k">Nro interno:</span> {dato.numero_interno}</td>
          </tr>
          <tr>
            <td><span className="pr-k">Propietario:</span> {dato.propietario}</td>
            <td colSpan={2}><span className="pr-k">Marca:</span> {dato.marca}</td>
            <td colSpan={2}><span className="pr-k">Tarjeta operación:</span> {dato.tarjeta_operacion}</td>
            <td colSpan={3}><span className="pr-k">Kilometraje:</span> {dato.kilometraje}</td>
          </tr>
          <tr>
            <td colSpan={8}>
              <span className="pr-k">Convenciones:</span> (B) Bueno &nbsp; (R) Regular &nbsp; (M) Malo &nbsp; (N/A) No Aplica &nbsp; (en blanco) Sin revisión
            </td>
          </tr>
        </tbody>
      </table>

      {/* Grilla por días */}
      <table className="pr-grid">
        <colgroup>
          <col style={{ width: `${1056 - diasMes * 26}px` }} />
          {dias.map((d) => <col key={d} style={{ width: '26px' }} />)}
        </colgroup>
        <thead>
          <tr>
            <th className="pr-itm">Pregunta</th>
            {dias.map((d) => <th key={d} className="pr-c">{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {preguntas.map((it) => (
            <tr key={it.key} style={{ height: filaAlto + 'px' }}>
              <td className="pr-itm"><b>{it.titulo}</b>{it.descripcion ? <span className="pr-desc"> · {it.descripcion}</span> : ''}</td>
              {dias.map((d) => <td key={d} className="pr-c" style={{ verticalAlign: 'middle', color: colorCel(it.key, d), fontWeight: cel(it.key, d) && cel(it.key, d) !== 'B' ? 'bold' : 'normal' }}>{cel(it.key, d)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pie: observaciones + firma */}
      <table>
        <tbody>
          <tr>
            <td style={{ width: '65%', verticalAlign: 'top', height: '120px' }}>
              <span className="pr-k">Observaciones del mes:</span><br />
              {novedades.length ? novedades.map((n, i) => <div key={i}>• {n}</div>) : 'Durante el mes no se presentaron novedades. El vehículo se encuentra en condiciones seguras de operación.'}
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'center' }}>
              <span className="pr-k">Nombre del responsable de la revisión:</span>
              <div style={{ marginTop: '4px', minHeight: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ultimo.firma_url && <img src={ultimo.firma_url} alt="firma" style={{ maxHeight: '46px', maxWidth: '70%', objectFit: 'contain', display: 'block', margin: '0 auto' }} />}
              </div>
              <div style={{ borderTop: '1px solid #111827', marginTop: '2px', paddingTop: '2px', textAlign: 'center' }}>{ultimo.conductor_nombre || ''}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
