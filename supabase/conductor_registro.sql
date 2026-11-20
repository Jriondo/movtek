-- ============================================================
--  Autoregistro del conductor desde la app (seguro).
--  La app usa la llave pública (anon) ANTES de iniciar sesión, y por seguridad
--  no puede leer la tabla de conductores. Esta función lo hace con permisos
--  elevados: valida que el conductor exista y tenga vehículo ACTIVO asignado,
--  y crea/liga su usuario (rol conductor).
--  Ejecuta este archivo UNA vez en Supabase (SQL Editor).
-- ============================================================

create or replace function public.registrar_conductor_auto(
  p_empresa_id uuid,
  p_documento  text,
  p_email      text
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c          conductores%rowtype;
  tiene_veh  boolean := false;
  uid        uuid;
  v_nombre   text;
begin
  -- 1) Buscar el conductor por documento dentro de la empresa.
  select * into c
  from conductores
  where empresa_id = p_empresa_id
    and trim(coalesce(documento,'')) = trim(coalesce(p_documento,''))
  limit 1;

  if c.id is null then
    return json_build_object('ok', false, 'motivo', 'no-ficha');
  end if;

  -- 2) ¿Tiene al menos un vehículo ACTIVO asignado?
  select exists (
    select 1
    from vehiculos v,
         jsonb_array_elements(coalesce(v.conductores_asignados, '[]'::jsonb)) e
    where v.empresa_id = p_empresa_id
      and coalesce(v.estado, 'activo') = 'activo'
      and (e->>'id') = c.id::text
  ) into tiene_veh;

  if not tiene_veh then
    return json_build_object('ok', false, 'motivo', 'sin-vehiculo');
  end if;

  v_nombre := trim(coalesce(c.nombres,'') || ' ' || coalesce(c.apellidos,''));

  -- 3) Crear o ligar el usuario (rol conductor) con su ficha.
  select id into uid from usuarios where lower(trim(email)) = lower(trim(p_email)) limit 1;
  if uid is null then
    insert into usuarios (empresa_id, nombre, email, rol, conductor_id, estado)
    values (p_empresa_id, v_nombre, p_email, 'conductor', c.id, 'activo')
    returning id into uid;
  else
    update usuarios
      set rol = 'conductor', conductor_id = c.id, empresa_id = p_empresa_id, estado = 'activo'
      where id = uid;
  end if;

  -- Si la ficha del conductor no tenía correo, guardarlo.
  if coalesce(trim(c.correo), '') = '' then
    update conductores set correo = p_email where id = c.id;
  end if;

  return json_build_object('ok', true, 'correo', coalesce(nullif(trim(p_email),''), c.correo), 'nombre', v_nombre);
end;
$$;

grant execute on function public.registrar_conductor_auto(uuid, text, text) to anon, authenticated;
