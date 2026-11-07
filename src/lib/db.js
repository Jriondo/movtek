import { supabase, isSupabaseConfigured } from './supabase'
import { catalogoDestinos, AREAS_METROPOLITANAS } from './colombia'

// Capa de datos de Movtek (multiempresa).
// Con Supabase usa la base real; sin conectar, modo demo en el navegador.

const LS_KEY = 'movtek_clientes'
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// Convierte strings vacíos a null (Postgres rechaza '' en columnas date/numeric).
const nulls = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]))

function lsAll() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsSave(rows) { try { localStorage.setItem(LS_KEY, JSON.stringify(rows)) } catch {} }

// ---------------- EMPRESAS (cada una con su color y logo) ----------------
const EMPRESAS_DEMO = [
  { id: 'e1', nombre: 'TransLitoral', color_primario: '#10b981', color_acento: '#84cc16',
    razon_social: 'TRANSPORTES LITORAL S.A.S', nit: '901450517', direccion: 'CR 15 29 345 BRR Bavaria',
    ciudad: 'Santa Marta, Magdalena', telefonos: '3145302372', email: 'contacto@translitoral.com', resolucion: 'ANT-2023-1182' },
  { id: 'e2', nombre: 'Andina Cargo', color_primario: '#2563eb', color_acento: '#06b6d4',
    razon_social: 'ANDINA CARGO S.A.S', nit: '900111222', direccion: 'Cra 50 # 10-20', ciudad: 'Bogotá D.C.',
    telefonos: '6015550000', email: 'contacto@andinacargo.com', resolucion: 'MT-2024-0455' },
  { id: 'e3', nombre: 'RutaSur Express', color_primario: '#e11d8f', color_acento: '#7c3aed',
    razon_social: 'RUTASUR EXPRESS S.A.S', nit: '900333444', direccion: 'Av. Sur 22-14', ciudad: 'Cali',
    telefonos: '6025551111', email: 'contacto@rutasur.com', resolucion: 'MT-2024-0781' },
  { id: 'e4', nombre: 'Costa Trans', color_primario: '#f97316', color_acento: '#0f766e',
    razon_social: 'COSTA TRANS S.A.S', nit: '900555666', direccion: 'Cll 72 # 40-15', ciudad: 'Barranquilla',
    telefonos: '6055552222', email: 'contacto@costatrans.com', resolucion: 'MT-2023-0990' },
]

export async function listEmpresas() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('empresas').select('*').order('nombre')
    if (error) throw error
    // Evita mostrar empresas repetidas por nombre (por si quedaron duplicadas en la base).
    const vistos = new Set()
    const unicas = (data || []).filter((e) => (vistos.has(e.nombre) ? false : vistos.add(e.nombre)))
    return unicas.length ? unicas : EMPRESAS_DEMO
  }
  return EMPRESAS_DEMO
}

export async function getEmpresa(id) {
  if (!id) return null
  const list = await listEmpresas()
  return list.find((e) => String(e.id) === String(id)) || null
}

// ---------------- CLIENTES MAESTROS ----------------
function seedDemo() {
  if (lsAll().length) return
  lsSave([
    {
      id: 'seed2', empresa_id: 'e1', tipo_persona: 'juridica', compania: 'Comercial Andina S.A.',
      tipo_identificacion: 'RUC', documento: '1790012345001', nombres: '', apellidos: '',
      telefono_oficina: '04 2567890', celular: '0998765432', estado: 'activo',
      contrato_maestro_nro: '0002',
      nombre_responsable: 'Carlos Vera', doc_responsable: '0912345678', telefono_responsable: '0987654321',
      tipo_direccion: 'catastral', direccion: 'Av. 9 de Octubre 12 # 34 - 56, Edif. Central',
    },
    {
      id: 'seed1', empresa_id: 'e1', tipo_persona: 'natural', compania: '',
      tipo_identificacion: 'Cédula', documento: '1712345678', nombres: 'María', apellidos: 'Zambrano',
      telefono_casa: '04 2234455', celular: '0991112233', estado: 'activo',
      contrato_maestro_nro: '0001',
      tipo_direccion: 'tradicional', direccion: 'Cdla. Los Ceibos, calle 3ra y Av. del Bombero',
    },
    {
      id: 'seed3', empresa_id: 'e2', tipo_persona: 'juridica', compania: 'Distribuidora del Valle',
      tipo_identificacion: 'RUC', documento: '0991234567001', celular: '0987000111', estado: 'activo',
      contrato_maestro_nro: '0001',
      tipo_direccion: 'tradicional', direccion: 'Parque Industrial, nave 14',
    },
  ])
}

