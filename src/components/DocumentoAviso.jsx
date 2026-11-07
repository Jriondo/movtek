// Avisos de documento repetido: duplicado (mismo módulo) o datos reutilizables (otro módulo).
function nombreDe(p) {
  if (!p) return ''
  if (p.tipo_persona === 'juridica') return p.compania || ''
  return `${p.nombres || ''} ${p.apellidos || ''}`.trim()
}

export default function DocumentoAviso({ dup, dupLabel, onEditarDup, prefill, prefillLabel, onUsar, aviso }) {
  if (!dup && !prefill && !aviso) return null
  return (
    <div className="flex flex-col gap-2">
      {dup && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm text-coral-500">
          <span>⚠️ Ya existe un {dupLabel} con este documento{nombreDe(dup) ? `: ${nombreDe(dup)}` : ''}.</span>
          <button type="button" onClick={onEditarDup} className="font-bold underline">Editar ese registro</button>
        </div>
      )}
      {prefill && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-600">
          <span>🔁 Este documento ya está registrado como {prefillLabel}{nombreDe(prefill) ? ` (${nombreDe(prefill)})` : ''}.</span>
          <button type="button" onClick={onUsar} className="font-bold underline">Usar sus datos</button>
        </div>
      )}
      {aviso && (
        <div className="rounded-xl bg-mint-500/15 px-4 py-2.5 text-sm font-medium text-mint-600">✓ {aviso}</div>
      )}
    </div>
  )
}
