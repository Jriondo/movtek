import { useState } from 'react'

// Modal genérico para editar una lista de textos (ej. tipos de mantenimiento, turnos).
export default function ListaEditableModal({ titulo, descripcion, items = [], onClose, onSave, busy = false }) {
  const [lista, setLista] = useState(items.length ? [...items] : [''])
  const set = (i, v) => setLista((l) => l.map((x, j) => (j === i ? v : x)))
  const quitar = (i) => setLista((l) => l.filter((_, j) => j !== i))
  const agregar = () => setLista((l) => [...l, ''])
  const subir = (i) => setLista((l) => { if (i === 0) return l; const n = [...l]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n })

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card flex max-h-[85vh] w-full max-w-sm flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-extrabold text-ink">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-sm text-ink-soft">{descripcion}</p>}
        <div className="mt-3 flex flex-col gap-2 overflow-y-auto">
          {lista.map((v, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <button onClick={() => subir(i)} disabled={i === 0} className="text-ink-faint disabled:opacity-30" title="Subir">↑</button>
              <input className="input flex-1" value={v} onChange={(e) => set(i, e.target.value)} placeholder="Escribe un ítem…" />
              <button onClick={() => quitar(i)} className="px-1 text-coral-500" title="Quitar">✕</button>
            </div>
          ))}
        </div>
        <button onClick={agregar} className="mt-2 self-start text-sm font-bold text-brand-600">+ Agregar ítem</button>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost ml-auto">Cancelar</button>
          <button onClick={() => onSave(lista.map((x) => x.trim()).filter(Boolean))} disabled={busy} className="btn-primary">{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