export async function listClientes({ empresaId = null, documento = '', nombre = '', estado = '' } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('clientes_maestros').select('*').order('created_at', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (documento) q = q.ilike('documento', `%${documento}%`)
    if (estado) q = q.eq('estado', estado)
    if (nombre) q = q.or(`nombres.ilike.%${nombre}%,apellidos.ilike.%${nombre}%,compania.ilike.%${nombre}%`)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  seedDemo()
  let rows = lsAll()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  if (documento) rows = rows.filter((r) => (r.documento || '').toLowerCase().includes(documento.toLowerCase()))
  if (estado) rows = rows.filter((r) => (r.estado || 'activo') === estado)
  if (nombre) {
    const n = nombre.toLowerCase()
    rows = rows.filter((r) => `${r.nombres || ''} ${r.apellidos || ''} ${r.compania || ''}`.toLowerCase().includes(n))
  }
  return rows
}

export async function getCliente(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('clientes_maestros').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return lsAll().find((r) => String(r.id) === String(id)) || null
}

export async function saveCliente(data) {
  const payload = { ...data }

  if (!payload.id) {
    let n
    if (isSupabaseConfigured) {
      let c = supabase.from('clientes_maestros').select('*', { count: 'exact', head: true })
      if (payload.empresa_id) c = c.eq('empresa_id', payload.empresa_id)
      const { count } = await c
      n = (count || 0) + 1
    } else {
      n = lsAll().filter((r) => r.empresa_id === payload.empresa_id).length + 1
    }
    if (!payload.contrato_maestro_nro) payload.contrato_maestro_nro = String(n).padStart(4, '0') // 0001, 0002…
    // El contrato HIJO no se fija aquí: se cuenta según los FUEC generados para este cliente.
  }

  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('clientes_maestros').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      return d
    }
    delete payload.id
    const { data: d, error } = await supabase.from('clientes_maestros').insert(nulls(payload)).select().single()
    if (error) throw error
    return d
  }

  const rows = lsAll()
  if (payload.id) {
    const i = rows.findIndex((r) => String(r.id) === String(payload.id))
    if (i >= 0) rows[i] = { ...rows[i], ...payload }
  } else {
    payload.id = newId()
    rows.unshift(payload)
  }
  lsSave(rows)
  return payload
}

export async function deleteCliente(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('clientes_maestros').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSave(lsAll().filter((r) => String(r.id) !== String(id)))
}

export function nombreMostrar(c) {
  if (c.tipo_persona === 'juridica') return c.compania || '(Sin nombre)'
  return `${c.nombres || ''} ${c.apellidos || ''}`.trim() || '(Sin nombre)'
}

// Contrato maestro automático: "Grupo específico de personas o particulares".
export const OBJETO_GRUPO = 'CONTRATO PARA TRANSPORTE ESPECÍFICO DE USUARIOS (TRANSPORTE DE PERSONAS PARTICULARES) Transporte expreso de un grupo homogéneo de personas desde un mismo lugar de origen a un mismo lugar de destino de acuerdo a las normas legales vigentes que rigen para la prestación del Servicio Público de Transporte Terrestre Automotor Especial'

export async function asegurarContratoGrupo(empresaId) {
  if (!empresaId) return
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('clientes_maestros').select('id').eq('empresa_id', empresaId).eq('es_grupo_especifico', true).limit(1)
    if (data && data.length) return
  } else {
    seedDemo()
    if (lsAll().some((r) => r.empresa_id === empresaId && r.es_grupo_especifico)) return
  }
  await saveCliente({
    empresa_id: empresaId, tipo_persona: 'juridica',
    compania: 'CONTRATO GRUPO ESPECÍFICO DE PERSONAS O PARTICULARES',
    objeto_contrato: OBJETO_GRUPO, asignar_objeto: true, es_grupo_especifico: true, estado: 'activo',
  })
}

// Cuenta los FUEC (contratos hijo) generados para un cliente maestro.
// Cada FUEC generado a nombre del maestro suma un "contrato hijo".
export async function contarFuecCliente(clienteId) {
  if (!clienteId) return 0
  if (isSupabaseConfigured) {
    const { count, error } = await supabase.from('fuec').select('*', { count: 'exact', head: true }).eq('cliente_id', clienteId)
    if (error) return 0 // la tabla fuec se crea con el módulo 4.6
    return count || 0
  }
  try {
    const rows = JSON.parse(localStorage.getItem('movtek_fuec') || '[]')
    return rows.filter((r) => String(r.cliente_id) === String(clienteId)).length
  } catch { return 0 }
}

// ---------------- MÓDULO 4.2: CONDUCTORES (empleados) ----------------
const LS_KEY_C = 'movtek_conductores'
function lsAllC() { try { return JSON.parse(localStorage.getItem(LS_KEY_C) || '[]') } catch { return [] } }
function lsSaveC(rows) { try { localStorage.setItem(LS_KEY_C, JSON.stringify(rows)) } catch {} }

