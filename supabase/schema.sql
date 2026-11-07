-- Movtek · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecuta esto en Supabase → SQL Editor cuando conectes tu proyecto.

-- Empresas (multiempresa / white-label): cada una con su color y logo.
create table if not exists empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  color_primario text default '#10b981',
  color_acento text default '#84cc16',
  logo_url text,
  created_at timestamptz default now()
);

-- Módulo 1: Clientes maestros (pertenecen a una empresa)
create table if not exists clientes_maestros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete cascade,
  tipo_persona text default 'natural',          -- 'natural' | 'juridica'
  compania text,
  tipo_identificacion text,
  documento text,
  nombres text,
  apellidos text,
  telefono_casa text,
  telefono_oficina text,
  celular text,
  estado text default 'activo',                 -- 'activo' | 'inactivo'
  contrato_maestro_nro text,
  contrato_hijo_nro text,
  asignar_objeto boolean default false,
  objeto_contrato text,
  doc_responsable text,
  nombre_responsable text,
  telefono_responsable text,
  tipo_direccion text default 'catastral',       -- 'catastral' | 'tradicional'
  direccion text,
  created_at timestamptz default now()
);

create index if not exists idx_clientes_empresa on clientes_maestros (empresa_id);
create index if not exists idx_clientes_documento on clientes_maestros (documento);
alter table clientes_maestros add column if not exists es_grupo_especifico boolean default false;
alter table clientes_maestros add column if not exists tipo_contrato text;

-- Módulo 4.2: Conductores (empleados)
create table if not exists conductores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete cascade,
  tipo_identificacion text,
  documento text,
  nombres text,
  apellidos text,
  telefono_casa text,
  whatsapp text,
  celular text,
  ciudad text,
  fecha_nacimiento date,
  rh text,
  genero text,
  telefono_emergencia text,
  tipo_direccion text default 'catastral',
  direccion text,
  licencia_numero text,
  licencia_vencimiento date,
  categoria_licencia text,
  correo text,
  estado_habilitacion text default 'activo',
  no_planilla text,
  salario_base numeric,
  vigencia_seguridad date,
  fecha_ingreso_eps date,
  tipo_cotizante text,
  eps text,
  arl text,
  afp text,
  ccf text,
  tipo_cuenta text,
  no_cuenta text,
  banco text,
  existen_comparendos text default 'NO',
  ultima_revision_comparendos date,
  created_at timestamptz default now()
);
create index if not exists idx_conductores_empresa on conductores (empresa_id);
create index if not exists idx_conductores_documento on conductores (documento);

-- Módulo 4.3: Propietarios
create table if not exists propietarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete cascade,
  tipo_identificacion text,
  documento text,
  tipo_persona text default 'natural',
  compania text,
  nombres text,
  apellidos text,
  telefono_casa text,
  telefono_oficina text,
  celular text,
  correo text,
  correo_alterno text,
  ciudad text,
  barrio text,
  tipo_cuenta text,
  no_cuenta text,
  banco text,
  tipo_direccion text default 'catastral',
  direccion text,
  estado text default 'activo',
  created_at timestamptz default now()
);
create index if not exists idx_propietarios_empresa on propietarios (empresa_id);
create index if not exists idx_propietarios_documento on propietarios (documento);
alter table propietarios add column if not exists vehiculos_vinculados jsonb default '[]';

-- Módulo 4.4: Empresas transportadoras
create table if not exists empresas_transportadoras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete cascade,
  tipo_identificacion text,
  documento text,
  tipo_persona text default 'natural',
  compania text,
  nombres text,
  apellidos text,
  telefono_casa text,
  telefono_oficina text,
  celular text,
  correo text,
  tipo_direccion text default 'catastral',
  direccion text,
  estado text default 'activo',
  doc_responsable text,
  nombre_responsable text,
  resolucion text,
  created_at timestamptz default now()
);
create index if not exists idx_transportadoras_empresa on empresas_transportadoras (empresa_id);
create index if not exists idx_transportadoras_documento on empresas_transportadoras (documento);

-- Módulo 4.5: Vehículos
create table if not exists vehiculos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete cascade,
  -- básicos
  modelo text, clase text, numero_interno text, marca text, linea text, placa text,
  cilindraje text, vehiculo_servicio text default 'PUBLICO',
  -- complementarios
  capacidad text, peso text, peso_unidad text default 'KILOGRAMO', registro_motor text, serie_chasis text,
  color text, carroceria text, tipo_combustible text, porcentaje_cobro text,
  -- operacionales
  aseguradora_soat text, fecha_venc_soat date,
  fecha_venc_rcc date, fecha_venc_rce date, fecha_venc_rcc_rce date,
  fecha_venc_preventiva date, fecha_venc_tecnomecanica date, tarjeta_operacion text, fecha_venc_toperacion date,
  propietario_id uuid references propietarios(id) on delete set null,
  tenedor_id uuid references propietarios(id) on delete set null,
  transportadora_id uuid references empresas_transportadoras(id) on delete set null,
  aseguradora_rcc_rce text, estado text default 'activo', desvinculacion text default 'NO',
  -- adicionales / convenio
  tiene_convenio text default 'NO', depto_matricula text, ciudad_matricula text, fecha_matricula date,
  inicio_convenio date, caducidad_convenio date,
  created_at timestamptz default now()
);
create index if not exists idx_vehiculos_empresa on vehiculos (empresa_id);
create index if not exists idx_vehiculos_placa on vehiculos (placa);

