-- ============================================================
--  MÓDULO DE COBROS (mensualidad por vehículo)
--  Ejecuta todo esto en Supabase → SQL Editor → New query → Run.
-- ============================================================

-- 1) Valor de cobro por vehículo (para generar los cobros del mes).
alter table vehiculos add column if not exists valor_cobro numeric;

-- 2) Tabla de cobros.
create table if not exists cobros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id) on delete cascade,
  vehiculo_id uuid references vehiculos(id) on delete cascade,
  placa text,
  propietario_id uuid references propietarios(id) on delete set null,
  tenedor_id uuid references propietarios(id) on delete set null,
  periodo text,                 -- 'YYYY-MM' (mes del cobro)
  concepto text default 'Mensualidad',
  monto numeric default 0,
  estado text default 'pendiente',   -- 'pendiente' | 'pagado'
  fecha_pago date,
  metodo text,
  nota text,
  created_at timestamptz default now()
);

create index if not exists idx_cobros_empresa on cobros (empresa_id);
create index if not exists idx_cobros_periodo on cobros (periodo);
create index if not exists idx_cobros_vehiculo on cobros (vehiculo_id);

-- Evita duplicar el cobro del mismo vehículo en el mismo mes.
create unique index if not exists uq_cobros_vehiculo_periodo on cobros (vehiculo_id, periodo);

-- 3) Permisos (mismo esquema que el resto de tablas).
alter table cobros enable row level security;
drop policy if exists "dev_cobros_all" on cobros;
create policy "dev_cobros_all" on cobros for all to authenticated using (true) with check (true);