function seedConductores() {
  if (lsAllC().length) return
  lsSaveC([
    {
      id: 'dc1', empresa_id: 'e1', tipo_identificacion: 'Cédula', documento: '0923456789',
      nombres: 'Luis', apellidos: 'Mendoza', celular: '0981234567', whatsapp: '0981234567',
      ciudad: 'Guayaquil', rh: 'O+', genero: 'Masculino', fecha_nacimiento: '1988-04-12',
      licencia_numero: 'B-884512', categoria_licencia: 'C2', licencia_vencimiento: '2027-05-30',
      correo: 'luis.mendoza@correo.com', estado_habilitacion: 'activo',
      tipo_direccion: 'tradicional', direccion: 'Cdla. Alborada, etapa 5 mz 12',
      salario_base: '850', eps: 'Sura', arl: 'Positiva', afp: 'Porvenir', banco: 'Bancolombia',
      tipo_cuenta: 'Ahorros', no_cuenta: '12345678', existen_comparendos: 'NO',
    },
    {
      id: 'dc2', empresa_id: 'e1', tipo_identificacion: 'Cédula', documento: '0934567890',
      nombres: 'Jorge', apellidos: 'Paredes', celular: '0991000222', whatsapp: '',
      ciudad: 'Durán', rh: 'A+', genero: 'Masculino', fecha_nacimiento: '1992-11-03',
      licencia_numero: 'B-771203', categoria_licencia: 'C1', licencia_vencimiento: '2026-02-18',
      correo: 'jorge.paredes@correo.com', estado_habilitacion: 'inactivo',
      tipo_direccion: 'tradicional', direccion: 'Km 8.5 vía a Daule',
      existen_comparendos: 'SI', ultima_revision_comparendos: '2025-09-10',
    },
  ])
}

export async function listConductores({ empresaId = null, documento = '', nombre = '', estado = '' } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('conductores').select('*').order('created_at', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (documento) q = q.ilike('documento', `%${documento}%`)
    if (estado) q = q.eq('estado_habilitacion', estado)
    if (nombre) q = q.or(`nombres.ilike.%${nombre}%,apellidos.ilike.%${nombre}%`)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  seedConductores()
  let rows = lsAllC()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  if (documento) rows = rows.filter((r) => (r.documento || '').toLowerCase().includes(documento.toLowerCase()))
  if (estado) rows = rows.filter((r) => (r.estado_habilitacion || 'activo') === estado)
  if (nombre) {
    const n = nombre.toLowerCase()
    rows = rows.filter((r) => `${r.nombres || ''} ${r.apellidos || ''}`.toLowerCase().includes(n))
  }
  return rows
}

export async function getConductor(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('conductores').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return lsAllC().find((r) => String(r.id) === String(id)) || null
}

export async function saveConductor(data) {
  const payload = { ...data }
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('conductores').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      return d
    }
    delete payload.id
    const { data: d, error } = await supabase.from('conductores').insert(nulls(payload)).select().single()
    if (error) throw error
    return d
  }
  const rows = lsAllC()
  if (payload.id) {
    const i = rows.findIndex((r) => String(r.id) === String(payload.id))
    if (i >= 0) rows[i] = { ...rows[i], ...payload }
  } else {
    payload.id = newId()
    rows.unshift(payload)
  }
  lsSaveC(rows)
  return payload
}

export async function deleteConductor(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('conductores').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSaveC(lsAllC().filter((r) => String(r.id) !== String(id)))
}

export const nombreConductor = (c) => `${c.nombres || ''} ${c.apellidos || ''}`.trim() || '(Sin nombre)'

