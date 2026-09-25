-- =====================================================================
--  PracticIA · Esquema unificado de Supabase
--  Ejecutar UNA VEZ en: Supabase → SQL Editor → New query → Run
--  Es seguro re-ejecutarlo (idempotente).
--
--  Qué hace:
--   1. Conserva tus datos: las tablas del "modelo A" antiguo
--      (usuarios, practicas, asistencias, sesiones, anecdotarios) y
--      (asistencias_practica, sesiones_practica) se RENOMBRAN a legacy_*.
--   2. Unifica todo sobre `perfiles` (ligado a auth.users).
--   3. Activa RLS por rol y elimina las políticas "Acceso total".
--   4. Hace privado el bucket de evidencias y lo protege por carpeta.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Retirar tablas del modelo antiguo (renombrar, NO borrar)
-- ---------------------------------------------------------------------
do $$
begin
  -- `usuarios` solo existe en el modelo antiguo: su presencia indica que falta migrar.
  if to_regclass('public.usuarios') is not null then
    alter table public.usuarios              rename to legacy_usuarios;
    if to_regclass('public.practicas')            is not null then alter table public.practicas            rename to legacy_practicas;            end if;
    if to_regclass('public.asistencias')          is not null then alter table public.asistencias          rename to legacy_asistencias;          end if;
    if to_regclass('public.sesiones')             is not null then alter table public.sesiones             rename to legacy_sesiones;             end if;
    if to_regclass('public.anecdotarios')         is not null then alter table public.anecdotarios         rename to legacy_anecdotarios;         end if;
    if to_regclass('public.asistencias_practica') is not null then alter table public.asistencias_practica rename to legacy_asistencias_practica; end if;
    if to_regclass('public.sesiones_practica')    is not null then alter table public.sesiones_practica    rename to legacy_sesiones_practica;    end if;
  end if;
end $$;

-- Las tablas legacy quedan bloqueadas (RLS activo y sin políticas).
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'legacy\_%' loop
    execute format('alter table public.%I enable row level security', t);
    execute (
      select coalesce(string_agg(format('drop policy %I on public.%I', policyname, t), '; '), 'select 1')
      from pg_policies where schemaname = 'public' and tablename = t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 1. Instituciones
-- ---------------------------------------------------------------------
create table if not exists public.instituciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  latitud numeric,
  longitud numeric,
  radio_permitido_metros integer default 100,
  created_at timestamptz default now()
);
alter table public.instituciones add column if not exists distrito      text;
alter table public.instituciones add column if not exists provincia     text;
alter table public.instituciones add column if not exists departamento  text;
alter table public.instituciones add column if not exists estado        text default 'Activa';
-- Minutos de tolerancia para calificar la llegada como "Puntual" (después de la hora programada)
alter table public.instituciones add column if not exists tolerancia_puntual_min integer not null default 10;
-- Minutos de gracia tras los cuales, sin registro, la práctica se considera "Falta" (uso en reportes, no se guarda)
alter table public.instituciones add column if not exists tolerancia_falta_min    integer not null default 30;

-- ---------------------------------------------------------------------
-- 2. Perfiles (1 fila por usuario de Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  id uuid primary key,
  nombre_completo text not null default '',
  email text not null,
  rol text default 'estudiante',
  institucion_id uuid references public.instituciones(id) on delete set null,
  especialidad text,
  created_at timestamptz default now()
);
alter table public.perfiles add column if not exists nombres    text;
alter table public.perfiles add column if not exists apellidos  text;
alter table public.perfiles add column if not exists programa   text;
alter table public.perfiles add column if not exists ciclo      text;
alter table public.perfiles add column if not exists estado     text default 'Activo';
alter table public.perfiles add column if not exists telefono   text;
alter table public.perfiles add column if not exists docente_id uuid references public.perfiles(id) on delete set null;

-- Rellenar nombres/apellidos de los perfiles ya existentes
update public.perfiles
set nombres   = split_part(nombre_completo, ' ', 1),
    apellidos = nullif(trim(substr(nombre_completo, length(split_part(nombre_completo, ' ', 1)) + 1)), '')
where nombres is null and nombre_completo is not null;

update public.perfiles set estado = 'Activo' where estado is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'perfiles_rol_check') then
    alter table public.perfiles add constraint perfiles_rol_check
      check (rol in ('estudiante','docente','admin')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'perfiles_email_key') then
    begin
      alter table public.perfiles add constraint perfiles_email_key unique (email);
    exception when others then
      raise notice 'No se pudo crear UNIQUE(email) en perfiles (hay correos duplicados). Revísalo luego.';
    end;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Funciones auxiliares (SECURITY DEFINER para evitar recursión en RLS)
