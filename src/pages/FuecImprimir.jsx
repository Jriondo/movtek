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

  // El archivo PDF se llamará "FUEC-<número>" en vez del título de la página.
  function guardarPdf() {
    const titulo = document.title
    document.title = `FUEC-${f?.numero_fuec || f?.no_maestro || ''}`.replace(/-$/, '') || 'FUEC'
    window.print()
    setTimeout(() => { document.title = titulo }, 500)
  }

  if (!f) return <div className="grid min-h-full place-items-center text-ink-faint">Cargando…</div>

  return (
    <div className="fuec-wrap" ref={wrapRef}>
      <style>{`
        /* El escalado (zoom) SOLO en pantalla; en impresión no aplica y usa el formato carta. */
        @media screen { .fuec-screen { width:830px; zoom: var(--fuec-scale, 1); } }
        @media print {
          header, aside, .no-print { display:none !important; }
          main { padding:0 !important; }
          body { background:#fff !important; }
        }
      `}</style>
      <div className="mb-4 flex flex-wrap gap-2 no-print">
        <button onClick={guardarPdf} className="btn-primary">📥 Guardar / Descargar PDF</button>
        <button onClick={() => window.print()} className="btn-ghost">🖨️ Imprimir</button>
        <button onClick={() => navigate('/fuec')} className="btn-ghost">Retornar</button>
      </div>
      <div className="fuec-screen" style={{ '--fuec-scale': scale }}>
        <FuecDocumento f={f} empresa={empresa} qr={qr} />
      </div>
    </div>
  )
}
