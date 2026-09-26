-- SGA / primera etapa. Ejecutar en UN proyecto Supabase exclusivo para SGA.
-- No contiene datos reales ni credenciales. No ejecutar sobre otra base existente.
begin;
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(), legacy_id text unique,
  nombre text not null unique check (length(trim(nombre)) between 2 and 120),
  activo boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(), legacy_id text unique,
  departamento_id uuid not null references public.departments(id),
  nombre text not null check(length(trim(nombre)) between 2 and 120),
  activo boolean not null default true, created_at timestamptz not null default now(),
  unique(departamento_id,id), unique(departamento_id,nombre)
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null, apellido text not null,
  rol text not null check(rol in ('SUPER_ADMIN','RRHH_ADMIN','RRHH','DEPARTAMENTO','SERVICIO','CONSULTA')),
  departamento_id uuid references public.departments(id),
  servicio_id uuid,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key(departamento_id,servicio_id) references public.services(departamento_id,id),
  constraint scope_for_role check (
    (rol in ('SUPER_ADMIN','RRHH_ADMIN','RRHH') and departamento_id is null and servicio_id is null)
    or (rol='DEPARTAMENTO' and departamento_id is not null and servicio_id is null)
    or (rol='SERVICIO' and departamento_id is not null and servicio_id is not null)
    or (rol='CONSULTA' and departamento_id is not null)
  )
);
create table if not exists public.personnel (
  id uuid primary key default gen_random_uuid(), legacy_id text unique,
  lp text not null unique check(lp ~ '^[0-9]{1,20}$'),
  apellido text not null check(length(trim(apellido)) between 1 and 100),
  nombres text not null check(length(trim(nombres)) between 1 and 120),
  jerarquia text, dni text unique check(dni is null or dni ~ '^[0-9]{6,9}$'),
  cuil text unique check(cuil is null or cuil ~ '^[0-9]{11}$'),
  telefono text, email text, funcion text, horario text, turno text,
  fecha_ingreso date, observaciones text,
  departamento_id uuid not null references public.departments(id), servicio_id uuid not null,
  activo boolean not null default true,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(departamento_id,servicio_id) references public.services(departamento_id,id)
);
create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(), legacy_id text unique,
  personal_id uuid not null references public.personnel(id),
  tipo text not null check(tipo in ('LICENCIA MEDICA','LICENCIA ANUAL','FRANCO','DESPLAZAMIENTO','ARTICULO 8','ARTICULO 4','ARTICULO 6','AUSENTE','GUARDIA PAGA','JUNTA MEDICA','SUSPENSION','ACCIDENTE LABORAL','PERMISO','COMISION','CAPACITACION','OTROS')),
  subtipo text, fecha_desde date not null, fecha_hasta date not null,
  hora_desde time, hora_hasta time, descripcion text,
  estado text not null default 'REGISTRADO' check(estado in ('REGISTRADO','ANULADO')),
  departamento_id uuid not null references public.departments(id), servicio_id uuid not null,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(departamento_id,servicio_id) references public.services(departamento_id,id),
  constraint dates_order check(fecha_hasta>=fecha_desde),
  constraint paid_guard_hours check(tipo<>'GUARDIA PAGA' or (fecha_hasta=fecha_desde and hora_desde is not null and hora_hasta is not null and hora_hasta>hora_desde))
);
create table if not exists public.expedientes (
  id uuid primary key default gen_random_uuid(), legacy_id text unique,
  numero text not null unique check(length(trim(numero)) between 1 and 100),
  asunto text not null check(length(trim(asunto)) between 1 and 500),
  tipo text, estado text not null default 'INICIADO' check(estado in ('INICIADO','EN TRAMITE','OBSERVADO','DERIVADO','FINALIZADO','ARCHIVADO')),
  fecha_inicio date not null, personal_id uuid references public.personnel(id),
  departamento_id uuid not null references public.departments(id), servicio_id uuid not null,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(departamento_id,servicio_id) references public.services(departamento_id,id)
);
create table if not exists public.parte_entries (
  id uuid primary key default gen_random_uuid(), fecha date not null,
  personal_id uuid not null references public.personnel(id),
  departamento_id uuid not null references public.departments(id), servicio_id uuid not null,
  turno text not null check(turno in ('MAÑANA','TARDE','NOCHE')),
  estado text not null check(estado in ('PRESENTE','DESCANSO','LICENCIA MEDICA','LICENCIA ANUAL','FRANCO','DESPLAZAMIENTO','ARTICULO','ARTICULO 8','ARTICULO 4','ARTICULO 6','AUSENTE','GUARDIA PAGA','JUNTA MEDICA','SUSPENSION','ACCIDENTE LABORAL','PERMISO','COMISION','CAPACITACION','OTROS')),
  hora_desde time, hora_hasta time, observaciones text,
  created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(departamento_id,servicio_id) references public.services(departamento_id,id),
  unique(fecha,personal_id,turno),
  constraint paid_hours check(estado<>'GUARDIA PAGA' or (hora_desde is not null and hora_hasta is not null and hora_hasta>hora_desde))
);
create table if not exists public.audit_log (
  id bigint generated always as identity primary key, created_at timestamptz not null default now(),
  actor uuid, module text not null, action text not null, record_id uuid not null
);
create index if not exists personnel_scope on public.personnel(departamento_id,servicio_id,apellido);
create index if not exists movements_scope on public.movements(departamento_id,servicio_id,fecha_desde desc);
create index if not exists movements_person_dates on public.movements(personal_id,fecha_desde,fecha_hasta);
create index if not exists expedientes_scope on public.expedientes(departamento_id,servicio_id,fecha_inicio desc);
create index if not exists parte_scope on public.parte_entries(servicio_id,fecha,turno);

