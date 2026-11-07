// Catálogos del módulo de Vehículos (servicio especial de pasajeros - Colombia).

// Modelos: de 1991 al año actual; pasada la mitad del año se incluye el siguiente.
export function modelosDisponibles() {
  const now = new Date()
  const y = now.getFullYear()
  const max = now.getMonth() >= 6 ? y + 1 : y // julio en adelante ⇒ incluye el próximo año
  const arr = []
  for (let m = max; m >= 1991; m--) arr.push(String(m))
  return arr
}

// Clases de vehículo del servicio especial de pasajeros.
export const CLASES = [
  'Automóvil', 'Campero', 'Camioneta', 'Microbús', 'Buseta', 'Bus', 'Van', 'Minivan',
]

// Marcas y sus líneas (van de la mano).
export const MARCAS_LINEAS = {
  Chevrolet: ['N300', 'N400 Max', 'NPR', 'NKR', 'NHR', 'Spark GT', 'Aveo', 'Captiva', 'Trailblazer', 'Luv D-Max', 'Suburban'],
  Toyota: ['Hiace', 'Hilux', 'Prado', 'Fortuner', 'Land Cruiser', 'Corolla', 'Rush'],
  Nissan: ['Urvan', 'Frontier', 'Patrol', 'Sentra', 'X-Trail'],
  Hyundai: ['H1', 'H100', 'County', 'Starex', 'Tucson', 'Santa Fe', 'Accent'],
  Kia: ['Pregio', 'Besta', 'Carnival', 'Sportage', 'Sorento', 'K2500'],
  Renault: ['Master', 'Trafic', 'Duster', 'Logan', 'Sandero', 'Kangoo'],
  'Mercedes-Benz': ['Sprinter', 'Vito', 'Viano', 'Vario', 'OF-1721'],
  Volkswagen: ['Crafter', 'Transporter', 'Amarok'],
  Ford: ['Transit', 'Econoline', 'Ranger', 'Explorer'],
  JAC: ['Sunray', 'Refine', 'T6', 'HFC'],
  Foton: ['View', 'Toano', 'Aumark'],
  Changan: ['Van', 'Star', 'CS35'],
  Chery: ['Van H5', 'Tiggo'],
  Hino: ['Dutro', 'Serie 300', 'Serie 500'],
  Mitsubishi: ['L200', 'Montero', 'Fuso'],
  Isuzu: ['NPR', 'NKR', 'D-Max'],
}
export const MARCAS = Object.keys(MARCAS_LINEAS)

export const COLORES = [
  'NA',
  // Blancos
  'BLANCO', 'BLANCO ARTICO - (A)', 'BLANCO CERAMICA', 'BLANCO DIAMANTE', 'BLANCO GALAXIA',
  'BLANCO LUNA', 'BLANCO METALICO', 'BLANCO NEVADO', 'BLANCO PERLA', 'BLANCO PURO SOLIDO',
  'BLANCO SOLIDO', 'BLANCO TITANIO', 'BLANCO VAINILLA', 'SUPER BLANCO',
  // Verdes
  'VERDE', 'VERDE AMAZONIA', 'VERDE MEDIO MICA', 'VERDE METROPOLITANO',
  // Otros colores base
  'NEGRO', 'GRIS', 'PLATA', 'AZUL', 'AZUL OSCURO', 'ROJO', 'VINOTINTO',
  'AMARILLO', 'BEIGE', 'DORADO', 'NARANJA', 'CAFE', 'GRIS PLATA', 'GRIS METALICO',
]

export const CARROCERIAS = [
  'CABINA UNO', 'CABINADO', 'CARPADO', 'CERRADA', 'DOBLE CABINA', 'DOBLE CABINA ESTACAS',
  'DOBLE CABINA FURGON', 'ESTACAS', 'FURGON', 'GRUA', 'HORMIGONER', 'LIMOSINA', 'NA',
  'PICK UP', 'PLANCHON', 'PLATON', 'REPARTO', 'SEDAN', 'STATION WAGON', 'TANQUE',
  'VAN', 'VOLCO', 'WAGON',
]

export const COMBUSTIBLES = [
  'Gasolina', 'Diésel', 'Gas natural vehicular (GNV)', 'GLP', 'Gasolina/Gas', 'Eléctrico', 'Híbrido',
]

export const PESO_UNIDADES = ['KILOGRAMO', 'TONELADA', 'GRAMO']

export const SERVICIO = ['PUBLICO', 'PARTICULAR', 'OFICIAL']

// Aseguradoras registradas en Colombia (SOAT y pólizas RCC/RCE).
export const ASEGURADORAS = [
  'Sura', 'Seguros del Estado', 'Mapfre', 'AXA Colpatria', 'La Previsora', 'Seguros Mundial',
  'Allianz', 'Liberty Seguros', 'La Equidad', 'Seguros Bolívar', 'HDI Seguros', 'Seguros Solidaria',
  'Positiva', 'Zurich', 'SBS Seguros', 'Berkley', 'Mundial de Seguros',
]