export function exportConductoresCsv(rows) {
  const cols = [
    ['documento', 'Documento'], ['nombre', 'Nombre'], ['celular', 'Celular'], ['ciudad', 'Ciudad'],
    ['licencia_numero', 'Licencia'], ['categoria_licencia', 'Categoría'], ['licencia_vencimiento', 'Vence licencia'],
    ['estado_habilitacion', 'Habilitación'], ['correo', 'Correo'],
  ]
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = cols.map((c) => esc(c[1])).join(';')
  const body = rows.map((r) => cols.map(([k]) => esc(k === 'nombre' ? nombreConductor(r) : r[k])).join(';')).join('\n')
  const csv = '﻿' + head + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'conductores.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------- MÓDULO 4.3: PROPIETARIOS ----------------
const LS_KEY_P = 'movtek_propietarios'
function lsAllP() { try { return JSON.parse(localStorage.getItem(LS_KEY_P) || '[]') } catch { return [] } }
function lsSaveP(rows) { try { localStorage.setItem(LS_KEY_P, JSON.stringify(rows)) } catch {} }

function seedPropietarios() {
  if (lsAllP().length) return
  lsSaveP([
    {
      id: 'pp1', empresa_id: 'e1', tipo_persona: 'natural', tipo_identificacion: 'Cédula',
      documento: '0945678912', nombres: 'Ricardo', apellidos: 'Salazar',
      celular: '0982223344', correo: 'ricardo.salazar@correo.com', ciudad: 'Guayaquil', barrio: 'Urdesa',
      tipo_cuenta: 'Ahorros', no_cuenta: '220199887', banco: 'Bancolombia', estado: 'activo',
      tipo_direccion: 'tradicional', direccion: 'Urdesa Central, calle Primera 203',
    },
  ])
}

export async function listPropietarios({ empresaId = null, documento = '', nombre = '', estado = '' } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('propietarios').select('*').order('created_at', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (documento) q = q.ilike('documento', `%${documento}%`)
    if (estado) q = q.eq('estado', estado)
    if (nombre) q = q.or(`nombres.ilike.%${nombre}%,apellidos.ilike.%${nombre}%,compania.ilike.%${nombre}%`)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  seedPropietarios()
  let rows = lsAllP()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  if (documento) rows = rows.filter((r) => (r.documento || '').toLowerCase().includes(documento.toLowerCase()))
  if (estado) rows = rows.filter((r) => (r.estado || 'activo') === estado)
  if (nombre) {
    const n = nombre.toLowerCase()
    rows = rows.filter((r) => `${r.nombres || ''} ${r.apellidos || ''} ${r.compania || ''}`.toLowerCase().includes(n))
  }
  return rows
}

export async function getPropietario(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('propietarios').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return lsAllP().find((r) => String(r.id) === String(id)) || null
}

export async function savePropietario(data) {
  const payload = { ...data }
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('propietarios').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      return d
    }
    delete payload.id
    const { data: d, error } = await supabase.from('propietarios').insert(nulls(payload)).select().single()
    if (error) throw error
    return d
  }
  const rows = lsAllP()
  if (payload.id) {
    const i = rows.findIndex((r) => String(r.id) === String(payload.id))
    if (i >= 0) rows[i] = { ...rows[i], ...payload }
  } else {
    payload.id = newId()
    rows.unshift(payload)
  }
  lsSaveP(rows)
  return payload
}

export async function deletePropietario(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('propietarios').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSaveP(lsAllP().filter((r) => String(r.id) !== String(id)))
}

export function nombrePropietario(p) {
  if (p.tipo_persona === 'juridica') return p.compania || '(Sin nombre)'
  return `${p.nombres || ''} ${p.apellidos || ''}`.trim() || '(Sin nombre)'
}

