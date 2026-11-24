import { supabase, isSupabaseConfigured } from './supabase'
import { catalogoDestinos, AREAS_METROPOLITANAS } from './colombia'
import { normalizarPreguntas } from './preoperacional'
import { subirFirma, subirLogo, esDataUrl } from './storage'

// Capa de datos de Movtek (multiempresa).
// Con Supabase usa la base real; sin conectar, modo demo en el navegador.

const LS_KEY = 'movtek_clientes'
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// Convierte strings vacíos a null (Postgres rechaza '' en columnas date/numeric).
const nulls = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]))

function lsAll() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
function lsSave(rows) { try { localStorage.setItem(LS_KEY, JSON.stringify(rows)) } catch {} }

// ---------------- EMPRESAS (Movtek es la maestra; cada empresa con su marca y link) ----------------
export const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Empresa maestra por defecto (Movtek). El super-administrador crea las demás.
const MOVTEK_MASTER = {
  id: 'movtek', nombre: 'Movtek', slug: 'movtek', es_maestra: true,
  color_primario: '#1d4ed8', color_acento: '#f97316',
  razon_social: 'MOVTEK', nit: '', direccion: '', ciudad: '', telefonos: '', email: '', resolucion: '',
  logo_url: '', iso_url: '',
}

const LS_KEY_E = 'movtek_empresas'
function lsAllE() { try { const v = JSON.parse(localStorage.getItem(LS_KEY_E) || 'null'); return v && v.length ? v : [MOVTEK_MASTER] } catch { return [MOVTEK_MASTER] } }
function lsSaveE(rows) { try { localStorage.setItem(LS_KEY_E, JSON.stringify(rows)) } catch {} }

export async function listEmpresas() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('empresas').select('*').order('nombre')
    if (error) throw error
    const vistos = new Set()
    const unicas = (data || []).filter((e) => (vistos.has(e.nombre) ? false : vistos.add(e.nombre)))
    // Movtek (plataforma maestra) siempre va primero, aunque no exista como fila en la BD.
    const tieneMaestra = unicas.some((e) => e.es_maestra || e.id === 'movtek' || (e.nombre || '').toLowerCase() === 'movtek')
    return tieneMaestra ? unicas : [MOVTEK_MASTER, ...unicas]
  }
  return lsAllE()
}

// La empresa maestra (Movtek) dentro de una lista de empresas.
export function empresaMaestra(list = []) {
  return list.find((e) => e.es_maestra || e.id === 'movtek' || (e.nombre || '').toLowerCase() === 'movtek') || MOVTEK_MASTER
}

// ------- Historial de cambios (auditoría) -------
// Quién está haciendo los cambios (lo fija la app al iniciar sesión / cambiar de empresa).
let _actor = { usuario: '', empresaId: null }
export function setActorHistorial(a) { _actor = { usuario: a?.usuario || '', empresaId: a?.empresaId ?? null } }

const LS_KEY_H = 'movtek_historial'
// Registra un cambio (crear / editar / eliminar). No bloquea el guardado si falla.
export function registrarCambio({ accion, entidad, descripcion = '', empresa_id }) {
  const row = {
    accion, entidad, descripcion,
    empresa_id: (empresa_id ?? _actor.empresaId) || null,
    usuario: _actor.usuario || 'sistema',
    created_at: new Date().toISOString(),
  }
  try {
    if (isSupabaseConfigured) { supabase.from('historial').insert(row).then(() => {}, () => {}); return }
    const all = JSON.parse(localStorage.getItem(LS_KEY_H) || '[]')
    all.unshift({ id: newId(), ...row })
    localStorage.setItem(LS_KEY_H, JSON.stringify(all.slice(0, 5000)))
  } catch {}
}

// Lista el historial, opcionalmente por empresa y rango de fechas (ISO yyyy-mm-dd).
export async function listHistorial({ empresaId = null, desde = '', hasta = '' } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('historial').select('*').order('created_at', { ascending: false }).limit(5000)
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (desde) q = q.gte('created_at', desde)
    if (hasta) q = q.lte('created_at', hasta + 'T23:59:59')
    const { data, error } = await q
    if (error) throw error
    return data || []
  }
  let rows = []
  try { rows = JSON.parse(localStorage.getItem(LS_KEY_H) || '[]') } catch {}
  if (empresaId) rows = rows.filter((r) => String(r.empresa_id) === String(empresaId))
  if (desde) rows = rows.filter((r) => r.created_at >= desde)
  if (hasta) rows = rows.filter((r) => r.created_at <= hasta + 'T23:59:59')
  return rows
}

export async function getEmpresa(id) {
  if (!id) return null
  const list = await listEmpresas()
  return list.find((e) => String(e.id) === String(id)) || null
}

// Busca la empresa por su link (slug) — para la página de acceso de cada empresa.
export async function getEmpresaPorSlug(slug) {
  const s = slugify(slug)
  if (!s) return null
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('empresas').select('*').eq('slug', s).limit(1)
    if (error) return null
    return (data && data[0]) || null
  }
  return lsAllE().find((e) => (e.slug || slugify(e.nombre)) === s) || null
}

