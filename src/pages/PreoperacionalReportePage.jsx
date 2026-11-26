import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listPreoperacionales, listVehiculos, fechaLocalISO, getPropietario, nombrePropietario, propietarioTieneVehiculo } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'
import PreoperacionalReporte from '../components/PreoperacionalReporte'

export default function PreoperacionalReportePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { empresa } = useEmpresa() || {}
  const { esPropietario, propietarioId } = useAuth()
  const mes = params.get('mes') || fechaLocalISO().slice(0, 7)
  const placaParam = (params.get('placa') || '').trim().toUpperCase()

  const [rows, setRows] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [placaSel, setPlacaSel] = useState(placaParam)
  const [descargando, setDescargando] = useState(false)
  const ref = useRef(null)

  const [anio, mesNum] = mes.split('-').map(Number)
  const desde = `${anio}-${String(mesNum).padStart(2, '0')}-01`
  const hasta = `${anio}-${String(mesNum).padStart(2, '0')}-${String(new Date(anio, mesNum, 0).getDate()).padStart(2, '0')}`

  useEffect(() => {
    (async () => {
      let data = await listPreoperacionales({ empresaId: empresa?.id, desde, hasta })
      if (esPropietario && propietarioId) {
        const vs = await listVehiculos({ empresaId: empresa?.id })
        const mias = new Set(vs.filter((v) => propietarioTieneVehiculo(v, propietarioId)).map((v) => String(v.id)))
        data = data.filter((r) => mias.has(String(r.vehiculo_id)))
      }
      setRows(data)
    })().catch(() => setRows([]))
  }, [empresa?.id, mes])

  // Carga los vehículos para completar la info que falte en la "foto".
  useEffect(() => { listVehiculos({ empresaId: empresa?.id }).then(setVehiculos).catch(() => setVehiculos([])) }, [empresa?.id])

  const placas = useMemo(() => [...new Set(rows.map((r) => r.placa).filter(Boolean))].sort(), [rows])
  useEffect(() => { if (!placaSel && placas.length) setPlacaSel(placas[0]) }, [placas])

  const registros = useMemo(() => rows.filter((r) => (r.placa || '').toUpperCase() === placaSel), [rows, placaSel])
  const vehiculoSel = useMemo(() => vehiculos.find((v) => (v.placa || '').toUpperCase() === placaSel), [vehiculos, placaSel])

  // Nombre del propietario del vehículo (para el reporte).
  const [propNombre, setPropNombre] = useState('')
  useEffect(() => {
    const pid = vehiculoSel?.propietario_id
    if (!pid) { setPropNombre(vehiculoSel?.propietario_nombre || ''); return }
    getPropietario(pid).then((p) => setPropNombre(p ? nombrePropietario(p) : '')).catch(() => setPropNombre(''))
  }, [vehiculoSel?.propietario_id])

  async function descargarPdf() {
    if (descargando || !ref.current) return
    setDescargando(true)
    try {
      const [{ jsPDF }, h2c] = await Promise.all([import('jspdf'), import('html2canvas-pro')])
      const html2canvas = h2c.default
      const anchoReal = ref.current.scrollWidth || 1056
      const altoReal = ref.current.scrollHeight || 800
      const canvas = await html2canvas(ref.current, {
        scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false,
        // Forzamos el ancho completo del reporte (aunque el celular sea angosto),
        // para que NUNCA quede espacio en blanco a los lados.
        width: anchoReal, height: altoReal,
        windowWidth: anchoReal + 40, windowHeight: altoReal + 40,
        scrollX: 0, scrollY: 0,
      })
      const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'landscape' })
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight()
      // Llena TODA la hoja (con un pequeño margen), sin dejar espacio en blanco.
      const m = 4
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', m, m, pw - 2 * m, ph - 2 * m)
      pdf.save(`Preoperacional-${placaSel}-${mes}.pdf`)
    } catch (e) { alert('No se pudo generar el PDF. ' + (e?.message || '')) }
    setDescargando(false)
  }

  // Botón de emergencia: borra la caché/service worker y recarga para quedar en la última versión.
  async function actualizarApp() {
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) || []
      await Promise.all(regs.map((r) => r.unregister()))
    } catch {}
    try {
      const keys = (await caches?.keys?.()) || []
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {}
    window.location.reload()
  }

  const nombreMes = new Date(anio, mesNum - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          @page { size: Letter landscape; margin: 6mm; }
          header, aside, .no-print, .aviso-actualizacion { display:none !important; }
          main { padding:0 !important; }
          body { background:#fff !important; }
          /* El reporte (1056px) se reduce para caber en la hoja horizontal. */
          .preop-rep { zoom: 0.9; }
          .preop-report-wrap { overflow: visible !important; box-shadow:none !important; }
        }
      `}</style>
      <div className="flex flex-wrap items-center gap-2 no-print">
        <button onClick={() => navigate('/preoperacionales')} className="btn-ghost">← Volver</button>
        <span className="font-display text-sm font-bold text-ink">Reporte mensual · {nombreMes}</span>
        {placas.length > 0 && (
          <div className="ml-2 flex items-center gap-1">
            <input list="placas-reporte" className="input w-40" value={placaSel}
              onChange={(e) => setPlacaSel(e.target.value.toUpperCase())}
              placeholder="Escribe o elige placa…" />
            <datalist id="placas-reporte">
              {placas.map((p) => <option key={p} value={p} />)}
            </datalist>
            <span className="whitespace-nowrap text-xs text-ink-faint">{placas.length} con registros</span>
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={actualizarApp} className="btn-ghost" title="Si ves una versión vieja, actualiza">⟳ Actualizar</button>
          <button onClick={descargarPdf} disabled={descargando || !registros.length} className="btn-primary">{descargando ? '⏳ Generando…' : '📥 Descargar PDF'}</button>
          <button onClick={() => window.print()} disabled={!registros.length} className="btn-ghost">🖨️ Imprimir</button>
        </div>
      </div>

      {registros.length === 0 ? (
        <div className="card p-8 text-center text-ink-faint">No hay preoperacionales de <b>{placaSel || 'esa placa'}</b> en {nombreMes}.</div>
      ) : (
        <div className="preop-report-wrap overflow-x-auto">
          <div ref={ref} className="mx-auto w-fit shadow-card">
            <PreoperacionalReporte empresa={empresa} mes={mes} registros={registros} vehiculo={vehiculoSel} propietarioNombre={propNombre} />
          </div>
        </div>
      )}
    </div>
  )
}