export function exportPropietariosCsv(rows) {
  const cols = [
    ['documento', 'Documento'], ['nombre', 'Nombre / Compañía'], ['tipo_persona', 'Tipo'],
    ['celular', 'Celular'], ['correo', 'Correo'], ['ciudad', 'Ciudad'],
    ['banco', 'Banco'], ['no_cuenta', 'N° cuenta'], ['estado', 'Estado'], ['direccion', 'Dirección'],
  ]
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = cols.map((c) => esc(c[1])).join(';')
  const body = rows.map((r) => cols.map(([k]) => esc(k === 'nombre' ? nombrePropietario(r) : r[k])).join(';')).join('\n')
  const csv = '﻿' + head + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'propietarios.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------- PERSONAS COMPARTIDAS (evitar duplicados) ----------------
// Busca un documento en conductores y propietarios de la misma empresa.
export async function buscarPersonaPorDocumento({ empresaId, documento }) {
  const doc = (documento || '').trim()
  if (!doc) return { conductor: null, propietario: null }
  if (isSupabaseConfigured) {
    const [c, p] = await Promise.all([
      supabase.from('conductores').select('*').eq('empresa_id', empresaId).eq('documento', doc).limit(1),
      supabase.from('propietarios').select('*').eq('empresa_id', empresaId).eq('documento', doc).limit(1),
    ])
    return { conductor: c.data?.[0] || null, propietario: p.data?.[0] || null }
  }
  seedConductores(); seedPropietarios()
  const match = (rows) => rows.find((r) => r.empresa_id === empresaId && (r.documento || '').trim() === doc) || null
  return { conductor: match(lsAllC()), propietario: match(lsAllP()) }
}

// Campos que comparten conductor y propietario (para copiar de uno a otro).
export function datosComunes(src = {}) {
  return {
    tipo_identificacion: src.tipo_identificacion || '',
    nombres: src.nombres || '',
    apellidos: src.apellidos || '',
    telefono_casa: src.telefono_casa || '',
    celular: src.celular || '',
    correo: src.correo || '',
    ciudad: src.ciudad || '',
    tipo_direccion: src.tipo_direccion || 'catastral',
    direccion: src.direccion || '',
  }
}

// ---------------- MÓDULO 4.4: EMPRESAS TRANSPORTADORAS ----------------
const LS_KEY_T = 'movtek_transportadoras'
function lsAllT() { try { return JSON.parse(localStorage.getItem(LS_KEY_T) || '[]') } catch { return [] } }
function lsSaveT(rows) { try { localStorage.setItem(LS_KEY_T, JSON.stringify(rows)) } catch {} }

function seedTransportadoras() {
  if (lsAllT().length) return
  lsSaveT([
    {
      id: 'tr1', empresa_id: 'e1', tipo_persona: 'juridica', compania: 'Transportes Unidos del Sur S.A.',
      tipo_identificacion: 'RUC', documento: '0992345678001', telefono_oficina: '04 2998877',
      celular: '0990001122', correo: 'contacto@tusur.com', estado: 'activo',
      doc_responsable: '0912345678', nombre_responsable: 'Ana Herrera', resolucion: 'ANT-2023-1182',
      tipo_direccion: 'tradicional', direccion: 'Av. Juan Tanca Marengo km 2.5',
    },
  ])
}

export async function listTransportadoras({ empresaId = null, documento = '', nombre = '', estado = '' } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('empresas_transportadoras').select('*').order('created_at', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (documento) q = q.ilike('documento', `%${documento}%`)
    if (estado) q = q.eq('estado', estado)
    if (nombre) q = q.or(`nombres.ilike.%${nombre}%,apellidos.ilike.%${nombre}%,compania.ilike.%${nombre}%`)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  seedTransportadoras()
  let rows = lsAllT()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  if (documento) rows = rows.filter((r) => (r.documento || '').toLowerCase().includes(documento.toLowerCase()))
  if (estado) rows = rows.filter((r) => (r.estado || 'activo') === estado)
  if (nombre) {
    const n = nombre.toLowerCase()
    rows = rows.filter((r) => `${r.nombres || ''} ${r.apellidos || ''} ${r.compania || ''}`.toLowerCase().includes(n))
  }
  return rows
}

export async function getTransportadora(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('empresas_transportadoras').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return lsAllT().find((r) => String(r.id) === String(id)) || null
}

export async function buscarTransportadoraPorDocumento({ empresaId, documento }) {
  const doc = (documento || '').trim()
  if (!doc) return null
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('empresas_transportadoras').select('*').eq('empresa_id', empresaId).eq('documento', doc).limit(1)
    return data?.[0] || null
  }
  seedTransportadoras()
  return lsAllT().find((r) => r.empresa_id === empresaId && (r.documento || '').trim() === doc) || null
}

export async function saveTransportadora(data) {
  const payload = { ...data }
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('empresas_transportadoras').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      return d
    }
    delete payload.id
    const { data: d, error } = await supabase.from('empresas_transportadoras').insert(nulls(payload)).select().single()
    if (error) throw error
    return d
  }
  const rows = lsAllT()
  if (payload.id) {
    const i = rows.findIndex((r) => String(r.id) === String(payload.id))
    if (i >= 0) rows[i] = { ...rows[i], ...payload }
  } else {
    payload.id = newId()
    rows.unshift(payload)
  }
  lsSaveT(rows)
  return payload
}

export async function deleteTransportadora(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('empresas_transportadoras').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSaveT(lsAllT().filter((r) => String(r.id) !== String(id)))
}

export function nombreTransportadora(t) {
  if (t.tipo_persona === 'juridica') return t.compania || '(Sin nombre)'
  return `${t.nombres || ''} ${t.apellidos || ''}`.trim() || '(Sin nombre)'
}

