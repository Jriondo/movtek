import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getFuec, getEmpresa } from '../lib/db'
import { applyTheme } from '../lib/theme'
import FuecDocumento from '../components/FuecDocumento'

// Página PÚBLICA de verificación (se abre al escanear el QR del FUEC).
export default function VerificarFuec() {
  const { id } = useParams()
  const [f, setF] = useState(undefined)
  const [empresa, setEmpresa] = useState(null)

  useEffect(() => {
    getFuec(id).then(async (fuec) => {
      setF(fuec || null)
      if (fuec?.empresa_id) {
        const e = await getEmpresa(fuec.empresa_id)
        setEmpresa(e)
        if (e?.color_primario) applyTheme({ primary: e.color_primario, accent: e.color_acento })
      }
    }).catch(() => setF(null))
  }, [id])

  if (f === undefined) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Verificando documento…</div>
  if (f === null) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'sans-serif', color: '#b4231f' }}>Documento no encontrado</h1>
      <p style={{ color: '#64748b' }}>El FUEC que intentas verificar no existe o fue anulado.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100%', background: '#f6f6fc', padding: '16px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto 12px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#e3f4ea', color: '#1b7a4b', fontWeight: 700, padding: '8px 16px', borderRadius: 999, fontFamily: 'sans-serif', fontSize: 14 }}>
          ✅ Documento verificado · Movtek
        </div>
        <p style={{ color: '#64748b', fontFamily: 'sans-serif', fontSize: 12, marginTop: 6 }}>
          FUEC N° {f.numero_fuec} · Vigente del {f.vigencia_inicio} al {f.vigencia_fin}
        </p>
      </div>
      <FuecDocumento f={f} empresa={empresa} />
    </div>
  )
}
