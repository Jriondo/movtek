-- ============================================================
--  Arreglo de columnas faltantes en la tabla 'rodamiento'
--  (Plan de rodamiento / cronograma). Seguro de ejecutar varias veces.
--  Supabase → SQL Editor → New query → pega todo → Run.
-- ============================================================

alter table rodamiento add column if not exists estado text default 'programado';   -- programado | terminado | cancelado
alter table rodamiento add column if not exists motivo_cancelacion text;
alter table rodamiento add column if not exists hora_final text;
alter table rodamiento add column if not exists tiempo text;
alter table rodamiento add column if not exists ruta_id uuid;
alter table rodamiento add column if not exists ruta text;
alter table rodamiento add column if not exists origen text;
alter table rodamiento add column if not exists destino text;
alter table rodamiento add column if not exists empresa_cliente text;
alter table rodamiento add column if not exists descripcion text;
alter table rodamiento add column if not exists clase text;
alter table rodamiento add column if not exists conductor_nombre text;

-- Deja en 'programado' los servicios que quedaron sin estado.
update rodamiento set estado = 'programado' where estado is null;