export function exportTransportadorasCsv(rows) {
  const cols = [
    ['documento', 'Documento'], ['nombre', 'Nombre / Compañía'], ['tipo_persona', 'Tipo'],
    ['celular', 'Celular'], ['correo', 'Correo'], ['nombre_responsable', 'Responsable'],
    ['resolucion', 'Resolución'], ['estado', 'Estado'],
  ]
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = cols.map((c) => esc(c[1])).join(';')
  const body = rows.map((r) => cols.map(([k]) => esc(k === 'nombre' ? nombreTransportadora(r) : r[k])).join(';')).join('\n')
  const csv = '﻿' + head + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'empresas_transportadoras.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------- MÓDULO 4.5: VEHÍCULOS ----------------
const LS_KEY_V = 'movtek_vehiculos'
function lsAllV() { try { return JSON.parse(localStorage.getItem(LS_KEY_V) || '[]') } catch { return [] } }
function lsSaveV(rows) { try { localStorage.setItem(LS_KEY_V, JSON.stringify(rows)) } catch {} }

function seedVehiculos() {
  if (lsAllV().length) return
  lsSaveV([
    {
      id: 'vh1', empresa_id: 'e1', placa: 'PBA-4471', numero_interno: '28', modelo: '2019',
      clase: 'Microbús', marca: 'Hyundai', linea: 'County', cilindraje: '3907', vehiculo_servicio: 'PUBLICO',
      capacidad: '26', color: 'Blanco', carroceria: 'Microbús', tipo_combustible: 'Diésel',
      aseguradora_soat: 'Sura', fecha_venc_soat: '2027-03-12',
      propietario_id: 'pp1', transportadora_id: 'tr1', estado: 'activo', desvinculacion: 'NO',
      tiene_convenio: 'NO', ciudad_matricula: 'Guayaquil', fecha_matricula: '2019-05-10',
    },
  ])
}

export async function listVehiculos({ empresaId = null, placa = '', movil = '', estado = '' } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('vehiculos').select('*').order('created_at', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (placa) q = q.ilike('placa', `%${placa}%`)
    if (movil) q = q.ilike('numero_interno', `%${movil}%`)
    if (estado) q = q.eq('estado', estado)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  seedVehiculos()
  let rows = lsAllV()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  if (placa) rows = rows.filter((r) => (r.placa || '').toLowerCase().includes(placa.toLowerCase()))
  if (movil) rows = rows.filter((r) => (r.numero_interno || '').toLowerCase().includes(movil.toLowerCase()))
  if (estado) rows = rows.filter((r) => (r.estado || 'activo') === estado)
  return rows
}

export async function getVehiculo(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('vehiculos').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return lsAllV().find((r) => String(r.id) === String(id)) || null
}

export async function buscarVehiculoPorPlaca({ empresaId, placa }) {
  const pl = (placa || '').trim().toUpperCase()
  if (!pl) return null
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('vehiculos').select('*').eq('empresa_id', empresaId).ilike('placa', pl).limit(1)
    return data?.[0] || null
  }
  seedVehiculos()
  return lsAllV().find((r) => r.empresa_id === empresaId && (r.placa || '').trim().toUpperCase() === pl) || null
}

export async function saveVehiculo(data) {
  const payload = { ...data }
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('vehiculos').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      return d
    }
    delete payload.id
    const { data: d, error } = await supabase.from('vehiculos').insert(nulls(payload)).select().single()
    if (error) throw error
    return d
  }
  const rows = lsAllV()
  if (payload.id) {
    const i = rows.findIndex((r) => String(r.id) === String(payload.id))
    if (i >= 0) rows[i] = { ...rows[i], ...payload }
  } else {
    payload.id = newId()
    rows.unshift(payload)
  }
  lsSaveV(rows)
  return payload
}

export async function deleteVehiculo(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('vehiculos').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSaveV(lsAllV().filter((r) => String(r.id) !== String(id)))
}

// Cuenta los FUEC generados para un vehículo (se llena con el módulo 4.6).
export async function contarFuecVehiculo(vehiculoId) {
  if (!vehiculoId) return 0
  if (isSupabaseConfigured) {
    const { count, error } = await supabase.from('fuec').select('*', { count: 'exact', head: true }).eq('vehiculo_id', vehiculoId)
    if (error) return 0
    return count || 0
  }
  try {
    const rows = JSON.parse(localStorage.getItem('movtek_fuec') || '[]')
    return rows.filter((r) => String(r.vehiculo_id) === String(vehiculoId)).length
  } catch { return 0 }
}

export function exportVehiculosCsv(rows) {
  const cols = [
    ['placa', 'Placa'], ['numero_interno', 'Móvil'], ['clase', 'Clase'], ['marca', 'Marca'],
    ['linea', 'Línea'], ['modelo', 'Modelo'], ['color', 'Color'], ['tipo_combustible', 'Combustible'],
    ['vehiculo_servicio', 'Servicio'], ['estado', 'Estado'],
  ]
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = cols.map((c) => esc(c[1])).join(';')
  const body = rows.map((r) => cols.map(([k]) => esc(r[k])).join(';')).join('\n')
  const csv = '﻿' + head + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vehiculos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------- MÓDULO 4.11: MATRIZ DE DESTINOS (ciudades de Colombia) ----------------
// Catálogo GLOBAL (compartido por todas las empresas).
const LS_KEY_D = 'movtek_destinos'
function lsAllD() { try { return JSON.parse(localStorage.getItem(LS_KEY_D) || '[]') } catch { return [] } }
function lsSaveD(rows) { try { localStorage.setItem(LS_KEY_D, JSON.stringify(rows)) } catch {} }
function seedDestinos() {
  if (lsAllD().length) return
  lsSaveD(catalogoDestinos().map((c) => ({ id: newId(), ...c })))
}

export async function contarDestinos() {
  if (isSupabaseConfigured) {
    const { count } = await supabase.from('destinos').select('*', { count: 'exact', head: true })
    return count || 0
  }
  seedDestinos()
  return lsAllD().length
}

export async function listDestinos({ departamento = '', q = '' } = {}) {
  if (isSupabaseConfigured) {
    let query = supabase.from('destinos').select('*').order('nombre')
    if (departamento) query = query.eq('departamento', departamento)
    if (q) query = query.ilike('nombre', `%${q}%`)
    const { data, error } = await query
    if (error) throw error
    return data
  }
  seedDestinos()
  let rows = lsAllD().slice().sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
  if (departamento) rows = rows.filter((r) => r.departamento === departamento)
  if (q) rows = rows.filter((r) => (r.nombre || '').toLowerCase().includes(q.toLowerCase()))
  return rows
}

export async function saveDestino(data) {
  const payload = { ...data }
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('destinos').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      return d
    }
    delete payload.id
    const { data: d, error } = await supabase.from('destinos').insert(nulls(payload)).select().single()
    if (error) throw error
    return d
  }
  const rows = lsAllD()
  if (payload.id) {
    const i = rows.findIndex((r) => String(r.id) === String(payload.id))
    if (i >= 0) rows[i] = { ...rows[i], ...payload }
  } else {
    payload.id = newId()
    rows.push(payload)
  }
  lsSaveD(rows)
  return payload
}

