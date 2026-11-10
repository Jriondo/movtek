// Numeración oficial del FUEC (instructivo del formato único de extracto de contrato).
// El número se arma así (21 dígitos):
//   a) 3 dígitos — código de la Dirección Territorial que habilitó la empresa
//   b) 4 dígitos — número de la resolución de habilitación (ceros a la izquierda)
//   c) 2 dígitos — dos últimos del año en que la empresa fue habilitada
//   d) 4 dígitos — año en que se pide el extracto (automático: año del FUEC)
//   e) 4 dígitos — número del contrato (maestro)
//   f) 4 dígitos — consecutivo del extracto (contrato hijo)
// Ejemplo: 425 0155 12 2015 0255 0001 => 425015512201502550001

// Direcciones Territoriales del Ministerio de Transporte (código de 3 dígitos).
export const DIRECCIONES_TERRITORIALES = [
  { nombre: 'Antioquia – Chocó', codigo: '305' },
  { nombre: 'Atlántico', codigo: '208' },
  { nombre: 'Bolívar - San Andrés Providencia', codigo: '213' },
  { nombre: 'Boyacá – Casanare', codigo: '415' },
  { nombre: 'Caldas', codigo: '317' },
  { nombre: 'Cauca', codigo: '319' },
  { nombre: 'Cesar', codigo: '220' },
  { nombre: 'Córdoba – Sucre', codigo: '223' },
  { nombre: 'Cundinamarca', codigo: '425' },
  { nombre: 'Guajira', codigo: '241' },
  { nombre: 'Huila – Caquetá', codigo: '441' },
  { nombre: 'Magdalena', codigo: '247' },
  { nombre: 'Meta – Vaupés - Vichada', codigo: '550' },
  { nombre: 'Nariño – Putumayo', codigo: '352' },
  { nombre: 'N/Santander – Arauca', codigo: '454' },
  { nombre: 'Quindío', codigo: '363' },
  { nombre: 'Risaralda', codigo: '366' },
  { nombre: 'Santander', codigo: '468' },
  { nombre: 'Tolima', codigo: '473' },
  { nombre: 'Valle del Cauca', codigo: '376' },
]

const soloDigitos = (s) => String(s || '').replace(/\D/g, '')

// Arma el número oficial del FUEC a partir de los datos de la empresa y del contrato.
// anio = año en que se expide el extracto (por defecto, el año actual).
export function generarNumeroFuec({ empresa, contratoMaestro = '', contratoHijo = '', anio } = {}) {
  const emp = empresa || {}
  const a = soloDigitos(emp.dir_territorial).padStart(3, '0').slice(-3)                   // Dirección Territorial
  const b = soloDigitos(emp.resolucion).padStart(4, '0').slice(-4)                        // Resolución
  const c = soloDigitos(emp.anio_habilitacion).slice(-2).padStart(2, '0')                // Año habilitación (2)
  const d = String(anio || new Date().getFullYear()).slice(-4).padStart(4, '0')          // Año del extracto (4)
  const e = soloDigitos(contratoMaestro).padStart(4, '0').slice(-4)                       // Contrato maestro
  const f = soloDigitos(contratoHijo).padStart(4, '0').slice(-4)                          // Contrato hijo
  return `${a}${b}${c}${d}${e}${f}`
}
