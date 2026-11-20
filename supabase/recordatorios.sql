-- ============================================================
--  Recordatorios push de preoperacional (parte de base de datos)
--  Ejecuta este archivo UNA vez en Supabase (SQL Editor).
-- ============================================================

-- Suscripciones push de cada conductor (un dispositivo = una fila).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text,
  auth text,
  empresa_id uuid,
  conductor_id uuid,
  user_email text,
  created_at timestamptz default now()
);
create index if not exists idx_push_conductor on push_subscriptions (conductor_id);

alter table push_subscriptions enable row level security;
drop policy if exists dev_push_all on push_subscriptions;
create policy dev_push_all on push_subscriptions for all using (true) with check (true);

-- ------------------------------------------------------------
--  PROGRAMACIÓN (cron) — OPCIÓN A: desde el panel de Supabase.
--  Edge Functions -> (tu función) -> Schedules -> cron:
--     30 9-23/2 * * *     (cada 2 horas, 4:30 a.m. a 6:30 p.m. hora Colombia)
--
--  OPCIÓN B: con pg_cron + pg_net (descomenta y pon tus datos).
-- ------------------------------------------------------------
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
-- select cron.schedule(
--   'recordatorios-preop',
--   '30 9-23/2 * * *',
--   $$
--   select net.http_post(
--     url := 'https://TU_PROYECTO.supabase.co/functions/v1/recordatorios-preop',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
