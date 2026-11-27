-- ============================================================
--  AISLAMIENTO POR EMPRESA (RLS)  —  ⚠️ LÉEME ANTES DE CORRER
-- ------------------------------------------------------------
--  Qué hace: cada usuario solo ve/edita los datos de SU empresa.
--  El Superadministrador (rol 'admin', Movtek) sigue viendo todo.
--
--  ⚠️ IMPORTANTE:
--   • Corre esto en un momento de poco uso.
--   • Justo después, PRUEBA: entra como superadministrador, como
--     administrador de empresa, como propietario y como conductor;
--     revisa que cada uno vea sus datos y pueda guardar.
--   • Si algo falla, corre el bloque "ROLLBACK" del final (revierte todo).
--
--  Requisito: cada usuario debe existir en la tabla 'usuarios' con su
--  'email' y su 'empresa_id' (el superadministrador va con rol 'admin').
-- ============================================================

-- ---------- Funciones de ayuda (leen la ficha del usuario actual) ----------
create or replace function mv_email() returns text
  language sql stable security definer set search_path = public as $$
  select lower(coalesce(auth.email(), auth.jwt() ->> 'email', ''));
$$;

create or replace function mv_es_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from usuarios where lower(email) = mv_email() and rol = 'admin' and coalesce(estado,'activo') <> 'inactivo');
$$;

create or replace function mv_empresa() returns uuid
  language sql stable security definer set search_path = public as $$
  select empresa_id from usuarios
  where lower(email) = mv_email() and coalesce(estado,'activo') <> 'inactivo'
  order by (case rol when 'admin' then 6 when 'admin_empresa' then 5 when 'operativo' then 4
                     when 'mantenimiento' then 3 when 'propietario' then 2 else 1 end) desc,
           created_at asc nulls last
  limit 1;
$$;

grant execute on function mv_email(), mv_es_admin(), mv_empresa() to authenticated;

-- ---------- Política por empresa para cada tabla con empresa_id ----------
do $$
declare
  t text;
  tablas text[] := array[
    'clientes_maestros','conductores','propietarios','empresas_transportadoras',
    'vehiculos','fuec','preoperacionales','rodamiento','rutas_maestras',
    'mantenimiento_plan','mantenimiento_registro','cobros'
  ];
begin
  foreach t in array tablas loop
    if to_regclass(t) is not null then
      execute format('alter table %I enable row level security', t);
      execute format('drop policy if exists "dev_%s_all" on %I', t, t);
      execute format('drop policy if exists "rls_%s" on %I', t, t);
      execute format($f$create policy "rls_%s" on %I for all to authenticated
        using ( mv_es_admin() or empresa_id = mv_empresa() )
        with check ( mv_es_admin() or empresa_id = mv_empresa() )$f$, t, t);
    end if;
  end loop;
end $$;

-- ---------- usuarios: su empresa + su propia ficha (para iniciar sesión) ----------
alter table usuarios enable row level security;
drop policy if exists "dev_usuarios_all" on usuarios;
drop policy if exists "rls_usuarios" on usuarios;
create policy "rls_usuarios" on usuarios for all to authenticated
  using ( mv_es_admin() or empresa_id = mv_empresa() or lower(email) = mv_email() )
  with check ( mv_es_admin() or empresa_id = mv_empresa() );

-- ---------- empresas: cada quien la suya; solo el admin crea/edita ----------
alter table empresas enable row level security;
drop policy if exists "dev_empresas_all" on empresas;
drop policy if exists "rls_empresas" on empresas;
create policy "rls_empresas" on empresas for all to authenticated
  using ( mv_es_admin() or id = mv_empresa() )
  with check ( mv_es_admin() );
-- (Se mantiene public_empresas_select para la marca del login por empresa.)

-- NOTA: 'destinos' y 'ajustes' son catálogos globales y se dejan como están
--       (compartidos por todas las empresas). 'push_subscriptions' también.


-- ============================================================
--  ROLLBACK  —  si algo se rompe, corre SOLO esto para revertir:
-- ============================================================
-- do $$
-- declare t text; tablas text[] := array[
--   'clientes_maestros','conductores','propietarios','empresas_transportadoras',
--   'vehiculos','fuec','preoperacionales','rodamiento','rutas_maestras',
--   'mantenimiento_plan','mantenimiento_registro','cobros','usuarios','empresas'];
-- begin
--   foreach t in array tablas loop
--     if to_regclass(t) is not null then
--       execute format('drop policy if exists "rls_%s" on %I', t, t);
--       execute format('drop policy if exists "dev_%s_all" on %I', t, t);
--       execute format('create policy "dev_%s_all" on %I for all to authenticated using (true) with check (true)', t, t);
--     end if;
--   end loop;
-- end $$;
