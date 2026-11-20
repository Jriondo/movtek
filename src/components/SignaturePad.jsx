import { useRef, useEffect, useState } from 'react'

// Pad de firma: el conductor firma con el dedo (móvil) o el mouse.
// Devuelve la firma como data URL (PNG) mediante onChange.
export default function SignaturePad({ onChange, alto = 180 }) {
  const canvasRef = useRef(null)
  const dibujando = useRef(false)
  const [vacio, setVacio] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const ancho = canvas.offsetWidth
    canvas.width = ancho * ratio
    canvas.height = alto * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111827'
  }, [alto])

  const pos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return { x: t.clientX - rect.left, y: t.clientY - rect.top }
  }

  const start = (e) => {
    e.preventDefault()
    dibujando.current = true
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  const move = (e) => {
    if (!dibujando.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (vacio) setVacio(false)
  }
  const end = () => {
    if (!dibujando.current) return
    dibujando.current = false
    onChange?.(vacio ? '' : canvasRef.current.toDataURL('image/png'))
  }

  const limpiar = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setVacio(true)
    onChange?.('')
  }

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-cloud-line bg-white">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: alto, touchAction: 'none' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        {vacio && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-ink-faint">
            ✍️ Firma aquí con el dedo
          </span>
        )}
      </div>
      <button type="button" onClick={limpiar} className="mt-1 text-xs font-semibold text-brand-500 hover:underline">
        Borrar firma
      </button>
    </div>
  )
}
