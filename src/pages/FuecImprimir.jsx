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

  if (!f) return <div className="grid min-h-full place-items-center text-ink-faint">Cargando…</div>

  return (
    <div className="fuec-wrap" ref={wrapRef}>
      <style>{`
        @media print { header, aside, .no-print { display:none !important; } main { padding:0 !important; } body { background:#fff !important; } .fuec-screen { zoom:1 !important; } }
        .fuec-screen { width:830px; }
      `}</style>
      <div className="mb-4 flex gap-2 no-print">
        <button onClick={() => window.print()} className="btn-primary">🖨️ Imprimir / Guardar PDF</button>
        <button onClick={() => navigate('/fuec')} className="btn-ghost">Retornar</button>
      </div>
      {/* En pantalla se escala al ancho; al imprimir el zoom se desactiva y usa el formato carta. */}
      <div className="fuec-screen" style={{ zoom: scale }}>
        <FuecDocumento f={f} empresa={empresa} qr={qr} />
      </div>
    </div>
  )
}
