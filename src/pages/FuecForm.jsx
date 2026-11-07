import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  listVehiculos, listConductores, nombreConductor, listClientes, nombreMostrar,
  listDestinos, saveFuec, getFuec,
} from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'
import { DEPARTAMENTOS_NOMBRES } from '../lib/colombia'

const ESTRATEGIAS = ['N/A', 'Promoción', 'Descuento', 'Convenio', 'Tarifa especial']

export default function FuecForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { empresa } = useEmpresa()
  const { user } = useAuth()
  const editando = Boolean(id)

  const [vehiculos, setVehiculos] = useState([])
  const [conductores, setConductores] = useState([])
  const [clientes, setClientes] = useState([])
  const [destinos, setDestinos] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    vehiculo_id: '', conductores: [], contratantes: [], objeto_contrato: '',
    itinerarios: [], descripcion_recorrido: '', estrategia_comercial: 'N/A', estrategia_con: '',
    vigencia_inicio: '', vigencia_fin: '',
  })
  // selección temporal
  const [selCond, setSelCond] = useState('')
  const [selCont, setSelCont] = useState('')
  const [it, setIt] = useState({ depto_origen: '', ciudad_origen: '', depto_destino: '', ciudad_destino: '' })

  useEffect(() => {
    listVehiculos({ empresaId: empresa?.id }).then(setVehiculos).catch(() => {})
    listConductores({ empresaId: empresa?.id }).then(setConductores).catch(() => {})
    listClientes({ empresaId: empresa?.id }).then(setClientes).catch(() => {})
    listDestinos({}).then((d) => setDestinos(d.filter((x) => x.estado !== 'inactivo'))).catch(() => {})
  }, [empresa?.id])

  useEffect(() => {
    if (!id) return
    getFuec(id).then((f) => { if (f) setForm((prev) => ({ ...prev, ...f })) })
  }, [id])

  const vehiculo = useMemo(() => vehiculos.find((v) => String(v.id) === String(form.vehiculo_id)), [vehiculos, form.vehiculo_id])
  const ciudadesDe = (dep) => destinos.filter((d) => d.departamento === dep).map((d) => d.nombre)

  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }))

  function addConductor() {
    const c = conductores.find((x) => String(x.id) === String(selCond))
    if (!c || form.conductores.some((x) => x.id === c.id)) return
    set('conductores', [...form.conductores, { id: c.id, nombre: nombreConductor(c), documento: c.documento }])
    setSelCond('')
  }
  function addContratante() {
    const c = clientes.find((x) => String(x.id) === String(selCont))
    if (!c || form.contratantes.some((x) => x.id === c.id)) return
    set('contratantes', [...form.contratantes, { id: c.id, nombre: nombreMostrar(c), no_maestro: c.contrato_maestro_nro || '' }])
    if (!form.objeto_contrato && c.objeto_contrato) set('objeto_contrato', c.objeto_contrato)
    setSelCont('')
  }
  function addItinerario() {
    if (!it.ciudad_origen || !it.ciudad_destino) return
    set('itinerarios', [...form.itinerarios, it])
    setIt({ depto_origen: '', ciudad_origen: '', depto_destino: '', ciudad_destino: '' })
  }
  const quitar = (campo, i) => set(campo, form[campo].filter((_, idx) => idx !== i))

  async function guardar(irAImprimir = false) {
    if (!vehiculo) { setMsg('Selecciona un vehículo (placa).'); return }
    if (!form.contratantes.length) { setMsg('Agrega al menos un contratante.'); return }
    setBusy(true); setMsg('')
    try {
      const primary = form.contratantes[0]
      const payload = {
        ...form,
        empresa_id: empresa?.id,
        placa: vehiculo.placa, movil: vehiculo.numero_interno,
        cliente_id: primary.id, no_maestro: primary.no_maestro || '',
        usuario: (user?.email || '').split('@')[0] || 'usuario',
        estado: 'activo',
      }
      const saved = await saveFuec(payload)
      if (irAImprimir) navigate(`/fuec/${saved.id}/imprimir`)
      else navigate('/fuec')
    } catch (e) {
      setMsg('No se pudo guardar. ' + (e?.message || ''))
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={() => navigate('/fuec')} className="text-sm font-semibold text-brand-500 hover:underline">← FUEC</button>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-ink">{editando ? 'Editar FUEC' : 'Generar FUEC'}</h1>
      </div>

      {/* Vehículo */}
      <div className="card p-5">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-faint">Características del vehículo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Placa</label>
            <select className="input" value={form.vehiculo_id} onChange={(e) => set('vehiculo_id', e.target.value)}>
              <option value="">Seleccione un vehículo…</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.marca} {v.linea}</option>)}
            </select>
          </div>
          {vehiculo && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-cloud p-3 text-sm sm:grid-cols-3">
              <Dato k="Modelo" v={vehiculo.modelo} /><Dato k="Marca" v={vehiculo.marca} /><Dato k="Clase" v={vehiculo.clase} />
              <Dato k="N° interno" v={vehiculo.numero_interno} /><Dato k="Tarjeta op." v={vehiculo.tarjeta_operacion} />
            </div>
          )}
        </div>
      </div>

      {/* Conductores */}
      <ListaCard titulo="Conductores"
        sel={<Picker value={selCond} onChange={setSelCond} onAdd={addConductor}
          options={conductores.map((c) => ({ id: c.id, label: `${nombreConductor(c)} · ${c.documento || ''}` }))} placeholder="Selecciona conductor…" />}
        items={form.conductores} render={(c) => `${c.nombre} · ${c.documento || ''}`} onQuitar={(i) => quitar('conductores', i)} />

      {/* Contratante */}
      <ListaCard titulo="Contratante"
        sel={<Picker value={selCont} onChange={setSelCont} onAdd={addContratante}
          options={clientes.map((c) => ({ id: c.id, label: `${nombreMostrar(c)}${c.contrato_maestro_nro ? ' · ' + c.contrato_maestro_nro : ''}` }))} placeholder="Selecciona contratante…" />}
        items={form.contratantes} render={(c) => `${c.nombre}${c.no_maestro ? ' · Maestro ' + c.no_maestro : ''}`} onQuitar={(i) => quitar('contratantes', i)}>
        <div className="mt-3">
          <label className="label">Objeto del contrato</label>
          <textarea className="input h-20" value={form.objeto_contrato} onChange={(e) => set('objeto_contrato', e.target.value)} />
        </div>
      </ListaCard>

      {/* Itinerario */}
      <div className="card p-5">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-faint">Itinerario (origen – destino)</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className="label">Depto origen</label>
            <select className="input" value={it.depto_origen} onChange={(e) => setIt({ ...it, depto_origen: e.target.value, ciudad_origen: '' })}>
              <option value="">Seleccione…</option>{DEPARTAMENTOS_NOMBRES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div><label className="label">Ciudad origen</label>
            <select className="input" value={it.ciudad_origen} onChange={(e) => setIt({ ...it, ciudad_origen: e.target.value })} disabled={!it.depto_origen}>
              <option value="">Seleccione…</option>{ciudadesDe(it.depto_origen).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Depto destino</label>
            <select className="input" value={it.depto_destino} onChange={(e) => setIt({ ...it, depto_destino: e.target.value, ciudad_destino: '' })}>
              <option value="">Seleccione…</option>{DEPARTAMENTOS_NOMBRES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div><label className="label">Ciudad destino</label>
            <div className="flex gap-2">
              <select className="input" value={it.ciudad_destino} onChange={(e) => setIt({ ...it, ciudad_destino: e.target.value })} disabled={!it.depto_destino}>
                <option value="">Seleccione…</option>{ciudadesDe(it.depto_destino).map((c) => <option key={c}>{c}</option>)}
              </select>
              <button type="button" onClick={addItinerario} className="btn-accent !px-3">+</button>
            </div>
          </div>
        </div>
        {form.itinerarios.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {form.itinerarios.map((i, idx) => (
              <li key={idx} className="flex items-center justify-between rounded-lg bg-cloud px-3 py-2 text-sm">
                <span className="font-semibold text-ink">{i.ciudad_origen} → {i.ciudad_destino}</span>
                <button onClick={() => quitar('itinerarios', idx)} className="text-ink-faint hover:text-coral-500">✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <label className="label">Descripción del recorrido</label>
          <textarea className="input h-16" value={form.descripcion_recorrido} onChange={(e) => set('descripcion_recorrido', e.target.value)} />
        </div>
      </div>

      {/* Estrategia + vigencia */}
      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Estrategia comercial</label>
            <select className="input" value={form.estrategia_comercial} onChange={(e) => set('estrategia_comercial', e.target.value)}>
              {ESTRATEGIAS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div><label className="label">Con</label><input className="input" value={form.estrategia_con} onChange={(e) => set('estrategia_con', e.target.value)} placeholder="NO APLICA" /></div>
          <div><label className="label">Vigencia — fecha inicial</label><input type="date" className="input" value={form.vigencia_inicio} onChange={(e) => set('vigencia_inicio', e.target.value)} /></div>
          <div><label className="label">Vigencia — fecha vencimiento</label><input type="date" className="input" value={form.vigencia_fin} onChange={(e) => set('vigencia_fin', e.target.value)} /></div>
        </div>
      </div>

      {msg && <p className="rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}

      <div className="flex flex-wrap justify-center gap-2">
        <button className="btn-primary" onClick={() => guardar(false)} disabled={busy}>{busy ? 'Guardando…' : '💾 Guardar'}</button>
        <button className="btn-accent" onClick={() => guardar(true)} disabled={busy}>🖨️ Guardar e imprimir PDF</button>
        <button className="btn-ghost" onClick={() => navigate('/fuec')} disabled={busy}>Retornar</button>
      </div>
    </div>
  )
}

function Dato({ k, v }) { return <div><span className="text-xs text-ink-faint">{k}: </span><span className="font-semibold text-ink">{v || '—'}</span></div> }

function ListaCard({ titulo, sel, items, render, onQuitar, children }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-faint">{titulo}</h2>
      {sel}
      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {items.map((x, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-cloud px-3 py-2 text-sm">
              <span className="font-semibold text-ink">{i === 0 ? '★ ' : ''}{render(x)}</span>
              <button onClick={() => onQuitar(i)} className="text-ink-faint hover:text-coral-500">✕</button>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  )
}

function Picker({ value, onChange, onAdd, options, placeholder }) {
  return (
    <div className="flex gap-2">
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <button type="button" onClick={onAdd} className="btn-accent !px-3">+</button>
    </div>
  )
}
