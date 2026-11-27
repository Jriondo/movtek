-- ============================================================
--  MEJORAS DE SEGURIDAD
--  Supabase → SQL Editor → New query → pega todo → Run.
-- ============================================================

-- -----------------------------------------------------------
-- 1) FUEC público: solo se puede ver el FUEC que se verifica por QR
--    (antes cualquiera sin login podía leer TODOS los FUEC).
-- -----------------------------------------------------------
create or replace function verificar_fuec(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_f fuec;
  v_e empresas;
begin
  select * into v_f from fuec where id = p_id;
  if not found then return null; end if;
  select * into v_e from empresas where id = v_f.empresa_id;
  return jsonb_build_object('fuec', to_jsonb(v_f), 'empresa', to_jsonb(v_e));
end;
$$;
grant execute on function verificar_fuec(uuid) to anon, authenticated;

-- Quita la lectura pública de TODOS los FUEC (ya no hace falta: se usa el RPC de arriba).
drop policy if exists "public_fuec_select" on fuec;

-- (La lectura pública de 'empresas' se mantiene: se usa para la marca del login por empresa.)


-- -----------------------------------------------------------
-- 2) Correos duplicados entre usuarios (un correo = una sola persona).
--    OJO: este índice ÚNICO falla si ya tienes correos repetidos.
--    Primero MIRA si hay repetidos con esta consulta:
--
--      select lower(email) correo, count(*)
--      from usuarios
--      group by lower(email)
--      having count(*) > 1;
--
--    Si aparece alguno, elimina el usuario sobrante (o usa "Quitar duplicados"
--    en la plataforma) y DESPUÉS ejecuta el índice de abajo.
-- -----------------------------------------------------------
create unique index if not exists uq_usuarios_email on usuarios (lower(email)) where email is not null and email <> '';