-- SECURITY DEFINER solo en schema NO expuesto; función limitada a leer el perfil del propio auth.uid().
create or replace function private.my_role() returns text language sql stable security definer set search_path = '' as $$
  select p.rol from public.profiles p where p.id=(select auth.uid()) and p.activo=true limit 1
$$;
create or replace function private.can_view(dep uuid,srv uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.activo
    and (p.rol in ('SUPER_ADMIN','RRHH_ADMIN','RRHH')
      or (p.rol='DEPARTAMENTO' and p.departamento_id=dep)
      or (p.rol='SERVICIO' and p.departamento_id=dep and p.servicio_id=srv)
      or (p.rol='CONSULTA' and p.departamento_id=dep and (p.servicio_id is null or p.servicio_id=srv))))
$$;
create or replace function private.can_write(dep uuid,srv uuid,operation text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.activo and
    case when operation='PERSONNEL' then p.rol in ('SUPER_ADMIN','RRHH_ADMIN')
         when operation='MOVEMENT' then p.rol in ('SUPER_ADMIN','RRHH_ADMIN','RRHH')
         when operation in ('PARTE','EXPEDIENTE') then p.rol in ('SUPER_ADMIN','RRHH_ADMIN','RRHH','DEPARTAMENTO','SERVICIO')
         else false end and
    (p.rol in ('SUPER_ADMIN','RRHH_ADMIN','RRHH') or (p.departamento_id=dep and (p.rol='DEPARTAMENTO' or p.servicio_id=srv))))
$$;
create or replace function private.person_matches(pid uuid,dep uuid,srv uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.personnel p where p.id=pid and p.departamento_id=dep and p.servicio_id=srv)
$$;
create or replace function private.touch_and_audit() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' then new.updated_at=now(); end if;
  insert into public.audit_log(actor,module,action,record_id) values(auth.uid(),tg_table_name,tg_op,new.id);
  return new;
end;
$$;
-- BEFORE trigger: si hay un error en el registro, toda la transacción se revierte.
drop trigger if exists audit_personnel on public.personnel;
create trigger audit_personnel before insert or update on public.personnel for each row execute function private.touch_and_audit();
drop trigger if exists audit_movements on public.movements;
create trigger audit_movements before insert or update on public.movements for each row execute function private.touch_and_audit();
drop trigger if exists audit_expedientes on public.expedientes;
create trigger audit_expedientes before insert or update on public.expedientes for each row execute function private.touch_and_audit();
drop trigger if exists audit_parte on public.parte_entries;
create trigger audit_parte before insert or update on public.parte_entries for each row execute function private.touch_and_audit();

