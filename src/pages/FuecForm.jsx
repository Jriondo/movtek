import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  listVehiculos, listConductores, nombreConductor, listClientes, nombreMostrar,
  listDestinos, saveFuec, getFuec, asegurarContratoGrupo,
  listTransportadoras, nombreTransportadora, contarFuecCliente, verificarHabilitacionFuec,
} from '../lib/db'
import { useEmpresa } from '../context/EmpresaContext'
import { useAuth } from '../context/AuthContext'
import { DEPARTAMENTOS_NOMBRES } from '../lib/colombia'
import { validarFuec, documentosVehiculo } from '../lib/fuecValidacion'
import FechaInput from '../components/FechaInput'

const ESTRATEGIAS = ['N/A', 'CONSORCIO', 'CONVENIO', 'UNIÓN TEMPORAL']
const TIPOS_DOC = ['Cédula de ciudadanía', 'NIT', 'Cédula de extranjería', 'Pasaporte', 'Tarjeta de identidad']
const OCASIONAL_VACIO = { tipo_documento: '', documento: '', nombre: '', responsable: true, direccion: '', telefono: '', empresa_nombre: '', empresa_nit: '' }

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
  const [transportadoras, setTransportadoras] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    vehiculo_id: '', conductores: [], contratantes: [], objeto_contrato: '',
    itinerarios: [], origen_destino: '', descripcion_recorrido: '', estrategia_comercial: 'N/A', estrategia_con: 'NO APLICA',
    vigencia_inicio: '', vigencia_fin: '',
  })
  // selección temporal
  const [selCond, setSelCond] = useState('')
  const [selCont, setSelCont] = useState('')
  const [it, setIt] = useState({ depto_origen: '', ciudad_origen: '', depto_destino: '', ciudad_destino: '' })
  const [ocasional, setOcasional] = useState(OCASIONAL_VACIO)
  const [hijoActual, setHijoActual] = useState(null)
  const [avisosHab, setAvisosHab] = useState([])

  useEffect(() => {
    listVehiculos({ empresaId: empresa?.id }).then(setVehiculos).catch(() => {})
    listConductores({ empresaId: empresa?.id }).then(setConductores).catch(() => {})
    listDestinos({}).then((d) => setDestinos(d.filter((x) => x.estado !== 'inactivo'))).catch(() => {})
    listTransportadoras({ empresaId: empresa?.id }).then(setTransportadoras).catch(() => {})
    // Asegura el contrato automático "grupo específico" y carga los clientes.
    ;(async () => {
      await asegurarContratoGrupo(empresa?.id)
      setClientes(await listClientes({ empresaId: empresa?.id }))
    })().catch(() => {})
  }, [empresa?.id])

  useEffect(() => {
    if (!id) return
    getFuec(id).then((f) => {
      if (!f) return
      setForm((prev) => ({ ...prev, ...f }))
      if (f.ocasional) setOcasional({ ...OCASIONAL_VACIO, ...f.ocasional })
      verificarHabilitacionFuec(f).then(setAvisosHab).catch(() => {})
    })
  }, [id])

  // Cuenta cuántos FUEC (contrato hijo) lleva el contratante principal.
  useEffect(() => {
    const primary = form.contratantes[0]
    if (primary?.id) contarFuecCliente(primary.id).then(setHijoActual).catch(() => setHijoActual(null))
    else setHijoActual(null)
  }, [form.contratantes])

  const vehiculo = useMemo(() => vehiculos.find((v) => String(v.id) === String(form.vehiculo_id)), [vehiculos, form.vehiculo_id])
  const ciudadesDe = (dep) => destinos.filter((d) => d.departamento === dep).map((d) => d.nombre)

  // Validación de documentos (vencidos / por vencer / convenio).
  const validacion = useMemo(
    () => validarFuec({ vehiculo, conductores: form.conductores, vigenciaFin: form.vigencia_fin }),
    [vehiculo, form.conductores, form.vigencia_fin]
  )
  const docs = useMemo(() => documentosVehiculo(vehiculo, form.conductores), [vehiculo, form.conductores])
  const hoy = new Date().toISOString().slice(0, 10)
  const grupo = form.contratantes.find((x) => x.es_grupo)
  const mostrarEmpresa = ocasional.responsable === false
  const setOc = (k, v) => setOcasional((o) => ({ ...o, [k]: v }))
  // Un FUEC solo se puede modificar hasta medianoche del día de creación.
  const hoyLocal = new Date().toLocaleDateString('en-CA')
  const puedeModificar = editando ? (form.created_at ? new Date(form.created_at).toLocaleDateString('en-CA') === hoyLocal : true) : true
  const forzarNuevo = editando && !puedeModificar
  // Límite de 9999 contratos hijo (FUEC) por contrato maestro.
  const creaNuevo = !editando || forzarNuevo
  const limiteHijo = creaNuevo && hijoActual != null && hijoActual >= 9999

  const set = (c, v) => setForm((f) => ({ ...f, [c]: v }))

  function addConductor() {
    const c = conductores.find((x) => String(x.id) === String(selCond))
    if (!c || form.conductores.some((x) => x.id === c.id)) return
    set('conductores', [...form.conductores, {
      id: c.id, nombre: nombreConductor(c), documento: c.documento,
      licencia_numero: c.licencia_numero || '', licencia_vencimiento: c.licencia_vencimiento || '',
      vigencia_seguridad: c.vigencia_seguridad || '',
    }])
    setSelCond('')
  }
  function addContratante() {
    const c = clientes.find((x) => String(x.id) === String(selCont))
    if (!c || form.contratantes.some((x) => x.id === c.id)) return
    set('contratantes', [...form.contratantes, {
      id: c.id, nombre: nombreMostrar(c), documento: c.documento || '', no_maestro: c.contrato_maestro_nro || '',
      es_grupo: !!c.es_grupo_especifico, tipo_contrato: c.tipo_contrato || '',
      resp_nombre: c.nombre_responsable || '', resp_cedula: c.doc_responsable || '',
      resp_telefono: c.telefono_responsable || '', resp_direccion: c.direccion || '',
    }])
    if (!form.objeto_contrato && c.objeto_contrato) set('objeto_contrato', c.objeto_contrato)
    setSelCont('')
  }
  function addItinerario() {
    if (!it.ciudad_origen || !it.ciudad_destino) return
    const nuevos = [...form.itinerarios, it]
    setForm((fm) => ({ ...fm, itinerarios: nuevos }))
    setIt({ depto_origen: '', ciudad_origen: '', depto_destino: '', ciudad_destino: '' })
  }
  const quitar = (campo, i) => set(campo, form[campo].filter((_, idx) => idx !== i))

  async function guardar(irAImprimir = false) {
    // Validación de campos obligatorios — indica qué falta por llenar.
    const falta = []
    if (!vehiculo) falta.push('Vehículo (placa)')
    if (!form.conductores.length) falta.push('Al menos un conductor')
    if (!form.contratantes.length) falta.push('Al menos un contratante')
    if (!String(form.objeto_contrato || '').trim()) falta.push('Objeto del contrato')
    if (!String(form.origen_destino || '').trim() && !form.itinerarios.length) falta.push('Itinerario (origen – destino)')
    if (!form.vigencia_inicio) falta.push('Vigencia — fecha inicial')
    if (!form.vigencia_fin) falta.push('Vigencia — fecha vencimiento')
    if (falta.length) { setMsg(`Faltan por llenar: ${falta.join(', ')}.`); return }
    // Confirmar al modificar un FUEC existente (no al crear uno nuevo).
    if (editando && !forzarNuevo && !window.confirm('¿Estás seguro de guardar los cambios en este FUEC?')) return
    if (limiteHijo) { setMsg('Este contrato maestro alcanzó el límite de 9999 FUEC. No se pueden generar más con este contrato.'); return }
    if (validacion.bloqueos.length) { setMsg(validacion.bloqueos[0]); return }
    const primary = form.contratantes[0]
    if (primary.es_grupo && !ocasional.nombre && !ocasional.documento && !ocasional.empresa_nit) {
      setMsg('Completa los datos del contratante (grupo específico).'); return
    }
    setBusy(true); setMsg('')
    try {
      // Datos del contratante: del cliente, o del sub-formulario si es "grupo específico".
      let c_nombre = primary.nombre, c_doc = primary.documento || ''
      let r_nombre = primary.resp_nombre || '', r_cedula = primary.resp_cedula || '', r_tel = primary.resp_telefono || '', r_dir = primary.resp_direccion || ''
      if (primary.es_grupo) {
        const oc = ocasional
        // Si NO es el responsable, el contratante es la empresa (nombre + NIT) y la persona es el responsable.
        if (!oc.responsable && (oc.empresa_nombre || oc.empresa_nit)) {
          c_nombre = oc.empresa_nombre || oc.nombre; c_doc = oc.empresa_nit || oc.documento
        } else {
          c_nombre = oc.nombre; c_doc = oc.documento
        }
        r_nombre = oc.nombre; r_cedula = oc.documento; r_tel = oc.telefono; r_dir = oc.direccion
      }
      // "Foto" de los datos de la empresa al momento de generar el FUEC (encabezado inmutable).
      const emp = empresa || {}
      const empresa_snapshot = {
        razon_social: emp.razon_social || '', nombre: emp.nombre || '', nit: emp.nit || '',
        direccion: emp.direccion || '', ciudad: emp.ciudad || '', telefonos: emp.telefonos || '',
        email: emp.email || '', logo_url: emp.logo_url || '', resolucion: emp.resolucion || '',
      }
      const payload = {
        ...form,
        empresa_id: empresa?.id,
        empresa_snapshot,
        placa: vehiculo.placa, movil: vehiculo.numero_interno,
        marca: vehiculo.marca, modelo: vehiculo.modelo, clase: vehiculo.clase, tarjeta_operacion: vehiculo.tarjeta_operacion,
        cliente_id: primary.id, no_maestro: primary.no_maestro || '', tipo_contrato: primary.tipo_contrato || '',
        contratante_nombre: c_nombre, contratante_doc: c_doc,
        resp_nombre: r_nombre, resp_cedula: r_cedula, resp_telefono: r_tel, resp_direccion: r_dir,
        ocasional: primary.es_grupo ? ocasional : null,
        origen_destino: (form.origen_destino || form.itinerarios.map((i) => `${i.ciudad_origen}-${i.ciudad_destino}`).join(', ')).toUpperCase(),
        usuario: (user?.email || '').split('@')[0] || 'usuario',
        estado: 'activo',
      }
      if (forzarNuevo) delete payload.id // pasado el plazo, se crea un FUEC nuevo
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
        <p className="mt-0.5 text-sm text-ink-soft">Completa los datos del contrato; el documento se arma automáticamente con el formato oficial.</p>
      </div>

      {avisosHab.length > 0 && (
        <div className="rounded-xl bg-coral-400/15 px-4 py-3 text-sm text-coral-500">
          <b>⚠️ Elementos inhabilitados:</b>
          <ul className="mt-1 list-disc pl-5">{avisosHab.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}

      {/* Vehículo */}
      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />🚐 Características del vehículo</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Placa</label>
            <select className="input" value={form.vehiculo_id} onChange={(e) => set('vehiculo_id', e.target.value)}>
              <option value="">Seleccione un vehículo…</option>
              {vehiculos.filter((v) => v.estado !== 'inactivo' || String(v.id) === String(form.vehiculo_id)).map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.marca} {v.linea}</option>)}
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

      {/* Estado de documentos (validación) */}
      {vehiculo && (
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />📋 Estado de documentos</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map(([nombre, fecha]) => {
              const dias = Math.round((new Date(fecha) - new Date(hoy)) / 86400000)
              const estado = fecha < hoy ? 'vencido' : dias <= 30 ? 'porvencer' : 'vigente'
              const clase = estado === 'vencido' ? 'bg-coral-400/15 text-coral-500'
                : estado === 'porvencer' ? 'bg-amber-100 text-amber-700' : 'bg-mint-500/15 text-mint-600'
              const txt = estado === 'vencido' ? 'Vencido' : estado === 'porvencer' ? `Vence en ${dias} d` : 'Vigente'
              return (
                <div key={nombre} className="flex items-center justify-between rounded-lg border border-cloud-line px-3 py-2 text-sm">
                  <span className="text-ink">{nombre}</span>
                  <span className={`pill ${clase}`}>{txt} · {fecha.split('-').reverse().join('/')}</span>
                </div>
              )
            })}
            {docs.length === 0 && <p className="text-sm text-ink-soft">Este vehículo no tiene fechas de documentos registradas.</p>}
          </div>

          {validacion.bloqueos.length > 0 ? (
            <div className="mt-4 flex flex-col gap-2 rounded-xl bg-coral-400/15 p-4 text-sm text-coral-500">
              <b>⛔ No se puede generar el FUEC:</b>
              <ul className="list-disc pl-5">{validacion.bloqueos.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          ) : validacion.limite ? (
            <p className="mt-4 rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-600">
              ✅ Vigencia máxima permitida: <b>{validacion.limite.split('-').reverse().join('/')}</b> (vence {validacion.limiteDoc}).
            </p>
          ) : null}
        </div>
      )}

      {/* Conductores */}
      <ListaCard titulo="👤 Conductores"
        sel={<Picker value={selCond} onChange={setSelCond} onAdd={addConductor}
          options={conductores.filter((c) => c.estado_habilitacion !== 'inactivo').map((c) => ({ id: c.id, label: `${nombreConductor(c)} · ${c.documento || ''}` }))} placeholder="Selecciona conductor…" />}
        items={form.conductores} render={(c) => `${c.nombre} · ${c.documento || ''}`} onQuitar={(i) => quitar('conductores', i)} />

      {/* Contratante */}
      <ListaCard titulo="🏢 Contratante"
        sel={<Picker value={selCont} onChange={setSelCont} onAdd={addContratante}
          options={clientes.filter((c) => c.estado !== 'inactivo').map((c) => ({ id: c.id, label: `${nombreMostrar(c)}${c.contrato_maestro_nro ? ' · ' + c.contrato_maestro_nro : ''}` }))} placeholder="Selecciona contratante…" />}
        items={form.contratantes} render={(c) => `${c.nombre}${c.no_maestro ? ' · Maestro ' + c.no_maestro : ''}`} onQuitar={(i) => quitar('contratantes', i)}>
        <div className="mt-3">
          <label className="label">Objeto del contrato</label>
          <textarea className="input h-20" value={form.objeto_contrato} onChange={(e) => set('objeto_contrato', e.target.value)} />
        </div>
      </ListaCard>

      {/* Sub-formulario del contratante "grupo específico" (se habilita solo con ese contrato) */}
      {grupo && (
        <div className="card border-2 border-brand-300 p-5 sm:p-6">
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-brand-600">Contratante · Grupo específico usuarios-particulares</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo documento">
              <Select value={ocasional.tipo_documento} onChange={(v) => setOc('tipo_documento', v)} options={TIPOS_DOC} />
            </Field>
            <Field label="Documento"><input className="input" value={ocasional.documento} onChange={(e) => setOc('documento', e.target.value)} placeholder="N° de documento" /></Field>
            <Field label="Nombre" className="sm:col-span-2"><input className="input" value={ocasional.nombre} onChange={(e) => setOc('nombre', e.target.value)} placeholder="Nombre completo del contratante" /></Field>
            <Field label="Dirección"><input className="input" value={ocasional.direccion} onChange={(e) => setOc('direccion', e.target.value)} placeholder="Dirección" /></Field>
            <Field label="Teléfono"><input className="input" value={ocasional.telefono} onChange={(e) => setOc('telefono', e.target.value)} placeholder="Teléfono" /></Field>
          </div>

          {/* Selector de responsable: si se desmarca, se habilitan los datos de la empresa */}
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={ocasional.responsable !== false} onChange={(e) => setOc('responsable', e.target.checked)} />
            Esta persona es el responsable del contrato
          </label>
          <p className="mt-1 text-xs text-ink-soft">Desmárcalo si el contratante es una empresa; así podrás escribir el nombre y el NIT de la empresa.</p>

          {/* Si NO es el responsable (es empresa): nombre de la empresa y NIT */}
          {mostrarEmpresa && (
            <div className="mt-4 rounded-xl bg-brand-50 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand-600">Datos de la empresa</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre de la empresa"><input className="input" value={ocasional.empresa_nombre} onChange={(e) => setOc('empresa_nombre', e.target.value)} placeholder="Razón social" /></Field>
                <Field label="NIT"><input className="input" value={ocasional.empresa_nit} onChange={(e) => setOc('empresa_nit', e.target.value)} placeholder="N° de NIT" /></Field>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Itinerario */}
      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />🗺️ Itinerario (origen – destino)</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className="label">Depto origen</label>
            <select className="input uppercase" value={it.depto_origen} onChange={(e) => setIt({ ...it, depto_origen: e.target.value, ciudad_origen: '' })}>
              <option value="">Seleccione…</option>{DEPARTAMENTOS_NOMBRES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div><label className="label">Ciudad origen</label>
            <select className="input uppercase" value={it.ciudad_origen} onChange={(e) => setIt({ ...it, ciudad_origen: e.target.value })} disabled={!it.depto_origen}>
              <option value="">Seleccione…</option>{ciudadesDe(it.depto_origen).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Depto destino</label>
            <select className="input uppercase" value={it.depto_destino} onChange={(e) => setIt({ ...it, depto_destino: e.target.value, ciudad_destino: '' })}>
              <option value="">Seleccione…</option>{DEPARTAMENTOS_NOMBRES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div><label className="label">Ciudad destino</label>
            <div className="flex gap-2">
              <select className="input uppercase" value={it.ciudad_destino} onChange={(e) => setIt({ ...it, ciudad_destino: e.target.value })} disabled={!it.depto_destino}>
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
                <span className="font-semibold uppercase text-ink">{i.ciudad_origen} → {i.ciudad_destino}</span>
                <button onClick={() => quitar('itinerarios', idx)} className="text-ink-faint hover:text-coral-500">✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <label className="label">Descripción de recorrido</label>
          <textarea className="input h-16" value={form.origen_destino} onChange={(e) => set('origen_destino', e.target.value)} />
        </div>
      </div>

      {/* Estrategia + vigencia */}
      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />📅 Estrategia y vigencia</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Estrategia comercial</label>
            <select className="input" value={form.estrategia_comercial} onChange={(e) => set('estrategia_comercial', e.target.value)}>
              {ESTRATEGIAS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div><label className="label">Con</label>
            <select className="input" value={form.estrategia_con} onChange={(e) => set('estrategia_con', e.target.value)}>
              <option>NO APLICA</option>
              {transportadoras.map((t) => <option key={t.id} value={nombreTransportadora(t)}>{nombreTransportadora(t)}</option>)}
            </select>
          </div>
          <div><label className="label">Vigencia — fecha inicial</label><FechaInput value={form.vigencia_inicio} onChange={(v) => set('vigencia_inicio', v)} /></div>
          <div><label className="label">Vigencia — fecha vencimiento</label><FechaInput value={form.vigencia_fin} onChange={(v) => set('vigencia_fin', v)} /></div>
        </div>
      </div>

      {limiteHijo && (
        <p className="rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">
          ⛔ Este contrato maestro llegó al límite de <b>9999</b> FUEC (contrato hijo). No se pueden generar más con este contrato.
        </p>
      )}
      {forzarNuevo && !limiteHijo && (
        <p className="rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-medium text-amber-700">
          ⏰ El plazo para modificar este FUEC venció (solo hasta la medianoche del día en que se creó). Si continúas, se generará un <b>FUEC nuevo</b>.
        </p>
      )}
      {msg && <p className="rounded-xl bg-coral-400/15 px-4 py-2.5 text-sm font-medium text-coral-500">{msg}</p>}

      <div className="flex flex-wrap justify-center gap-2">
        <button className="btn-accent" onClick={() => guardar(true)} disabled={busy || validacion.bloqueos.length > 0 || limiteHijo}>
          {busy ? 'Procesando…' : forzarNuevo ? '🖨️ Crear nuevo e imprimir PDF' : editando ? '🖨️ Modificar e imprimir PDF' : '🖨️ Guardar e imprimir PDF'}
        </button>
      </div>
    </div>
  )
}

function Dato({ k, v }) { return <div><span className="text-xs text-ink-faint">{k}: </span><span className="font-semibold text-ink">{v || '—'}</span></div> }

function Field({ label, children, className = '' }) {
  return <div className={className}><span className="label">{label}</span>{children}</div>
}
function Select({ value, onChange, options }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Seleccione…</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  )
}

function ListaCard({ titulo, sel, items, render, onQuitar, children }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-brand-600"><span className="h-4 w-1.5 rounded-full bg-brand-500" />{titulo}</h2>
      {sel}
      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {items.map((x, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-cloud px-3 py-2 text-sm">
              <span className="font-semibold text-ink">{render(x)}</span>
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
