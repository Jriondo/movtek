-- ============================================================
--  Iniciar sesión con CORREO o NOMBRE DE USUARIO
--  Supabase → SQL Editor → New query → pega todo → Run.
-- ============================================================

-- 1) Nombre de usuario (opcional) en la tabla usuarios.
alter table usuarios add column if not exists username text;

-- Único ignorando mayúsculas (permite varios vacíos/nulos).
create unique index if not exists uq_usuarios_username
  on usuarios (lower(username)) where username is not null and username <> '';

-- 2) RPC seguro: a partir de un identificador (correo o nombre de usuario)
--    devuelve el CORREO con el que se inicia sesión. Lo puede llamar anon
--    (antes de iniciar sesión), pero SOLO devuelve el correo, nada más.
create or replace function email_por_identificador(p_identificador text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := trim(p_identificador);
  v_email text;
begin
  if v_id is null or v_id = '' then return null; end if;
  -- Si ya es un correo, se usa tal cual.
  if position('@' in v_id) > 0 then
    return v_id;
  end if;
  -- Si es un nombre de usuario, devuelve el correo de la ficha ACTIVA.
  select email into v_email
  from usuarios
  where lower(username) = lower(v_id)
    and coalesce(estado, 'activo') <> 'inactivo'
  order by created_at asc nulls last
  limit 1;
  return v_email;
end;
$$;

grant execute on function email_por_identificador(text) to anon, authenticated;