alter table public.departments enable row level security;
alter table public.services enable row level security;
alter table public.profiles enable row level security;
alter table public.personnel enable row level security;
alter table public.movements enable row level security;
alter table public.expedientes enable row level security;
alter table public.parte_entries enable row level security;
alter table public.audit_log enable row level security;

create policy "departments scoped select" on public.departments for select to authenticated using (
  private.my_role() in ('SUPER_ADMIN','RRHH_ADMIN','RRHH') or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.activo and p.departamento_id=departments.id)
);
create policy "services scoped select" on public.services for select to authenticated using (private.can_view(departamento_id,id));
create policy "profiles self select" on public.profiles for select to authenticated using (id=(select auth.uid()) or private.my_role() in ('SUPER_ADMIN','RRHH_ADMIN'));
create policy "profiles admin insert" on public.profiles for insert to authenticated with check (private.my_role()='SUPER_ADMIN');
create policy "profiles admin update" on public.profiles for update to authenticated using (private.my_role()='SUPER_ADMIN') with check (private.my_role()='SUPER_ADMIN');
create policy "personnel scoped select" on public.personnel for select to authenticated using (private.can_view(departamento_id,servicio_id));
create policy "personnel central insert" on public.personnel for insert to authenticated with check (private.can_write(departamento_id,servicio_id,'PERSONNEL'));
create policy "personnel central update" on public.personnel for update to authenticated using (private.can_write(departamento_id,servicio_id,'PERSONNEL')) with check (private.can_write(departamento_id,servicio_id,'PERSONNEL'));
create policy "movements scoped select" on public.movements for select to authenticated using (private.can_view(departamento_id,servicio_id) and private.person_matches(personal_id,departamento_id,servicio_id));
create policy "movements central insert" on public.movements for insert to authenticated with check (private.can_write(departamento_id,servicio_id,'MOVEMENT') and private.person_matches(personal_id,departamento_id,servicio_id));
create policy "movements admin update" on public.movements for update to authenticated using (private.my_role() in ('SUPER_ADMIN','RRHH_ADMIN') and private.can_view(departamento_id,servicio_id)) with check (private.my_role() in ('SUPER_ADMIN','RRHH_ADMIN') and private.can_view(departamento_id,servicio_id) and private.person_matches(personal_id,departamento_id,servicio_id));
create policy "expedientes scoped select" on public.expedientes for select to authenticated using (private.can_view(departamento_id,servicio_id));
create policy "expedientes scoped insert" on public.expedientes for insert to authenticated with check (private.can_write(departamento_id,servicio_id,'EXPEDIENTE') and (personal_id is null or private.person_matches(personal_id,departamento_id,servicio_id)));
create policy "parte scoped select" on public.parte_entries for select to authenticated using (private.can_view(departamento_id,servicio_id) and private.person_matches(personal_id,departamento_id,servicio_id));
create policy "parte scoped insert" on public.parte_entries for insert to authenticated with check (private.can_write(departamento_id,servicio_id,'PARTE') and private.person_matches(personal_id,departamento_id,servicio_id));
create policy "parte scoped update" on public.parte_entries for update to authenticated using (private.can_write(departamento_id,servicio_id,'PARTE') and private.person_matches(personal_id,departamento_id,servicio_id)) with check (private.can_write(departamento_id,servicio_id,'PARTE') and private.person_matches(personal_id,departamento_id,servicio_id));
create policy "audit central select" on public.audit_log for select to authenticated using (private.my_role() in ('SUPER_ADMIN','RRHH_ADMIN'));

revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public,anon;
grant execute on function private.my_role() to authenticated;
grant execute on function private.can_view(uuid,uuid) to authenticated;
grant execute on function private.can_write(uuid,uuid,text) to authenticated;
grant execute on function private.person_matches(uuid,uuid,uuid) to authenticated;
revoke all on function private.touch_and_audit() from public,anon,authenticated;
grant usage on schema public to authenticated;
grant select on public.departments,public.services,public.profiles,public.personnel,public.movements,public.expedientes,public.parte_entries,public.audit_log to authenticated;
grant insert,update on public.personnel,public.movements,public.expedientes,public.parte_entries,public.profiles to authenticated;
-- Nunca permitir CRUD directo de auditoría ni de estructura desde el cliente en esta etapa.
commit;
