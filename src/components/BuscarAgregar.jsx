import { useState } from 'react'

// Buscador para agregar elementos a una lista.
// - items: opciones disponibles (ya sin los agregados)
// - label(i): texto que se muestra
// - texto(i): texto sobre el que se busca (nombre, documento, placa…)
// - onAdd(i): agrega el elemento elegido
export default function BuscarAgregar({ items, onAdd, label, texto, placeholder = 'Escribe para buscar…' }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const base = (i) => (texto ? texto(i) : label(i)).toLowerCase()
  const filtered = (q.trim() ? items.filter((i) => base(i).includes(q.toLowerCase())) : items).slice(0, 30)
  function add(i) { onAdd(i); setQ(''); setOpen(false) }
  return (
    <div className="relative">
      <input
        className="input"
        value={q}
        placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === 'Enter' && filtered.length) { e.preventDefault(); add(filtered[0]) } }}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-cloud-line bg-white shadow-card">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-ink-faint">Sin resultados</li>}
          {filtered.map((i) => (
            <li key={i.id}>
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-cloud" onMouseDown={() => add(i)}>
                {label(i)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