-- ---------------------------------------------------------------------
create or replace function public.mi_rol()
returns text language sql stable security definer set search_path = public as
$$ select rol from public.perfiles where id = auth.uid() $$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as
$$ select coalesce((select rol = 'admin' from public.perfiles where id = auth.uid()), false) $$;

create or replace function public.docente_de(est uuid)
returns uuid language sql stable security definer set search_path = public as
$$ select docente_id from public.perfiles where id = est $$;

create or replace function public.mi_docente()
returns uuid language sql stable security definer set search_path = public as
$$ select docente_id from public.perfiles where id = auth.uid() $$;

grant execute on function public.mi_rol(), public.es_admin(), public.docente_de(uuid), public.mi_docente() to authenticated;

-- Mantener nombre_completo sincronizado y proteger campos sensibles del perfil
create or replace function public.perfiles_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.nombres is not null then
    new.nombre_completo := trim(coalesce(new.nombres, '') || ' ' || coalesce(new.apellidos, ''));
  end if;
  -- auth.uid() es NULL con la service_role (backend) → sin restricciones.
  if tg_op = 'UPDATE' and auth.uid() is not null and not public.es_admin() then
    new.rol            := old.rol;
    new.email          := old.email;
    new.estado         := old.estado;
    new.docente_id     := old.docente_id;
    new.institucion_id := old.institucion_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_perfiles_before_write on public.perfiles;
create trigger trg_perfiles_before_write
  before insert or update on public.perfiles
  for each row execute function public.perfiles_before_write();

-- ---------------------------------------------------------------------
-- 4. Prácticas
-- ---------------------------------------------------------------------
create table if not exists public.practicas (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.perfiles(id) on delete cascade,
  docente_id uuid references public.perfiles(id) on delete set null,
  institucion_id uuid references public.instituciones(id) on delete set null,
  fecha date not null,
  hora time not null default '08:00',
  sesion text,
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente','En preparación','Aprobada','En camino','Llegada registrada','Finalizada')),
  created_at timestamptz default now()
);
create index if not exists practicas_estudiante_idx on public.practicas(estudiante_id, fecha);
create index if not exists practicas_docente_idx    on public.practicas(docente_id, fecha);

-- ---------------------------------------------------------------------
-- 5. Asistencias
-- ---------------------------------------------------------------------
create table if not exists public.asistencias (
  id uuid primary key default gen_random_uuid(),
  practica_id uuid references public.practicas(id) on delete set null,
  estudiante_id uuid not null references public.perfiles(id) on delete cascade,
  institucion_id uuid references public.instituciones(id) on delete set null,
  fecha_hora timestamptz not null default now(),
  latitud numeric,
  longitud numeric,
  distancia_m numeric,
  ubicacion text,
  foto_path text,
  -- Confirmada: pasó la validación del servidor (siempre, porque fuera de rango ya no se guarda).
  -- Observada: se deja solo para correcciones manuales del docente/admin.
  estado text not null default 'Confirmada' check (estado in ('Confirmada','Observada')),
  -- Calculada por el servidor en registrar_asistencia() a partir de la hora programada de la práctica.
  puntualidad text check (puntualidad in ('Temprano','Puntual','Tarde')),
  created_at timestamptz default now()
);
create index if not exists asistencias_estudiante_idx on public.asistencias(estudiante_id, fecha_hora desc);
create unique index if not exists asistencias_practica_unica on public.asistencias(practica_id) where practica_id is not null;