export async function deleteDestino(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('destinos').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSaveD(lsAllD().filter((r) => String(r.id) !== String(id)))
}

// Importa el catálogo completo de Colombia (departamentos + ciudades).
export async function importarCatalogoDestinos() {
  const cat = catalogoDestinos()
  if (isSupabaseConfigured) {
    // Inserta por lotes para no exceder límites.
    for (let i = 0; i < cat.length; i += 200) {
      const lote = cat.slice(i, i + 200)
      const { error } = await supabase.from('destinos').insert(lote)
      if (error) throw error
    }
    return cat.length
  }
  lsSaveD(cat.map((c) => ({ id: newId(), ...c })))
  return cat.length
}

// Garantiza que cada Área Metropolitana exista como una ciudad (para datos ya cargados).
export async function asegurarAreasMetro() {
  for (const am of AREAS_METROPOLITANAS) {
    let existe = false
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('destinos').select('id').eq('departamento', am.departamento).eq('nombre', am.nombre).limit(1)
      existe = !!(data && data.length)
    } else {
      seedDestinos()
      existe = lsAllD().some((r) => r.departamento === am.departamento && r.nombre === am.nombre)
    }
    if (!existe) await saveDestino({ departamento: am.departamento, nombre: am.nombre, estado: 'activo' })
  }
}

// ---------------- MÓDULO 4.6: FUEC ----------------
const LS_KEY_F = 'movtek_fuec'
function lsAllF() { try { return JSON.parse(localStorage.getItem(LS_KEY_F) || '[]') } catch { return [] } }
function lsSaveF(rows) { try { localStorage.setItem(LS_KEY_F, JSON.stringify(rows)) } catch {} }

