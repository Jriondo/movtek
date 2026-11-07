import { OBJETO_GRUPO } from './db'

// Tipos de contrato del servicio especial y su objeto de contrato.
export const TIPOS_CONTRATO = [
  {
    label: 'Transporte de estudiantes',
    objeto: 'CONTRATO PARA TRANSPORTE DE ESTUDIANTES y/o familiares desde el lugar de residencia hasta el establecimiento educativo y viceversa, incluyendo las salidas extracurriculares de acuerdo a las normas legales vigentes que rigen para la prestación del Servicio Público de Transporte Terrestre Automotor Especial. Incluyendo a el (la) auxiliar.',
  },
  {
    label: 'Transporte empresarial',
    objeto: 'CONTRATO DE SERVICIO DE TRANSPORTE DE EMPLEADOS Y CONTRATISTAS desde su residencia hasta el lugar de trabajo incluyendo salidas ocasionales de acuerdo a las normas legales vigentes que rigen para la prestación del Servicio Público de Transporte Terrestre.',
  },
  {
    label: 'Transporte de turistas',
    objeto: 'CONTRATO DE SERVICIO DE TRANSPORTE DE TURISTAS Y/O PASAJEROS desde el punto de origen hacia los destinos turísticos acordados y viceversa, incluyendo los recorridos y salidas programadas, de acuerdo a las normas legales vigentes que rigen para la prestación del Servicio Público de Transporte Terrestre Automotor Especial.',
  },
  {
    label: 'Transporte de salud (usuarios sector salud)',
    objeto: 'CONTRATO DE SERVICIO DE TRANSPORTE para usuarios del sector salud desde su residencia hasta el centro de salud de acuerdo a las normas legales vigentes que rigen para la prestación del Servicio Público de Transporte Terrestre.',
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
