// Definición del formato de revisión preoperacional (según formato oficial de la empresa).
// Cada ítem se califica: B (Bueno), R (Regular), M (Malo) o NA (No aplica).
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

// Secciones y preguntas, con la redacción exacta del formato.
export const SECCIONES = [
  {
    titulo: 'Documentos del Conductor',
    items: [
      { key: 'lic_conduccion', label: 'Porta la Licencia de Conducción' },
      { key: 'doc_identidad', label: 'Porta Documento de Identidad' },
      { key: 'carnet_empresa', label: 'Porta el carnet institucional de la empresa' },
    ],
  },
  {
    titulo: 'Documentos del Vehículo',
    items: [
      { key: 'soat_vigente', label: 'El SOAT está Vigente' },
      { key: 'rtm_vigente', label: 'La Revisión Técnico mecánica está Vigente' },
      { key: 'tarjeta_operacion', label: 'La Tarjeta de Operación está Vigente' },
      { key: 'licencia_transito', label: 'Porta la Licencia de Tránsito Vigente' },
      { key: 'revision_bimensual', label: 'La Revisión Bimensual está Vigente' },
      { key: 'control_plagas', label: 'Cuenta el Vehículo con certificación vigente de control de Plagas (Máximo 2 Meses)' },
    ],
  },
  {
    titulo: 'Verificación Resolución 315',
    items: [
      { key: 'fugas_aceite', label: 'Se observan fugas de aceite motor, Transmisión, Dirección y Aditivo' },
      { key: 'humedad_lubricante', label: 'Se observa Humedad o Remanencia de Algún Aceite Lubricante' },
      { key: 'correas_motor', label: 'Están en buen estado las correas del motor' },
      { key: 'tapas_motor', label: 'Están en buen estado las tapas del motor' },
      { key: 'mangueras_frenos', label: 'Están en buen estado las mangueras de frenos' },
      { key: 'refrigerante_radiador', label: 'Se encuentra a nivel el aditivo refrigerante del radiador' },
      { key: 'agua_limpiabrisas', label: 'Se encuentra a nivel el agua del limpiabrisas' },
      { key: 'fugas_filtros_humedos', label: 'Se observan fugas en filtros húmedos' },
      { key: 'filtros_secos', label: 'Están en buen estado los filtros secos' },
      { key: 'baterias', label: 'Están en buen estado las baterías y su conjunto' },
      { key: 'llantas_rines', label: 'Están en buen estado las llantas y rines, incluida la de repuesto, en la presión de aire adecuado y profundidad de labrado' },
      { key: 'equipo_carretera', label: 'Está completo el equipo de carretera incluyendo chaleco reflectivo' },
      { key: 'extintor', label: 'Está en buen estado y vigente el extintor' },
      { key: 'suspension', label: 'Están en buen estado la suspensión/muelles/amortiguadores' },
      { key: 'sistema_escape', label: 'Está en buen estado el sistema de escape, múltiple, mofle, flexible, tubería' },
      { key: 'cinturones', label: 'Están en buen estado los cinturones de seguridad' },
    ],
  },
  {
    titulo: 'Exterior del Vehículo',
    items: [
      { key: 'luces_externas', label: 'Funcionan las luces externas' },
      { key: 'vidrios_espejos', label: 'Están en buen estado los vidrios y espejos' },
      { key: 'plumillas', label: 'Funcionan las plumillas del parabrisas y éste no presenta fisuras' },
      { key: 'cintas_reflectivas', label: 'El vehículo cuenta con cintas reflectivas, señalización requerida y avisos corporativos' },
      { key: 'alarma_reversa', label: 'Funciona alarma o pito de reversa' },
    ],
  },
]

// Lista plana de todos los ítems (para recorrer/validar).
export const ITEMS = SECCIONES.flatMap((s) => s.items.map((i) => ({ ...i, seccion: s.titulo })))
export const TOTAL_ITEMS = ITEMS.length

// Encuesta de salud del conductor (antes de operar).
// Cada pregunta indica qué respuesta representa un RIESGO (obliga a explicar).
export const SALUD = [
  { key: 'durmio_bien', label: '¿Durmió al menos 7 horas la noche anterior?', riesgo: 'no' },
  { key: 'condiciones', label: '¿Se siente en condiciones físicas y mentales para conducir?', riesgo: 'no' },
  { key: 'alcohol', label: '¿Ha consumido bebidas alcohólicas en las últimas 12 horas?', riesgo: 'si' },
  { key: 'medicamentos', label: '¿Ha tomado medicamentos que produzcan sueño o mareo?', riesgo: 'si' },
  { key: 'sintomas', label: '¿Presenta síntomas como fiebre, mareo, dolor fuerte o fatiga?', riesgo: 'si' },
]

export const saludEnRiesgo = (preg, valor) => valor && valor === preg.riesgo

// Calcula el estado general: 'ok' si todo B/NA; 'novedad' si hay algún R o M.
export function estadoGeneral(respuestas = {}) {
  const hay = Object.values(respuestas).some((v) => v === 'R' || v === 'M')
  return hay ? 'novedad' : 'ok'
}

// Cuenta respuestas por tipo (para resumen).
export function resumenRespuestas(respuestas = {}) {
  const r = { B: 0, R: 0, M: 0, NA: 0 }
  Object.values(respuestas).forEach((v) => { if (r[v] != null) r[v]++ })
  return r
}

// Tipos de registro: la preoperacional normal, o reportar el vehículo en taller/descanso.
export const TIPO = { PREOP: 'preoperacional', TALLER: 'taller', DESCANSO: 'descanso' }
