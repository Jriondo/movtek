// Catálogo base de Colombia: departamentos y sus ciudades (municipios).
// Incluye las ciudades principales de cada departamento; es editable y ampliable
// desde el módulo "Matriz de destinos".

// Áreas metropolitanas oficiales: se cargan como una CIUDAD más dentro de su departamento.
export const AREAS_METROPOLITANAS = [
  { departamento: 'Antioquia', nombre: 'Área Metropolitana del Valle de Aburrá' },
  { departamento: 'Atlántico', nombre: 'Área Metropolitana de Barranquilla' },
  { departamento: 'Santander', nombre: 'Área Metropolitana de Bucaramanga' },
  { departamento: 'Risaralda', nombre: 'Área Metropolitana Centro Occidente' },
  { departamento: 'Norte de Santander', nombre: 'Área Metropolitana de Cúcuta' },
  { departamento: 'Cesar', nombre: 'Área Metropolitana de Valledupar' },
]

export const DEPARTAMENTOS = [
  { nombre: 'Amazonas', ciudades: ['Leticia', 'Puerto Nariño'] },
  { nombre: 'Antioquia', ciudades: ['Área Metropolitana del Valle de Aburrá', 'Medellín', 'Bello', 'Itagüí', 'Envigado', 'Sabaneta', 'La Estrella', 'Caldas', 'Copacabana', 'Girardota', 'Barbosa', 'Rionegro', 'Marinilla', 'La Ceja', 'Apartadó', 'Turbo', 'Carepa', 'Chigorodó', 'Necoclí', 'Caucasia', 'Puerto Berrío', 'Yarumal', 'Santa Rosa de Osos', 'Andes', 'Ciudad Bolívar', 'Urrao', 'Segovia', 'El Bagre', 'Sonsón', 'Santa Fe de Antioquia'] },
  { nombre: 'Arauca', ciudades: ['Arauca', 'Arauquita', 'Saravena', 'Tame', 'Fortul', 'Puerto Rondón', 'Cravo Norte'] },
  { nombre: 'Atlántico', ciudades: ['Área Metropolitana de Barranquilla', 'Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Galapa', 'Sabanalarga', 'Baranoa', 'Sabanagrande', 'Santo Tomás', 'Palmar de Varela', 'Luruaco', 'Juan de Acosta', 'Tubará'] },
  { nombre: 'Bolívar', ciudades: ['Cartagena', 'Magangué', 'Turbaco', 'El Carmen de Bolívar', 'Arjona', 'Mompox', 'San Juan Nepomuceno', 'María la Baja', 'Simití', 'Santa Rosa del Sur', 'Mahates'] },
  { nombre: 'Boyacá', ciudades: ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa', 'Villa de Leyva', 'Puerto Boyacá', 'Moniquirá', 'Garagoa', 'Nobsa', 'Samacá', 'Tibasosa'] },
  { nombre: 'Caldas', ciudades: ['Manizales', 'La Dorada', 'Chinchiná', 'Villamaría', 'Riosucio', 'Anserma', 'Supía', 'Aguadas', 'Salamina', 'Neira', 'Palestina'] },
  { nombre: 'Caquetá', ciudades: ['Florencia', 'San Vicente del Caguán', 'Puerto Rico', 'El Doncello', 'Belén de los Andaquíes', 'La Montañita', 'Cartagena del Chairá', 'Curillo'] },
  { nombre: 'Casanare', ciudades: ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena', 'Paz de Ariporo', 'Monterrey', 'Maní', 'Trinidad', 'Hato Corozal'] },
  { nombre: 'Cauca', ciudades: ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía (El Bordo)', 'Piendamó', 'Guapi', 'Miranda', 'Corinto', 'Caloto', 'Timbío'] },
  { nombre: 'Cesar', ciudades: ['Área Metropolitana de Valledupar', 'Valledupar', 'Aguachica', 'Bosconia', 'Codazzi', 'La Jagua de Ibirico', 'El Copey', 'Chiriguaná', 'Curumaní', 'La Paz', 'San Alberto', 'Pailitas'] },
  { nombre: 'Chocó', ciudades: ['Quibdó', 'Istmina', 'Tadó', 'Condoto', 'Bahía Solano', 'Nuquí', 'Riosucio', 'Acandí', 'Bojayá', 'Unguía'] },
  { nombre: 'Córdoba', ciudades: ['Montería', 'Cereté', 'Lorica', 'Sahagún', 'Montelíbano', 'Planeta Rica', 'Tierralta', 'Ciénaga de Oro', 'San Andrés de Sotavento', 'Puerto Libertador', 'Ayapel'] },
  { nombre: 'Cundinamarca', ciudades: ['Soacha', 'Facatativá', 'Zipaquirá', 'Chía', 'Fusagasugá', 'Girardot', 'Mosquera', 'Madrid', 'Funza', 'Cajicá', 'Cota', 'Sibaté', 'Tocancipá', 'La Calera', 'Ubaté', 'Villeta', 'Tenjo', 'Gachancipá'] },
  { nombre: 'Guainía', ciudades: ['Inírida'] },
  { nombre: 'Guaviare', ciudades: ['San José del Guaviare', 'Calamar', 'El Retorno', 'Miraflores'] },
  { nombre: 'Huila', ciudades: ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'Gigante', 'Palermo', 'Aipe', 'Rivera', 'San Agustín'] },
  { nombre: 'La Guajira', ciudades: ['Riohacha', 'Maicao', 'Uribia', 'Manaure', 'Fonseca', 'San Juan del Cesar', 'Villanueva', 'Barrancas', 'Dibulla', 'Albania', 'Hatonuevo'] },
  { nombre: 'Magdalena', ciudades: ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco', 'Plato', 'Aracataca', 'Zona Bananera', 'Pivijay', 'Pueblo Viejo', 'Sitionuevo'] },
  { nombre: 'Meta', ciudades: ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'Puerto Gaitán', 'San Martín', 'Cumaral', 'Restrepo', 'Guamal', 'Castilla la Nueva'] },
  { nombre: 'Nariño', ciudades: ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'La Unión', 'Samaniego', 'Sandoná', 'Barbacoas', 'Cumbal', 'La Cruz', 'Buesaco'] },
  { nombre: 'Norte de Santander', ciudades: ['Área Metropolitana de Cúcuta', 'Cúcuta', 'Villa del Rosario', 'Los Patios', 'El Zulia', 'San Cayetano', 'Ocaña', 'Pamplona', 'Tibú', 'Chinácota', 'Ábrego', 'Sardinata', 'El Tarra'] },
  { nombre: 'Putumayo', ciudades: ['Mocoa', 'Puerto Asís', 'Orito', 'Valle del Guamuez (La Hormiga)', 'Villagarzón', 'Sibundoy', 'Puerto Caicedo', 'San Miguel'] },
  { nombre: 'Quindío', ciudades: ['Armenia', 'Calarcá', 'La Tebaida', 'Montenegro', 'Quimbaya', 'Circasia', 'Filandia', 'Salento', 'Córdoba', 'Buenavista'] },
  { nombre: 'Risaralda', ciudades: ['Área Metropolitana Centro Occidente', 'Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Marsella', 'Belén de Umbría', 'Quinchía', 'Apía', 'Santuario', 'Mistrató'] },
  { nombre: 'San Andrés y Providencia', ciudades: ['San Andrés', 'Providencia'] },
  { nombre: 'Santander', ciudades: ['Área Metropolitana de Bucaramanga', 'Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil', 'Socorro', 'Barbosa', 'Málaga', 'Vélez', 'Lebrija', 'Sabana de Torres', 'Puerto Wilches'] },
  { nombre: 'Sucre', ciudades: ['Sincelejo', 'Corozal', 'Sampués', 'San Marcos', 'San Onofre', 'Tolú', 'Majagual', 'Sincé', 'Los Palmitos', 'Morroa'] },
  { nombre: 'Tolima', ciudades: ['Ibagué', 'Espinal', 'Melgar', 'Honda', 'Líbano', 'Chaparral', 'Mariquita', 'Fresno', 'Guamo', 'Purificación', 'Flandes', 'Lérida'] },
  { nombre: 'Valle del Cauca', ciudades: ['Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Cartago', 'Buga', 'Jamundí', 'Yumbo', 'Candelaria', 'Florida', 'Pradera', 'Zarzal', 'Sevilla', 'Caicedonia', 'La Unión', 'Roldanillo'] },
  { nombre: 'Vaupés', ciudades: ['Mitú', 'Carurú', 'Taraira'] },
  { nombre: 'Vichada', ciudades: ['Puerto Carreño', 'La Primavera', 'Santa Rosalía', 'Cumaribo'] },
  { nombre: 'Bogotá D.C.', ciudades: ['Bogotá D.C.'] },
]

// Lista plana para sembrar el catálogo inicial.
export function catalogoDestinos() {
  const out = []
  for (const dep of DEPARTAMENTOS) {
    for (const ciudad of dep.ciudades) {
      out.push({ departamento: dep.nombre, nombre: ciudad, estado: 'activo' })
    }
  }
  return out
}

export const DEPARTAMENTOS_NOMBRES = DEPARTAMENTOS.map((d) => d.nombre)
