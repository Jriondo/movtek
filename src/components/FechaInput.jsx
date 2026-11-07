import { useEffect, useRef, useState } from 'react'

const pad = (n) => String(n).padStart(2, '0')

// ISO (aaaa-mm-dd) -> visible (dd/mm/aaaa)
export function isoAVisible(iso) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

// Acepta pegar/escribir en varios formatos y devuelve ISO (aaaa-mm-dd) o '' si no es válido.
export function parseFecha(s) {
  if (!s) return ''
  const t = String(s).trim()
  // aaaa-mm-dd  /  aaaa/mm/dd
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  // dd/mm/aaaa  /  dd-mm-aa  /  dd.mm.aaaa
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/)
  if (m) {
    let y = m[3]
    if (y.length === 2) y = '20' + y
    return `${y}-${pad(m[2])}-${pad(m[1])}`
  }
  return ''
}

// Campo de fecha: se puede escribir o pegar (dd/mm/aaaa) y también elegir del calendario.
export default function FechaInput({ value, onChange, className = '' }) {
  const [txt, setTxt] = useState(isoAVisible(value))
  const dateRef = useRef(null)
  useEffect(() => { setTxt(isoAVisible(value)) }, [value])

  function commit(raw) {
    const iso = parseFecha(raw)
    if (iso) { onChange(iso); setTxt(isoAVisible(iso)) }
    else if (!raw.trim()) { onChange(''); setTxt('') }
    // si es inválido, deja lo escrito para que el usuario lo corrija
  }

  function abrirCalendario() {
    const el = dateRef.current
    if (!el) return
    if (el.showPicker) { try { el.showPicker(); return } catch { /* noop */ } }
    el.focus(); el.click()
  }

  return (
    <div className={`relative ${className}`}>
      <input
        className="input pr-11"
        value={txt}
        placeholder="dd/mm/aaaa"
        inputMode="numeric"
        onChange={(e) => setTxt(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onPaste={(e) => {
          const data = (e.clipboardData || window.clipboardData)?.getData('text')
          if (data) { e.preventDefault(); commit(data) }
        }}
      />
      <button
        type="button"
        onClick={abrirCalendario}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-lg text-ink-faint hover:text-brand-500"
        aria-label="Elegir del calendario"
        title="Elegir del calendario"
      >
        📅
      </button>
      {/* Date picker nativo (oculto) que abre el calendario */}
      <input
        ref={dateRef}
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-8 h-0 w-0 opacity-0"
      />
    </div>
  )
}
