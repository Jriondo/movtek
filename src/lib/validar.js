// Devuelve la lista de etiquetas de los campos obligatorios que están vacíos.
// campos: [[nombreCampo, 'Etiqueta'], ...]
export function faltantes(form, campos) {
  return campos
    .filter(([c]) => {
      const v = form[c]
      if (Array.isArray(v)) return v.length === 0
      return v === undefined || v === null || String(v).trim() === ''
    })
    .map(([, label]) => label)
}

// Mensaje estándar de campos pendientes.
export function mensajeFaltantes(labels) {
  if (!labels.length) return ''
  return `Faltan por llenar: ${labels.join(', ')}.`
}