-- Matriz de destinos: ciudades de Colombia (catálogo global, compartido)
create table if not exists destinos (
  id uuid primary key default gen_random_uuid(),
  departamento text not null,
  nombre text not null,
  codigo_postal text,
  area_metropolitana boolean default false,
  estado text default 'activo',
  created_at timestamptz default now()
);
create index if not exists idx_destinos_departamento on destinos (departamento);

-- Módulo 4.6: FUEC
create table if not exists fuec (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete cascade,
  vehiculo_id uuid references vehiculos(id) on delete set null,
  placa text,
  movil text,
  cliente_id uuid references clientes_maestros(id) on delete set null,
  no_maestro text,
  contrato_hijo text,
  objeto_contrato text,
  conductores jsonb default '[]',
  contratantes jsonb default '[]',
  itinerarios jsonb default '[]',
  descripcion_recorrido text,
  estrategia_comercial text,
  estrategia_con text,
  vigencia_inicio date,
  vigencia_fin date,
  usuario text,
  estado text default 'activo',
  created_at timestamptz default now()
);
create index if not exists idx_fuec_empresa on fuec (empresa_id);
create index if not exists idx_fuec_cliente on fuec (cliente_id);
create index if not exists idx_fuec_vehiculo on fuec (vehiculo_id);

-- Columnas adicionales para el formato oficial del FUEC
alter table empresas add column if not exists razon_social text;
alter table empresas add column if not exists nit text;
alter table empresas add column if not exists direccion text;
alter table empresas add column if not exists ciudad text;
alter table empresas add column if not exists telefonos text;
alter table empresas add column if not exists email text;
alter table empresas add column if not exists resolucion text;

alter table fuec add column if not exists numero_fuec text;
alter table fuec add column if not exists marca text;
alter table fuec add column if not exists modelo text;
alter table fuec add column if not exists clase text;
alter table fuec add column if not exists tarjeta_operacion text;
alter table fuec add column if not exists contratante_nombre text;
alter table fuec add column if not exists contratante_doc text;
alter table fuec add column if not exists resp_nombre text;
alter table fuec add column if not exists resp_cedula text;
alter table fuec add column if not exists resp_telefono text;
alter table fuec add column if not exists resp_direccion text;
alter table fuec add column if not exists origen_destino text;
alter table fuec add column if not exists ocasional jsonb;
alter table fuec add column if not exists empresa_snapshot jsonb;

-- Seguridad a nivel de fila
alter table empresas enable row level security;
alter table clientes_maestros enable row level security;

-- Políticas temporales para DESARROLLO (permiten todo a usuarios autenticados).
-- ⚠️ Cuando definamos roles, se limitará a la empresa de cada usuario.
drop policy if exists "dev_empresas_all" on empresas;
create policy "dev_empresas_all" on empresas for all to authenticated using (true) with check (true);

drop policy if exists "dev_clientes_all" on clientes_maestros;
create policy "dev_clientes_all" on clientes_maestros for all to authenticated using (true) with check (true);

alter table conductores enable row level security;
drop policy if exists "dev_conductores_all" on conductores;
create policy "dev_conductores_all" on conductores for all to authenticated using (true) with check (true);

alter table propietarios enable row level security;
drop policy if exists "dev_propietarios_all" on propietarios;
create policy "dev_propietarios_all" on propietarios for all to authenticated using (true) with check (true);

alter table empresas_transportadoras enable row level security;
drop policy if exists "dev_transportadoras_all" on empresas_transportadoras;
create policy "dev_transportadoras_all" on empresas_transportadoras for all to authenticated using (true) with check (true);

alter table vehiculos enable row level security;
drop policy if exists "dev_vehiculos_all" on vehiculos;
create policy "dev_vehiculos_all" on vehiculos for all to authenticated using (true) with check (true);

alter table destinos enable row level security;
drop policy if exists "dev_destinos_all" on destinos;
create policy "dev_destinos_all" on destinos for all to authenticated using (true) with check (true);

alter table fuec enable row level security;
drop policy if exists "dev_fuec_all" on fuec;
create policy "dev_fuec_all" on fuec for all to authenticated using (true) with check (true);

-- Lectura pública para la verificación por QR (sin login).
drop policy if exists "public_fuec_select" on fuec;
create policy "public_fuec_select" on fuec for select to anon using (true);
drop policy if exists "public_empresas_select" on empresas;
create policy "public_empresas_select" on empresas for select to anon using (true);

-- Nombre de empresa único (evita duplicados al re-sembrar)
create unique index if not exists uq_empresas_nombre on empresas (nombre);

-- Empresas de ejemplo (opcional) — idempotente por nombre
insert into empresas (nombre, color_primario, color_acento) values
  ('TransLitoral', '#10b981', '#84cc16'),
  ('Andina Cargo', '#2563eb', '#06b6d4'),
  ('RutaSur Express', '#e11d8f', '#7c3aed')
on conflict (nombre) do nothing;
