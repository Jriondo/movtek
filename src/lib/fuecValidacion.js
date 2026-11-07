// Validación de documentos al generar un FUEC.
// - Documento vencido  -> bloquea hasta actualizar.
// - Documento por vencer dentro de la vigencia -> el FUEC no puede vencer después de esa fecha.
// - Convenio: dura 6 meses (o hasta su caducidad); si venció, bloquea.

const hoyISO = () => new Date().toISOString().slice(0, 10)
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

// Fecha de vencimiento del convenio (solo si el vehículo tiene convenio).
export function convenioVence(v) {
  if (!v || v.tiene_convenio !== 'SI') return null
  if (v.caducidad_convenio) return v.caducidad_convenio
  if (v.inicio_convenio) {
    const d = new Date(v.inicio_convenio)
    d.setMonth(d.getMonth() + 6) // los convenios duran 6 meses
    return d.toISOString().slice(0, 10)
  }
  return null
}

// Lista de documentos con su fecha de vencimiento (para mostrar estado).
export function documentosVehiculo(v, conductores = []) {
  // Póliza RCC/RCE unificada (vencen el mismo día). Retrocompat con datos antiguos.
  const fechaPoliza = v?.fecha_venc_rcc_rce || v?.fecha_venc_rcc || v?.fecha_venc_rce
  const docs = [
    ['SOAT', v?.fecha_venc_soat],
    ['Póliza RCC/RCE', fechaPoliza],
    ['Revisión preventiva', v?.fecha_venc_preventiva],
    ['Revisión tecnicomecánica', v?.fecha_venc_tecnomecanica],
    ['Tarjeta de operación', v?.fecha_venc_toperacion],
  ]
  const cv = convenioVence(v)
  if (cv) docs.push(['Convenio', cv])
  conductores.forEach((c) => {
    if (c.licencia_vencimiento) docs.push([`Licencia de ${c.nombre}`, c.licencia_vencimiento])
    if (c.vigencia_seguridad) docs.push([`Seguridad social de ${c.nombre}`, c.vigencia_seguridad])
  })
  return docs.filter(([, f]) => f) // solo los que tienen fecha
}

export function validarFuec({ vehiculo, conductores = [], vigenciaFin = '' }) {
  const hoy = hoyISO()
  const docs = documentosVehiculo(vehiculo, conductores)
  const bloqueos = []
  let limite = null, limiteDoc = ''

  for (const [nombre, fecha] of docs) {
    if (fecha < hoy) {
      bloqueos.push(`${nombre} está VENCIDO (${fmt(fecha)}). Debes actualizarlo antes de generar el FUEC.`)
    } else if (limite === null || fecha < limite) {
      limite = fecha
      limiteDoc = nombre
    }
  }

  if (vigenciaFin && limite && vigenciaFin > limite) {
    bloqueos.push(`El FUEC no puede vencer después del ${fmt(limite)} porque ${limiteDoc} vence ese día. Ajusta la fecha de vencimiento o renueva el documento.`)
  }

  return { bloqueos, limite, limiteDoc, fmt }
}