-- ---------------------------------------------------------------------
-- 6. Sesiones de aprendizaje
-- ---------------------------------------------------------------------
create table if not exists public.sesiones (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.perfiles(id) on delete cascade,
  practica_id uuid references public.practicas(id) on delete set null,
  titulo text not null,
  archivo_path text,
  archivo_nombre text,
  version integer not null default 1,
  estado text not null default 'Pendiente de revisión IA'
    check (estado in ('Pendiente de revisión IA','IA analizando','Recomendaciones disponibles',
                      'Enviada a docente','Aprobada','Requiere modificaciones')),
  recomendaciones_ia jsonb,
  nota numeric,
  observaciones_docente text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists sesiones_estudiante_idx on public.sesiones(estudiante_id, updated_at desc);

-- ---------------------------------------------------------------------
-- 7. Anecdotarios, evidencias y notificaciones
-- ---------------------------------------------------------------------
create table if not exists public.anecdotarios (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.perfiles(id) on delete cascade,
  practica_id uuid references public.practicas(id) on delete set null,
  nombre text not null,
  archivo_path text,
  estado text not null default 'Enviado'
    check (estado in ('Pendiente','Enviado','Revisado','Requiere modificación')),
  observaciones text,
  created_at timestamptz default now()
);

create table if not exists public.evidencias (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.perfiles(id) on delete cascade,
  practica_id uuid references public.practicas(id) on delete set null,
  tipo text not null default 'Fotografía' check (tipo in ('Fotografía','Documento','Registro de llegada')),
  nombre text not null,
  archivo_path text,
  estado text not null default 'Pendiente' check (estado in ('Validada','Pendiente','Observada')),
  created_at timestamptz default now()
);

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.perfiles(id) on delete cascade,
  titulo text not null,
  detalle text,
  tipo text not null default 'sistema' check (tipo in ('asistencia','sesion','recordatorio','revision','sistema')),
  leida boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists notificaciones_user_idx on public.notificaciones(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 8. Triggers: protección de campos del docente + notificaciones automáticas
-- ---------------------------------------------------------------------
create or replace function public.notificar(p_user uuid, p_titulo text, p_detalle text, p_tipo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is not null then
    insert into public.notificaciones(user_id, titulo, detalle, tipo) values (p_user, p_titulo, p_detalle, p_tipo);
  end if;
end $$;

-- Sesiones: la estudiante no puede aprobarse ni ponerse nota
create or replace function public.sesiones_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is not null and not (public.es_admin() or public.docente_de(old.estudiante_id) = auth.uid()) then
    new.nota := old.nota;
    new.observaciones_docente := old.observaciones_docente;
    if new.estado in ('Aprobada','Requiere modificaciones') then new.estado := old.estado; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_sesiones_before_update on public.sesiones;
create trigger trg_sesiones_before_update before update on public.sesiones
  for each row execute function public.sesiones_before_update();

create or replace function public.sesiones_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or (new.estado = 'Enviada a docente' and old.estado is distinct from new.estado) then
    if new.estado = 'Enviada a docente' then
      perform public.notificar(public.docente_de(new.estudiante_id), 'Nueva sesión para revisar',
        new.titulo || ' · versión ' || new.version, 'revision');
    end if;
  end if;
  if tg_op = 'UPDATE' and new.estado is distinct from old.estado and new.estado in ('Aprobada','Requiere modificaciones') then
    perform public.notificar(new.estudiante_id,
      case when new.estado = 'Aprobada' then 'Sesión aprobada' else 'Tu docente solicitó cambios' end,
      new.titulo, 'revision');
  end if;
  return new;
end $$;
drop trigger if exists trg_sesiones_after_write on public.sesiones;
create trigger trg_sesiones_after_write after insert or update on public.sesiones
  for each row execute function public.sesiones_after_write();

-- Anecdotarios: la estudiante solo puede (re)enviar; solo el docente marca Revisado / Requiere modificación
create or replace function public.anecdotarios_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not (public.es_admin() or public.docente_de(old.estudiante_id) = auth.uid()) then
    if new.estado <> 'Enviado' then new.estado := old.estado; end if;
    new.observaciones := old.observaciones;
  end if;
  return new;
end $$;
drop trigger if exists trg_anecdotarios_guard on public.anecdotarios;
create trigger trg_anecdotarios_guard before update on public.anecdotarios
  for each row execute function public.anecdotarios_guard();

-- Evidencias: solo el docente cambia el estado (Validada / Observada)
create or replace function public.evidencias_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not (public.es_admin() or public.docente_de(old.estudiante_id) = auth.uid()) then
    new.estado := old.estado;
  end if;
  return new;
end $$;
drop trigger if exists trg_evidencias_guard on public.evidencias;
create trigger trg_evidencias_guard before update on public.evidencias
  for each row execute function public.evidencias_guard();

create or replace function public.anecdotarios_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notificar(public.docente_de(new.estudiante_id), 'Nuevo anecdotario', new.nombre, 'revision');
  return new;
end $$;
drop trigger if exists trg_anecdotarios_after_insert on public.anecdotarios;
create trigger trg_anecdotarios_after_insert after insert on public.anecdotarios
  for each row execute function public.anecdotarios_after_insert();

-- Asistencia registrada → práctica pasa a "Llegada registrada" y se avisa al docente
create or replace function public.asistencias_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.practica_id is not null then
    update public.practicas set estado = 'Llegada registrada'
    where id = new.practica_id and estudiante_id = new.estudiante_id and estado <> 'Finalizada';
  end if;
  perform public.notificar(public.docente_de(new.estudiante_id),
    case when new.estado = 'Observada' then 'Asistencia observada' else 'Asistencia registrada' end,
    coalesce(new.ubicacion, 'Llegada registrada'), 'asistencia');
  return new;
end $$;
drop trigger if exists trg_asistencias_after_insert on public.asistencias;
create trigger trg_asistencias_after_insert after insert on public.asistencias
  for each row execute function public.asistencias_after_insert();

-- La estudiante solo puede pasar su práctica a "En camino" (el resto lo hace el sistema/docente)
create or replace function public.marcar_en_camino(p_practica uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.practicas set estado = 'En camino'
  where id = p_practica and estudiante_id = auth.uid() and estado in ('Pendiente','En preparación','Aprobada');
  perform public.notificar(public.docente_de(auth.uid()), 'Estudiante en camino', 'Salió hacia la institución', 'asistencia');
end $$;
grant execute on function public.marcar_en_camino(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8.1 Registro de asistencia validado en el SERVIDOR (no solo en el navegador)
--
-- El cliente NUNCA inserta directamente en `asistencias` (ver política más abajo:
-- no existe un INSERT para el rol "authenticated"). Todo pasa por esta función,
-- que corre con los privilegios de quien la creó (el dueño de las tablas), así
-- que puede escribir aunque la política de la tabla no lo permita al usuario.
-- Aquí, y solo aquí, se decide si el registro es válido:
--   · Sin latitud/longitud  → rechazado (GPS_REQUERIDO)
--   · Fuera del radio de la institución → rechazado (FUERA_DE_RANGO)
--   · Dentro del radio → se calcula Temprano / Puntual / Tarde y se guarda
-- ---------------------------------------------------------------------
create or replace function public.registrar_asistencia(
  p_practica uuid,
  p_lat numeric,
  p_lng numeric,
  p_foto_path text
)
returns public.asistencias
language plpgsql
security definer
set search_path = public
as $$
declare
  v_practica   public.practicas%rowtype;
  v_inst       public.instituciones%rowtype;
  v_distancia  numeric;
  v_hora_prog  timestamptz;
  v_delta_min  numeric;
  v_puntual    text;
  v_fila       public.asistencias%rowtype;
begin
  if auth.uid() is null then
    raise exception 'SIN_SESION: Debes iniciar sesión.';
  end if;

  select * into v_practica from public.practicas where id = p_practica;
  if v_practica.id is null then
    raise exception 'PRACTICA_NO_ENCONTRADA: La práctica indicada no existe.';
  end if;
  if v_practica.estudiante_id <> auth.uid() then
    raise exception 'SIN_PERMISO: Esta práctica no te pertenece.';
  end if;
  if exists (select 1 from public.asistencias where practica_id = p_practica) then
    raise exception 'YA_REGISTRADA: Ya registraste tu asistencia para esta práctica.';
  end if;

  if p_lat is null or p_lng is null then
    raise exception 'GPS_REQUERIDO: Necesitamos tu ubicación para registrar la asistencia.';
  end if;
  if p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    raise exception 'GPS_INVALIDO: Las coordenadas recibidas no son válidas.';
  end if;

  if v_practica.institucion_id is not null then
    select * into v_inst from public.instituciones where id = v_practica.institucion_id;
  end if;

  -- La geocerca es obligatoria. Sin institución o sin coordenadas válidas,
  -- nunca se registra una asistencia. PracticIA no permite una asistencia
  -- 'sin GPS' como excepción.
  if v_inst.id is null then
    raise exception 'INSTITUCION_REQUERIDA: La práctica no tiene una institución válida asignada.';
  end if;
  if v_inst.latitud is null or v_inst.longitud is null
     or v_inst.latitud = 0 or v_inst.longitud = 0 then
    raise exception 'COORDENADAS_REQUERIDAS: La institución todavía no tiene coordenadas GPS configuradas. Pide al administrador que las registre.';
  end if;
  if coalesce(v_inst.radio_permitido_metros, 0) <= 0 then
    raise exception 'RADIO_INVALIDO: La institución no tiene un radio de geocerca válido.';
  end if;

  -- Fórmula de Haversine, en metros (radio de la Tierra ≈ 6 371 000 m)
  v_distancia := 2 * 6371000 * asin(sqrt(
    power(sin(radians(v_inst.latitud - p_lat) / 2), 2) +
    cos(radians(p_lat)) * cos(radians(v_inst.latitud)) *
    power(sin(radians(v_inst.longitud - p_lng) / 2), 2)
  ));
  if v_distancia > v_inst.radio_permitido_metros then
    raise exception 'FUERA_DE_RANGO: Estás a % m de tu institución; el máximo permitido es % m.',
      round(v_distancia), v_inst.radio_permitido_metros;
  end if;

  -- Puntualidad, según la hora programada de la práctica y la tolerancia de la institución.
  -- IMPORTANTE: `fecha` y `hora` son valores ingresados por el admin pensando en hora de Cusco/Perú
  -- (UTC-5, sin horario de verano). Si aquí solo hiciéramos `::timestamptz`, Postgres los
  -- interpretaría con la zona horaria interna del servidor (normalmente UTC), adelantando el
  -- cálculo 5 horas y marcando "Tarde" a alguien que en realidad llegó puntual. Por eso se
  -- localiza explícitamente con AT TIME ZONE antes de compararlo con `now()`.
  v_hora_prog := (v_practica.fecha + v_practica.hora) at time zone 'America/Lima';
  v_delta_min := extract(epoch from (now() - v_hora_prog)) / 60.0;
  v_puntual := case
    when v_delta_min < 0 then 'Temprano'
    when v_delta_min <= coalesce(v_inst.tolerancia_puntual_min, 10) then 'Puntual'
    else 'Tarde'
  end;

  insert into public.asistencias (
    practica_id, estudiante_id, institucion_id, latitud, longitud,
    distancia_m, ubicacion, foto_path, estado, puntualidad
  ) values (
    p_practica, auth.uid(), v_practica.institucion_id, p_lat, p_lng,
    v_distancia,
    nullif(concat_ws(', ', v_inst.direccion, v_inst.distrito), ''),
    p_foto_path, 'Confirmada', v_puntual
  )
  returning * into v_fila;

  return v_fila;
end;
$$;

grant execute on function public.registrar_asistencia(uuid, numeric, numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- 9. RLS: activar y (re)crear políticas
-- ---------------------------------------------------------------------
alter table public.perfiles       enable row level security;
alter table public.instituciones  enable row level security;
alter table public.practicas      enable row level security;
alter table public.asistencias    enable row level security;
alter table public.sesiones       enable row level security;
alter table public.anecdotarios   enable row level security;
alter table public.evidencias     enable row level security;
alter table public.notificaciones enable row level security;

-- Limpiar TODAS las políticas anteriores de estas tablas (incluye los "Acceso total")
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('perfiles','instituciones','practicas','asistencias','sesiones','anecdotarios','evidencias','notificaciones')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- perfiles
create policy perfiles_select on public.perfiles for select to authenticated using (
  id = auth.uid() or public.es_admin() or docente_id = auth.uid() or id = public.mi_docente()
);
create policy perfiles_update on public.perfiles for update to authenticated
  using (id = auth.uid() or public.es_admin()) with check (id = auth.uid() or public.es_admin());
create policy perfiles_insert on public.perfiles for insert to authenticated with check (public.es_admin());
create policy perfiles_delete on public.perfiles for delete to authenticated using (public.es_admin());

-- instituciones (lectura para cualquier usuario autenticado; escritura solo admin)
create policy instituciones_select on public.instituciones for select to authenticated using (true);
create policy instituciones_write  on public.instituciones for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- practicas
create policy practicas_select on public.practicas for select to authenticated using (
  estudiante_id = auth.uid() or docente_id = auth.uid() or public.es_admin()
);
create policy practicas_update_docente on public.practicas for update to authenticated
  using (docente_id = auth.uid() or public.es_admin()) with check (docente_id = auth.uid() or public.es_admin());
create policy practicas_insert_admin on public.practicas for insert to authenticated with check (public.es_admin());
create policy practicas_delete_admin on public.practicas for delete to authenticated using (public.es_admin());

-- asistencias
create policy asistencias_select on public.asistencias for select to authenticated using (
  estudiante_id = auth.uid() or public.docente_de(estudiante_id) = auth.uid() or public.es_admin()
);
-- Sin política de INSERT a propósito: el estudiante ya no inserta asistencias directamente.
-- Todo registro pasa por la función registrar_asistencia(), que valida GPS y distancia en el
-- servidor y escribe con los privilegios del dueño de la tabla (ver sección 8.1 más arriba).
-- El único INSERT manual permitido es para correcciones del administrador:
create policy asistencias_insert_admin on public.asistencias for insert to authenticated
  with check (public.es_admin());
create policy asistencias_update on public.asistencias for update to authenticated
  using (public.docente_de(estudiante_id) = auth.uid() or public.es_admin())
  with check (public.docente_de(estudiante_id) = auth.uid() or public.es_admin());
create policy asistencias_delete on public.asistencias for delete to authenticated using (public.es_admin());

-- sesiones
create policy sesiones_select on public.sesiones for select to authenticated using (
  estudiante_id = auth.uid() or public.docente_de(estudiante_id) = auth.uid() or public.es_admin()
);
create policy sesiones_insert on public.sesiones for insert to authenticated with check (estudiante_id = auth.uid());
create policy sesiones_update on public.sesiones for update to authenticated
  using (estudiante_id = auth.uid() or public.docente_de(estudiante_id) = auth.uid() or public.es_admin())
  with check (estudiante_id = auth.uid() or public.docente_de(estudiante_id) = auth.uid() or public.es_admin());
create policy sesiones_delete on public.sesiones for delete to authenticated using (public.es_admin());

-- anecdotarios
create policy anecdotarios_select on public.anecdotarios for select to authenticated using (
  estudiante_id = auth.uid() or public.docente_de(estudiante_id) = auth.uid() or public.es_admin()
);
create policy anecdotarios_insert on public.anecdotarios for insert to authenticated with check (estudiante_id = auth.uid());
create policy anecdotarios_update on public.anecdotarios for update to authenticated
  using (estudiante_id = auth.uid() or public.docente_de(estudiante_id) = auth.uid() or public.es_admin())
  with check (estudiante_id = auth.uid() or public.docente_de(estudiante_id) = auth.uid() or public.es_admin());
create policy anecdotarios_delete on public.anecdotarios for delete to authenticated using (public.es_admin());

-- evidencias
create policy evidencias_select on public.evidencias for select to authenticated using (
  estudiante_id = auth.uid() or public.docente_de(estudiante_id) = auth.uid() or public.es_admin()
);
create policy evidencias_insert on public.evidencias for insert to authenticated with check (estudiante_id = auth.uid());
create policy evidencias_update on public.evidencias for update to authenticated
  using (estudiante_id = auth.uid() or public.docente_de(estudiante_id) = auth.uid() or public.es_admin())
  with check (estudiante_id = auth.uid() or public.docente_de(estudiante_id) = auth.uid() or public.es_admin());
create policy evidencias_delete on public.evidencias for delete to authenticated
  using (estudiante_id = auth.uid() or public.es_admin());

-- notificaciones (cada quien las suyas; se crean por triggers)
create policy notificaciones_select on public.notificaciones for select to authenticated using (user_id = auth.uid());
create policy notificaciones_update on public.notificaciones for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notificaciones_delete on public.notificaciones for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 10. Storage: bucket privado, cada usuario escribe solo en su carpeta
--     Convención de rutas:  <user_id>/<tipo>/<archivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('evidencias_practicia', 'evidencias_practicia', false)
on conflict (id) do update set public = false;

-- quitar políticas previas que apunten a este bucket
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%evidencias_practicia%' or coalesce(with_check, '') ilike '%evidencias_practicia%')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy evid_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'evidencias_practicia' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy evid_select on storage.objects for select to authenticated using (
  bucket_id = 'evidencias_practicia' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.es_admin()
    or (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
      and public.docente_de(((storage.foldername(name))[1])::uuid) = auth.uid()
    )
  )
);
create policy evid_update on storage.objects for update to authenticated using (
  bucket_id = 'evidencias_practicia' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy evid_delete on storage.objects for delete to authenticated using (
  bucket_id = 'evidencias_practicia' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin())
);

-- =====================================================================
--  LISTO. Siguientes pasos manuales (ver README-DESPLIEGUE.md):
--   · Authentication → Providers → Email: desactiva "Allow new users to sign up".
--   · Asegúrate de que TU usuario en `perfiles` tenga rol = 'admin'.
-- =====================================================================