export async function saveEmpresa(data) {
  const payload = { ...data }
  delete payload.iso_url // el sello ISO es automático; no se guarda por empresa
  if (!payload.slug && payload.nombre) payload.slug = slugify(payload.nombre)
  if (payload.slug) payload.slug = slugify(payload.slug)
  const esNuevo = !(payload.id && payload.id !== 'movtek')
  let res
  if (isSupabaseConfigured) {
    // El logo se guarda en Storage (no en la base) para no llenarla: solo queda la URL.
    if (esDataUrl(payload.logo_url)) payload.logo_url = await subirLogo(payload.logo_url, payload.slug || payload.id)
    // Si una columna opcional (p. ej. firma_url) aún no existe en la BD, se reintenta sin ella.
    const guardar = async (p) => {
      if (p.id && p.id !== 'movtek') {
        const { id, created_at, es_maestra, ...rest } = p
        return supabase.from('empresas').update(nulls(rest)).eq('id', id).select().single()
      }
      const { id, es_maestra, ...rest } = p
      return supabase.from('empresas').insert(nulls(rest)).select().single()
    }
    let { data: d, error } = await guardar(payload)
    if (error && /column|schema cache/i.test(error.message || '')) {
      const m = (error.message || '').match(/'([a-z_]+)' column/i)
      const col = m ? m[1] : 'firma_url'
      const { [col]: _omit, ...sinCol } = payload
      ;({ data: d, error } = await guardar(sinCol))
    }
    if (error) throw error
    res = d
  } else {
    const rows = lsAllE()
    if (payload.id && payload.id !== 'movtek') {
      const i = rows.findIndex((r) => String(r.id) === String(payload.id))
      if (i >= 0) { rows[i] = { ...rows[i], ...payload }; res = rows[i] }
    } else { payload.id = newId(); rows.push(payload); res = payload }
    lsSaveE(rows); res = res || payload
  }
  registrarCambio({ accion: esNuevo ? 'crear' : 'editar', entidad: 'Empresa', descripcion: res.nombre || '', empresa_id: res.id })
  return res
}

// --- Logos del sistema (ISO, Ministerio de Transporte, Vigilado SuperTransporte) ---
// Globales para toda la plataforma; solo el administrador los cambia. Si no hay
// personalizados, el FUEC usa los que vienen por defecto en la app.
const LS_KEY_SIS = 'movtek_logos_sistema'
export async function getLogosSistema() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('ajustes').select('*').eq('id', 1).limit(1)
    if (error) return {}
    return (data && data[0]) || {}
  }
  try { return JSON.parse(localStorage.getItem(LS_KEY_SIS) || '{}') } catch { return {} }
}
export async function saveLogosSistema(data) {
  const payload = { id: 1, ...data }
  if (isSupabaseConfigured) {
    const { data: d, error } = await supabase.from('ajustes').upsert(payload).select().single()
    if (error) throw error
    return d
  }
  try { localStorage.setItem(LS_KEY_SIS, JSON.stringify(payload)) } catch {}
  return payload
}

