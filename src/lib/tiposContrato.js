import { OBJETO_GRUPO } from './db'

// Tipos de contrato del servicio especial y su objeto de contrato.
export const TIPOS_CONTRATO = [
  {
    label: 'Transporte de estudiantes',
    objeto: 'Contrato para transporte de estudiantes: celebrado para el traslado de alumnos hacia instituciones educativas (colegios, jardines y universidades), cumpliendo con normas especiales de seguridad y acompañamiento.',
  },
  {
    label: 'Transporte empresarial',
    objeto: 'Contrato para transporte empresarial: suscrito con una empresa o entidad para el desplazamiento de sus empleados, ejecutivos u operarios desde sus hogares o puntos de encuentro hasta el lugar de trabajo.',
  },
  {
    label: 'Transporte de turistas',
    objeto: 'Contrato para transporte de turistas: acordado entre un prestador de servicios turísticos debidamente registrado y una empresa de transporte especial habilitada, cuyo propósito es el traslado de turistas.',
  },
  {
    label: 'Usuarios del sector salud (pacientes no crónicos)',
    objeto: 'Contrato para usuarios del sector salud (pacientes no crónicos): orientado al traslado programado de pacientes que no requieren atención de una ambulancia medicalizada, así como de personas con movilidad reducida hacia centros médicos o terapias.',
  },
  {
    label: 'Grupo específico de personas o particulares',
    objeto: OBJETO_GRUPO,
  },
  {
    label: 'Otro (personalizado)',
    objeto: '',
  },
]
