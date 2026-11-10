// Exporta datos a un archivo Excel (.xls) usando una tabla HTML.
// Excel lo abre directamente, con acentos correctos y sin librerías externas.
function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function descargarExcel(nombreArchivo, columnas, filas, titulo = '') {
  const cab = columnas.map((c) => `<th style="background:#1d4ed8;color:#fff;border:1px solid #cbd5e1;padding:6px 10px;text-align:left">${esc(c.label)}</th>`).join('')
  const cuerpo = filas.map((f) => {
    const tds = columnas.map((c) => `<td style="border:1px solid #cbd5e1;padding:6px 10px">${esc(typeof c.get === 'function' ? c.get(f) : f[c.key])}</td>`).join('')
    return `<tr>${tds}</tr>`
  }).join('')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8" /></head>
    <body>
      ${titulo ? `<h3>${esc(titulo)}</h3>` : ''}
      <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px">
        <thead><tr>${cab}</tr></thead>
        <tbody>${cuerpo}</tbody>
      </table>
    </body></html>`
  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo.endsWith('.xls') ? nombreArchivo : `${nombreArchivo}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
