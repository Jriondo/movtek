// Definición del formato de revisión preoperacional.
// Las preguntas son EDITABLES por empresa (crear/modificar/eliminar). Aquí está la lista
// por defecto; la empresa puede personalizarla desde el módulo de Preoperacionales.
// Cada pregunta se califica: B (Bueno), R (Regular), M (Malo) o NA (No aplica).
// Si se marca R o M, la observación es OBLIGATORIA.

export const OPCIONES = [
  { v: 'B', label: 'Bueno', color: '#16a34a' },
  { v: 'R', label: 'Regular', color: '#d97706' },
  { v: 'M', label: 'Malo', color: '#dc2626' },
  { v: 'NA', label: 'N/A', color: '#64748b' },
]

export const LEYENDA = { B: 'Bueno', R: 'Regular', M: 'Malo', NA: 'No aplica', '': 'Sin respuesta' }

// Marcar R o M obliga a explicar por qué.
export const requiereObservacion = (v) => v === 'R' || v === 'M'

// Preguntas por defecto (título + descripción). La empresa puede editarlas.
export const PREGUNTAS_DEFAULT = [
  { key: 'documentos', titulo: 'DOCUMENTOS', descripcion: 'Licencia de conducción, SOAT, Seguro de daños, Tarjeta de Propiedad, Revisión Tecnomecánica' },
  { key: 'niveles', titulo: 'NIVELES', descripcion: 'Limpiabrisas, Frenos, Aceite, Refrigerante, Hidráulico' },
  { key: 'indicadores', titulo: 'INDICADORES', descripcion: 'Hidráulico, Velocímetro, Temperatura' },
  { key: 'sistema_direccion', titulo: 'SISTEMA', descripcion: 'Barra de dirección, Sistema Hidráulico, Estado de correas, Tensión de las correas' },
  { key: 'sistema_electrico', titulo: 'SISTEMA', descripcion: 'Sistema eléctrico, Sistema de refrigeración, Fugas del motor' },
  { key: 'cabina', titulo: 'CABINA', descripcion: 'Puertas, Asientos, Ventanería, Pito, Piso, Alarma de retroceso' },
  { key: 'luces', titulo: 'LUCES', descripcion: 'Altas, Bajas, Stops, Reversa, Parqueo, Direccionales delanteros, Direccionales traseros' },
  { key: 'frenos', titulo: 'FRENOS', descripcion: 'Principal (servicio), Emergencia (parqueo)' },
  { key: 'llantas', titulo: 'LLANTAS', descripcion: 'Cortes, espárragos, llanta de repuesto, abultamientos, Rotor' },
  { key: 'espejos', titulo: 'ESPEJOS', descripcion: 'Laterales Der/Izq., Retrovisor, Ubicación acorde a necesidad, sin opacidad ni roturas' },
  { key: 'equipo_carretera', titulo: 'EQUIPO DE CARRETERA', descripcion: 'Herramientas (Alicates, destornilladores, llaves de expansión y fijas, linterna)' },
  { key: 'equipo_carretera2', titulo: 'EQUIPO DE CARRETERA', descripcion: 'Cruceta, Gato, Tacos de bloqueo x2, Señales de carretera, Conos x2' },
  { key: 'extintor', titulo: 'EXTINTOR', descripcion: 'Capacidad, Fecha de vencimiento' },
  { key: 'botiquin', titulo: 'BOTIQUÍN', descripcion: 'Antisépticos, Elementos de corte, Algodón, gasa estéril, Esparadrapo, venda elástica, jabón' },
  { key: 'muelles', titulo: 'ESTADO DE LOS MUELLES', descripcion: 'Inspección y evaluación del estado de los muelles' },
]

// Normaliza una lista de preguntas (asegura key/título). Si viene vacía, usa las de defecto.
export function normalizarPreguntas(lista) {
  const arr = Array.isArray(lista) ? lista.filter((p) => p && (p.titulo || p.key)) : []
  const usar = arr.length ? arr : PREGUNTAS_DEFAULT
  return usar.map((p, i) => ({
    key: p.key || `q_${i}_${(p.titulo || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20)}`,
    titulo: p.titulo || '',
    descripcion: p.descripcion || '',
  }))
}

export const nuevaPreguntaKey = () => 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

// Encuesta de salud del conductor (va al FINAL de la preoperacional).
// Cada pregunta indica qué respuesta representa un RIESGO (obliga a explicar).
export const SALUD = [
  { key: 'durmio_bien', label: '¿Durmió al menos 7 horas la noche anterior?', riesgo: 'no' },
  { key: 'condiciones', label: '¿Se siente en condiciones físicas y mentales para conducir?', riesgo: 'no' },
  { key: 'alcohol', label: '¿Ha consumido bebidas alcohólicas en las últimas 12 horas?', riesgo: 'si' },
  { key: 'medicamentos', label: '¿Ha tomado medicamentos que produzcan sueño o mareo?', riesgo: 'si' },
  { key: 'sintomas', label: '¿Presenta síntomas como fiebre, mareo, dolor fuerte o fatiga?', riesgo: 'si' },
]

export const saludEnRiesgo = (preg, valor) => valor && valor === preg.riesgo

// Estado general: 'ok' si todo B/NA; 'novedad' si hay algún R o M.
export function estadoGeneral(respuestas = {}) {
  const hay = Object.values(respuestas).some((v) => v === 'R' || v === 'M')
  return hay ? 'novedad' : 'ok'
}

export function resumenRespuestas(respuestas = {}) {
  const r = { B: 0, R: 0, M: 0, NA: 0 }
  Object.values(respuestas).forEach((v) => { if (r[v] != null) r[v]++ })
  return r
}

// Tipos de registro.
export const TIPO = { PREOP: 'preoperacional', TALLER: 'taller', DESCANSO: 'descanso' }
