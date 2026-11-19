import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { getFuec } from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import FuecDocumento from '../components/FuecDocumento'

export default function FuecImprimir() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const [f, setF] = useState(null)
  const [qr, setQr] = useState('')
  const [descargando, setDescargando] = useState(false)
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => { getFuec(id).then(setF) }, [id])

  useEffect(() => {
    const url = `${window.location.origin}/verificar/${id}`
    QRCode.toDataURL(url, { margin: 1, width: 200 }).then(setQr).catch(() => {})
  }, [id])

  // Ajusta el documento (830px) al ancho de la pantalla (para que se vea bien en el teléfono).
  useEffect(() => {
    function fit() {
      const w = wrapRef.current?.clientWidth || 830
      setScale(Math.min(1, w / 834))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [f])

  // Descarga DIRECTA del PDF en tamaño carta (sin abrir el diálogo de impresión).
  async function descargarPdf() {
    if (descargando) return
    setDescargando(true)
    const screen = wrapRef.current?.querySelector('.fuec-screen')
    const fuec = wrapRef.current?.querySelector('.fuec')
    const prevScale = screen?.style.getPropertyValue('--fuec-scale')
    try {
      const [{ jsPDF }, h2c] = await Promise.all([import('jspdf'), import('html2canvas-pro')])
      const html2canvas = h2c.default
      // Captura a tamaño real (830px) y en modo compacto (igual que impreso).
      screen?.style.setProperty('--fuec-scale', '1')
      fuec?.classList.add('pdffill')
      await new Promise((r) => setTimeout(r, 200))
      const pages = Array.from(fuec.querySelectorAll('.fuec-page'))
      const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false })
        const img = canvas.toDataURL('image/jpeg', 0.95)
        let w = pw, h = (canvas.height * pw) / canvas.width
        if (h > ph) { h = ph; w = (canvas.width * ph) / canvas.height }
        if (i > 0) pdf.addPage()
        pdf.addImage(img, 'JPEG', (pw - w) / 2, 0, w, h)
      }
      pdf.save(`FUEC-${f?.numero_fuec || f?.no_maestro || 'documento'}.pdf`)
    } catch (e) {
      alert('No se pudo generar el PDF. ' + (e?.message || e))
    } finally {
      fuec?.classList.remove('compact')
      screen?.style.setProperty('--fuec-scale', prevScale || '1')
      setDescargando(false)
    }
  }

  if (!f) return <div className="grid min-h-full place-items-center text-ink-faint">Cargando…</div>

  return (
    <div className="fuec-wrap" ref={wrapRef}>
      <style>{`
        @media screen { .fuec-screen { width:830px; zoom: var(--fuec-scale, 1); } }
        @media print {
          header, aside, .no-print { display:none !important; }
          main { padding:0 !important; }
          body { background:#fff !important; }
        }
      `}</style>
      <div className="mb-4 flex flex-wrap gap-2 no-print">
        <button onClick={descargarPdf} disabled={descargando} className="btn-primary">{descargando ? '⏳ Generando PDF…' : '📥 Descargar PDF'}</button>
        <button onClick={() => window.print()} className="btn-ghost">🖨️ Imprimir</button>
        <button onClick={() => navigate('/fuec')} className="btn-ghost">Retornar</button>
      </div>
      <div className="fuec-screen" style={{ '--fuec-scale': scale }}>
        <FuecDocumento f={f} empresa={empresa} qr={qr} />
      </div>
    </div>
  )
}