export async function listFuec({ empresaId = null, placa = '', movil = '', contrato_hijo = '', contrato_maestro = '', desde = '', hasta = '' } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('fuec').select('*').order('created_at', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (placa) q = q.ilike('placa', `%${placa}%`)
    if (movil) q = q.ilike('movil', `%${movil}%`)
    if (contrato_hijo) q = q.ilike('contrato_hijo', `%${contrato_hijo}%`)
    if (contrato_maestro) q = q.ilike('no_maestro', `%${contrato_maestro}%`)
    if (desde) q = q.gte('created_at', desde)
    if (hasta) q = q.lte('created_at', hasta + 'T23:59:59')
    const { data, error } = await q
    if (error) throw error
    return data
  }
  let rows = lsAllF()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  if (placa) rows = rows.filter((r) => (r.placa || '').toLowerCase().includes(placa.toLowerCase()))
  if (movil) rows = rows.filter((r) => (r.movil || '').toLowerCase().includes(movil.toLowerCase()))
  if (contrato_hijo) rows = rows.filter((r) => (r.contrato_hijo || '').includes(contrato_hijo))
  if (contrato_maestro) rows = rows.filter((r) => (r.no_maestro || '').includes(contrato_maestro))
  if (desde) rows = rows.filter((r) => (r.created_at || '').slice(0, 10) >= desde)
  if (hasta) rows = rows.filter((r) => (r.created_at || '').slice(0, 10) <= hasta)
  return rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export async function getFuec(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('fuec').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return lsAllF().find((r) => String(r.id) === String(id)) || null
}

export async function saveFuec(data) {
  const payload = { ...data }
  if (!payload.id) {
    // Contrato hijo consecutivo por cliente maestro (máximo 9999).
    const n = await contarFuecCliente(payload.cliente_id)
    if (n >= 9999) throw new Error('Este contrato maestro alcanzó el límite de 9999 FUEC (contrato hijo). No se pueden generar más con este contrato.')
    payload.contrato_hijo = String(n + 1).padStart(4, '0')
    // Número único del FUEC (fecha + maestro + hijo).
    if (!payload.numero_fuec) {
      const d = new Date()
      const p2 = (x) => String(x).padStart(2, '0')
      const ymd = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`
      const maestro = (payload.no_maestro || '').replace(/\D/g, '').padStart(4, '0')
      payload.numero_fuec = `${ymd}${maestro}${payload.contrato_hijo}`
    }
  }
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('fuec').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      return d
    }
    const { data: d, error } = await supabase.from('fuec').insert(nulls(payload)).select().single()
    if (error) throw error
    return d
  }
  const rows = lsAllF()
  if (payload.id) {
    const i = rows.findIndex((r) => String(r.id) === String(payload.id))
    if (i >= 0) rows[i] = { ...rows[i], ...payload }
  } else {
    payload.id = newId()
    payload.created_at = new Date().toISOString()
    rows.unshift(payload)
  }
  lsSaveF(rows)
  return payload
}

export async function deleteFuec(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('fuec').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSaveF(lsAllF().filter((r) => String(r.id) !== String(id)))
}

// Duplica un FUEC (genera un nuevo contrato hijo).
export async function duplicarFuec(id) {
  const orig = await getFuec(id)
  if (!orig) return null
  const { id: _id, contrato_hijo, created_at, ...rest } = orig
  return saveFuec(rest)
}

// Verifica si el vehículo, conductor(es) o contrato maestro de un FUEC están inhabilitados.
export async function verificarHabilitacionFuec(f) {
  if (!f) return []
  const avisos = []
  if (f.vehiculo_id) {
    const v = await getVehiculo(f.vehiculo_id).catch(() => null)
    if (v && v.estado === 'inactivo') avisos.push(`El vehículo ${v.placa || ''} está inhabilitado.`)
  }
  if (f.cliente_id) {
    const c = await getCliente(f.cliente_id).catch(() => null)
    if (c && c.estado === 'inactivo') avisos.push(`El contrato maestro "${nombreMostrar(c)}" está inhabilitado.`)
  }
  for (const cond of (f.conductores || [])) {
    if (!cond.id) continue
    const cc = await getConductor(cond.id).catch(() => null)
    if (cc && cc.estado_habilitacion === 'inactivo') avisos.push(`El conductor ${cc.nombres || ''} ${cc.apellidos || ''} está inhabilitado.`)
  }
  return avisos
}

// Texto del itinerario: "CIUDAD ORIGEN - CIUDAD DESTINO".
export function itinerarioTexto(f) {
  const its = f.itinerarios || []
  return its.map((i) => `${i.ciudad_origen || ''}-${i.ciudad_destino || ''}`).join(', ')
}
export function ocasionalTexto(f) {
  return f.contratante_nombre || (f.contratantes || []).map((x) => x.nombre).join(', ')
}

export function exportFuecCsv(rows) {
  const cols = [
    ['no_maestro', 'No. Maestro'], ['contrato_hijo', 'Contrato Hijo'], ['placa', 'Placa'], ['movil', 'Móvil'],
    ['objeto_contrato', 'Contratante'], ['ocasional', 'Ocasional'], ['vigencia', 'Vigencia'],
    ['itinerario', 'Itinerario'], ['usuario', 'Usuario'], ['fecha', 'Fecha registro'],
  ]
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = cols.map((c) => esc(c[1])).join(';')
  const body = rows.map((r) => cols.map(([k]) => {
    if (k === 'ocasional') return esc(ocasionalTexto(r))
    if (k === 'itinerario') return esc(itinerarioTexto(r))
    if (k === 'vigencia') return esc(`${r.vigencia_inicio || ''} - ${r.vigencia_fin || ''}`)
    if (k === 'fecha') return esc((r.created_at || '').slice(0, 10))
    return esc(r[k])
  }).join(';')).join('\n')
  descargarCsv('﻿' + head + '\n' + body, 'fuec.csv')
}

export function exportFuecConductoresCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = ['Contrato Hijo', 'Placa', 'Conductor', 'Documento'].map(esc).join(';')
  const lines = []
  for (const r of rows) for (const c of (r.conductores || [])) {
    lines.push([r.contrato_hijo, r.placa, c.nombre, c.documento].map(esc).join(';'))
  }
  descargarCsv('﻿' + head + '\n' + lines.join('\n'), 'fuec_conductores.csv')
}

function descargarCsv(csv, nombre) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export function exportClientesCsv(rows) {
  const cols = [
    ['documento', 'Documento'], ['nombre', 'Nombre / Compañía'], ['tipo_persona', 'Tipo'],
    ['tipo_identificacion', 'Identificación'], ['celular', 'Celular'], ['telefono_oficina', 'Tel. oficina'],
    ['estado', 'Estado'], ['contrato_maestro_nro', 'Contrato maestro'], ['direccion', 'Dirección'],
  ]
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = cols.map((c) => esc(c[1])).join(';')
  const body = rows.map((r) => cols.map(([k]) => esc(k === 'nombre' ? nombreMostrar(r) : r[k])).join(';')).join('\n')
  const csv = '﻿' + head + '\n' + body
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'clientes_maestros.csv'
  a.click()
  URL.revokeObjectURL(url)
}
