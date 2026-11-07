import { useEffect, useState } from 'react'
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

  useEffect(() => { getFuec(id).then(setF) }, [id])

  useEffect(() => {
    const url = `${window.location.origin}/verificar/${id}`
    QRCode.toDataURL(url, { margin: 1, width: 200 }).then(setQr).catch(() => {})
  }, [id])

  if (!f) return <div className="grid min-h-full place-items-center text-ink-faint">Cargando…</div>

  return (
    <div className="fuec-wrap">
      <style>{`@media print { header, aside, .no-print { display:none !important; } main { padding:0 !important; } body { background:#fff !important; } }`}</style>
      <div className="mb-4 flex gap-2 no-print">
        <button onClick={() => window.print()} className="btn-primary">🖨️ Imprimir / Guardar PDF</button>
        <button onClick={() => navigate('/fuec')} className="btn-ghost">Retornar</button>
      </div>
      <FuecDocumento f={f} empresa={empresa} qr={qr} />
    </div>
  )
}
