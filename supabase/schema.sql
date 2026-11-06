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

-- Empresas de ejemplo (opcional)
insert into empresas (nombre, color_primario, color_acento) values
  ('TransLitoral', '#10b981', '#84cc16'),
  ('Andina Cargo', '#2563eb', '#06b6d4'),
  ('RutaSur Express', '#e11d8f', '#7c3aed')
on conflict do nothing;
