import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { verificarFuecPublico } from '../lib/db'
import { applyTheme } from '../lib/theme'
import FuecDocumento from '../components/FuecDocumento'

// Página PÚBLICA de verificación (se abre al escanear el QR del FUEC).
export default function VerificarFuec() {
  const { id } = useParams()
  const [f, setF] = useState(undefined)
  const [empresa, setEmpresa] = useState(null)
  const [qr, setQr] = useState('')
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const url = `${window.location.origin}/verificar/${id}`
    QRCode.toDataURL(url, { margin: 1, width: 200 }).then(setQr).catch(() => {})
  }, [id])

  useEffect(() => {
    verificarFuecPublico(id).then(({ fuec, empresa: e }) => {
      setF(fuec || null)
      if (e) {
        setEmpresa(e)
        if (e?.color_primario) applyTheme({ primary: e.color_primario, accent: e.color_acento })
      }
    }).catch(() => setF(null))
  }, [id])

  // Ajusta el documento (830px) al ancho de la pantalla (para que se vea bien en el teléfono).
  useEffect(() => {
    function fit() {
      const w = (wrapRef.current?.clientWidth || 830) - 34 // descuenta el padding del contenedor
      setScale(Math.min(1, w / 830))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [f])

  if (f === undefined) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Verificando documento…</div>
  if (f === null) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'sans-serif', color: '#b4231f' }}>Documento no encontrado</h1>
      <p style={{ color: '#64748b' }}>El FUEC que intentas verificar no existe o fue anulado.</p>
    </div>
  )

  return (
    <div ref={wrapRef} style={{ minHeight: '100%', background: '#f6f6fc', padding: '16px', overflowX: 'hidden' }}>
      <style>{`.fuec-screen { width:830px; zoom: var(--fuec-scale, 1); }`}</style>
      <div style={{ maxWidth: 820, margin: '0 auto 12px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#e3f4ea', color: '#1b7a4b', fontWeight: 700, padding: '8px 16px', borderRadius: 999, fontFamily: 'sans-serif', fontSize: 14 }}>
          ✅ Documento verificado · Movtek
        </div>
        <p style={{ color: '#64748b', fontFamily: 'sans-serif', fontSize: 12, marginTop: 6 }}>
          FUEC N° {f.numero_fuec} · Vigente del {f.vigencia_inicio} al {f.vigencia_fin}
        </p>
      </div>
      <div className="fuec-screen" style={{ '--fuec-scale': scale, margin: '0 auto' }}>
        <FuecDocumento f={f} empresa={empresa} qr={qr} />
      </div>
    </div>
  )
}