export async function deleteEmpresa(id) {
  if (id === 'movtek') return
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('empresas').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSaveE(lsAllE().filter((r) => String(r.id) !== String(id)))
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

  let res
  if (isSupabaseConfigured) {
    // Guarda y, si una columna aún no existe en la BD, la omite y reintenta (varias veces).
    const guardar = async (p) => {
      if (p.id) {
        const { id, created_at, ...rest } = p
        return supabase.from('clientes_maestros').update(nulls(rest)).eq('id', id).select().single()
      }
      const { id, ...rest } = p
      return supabase.from('clientes_maestros').insert(nulls(rest)).select().single()
    }
    let p = { ...payload }
    let d, error
    for (let intento = 0; intento < 12; intento++) {
      ;({ data: d, error } = await guardar(p))
      if (!error) break
      if (!/column|schema cache/i.test(error.message || '')) break
      const m = (error.message || '').match(/'([a-z_0-9]+)' column/i)
      if (!m || !(m[1] in p)) break
      const { [m[1]]: _omit, ...sinCol } = p
      p = sinCol
    }
    if (error) throw error
    res = d
  } else {
    const rows = lsAll()
    if (payload.id) {
      const i = rows.findIndex((r) => String(r.id) === String(payload.id))
      if (i >= 0) { rows[i] = { ...rows[i], ...payload }; res = rows[i] }
    } else { payload.id = newId(); rows.unshift(payload); res = payload }
    lsSave(rows); res = res || payload
  }
  registrarCambio({ accion: data.id ? 'editar' : 'crear', entidad: 'Cliente', descripcion: nombreMostrar(res), empresa_id: res.empresa_id })
  return res
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
  let res
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('conductores').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      res = d
    } else {
      delete payload.id
      const { data: d, error } = await supabase.from('conductores').insert(nulls(payload)).select().single()
      if (error) throw error
      res = d
    }
  } else {
    const rows = lsAllC()
    if (payload.id) {
      const i = rows.findIndex((r) => String(r.id) === String(payload.id))
      if (i >= 0) { rows[i] = { ...rows[i], ...payload }; res = rows[i] }
    } else { payload.id = newId(); rows.unshift(payload); res = payload }
    lsSaveC(rows); res = res || payload
  }
  registrarCambio({ accion: data.id ? 'editar' : 'crear', entidad: 'Conductor', descripcion: nombreConductor(res), empresa_id: res.empresa_id })
  return res
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
  let res
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('propietarios').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      res = d
    } else {
      delete payload.id
      const { data: d, error } = await supabase.from('propietarios').insert(nulls(payload)).select().single()
      if (error) throw error
      res = d
    }
  } else {
    const rows = lsAllP()
    if (payload.id) {
      const i = rows.findIndex((r) => String(r.id) === String(payload.id))
      if (i >= 0) { rows[i] = { ...rows[i], ...payload }; res = rows[i] }
    } else { payload.id = newId(); rows.unshift(payload); res = payload }
    lsSaveP(rows); res = res || payload
  }
  registrarCambio({ accion: data.id ? 'editar' : 'crear', entidad: 'Propietario', descripcion: nombrePropietario(res), empresa_id: res.empresa_id })
  return res
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
  let res
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('empresas_transportadoras').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      res = d
    } else {
      delete payload.id
      const { data: d, error } = await supabase.from('empresas_transportadoras').insert(nulls(payload)).select().single()
      if (error) throw error
      res = d
    }
  } else {
    const rows = lsAllT()
    if (payload.id) {
      const i = rows.findIndex((r) => String(r.id) === String(payload.id))
      if (i >= 0) { rows[i] = { ...rows[i], ...payload }; res = rows[i] }
    } else { payload.id = newId(); rows.unshift(payload); res = payload }
    lsSaveT(rows); res = res || payload
  }
  registrarCambio({ accion: data.id ? 'editar' : 'crear', entidad: 'Empresa transp.', descripcion: nombreTransportadora(res), empresa_id: res.empresa_id })
  return res
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
  let res
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('vehiculos').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      res = d
    } else {
      delete payload.id
      const { data: d, error } = await supabase.from('vehiculos').insert(nulls(payload)).select().single()
      if (error) throw error
      res = d
    }
  } else {
    const rows = lsAllV()
    if (payload.id) {
      const i = rows.findIndex((r) => String(r.id) === String(payload.id))
      if (i >= 0) { rows[i] = { ...rows[i], ...payload }; res = rows[i] }
    } else { payload.id = newId(); rows.unshift(payload); res = payload }
    lsSaveV(rows); res = res || payload
  }
  registrarCambio({ accion: data.id ? 'editar' : 'crear', entidad: 'Vehículo', descripcion: res.placa || '', empresa_id: res.empresa_id })
  return res
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
    // Usa el consecutivo indicado en el formulario; si no, el siguiente automático.
    payload.contrato_hijo = (payload.contrato_hijo && String(payload.contrato_hijo).replace(/\D/g, ''))
      ? String(payload.contrato_hijo).replace(/\D/g, '').padStart(4, '0')
      : String(n + 1).padStart(4, '0')
    // Número único del FUEC: si el formulario ya lo calculó (formato oficial), se respeta.
    if (!payload.numero_fuec) {
      const d = new Date()
      const p2 = (x) => String(x).padStart(2, '0')
      const ymd = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`
      const maestro = (payload.no_maestro || '').replace(/\D/g, '').padStart(4, '0')
      payload.numero_fuec = `${ymd}${maestro}${payload.contrato_hijo}`
    }
  }
  const esNuevo = !data.id
  let res
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('fuec').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      res = d
    } else {
      const { data: d, error } = await supabase.from('fuec').insert(nulls(payload)).select().single()
      if (error) throw error
      res = d
    }
  } else {
    const rows = lsAllF()
    if (payload.id) {
      const i = rows.findIndex((r) => String(r.id) === String(payload.id))
      if (i >= 0) { rows[i] = { ...rows[i], ...payload }; res = rows[i] }
    } else {
      payload.id = newId()
      payload.created_at = new Date().toISOString()
      rows.unshift(payload)
      res = payload
    }
    lsSaveF(rows); res = res || payload
  }
  registrarCambio({ accion: esNuevo ? 'crear' : 'editar', entidad: 'FUEC', descripcion: `${res.no_maestro || ''}-${res.contrato_hijo || ''}`, empresa_id: res.empresa_id })
  return res
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

// ---------------- USUARIOS Y ROLES ----------------
// Roles: 'admin' (todo + gestiona usuarios), 'operativo' (crea/edita datos, no usuarios),
// 'propietario' (solo ve su vehículo y conductores, crea FUEC con sus vehículos, edita sus datos).
const LS_KEY_U = 'movtek_usuarios'
function lsAllU() { try { return JSON.parse(localStorage.getItem(LS_KEY_U) || '[]') } catch { return [] } }
function lsSaveU(rows) { try { localStorage.setItem(LS_KEY_U, JSON.stringify(rows)) } catch {} }

function seedUsuarios() {
  if (lsAllU().length) return
  lsSaveU([
    { id: 'u1', empresa_id: 'e1', nombre: 'Administrador', email: 'admin@movtek.co', rol: 'admin', propietario_id: null, estado: 'activo' },
  ])
}

export async function listUsuarios({ empresaId = null } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('usuarios').select('*').order('created_at', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  seedUsuarios()
  let rows = lsAllU()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  return rows
}

export async function getUsuario(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return lsAllU().find((r) => String(r.id) === String(id)) || null
}

// Busca el usuario por correo (para determinar su rol al iniciar sesión).
// Si hay varias filas con el mismo correo (credenciales duplicadas), prioriza:
// admin > operativo > propietario, y entre iguales, la que esté activa.
function mejorUsuario(rows) {
  const peso = (u) => (u.rol === 'admin' ? 3 : u.rol === 'operativo' ? 2 : 1) + (u.estado !== 'inactivo' ? 0.5 : 0)
  return [...rows].sort((a, b) => peso(b) - peso(a))[0] || null
}

export async function getUsuarioPorEmail(email) {
  if (!email) return null
  const norm = String(email).trim().toLowerCase()
  if (isSupabaseConfigured) {
    let { data, error } = await supabase.from('usuarios').select('*').ilike('email', norm)
    if (error) throw error // deja que el caller distinga error de "no existe"
    let rows = data || []
    if (!rows.length) {
      // Respaldo: compara normalizando (por si el correo guardado trae espacios o mayúsculas distintas).
      const { data: todos } = await supabase.from('usuarios').select('*')
      rows = (todos || []).filter((u) => String(u.email || '').trim().toLowerCase() === norm)
    }
    return mejorUsuario(rows)
  }
  seedUsuarios()
  return mejorUsuario(lsAllU().filter((r) => String(r.email || '').trim().toLowerCase() === norm))
}

export async function saveUsuario(data) {
  const payload = { ...data }
  if (payload.email) payload.email = String(payload.email).trim() // evita espacios que rompen el login
  let res
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('usuarios').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error
      res = d
    } else {
      delete payload.id
      const { data: d, error } = await supabase.from('usuarios').insert(nulls(payload)).select().single()
      if (error) throw error
      res = d
    }
  } else {
    const rows = lsAllU()
    if (payload.id) {
      const i = rows.findIndex((r) => String(r.id) === String(payload.id))
      if (i >= 0) { rows[i] = { ...rows[i], ...payload }; res = rows[i] }
    } else { payload.id = newId(); rows.unshift(payload); res = payload }
    lsSaveU(rows); res = res || payload
  }
  registrarCambio({ accion: data.id ? 'editar' : 'crear', entidad: 'Usuario', descripcion: `${res.nombre || ''} (${res.email || ''})`, empresa_id: res.empresa_id })
  return res
}

export async function deleteUsuario(id) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('usuarios').delete().eq('id', id)
    if (error) throw error
    return
  }
  lsSaveU(lsAllU().filter((r) => String(r.id) !== String(id)))
}

export const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operativo', label: 'Operativo' },
  { value: 'propietario', label: 'Propietario' },
  { value: 'conductor', label: 'Conductor (app preoperacional)' },
]
export const rolLabel = (v) => (ROLES.find((r) => r.value === v)?.label || v || '—')

// Busca un propietario por su documento en toda la base (para el autoregistro desde el login).
export async function buscarPropietarioGlobalPorDocumento(documento) {
  const doc = String(documento || '').trim()
  if (!doc) return null
  if (isSupabaseConfigured) {
    // RPC pública (SECURITY DEFINER): permite verificar la cédula sin exponer la tabla.
    const { data, error } = await supabase.rpc('propietario_por_documento', { doc })
    if (error) return null
    return (Array.isArray(data) ? data[0] : data) || null
  }
  seedPropietarios()
  return lsAllP().find((p) => String(p.documento || '').trim() === doc) || null
}

// Registra el usuario de un propietario (rol propietario). Requiere que el propietario ya exista.
export async function registrarUsuarioPropietario({ documento, nombre, telefono, direccion, email }) {
  const doc = String(documento || '').trim()
  if (isSupabaseConfigured) {
    // RPC pública (SECURITY DEFINER): crea el usuario del propietario sin requerir sesión previa.
    const { data, error } = await supabase.rpc('registrar_usuario_propietario', {
      doc, p_nombre: nombre || '', p_tel: telefono || '', p_dir: direccion || '', p_email: email || '',
    })
    if (error) return { ok: false, motivo: 'error', error: error.message }
    if (!data || data.ok === false) return { ok: false, motivo: data?.motivo || 'no-propietario' }
    return { ok: true, usuario: { id: data.usuario_id }, propietario: { id: data.propietario_id, empresa_id: data.empresa_id } }
  }
  // Modo demo
  const prop = await buscarPropietarioGlobalPorDocumento(doc)
  if (!prop) return { ok: false, motivo: 'no-propietario' }
  try { await savePropietario({ ...prop, celular: telefono || prop.celular, direccion: direccion || prop.direccion, correo: email || prop.correo }) } catch {}
  const existentes = await listUsuarios({ empresaId: prop.empresa_id })
  const yaUsuario = existentes.find((u) => String(u.propietario_id) === String(prop.id))
  const base = { empresa_id: prop.empresa_id, nombre: nombre || nombrePropietario(prop), email, rol: 'propietario', propietario_id: prop.id, estado: 'activo' }
  const usuario = await saveUsuario(yaUsuario ? { ...yaUsuario, ...base } : base)
  return { ok: true, usuario, propietario: prop }
}

// ================= PREOPERACIONALES (app de conductores) =================
const LS_KEY_PRE = 'movtek_preop'
function lsAllPre() { try { return JSON.parse(localStorage.getItem(LS_KEY_PRE) || '[]') } catch { return [] } }
function lsSavePre(rows) { try { localStorage.setItem(LS_KEY_PRE, JSON.stringify(rows)) } catch {} }

// Fecha local (YYYY-MM-DD) respetando la zona horaria del equipo.
export const fechaLocalISO = (d = new Date()) => {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d - off).toISOString().slice(0, 10)
}

// Vehículos ACTIVOS asignados al conductor (si no tiene asignados, muestra los activos de la empresa).
export async function vehiculosDeConductor({ empresaId, conductorId }) {
  const todos = await listVehiculos({ empresaId, estado: 'activo' })
  if (!conductorId) return todos
  const asignados = todos.filter((v) => (v.conductores_asignados || []).some((c) => String(c.id) === String(conductorId)))
  return asignados.length ? asignados : todos
}

// Busca la ficha de conductor que corresponde al usuario que inició sesión.
export async function conductorDeUsuario({ empresaId, conductorId, email }) {
  // 1) Por el conductor_id recibido.
  if (conductorId) {
    const c = await getConductor(conductorId).catch(() => null)
    if (c) return c
  }
  if (email) {
    // 2) Por el usuario (email -> su conductor_id guardado).
    const u = await getUsuarioPorEmail(email).catch(() => null)
    if (u?.conductor_id) {
      const c = await getConductor(u.conductor_id).catch(() => null)
      if (c) return c
    }
    // 3) Por el correo guardado en la ficha del conductor.
    const lista = await listConductores({ empresaId }).catch(() => [])
    const norm = String(email).trim().toLowerCase()
    const c = lista.find((x) => String(x.correo || '').trim().toLowerCase() === norm)
    if (c) return c
  }
  return null
}

export async function listPreoperacionales({ empresaId = null, placa = '', conductor = '', desde = '', hasta = '', tipo = '' } = {}) {
  let rows
  if (isSupabaseConfigured) {
    let q = supabase.from('preoperacionales').select('*').order('fecha', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (tipo) q = q.eq('tipo', tipo)
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    const { data, error } = await q
    if (error) throw error
    rows = data || []
  } else {
    rows = lsAllPre()
    if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
    if (tipo) rows = rows.filter((r) => r.tipo === tipo)
    if (desde) rows = rows.filter((r) => (r.fecha || '') >= desde)
    if (hasta) rows = rows.filter((r) => (r.fecha || '') <= hasta)
    rows.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.hora || '').localeCompare(a.hora || ''))
  }
  if (placa) rows = rows.filter((r) => (r.placa || '').toLowerCase().includes(placa.toLowerCase()))
  if (conductor) rows = rows.filter((r) => (r.conductor_nombre || '').toLowerCase().includes(conductor.toLowerCase()) || (r.conductor_doc || '').includes(conductor))
  return rows
}

export async function getPreoperacional(id) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('preoperacionales').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
  return lsAllPre().find((r) => String(r.id) === String(id)) || null
}

// ¿Ya hizo el conductor su preoperacional (o reportó taller/descanso) hoy para este vehículo?
export async function preoperacionalHoy({ empresaId, vehiculoId, conductorId, fecha = fechaLocalISO() }) {
  const rows = await listPreoperacionales({ empresaId, desde: fecha, hasta: fecha })
  return rows.find((r) => String(r.vehiculo_id) === String(vehiculoId) && (!conductorId || String(r.conductor_id) === String(conductorId))) || null
}

export async function savePreoperacional(data) {
  const payload = { ...data }
  if (!payload.fecha) payload.fecha = fechaLocalISO()
  let res
  if (isSupabaseConfigured) {
    // La firma se sube a Storage (no base64 en la base): solo se guarda la URL.
    if (esDataUrl(payload.firma_url)) payload.firma_url = await subirFirma(payload.firma_url, payload.empresa_id)
    const guardar = async (p) => {
      if (p.id) {
        const { id, created_at, ...rest } = p
        return supabase.from('preoperacionales').update(nulls(rest)).eq('id', id).select().single()
      }
      const { id, ...rest } = p
      return supabase.from('preoperacionales').insert(nulls(rest)).select().single()
    }
    let p = { ...payload }, d, error
    for (let i = 0; i < 12; i++) {
      ;({ data: d, error } = await guardar(p))
      if (!error) break
      if (!/column|schema cache/i.test(error.message || '')) break
      const m = (error.message || '').match(/'([a-z_0-9]+)' column/i)
      if (!m || !(m[1] in p)) break
      const { [m[1]]: _o, ...sin } = p; p = sin
    }
    if (error) throw error
    res = d
  } else {
    const rows = lsAllPre()
    if (payload.id) {
      const i = rows.findIndex((r) => String(r.id) === String(payload.id))
      if (i >= 0) { rows[i] = { ...rows[i], ...payload }; res = rows[i] }
    } else { payload.id = newId(); payload.created_at = new Date().toISOString(); rows.unshift(payload); res = payload }
    lsSavePre(rows); res = res || payload
  }
  registrarCambio({ accion: data.id ? 'editar' : 'crear', entidad: 'Preoperacional', descripcion: `${res.placa || ''} · ${res.conductor_nombre || ''}`, empresa_id: res.empresa_id })
  return res
}

// ¿Este documento corresponde a un conductor registrado y CON vehículo activo asignado?
// Se usa para el autoregistro del conductor desde la app.
export async function conductorRegistrable({ empresaId, documento }) {
  const doc = String(documento || '').trim()
  if (!doc) return { ok: false, motivo: 'sin-documento' }
  const conductores = await listConductores({ empresaId })
  const c = conductores.find((x) => String(x.documento || '').trim() === doc)
  if (!c) return { ok: false, motivo: 'no-ficha' }
  const vehiculos = await listVehiculos({ empresaId, estado: 'activo' })
  const tieneVehiculo = vehiculos.some((v) => (v.conductores_asignados || []).some((a) => String(a.id) === String(c.id)))
  if (!tieneVehiculo) return { ok: false, motivo: 'sin-vehiculo' }
  return { ok: true, conductor: c }
}

// ============ PREGUNTAS de la preoperacional (editables por empresa) ============
const LS_KEY_PREG = 'movtek_preop_preguntas'

export async function getPreguntasPreop(empresaId) {
  if (isSupabaseConfigured && empresaId) {
    try {
      const { data, error } = await supabase.from('empresas').select('preop_preguntas').eq('id', empresaId).single()
      if (!error) return normalizarPreguntas(data?.preop_preguntas)
    } catch {}
    return normalizarPreguntas()
  }
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY_PREG) || '{}')
    return normalizarPreguntas(all[empresaId])
  } catch { return normalizarPreguntas() }
}

export async function savePreguntasPreop(empresaId, preguntas) {
  const limpias = normalizarPreguntas(preguntas)
  if (isSupabaseConfigured && empresaId) {
    const { error } = await supabase.from('empresas').update({ preop_preguntas: limpias }).eq('id', empresaId)
    if (error) throw error
  } else {
    try {
      const all = JSON.parse(localStorage.getItem(LS_KEY_PREG) || '{}')
      all[empresaId] = limpias
      localStorage.setItem(LS_KEY_PREG, JSON.stringify(all))
    } catch {}
  }
  registrarCambio({ accion: 'editar', entidad: 'Preguntas preoperacional', descripcion: `${limpias.length} preguntas`, empresa_id: empresaId })
  return limpias
}

// ================= MÓDULO: PLAN DE RODAMIENTO (CRONOGRAMA DE RUTAS) =================
// Formato oficial: cada registro = un SERVICIO/recorrido con fecha, placa, conductor,
// descripción (Ingreso/Salida/Traslado), horas, ruta, origen, destino, empresa cliente, clase.
const LS_KEY_ROD = 'movtek_rodamiento'
function lsAllR() { try { return JSON.parse(localStorage.getItem(LS_KEY_ROD) || '[]') } catch { return [] } }
function lsSaveR(rows) { try { localStorage.setItem(LS_KEY_ROD, JSON.stringify(rows)) } catch {} }

// Calcula el tiempo HH:MM entre dos horas "HH:MM".
export function tiempoRecorrido(ini, fin) {
  if (!ini || !fin) return ''
  const [h1, m1] = String(ini).split(':').map(Number)
  const [h2, m2] = String(fin).split(':').map(Number)
  if ([h1, m1, h2, m2].some((x) => Number.isNaN(x))) return ''
  let min = (h2 * 60 + m2) - (h1 * 60 + m1)
  if (min < 0) min += 24 * 60
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

export async function listRodamiento({ empresaId = null, desde = '', hasta = '', vehiculoId = '', placa = '', conductorId = '' } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('rodamiento').select('*').order('fecha', { ascending: true })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (vehiculoId) q = q.eq('vehiculo_id', vehiculoId)
    if (placa) q = q.ilike('placa', `%${placa}%`)
    if (conductorId) q = q.eq('conductor_id', conductorId)
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  let rows = lsAllR()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  if (vehiculoId) rows = rows.filter((r) => String(r.vehiculo_id) === String(vehiculoId))
  if (placa) rows = rows.filter((r) => (r.placa || '').toLowerCase().includes(placa.toLowerCase()))
  if (conductorId) rows = rows.filter((r) => String(r.conductor_id) === String(conductorId))
  if (desde) rows = rows.filter((r) => (r.fecha || '') >= desde)
  if (hasta) rows = rows.filter((r) => (r.fecha || '') <= hasta)
  return rows.sort((a, b) => (a.fecha + (a.hora_inicial || '')).localeCompare(b.fecha + (b.hora_inicial || '')))
}

// Guarda un servicio del cronograma (insertar o actualizar por id).
export async function saveRodamiento(data) {
  const payload = { ...data, tiempo: data.tiempo || tiempoRecorrido(data.hora_inicial, data.hora_final) }
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('rodamiento').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error; return d
    }
    delete payload.id
    const { data: d, error } = await supabase.from('rodamiento').insert(nulls(payload)).select().single()
    if (error) throw error; return d
  }
  const rows = lsAllR()
  if (payload.id) { const i = rows.findIndex((r) => String(r.id) === String(payload.id)); if (i >= 0) rows[i] = { ...rows[i], ...payload }; lsSaveR(rows); return rows[i] || payload }
  payload.id = newId(); rows.push(payload); lsSaveR(rows); return payload
}

export async function deleteRodamiento(id) {
  if (isSupabaseConfigured) { const { error } = await supabase.from('rodamiento').delete().eq('id', id); if (error) throw error; return }
  lsSaveR(lsAllR().filter((r) => String(r.id) !== String(id)))
}

// ---- Rutas maestras (plantillas de ruta con datos fijos) ----
const LS_KEY_RM = 'movtek_rutas_maestras'
function lsAllRM() { try { return JSON.parse(localStorage.getItem(LS_KEY_RM) || '[]') } catch { return [] } }
function lsSaveRM(rows) { try { localStorage.setItem(LS_KEY_RM, JSON.stringify(rows)) } catch {} }

export async function listRutasMaestras({ empresaId = null } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('rutas_maestras').select('*').order('nombre', { ascending: true })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  let rows = lsAllRM()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  return rows.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
}

export async function saveRutaMaestra(data) {
  const payload = { ...data }
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('rutas_maestras').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error; return d
    }
    delete payload.id
    const { data: d, error } = await supabase.from('rutas_maestras').insert(nulls(payload)).select().single()
    if (error) throw error; return d
  }
  const rows = lsAllRM()
  if (payload.id) { const i = rows.findIndex((r) => String(r.id) === String(payload.id)); if (i >= 0) rows[i] = { ...rows[i], ...payload }; lsSaveRM(rows); return rows[i] || payload }
  payload.id = newId(); rows.push(payload); lsSaveRM(rows); return payload
}

export async function deleteRutaMaestra(id) {
  if (isSupabaseConfigured) { const { error } = await supabase.from('rutas_maestras').delete().eq('id', id); if (error) throw error; return }
  lsSaveRM(lsAllRM().filter((r) => String(r.id) !== String(id)))
}

export const DESCRIPCIONES_ROD = ['Ingreso Personal', 'Salida Personal', 'Traslado']

// ================= MÓDULO: PLAN DE MANTENIMIENTO =================
// (A) Plan preventivo por vehículo (tareas con próximo por fecha/km).
// (B) Bitácora de mantenimientos realizados.
const LS_KEY_MP = 'movtek_mant_plan'
const LS_KEY_MR = 'movtek_mant_registro'
function lsAllMP() { try { return JSON.parse(localStorage.getItem(LS_KEY_MP) || '[]') } catch { return [] } }
function lsSaveMP(rows) { try { localStorage.setItem(LS_KEY_MP, JSON.stringify(rows)) } catch {} }
function lsAllMR() { try { return JSON.parse(localStorage.getItem(LS_KEY_MR) || '[]') } catch { return [] } }
function lsSaveMR(rows) { try { localStorage.setItem(LS_KEY_MR, JSON.stringify(rows)) } catch {} }

const sumarDias = (iso, dias) => {
  if (!iso || !dias) return ''
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + Number(dias))
  return d.toISOString().slice(0, 10)
}
// Calcula próximo mantenimiento a partir del último + intervalos.
export function calcularProximo(plan) {
  const proxima_fecha = plan.ultima_fecha && plan.cada_dias ? sumarDias(plan.ultima_fecha, plan.cada_dias) : (plan.proxima_fecha || '')
  const proximo_km = plan.ultimo_km && plan.cada_km ? (Number(plan.ultimo_km) + Number(plan.cada_km)) : (plan.proximo_km || '')
  return { proxima_fecha, proximo_km: proximo_km ? String(proximo_km) : '' }
}

export async function listMantPlan({ empresaId = null, vehiculoId = '' } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('mantenimiento_plan').select('*').order('created_at', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (vehiculoId) q = q.eq('vehiculo_id', vehiculoId)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  let rows = lsAllMP()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  if (vehiculoId) rows = rows.filter((r) => String(r.vehiculo_id) === String(vehiculoId))
  return rows
}

export async function saveMantPlan(data) {
  const payload = { ...data, ...calcularProximo(data) }
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('mantenimiento_plan').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error; return d
    }
    delete payload.id
    const { data: d, error } = await supabase.from('mantenimiento_plan').insert(nulls(payload)).select().single()
    if (error) throw error; return d
  }
  const rows = lsAllMP()
  if (payload.id) { const i = rows.findIndex((r) => String(r.id) === String(payload.id)); if (i >= 0) rows[i] = { ...rows[i], ...payload }; lsSaveMP(rows); return rows[i] }
  payload.id = newId(); rows.unshift(payload); lsSaveMP(rows); return payload
}

export async function deleteMantPlan(id) {
  if (isSupabaseConfigured) { const { error } = await supabase.from('mantenimiento_plan').delete().eq('id', id); if (error) throw error; return }
  lsSaveMP(lsAllMP().filter((r) => String(r.id) !== String(id)))
}

export async function listMantRegistro({ empresaId = null, vehiculoId = '', desde = '', hasta = '' } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase.from('mantenimiento_registro').select('*').order('fecha', { ascending: false })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (vehiculoId) q = q.eq('vehiculo_id', vehiculoId)
    if (desde) q = q.gte('fecha', desde)
    if (hasta) q = q.lte('fecha', hasta)
    const { data, error } = await q
    if (error) throw error
    return data
  }
  let rows = lsAllMR()
  if (empresaId) rows = rows.filter((r) => r.empresa_id === empresaId)
  if (vehiculoId) rows = rows.filter((r) => String(r.vehiculo_id) === String(vehiculoId))
  if (desde) rows = rows.filter((r) => (r.fecha || '') >= desde)
  if (hasta) rows = rows.filter((r) => (r.fecha || '') <= hasta)
  return rows.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
}

// Guarda un mantenimiento realizado; si viene de un plan, actualiza su último y recalcula el próximo.
export async function saveMantRegistro(data) {
  const payload = { ...data }
  let res
  if (isSupabaseConfigured) {
    if (payload.id) {
      const { id, created_at, ...rest } = payload
      const { data: d, error } = await supabase.from('mantenimiento_registro').update(nulls(rest)).eq('id', id).select().single()
      if (error) throw error; res = d
    } else {
      delete payload.id
      const { data: d, error } = await supabase.from('mantenimiento_registro').insert(nulls(payload)).select().single()
      if (error) throw error; res = d
    }
  } else {
    const rows = lsAllMR()
    if (payload.id) { const i = rows.findIndex((r) => String(r.id) === String(payload.id)); if (i >= 0) rows[i] = { ...rows[i], ...payload }; res = rows[i] }
    else { payload.id = newId(); payload.created_at = new Date().toISOString(); rows.unshift(payload); res = payload }
    lsSaveMR(rows)
  }
  // Actualiza el plan asociado (último km/fecha → próximo).
  if (payload.plan_id) {
    try {
      const planes = await listMantPlan({})
      const plan = planes.find((p) => String(p.id) === String(payload.plan_id))
      if (plan) await saveMantPlan({ ...plan, ultima_fecha: payload.fecha || plan.ultima_fecha, ultimo_km: payload.km || plan.ultimo_km })
    } catch {}
  }
  return res
}

export async function deleteMantRegistro(id) {
  if (isSupabaseConfigured) { const { error } = await supabase.from('mantenimiento_registro').delete().eq('id', id); if (error) throw error; return }
  lsSaveMR(lsAllMR().filter((r) => String(r.id) !== String(id)))
}

// Estado de un plan según fecha/km actual: 'vencido' | 'proximo' | 'ok'.
export function estadoMantenimiento(plan, kmActual = null, diasAviso = 15, kmAviso = 1000) {
  const hoy = new Date().toISOString().slice(0, 10)
  let venc = false, prox = false
  if (plan.proxima_fecha) {
    if (plan.proxima_fecha < hoy) venc = true
    else if (plan.proxima_fecha <= sumarDias(hoy, diasAviso)) prox = true
  }
  if (plan.proximo_km && kmActual != null && kmActual !== '') {
    const km = Number(kmActual), pk = Number(plan.proximo_km)
    if (km >= pk) venc = true
    else if (km >= pk - kmAviso) prox = true
  }
  return venc ? 'vencido' : prox ? 'proximo' : 'ok'
}

// ====== Listas personalizables por empresa (tipos de mantenimiento, turnos) ======
export const MANT_TIPOS_DEFAULT = ['Cambio de aceite', 'Filtros', 'Frenos', 'Llantas', 'Alineación y balanceo', 'Batería', 'Correas', 'Revisión general', 'Suspensión', 'Refrigeración', 'Otro']
export const ROD_TURNOS_DEFAULT = ['Mañana', 'Tarde', 'Noche', 'Todo el día']

const limpiarLista = (lista, def) => {
  const arr = Array.isArray(lista) ? lista.map((x) => String(x || '').trim()).filter(Boolean) : []
  // sin duplicados, conservando orden
  const out = []; for (const x of arr) if (!out.includes(x)) out.push(x)
  return out.length ? out : [...def]
}

async function getListaEmpresa(empresaId, columna, lsKey, def) {
  if (isSupabaseConfigured && empresaId) {
    try {
      const { data, error } = await supabase.from('empresas').select(columna).eq('id', empresaId).single()
      if (!error && Array.isArray(data?.[columna]) && data[columna].length) return limpiarLista(data[columna], def)
    } catch {}
    return [...def]
  }
  try { const all = JSON.parse(localStorage.getItem(lsKey) || '{}'); return limpiarLista(all[empresaId], def) } catch { return [...def] }
}
async function saveListaEmpresa(empresaId, columna, lsKey, lista, def, entidad) {
  const limpias = limpiarLista(lista, def)
  if (isSupabaseConfigured && empresaId) {
    const { error } = await supabase.from('empresas').update({ [columna]: limpias }).eq('id', empresaId)
    if (error) throw error
  } else {
    try { const all = JSON.parse(localStorage.getItem(lsKey) || '{}'); all[empresaId] = limpias; localStorage.setItem(lsKey, JSON.stringify(all)) } catch {}
  }
  registrarCambio({ accion: 'editar', entidad, descripcion: `${limpias.length} ítems`, empresa_id: empresaId })
  return limpias
}

export const getMantTipos = (empresaId) => getListaEmpresa(empresaId, 'mant_tipos', 'movtek_mant_tipos', MANT_TIPOS_DEFAULT)
export const saveMantTipos = (empresaId, lista) => saveListaEmpresa(empresaId, 'mant_tipos', 'movtek_mant_tipos', lista, MANT_TIPOS_DEFAULT, 'Tipos de mantenimiento')
export const getRodTurnos = (empresaId) => getListaEmpresa(empresaId, 'rod_turnos', 'movtek_rod_turnos', ROD_TURNOS_DEFAULT)
export const saveRodTurnos = (empresaId, lista) => saveListaEmpresa(empresaId, 'rod_turnos', 'movtek_rod_turnos', lista, ROD_TURNOS_DEFAULT, 'Turnos de rodamiento')

// ================= ALMACENAMIENTO (Storage vs base) =================
// Cuenta cuántas imágenes siguen guardadas como base64 dentro de la base (lo que la llena)
// y cuántas ya están en Storage (solo URL). Estima el espacio ocupado por esas imágenes.
export async function almacenamientoStats() {
  if (!isSupabaseConfigured) return null
  const cnt = async (tabla, col, patron) => {
    try { const { count } = await supabase.from(tabla).select(col, { count: 'exact', head: true }).like(col, patron); return count || 0 }
    catch { return 0 }
  }
  const firmasBase64 = await cnt('preoperacionales', 'firma_url', 'data:%')
  const firmasUrl = await cnt('preoperacionales', 'firma_url', 'http%')
  const logosBase64 = await cnt('empresas', 'logo_url', 'data:%')
  const logosUrl = await cnt('empresas', 'logo_url', 'http%')
  // Estimación aproximada (firma ~12 KB, logo ~120 KB) del espacio que ocupan en la BASE.
  const estMB = (firmasBase64 * 12 + logosBase64 * 120) / 1024
  return { firmasBase64, firmasUrl, logosBase64, logosUrl, estMB }
}

// Migra las imágenes base64 que queden en la base a Storage (y deja solo la URL).
export async function migrarImagenesAStorage(onProgress) {
  if (!isSupabaseConfigured) return { ok: false, motivo: 'demo' }
  let firmas = 0, logos = 0
  try {
    const { data: pre } = await supabase.from('preoperacionales').select('id,empresa_id,firma_url').like('firma_url', 'data:%')
    for (const r of (pre || [])) {
      const url = await subirFirma(r.firma_url, r.empresa_id)
      if (url && url !== r.firma_url) { await supabase.from('preoperacionales').update({ firma_url: url }).eq('id', r.id); firmas++ }
      onProgress?.({ firmas, logos })
    }
    const { data: emp } = await supabase.from('empresas').select('id,slug,logo_url').like('logo_url', 'data:%')
    for (const e of (emp || [])) {
      const url = await subirLogo(e.logo_url, e.slug || e.id)
      if (url && url !== e.logo_url) { await supabase.from('empresas').update({ logo_url: url }).eq('id', e.id); logos++ }
      onProgress?.({ firmas, logos })
    }
    return { ok: true, firmas, logos }
  } catch (e) {
    return { ok: false, motivo: 'error', error: e?.message, firmas, logos }
  }
}
