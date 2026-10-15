begin;
create schema if not exists private;

create table private.request_fingerprints (request_id uuid primary key, scope text not null, fingerprint text not null);
revoke all on private.request_fingerprints from public,anon,authenticated;
create function private.check_request(rid uuid,request_scope text,payload jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into private.request_fingerprints(request_id,scope,fingerprint) values(rid,request_scope,md5(payload::text)) on conflict(request_id) do nothing;
 if not exists(select 1 from private.request_fingerprints where request_id=rid and scope=request_scope and fingerprint=md5(payload::text)) then raise exception 'La solicitud ya fue registrada con otros datos. Cierra el formulario y revisa el registro antes de crear uno nuevo.'; end if;
end $$;

create table public.staff (
 id uuid primary key references auth.users(id), full_name text not null check(length(trim(full_name)) between 2 and 150),
 role text not null check(role in ('superadmin','sales')), active boolean not null default true,
 revoked_modules text[] not null default '{}', created_by uuid references public.staff(id), created_at timestamptz not null default now()
);
create function private.allowed(m text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff where id=auth.uid() and active and m=any(array['dashboard','intermediaries','bookings','operations','connections','providers','finance','settings','staff']) and
 (role='superadmin' or (m<>'staff' and not m=any(revoked_modules))))
$$;
create function private.require_module(m text) returns void language plpgsql security definer set search_path='' as $$
begin if not private.allowed(m) then raise exception 'No tienes permiso para esta operación.' using errcode='42501'; end if; end $$;

create table public.intermediaries (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 150),
 kind text not null check(kind in ('hotel','agency')), contact text not null default '', phone text not null default '', active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.services (
 id uuid primary key default gen_random_uuid(), name text not null, code text not null unique,
 days integer not null check(days>0), nights integer not null check(nights>=0), active boolean not null default true,
 created_at timestamptz not null default now()
);
insert into public.services(name,code,days,nights) values ('Full Day','FULL_DAY',1,0),('2D TREK','2D_TREK',2,1),('3D TREK','3D_TREK',3,2);
create table public.extras (
 id uuid primary key default gen_random_uuid(), name text not null, amount numeric(12,2) not null check(amount>=0), active boolean not null default true,
 created_at timestamptz not null default now()
);
insert into public.extras(name,amount) values ('Par de bastones',20),('Baño privado',20),('Boleto turístico — extranjero',70),('Boleto turístico — latinoamericano',40),('Boleto turístico — estudiante extranjero menor de 16 años',20),('Aguas termales',15),('Almuerzo buffet',50);
create table public.tariffs (
 id uuid primary key default gen_random_uuid(), intermediary_id uuid not null references public.intermediaries,
 service_id uuid not null references public.services, amount numeric(12,2) not null check(amount>=0),
 version bigint generated always as identity, created_by uuid not null references public.staff, created_at timestamptz not null default now()
);
create index tariffs_latest on public.tariffs(intermediary_id,service_id,version desc);
create table public.booking_links (
 id uuid primary key default gen_random_uuid(), intermediary_id uuid not null references public.intermediaries,
 token text not null unique check(token ~ '^[a-f0-9]{64}$'), active boolean not null default true, created_at timestamptz not null default now()
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), code bigint generated always as identity unique,
 intermediary_id uuid not null references public.intermediaries, service_id uuid not null references public.services,
 departure_date date not null, tour_rate numeric(12,2) not null check(tour_rate>=0), service_name text not null, duration_days integer not null, duration_nights integer not null, tariff_id uuid not null references public.tariffs,
 status text not null default 'registered' check(status in ('registered','cancelled')), notes text not null default '',
 request_id uuid not null, created_by uuid references public.staff, created_at timestamptz not null default now(), unique(intermediary_id,request_id)
);
create index bookings_date on public.bookings(departure_date,service_id);
create table public.passengers (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings,
 full_name text not null check(length(trim(full_name)) between 2 and 150), phone text not null default '', pickup text not null check(length(trim(pickup)) between 2 and 250),
 notes text not null default '', dietary text not null default '', attendance text not null default 'reserved' check(attendance in ('reserved','attended','no_show','cancelled')),
 created_at timestamptz not null default now()
);
create index passengers_booking on public.passengers(booking_id);
create table public.passenger_health (
 passenger_id uuid primary key references public.passengers, allergies text not null default '', medication text not null default ''
);
create table public.passenger_extras (
 id uuid primary key default gen_random_uuid(), passenger_id uuid not null references public.passengers,
 extra_id uuid not null references public.extras, name text not null, quantity integer not null check(quantity between 1 and 50),
 unit_price numeric(12,2) not null check(unit_price>=0), unique(passenger_id,extra_id)
);
create table public.providers (
 id uuid primary key default gen_random_uuid(), name text not null, contact text not null default '', phone text not null default '', active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.vehicles (
 id uuid primary key default gen_random_uuid(), name text not null, plate text not null unique, capacity integer not null check(capacity between 1 and 200),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table public.crew (
 id uuid primary key default gen_random_uuid(), name text not null, kind text not null check(kind in ('driver','guide')), phone text not null default '', active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.departures (
 id uuid primary key default gen_random_uuid(), service_id uuid not null references public.services, departure_date date not null,
 vehicle_id uuid not null references public.vehicles, driver_id uuid references public.crew, guide_id uuid references public.crew,
 notes text not null default '', created_at timestamptz not null default now()
);
create table public.assignments (
 passenger_id uuid primary key references public.passengers, departure_id uuid not null references public.departures, created_at timestamptz not null default now()
);
create table public.connections (
 id uuid primary key default gen_random_uuid(), passenger_id uuid not null unique references public.passengers,
 coordinator text not null check(coordinator in ('unconfirmed','peru_andes','intermediary','third_party')), responsible text not null default '',
 provider_id uuid references public.providers, transfer_point text not null default '', transfer_time time,
 status text not null default 'pending' check(status in ('pending','coordinated','transferred','completed','incident')),
 notes text not null default '', created_at timestamptz not null default now()
);
create table public.outsourcings (
 id uuid primary key default gen_random_uuid(), passenger_id uuid not null references public.passengers, provider_id uuid not null references public.providers,
 concept text not null, covers_transport boolean not null default false, request_id uuid not null unique, amount numeric(12,2) not null check(amount>=0), notes text not null default '', created_at timestamptz not null default now()
);
create table public.lodgings (
 id uuid primary key default gen_random_uuid(), passenger_id uuid not null references public.passengers, night date not null, place text not null,
 room_type text not null check(room_type in ('shared','single','double','triple')), room_reference text not null,
 notes text not null default '', created_at timestamptz not null default now(), unique(passenger_id,night)
);
create table public.guide_funds (
 id uuid primary key default gen_random_uuid(), departure_id uuid not null references public.departures, guide_id uuid not null references public.crew,
 guide_amount numeric(12,2) not null check(guide_amount>=0), no_show_amount numeric(12,2) check(no_show_amount>=0),
 notes text not null default '', created_by uuid not null references public.staff, created_at timestamptz not null default now()
);
create table public.booking_corrections (
 id uuid primary key, booking_id uuid not null references public.bookings,
 before_data jsonb not null, after_data jsonb not null, reason text not null check(length(trim(reason))>=3),
 created_by uuid not null references public.staff, created_at timestamptz not null default now()
);

create table public.ledger (
 id uuid primary key default gen_random_uuid(), direction text not null check(direction in ('receivable','payable')),
 intermediary_id uuid references public.intermediaries, provider_id uuid references public.providers,
 kind text not null check(kind in ('charge','payment','advance','adjustment')), origin text not null default 'manual' check(origin in ('manual','tour','outsourcing')),
 amount numeric(12,2) not null check(amount<>0), concept text not null check(length(trim(concept))>=3),
 booking_id uuid references public.bookings, outsourcing_id uuid references public.outsourcings, effective_date date not null default (now() at time zone 'America/Lima')::date,
 reference text not null default '', request_id uuid not null unique, created_by uuid references public.staff, created_at timestamptz not null default now(),
 check((direction='receivable' and intermediary_id is not null and provider_id is null) or (direction='payable' and provider_id is not null and intermediary_id is null)),
 check((kind='charge' and amount>0) or (kind in ('payment','advance') and amount<0) or kind='adjustment')
);
create unique index ledger_booking_charge on public.ledger(booking_id) where origin='tour' and booking_id is not null;
create unique index ledger_outsourcing_charge on public.ledger(outsourcing_id) where kind='charge' and outsourcing_id is not null;
create table public.applications (
 id uuid primary key default gen_random_uuid(), credit_id uuid not null references public.ledger, charge_id uuid not null references public.ledger,
 amount numeric(12,2) not null check(amount>0), request_id uuid not null unique, created_by uuid not null references public.staff,
 created_at timestamptz not null default now(), check(credit_id<>charge_id)
);
create table public.audit (
 id bigint generated always as identity primary key, entity text not null, record_id text not null, actor uuid,
 operation text not null, before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit(entity,record_id,actor,operation,before_data,after_data)
 values(tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'passenger_id'),coalesce(auth.uid(),(to_jsonb(new)->>'created_by')::uuid),tg_op,to_jsonb(old),to_jsonb(new));
 return new;
end $$;

-- Solo RPCs controladas escriben. Lecturas directas también respetan permisos revocables.
do $$ declare r record; begin
 for r in select * from (values
 ('staff','staff'),('intermediaries','intermediaries'),('tariffs','intermediaries'),('booking_links','intermediaries'),
 ('services','settings'),('extras','settings'),('bookings','bookings'),('passengers','bookings'),('passenger_health','bookings'),('passenger_extras','bookings'),
 ('providers','providers'),('vehicles','operations'),('crew','operations'),('departures','operations'),('assignments','operations'),
 ('connections','connections'),('outsourcings','providers'),('lodgings','operations'),('guide_funds','operations'),('booking_corrections','bookings'),('ledger','finance'),('applications','finance'),('audit','staff')) t(tbl,mod) loop
 execute format('alter table public.%I enable row level security',r.tbl);
 execute format('revoke all on public.%I from anon,authenticated',r.tbl);
 execute format('grant select on public.%I to authenticated',r.tbl);
 execute format('grant all on public.%I to service_role',r.tbl);
 execute format('create policy read_allowed on public.%I for select to authenticated using (private.allowed(%L))',r.tbl,r.mod);
 if r.tbl not in ('audit','passenger_health','booking_links') then
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',r.tbl);
 end if;
 end loop;
end $$;
create policy read_self on public.staff for select to authenticated using(id=auth.uid());
grant usage on schema private to authenticated;
revoke all on function private.allowed(text) from public;
grant execute on function private.allowed(text) to authenticated;
revoke all on function private.require_module(text) from public;
revoke all on function private.audit_change() from public;

create function public.my_access() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',id,'full_name',full_name,'role',role,'active',active,'revoked_modules',revoked_modules) from public.staff where id=auth.uid()
$$;

create function public.save_catalog(p_kind text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid()); act boolean:=coalesce((p_data->>'active')::boolean,true);
begin
 case p_kind
 when 'intermediaries' then
 perform private.require_module('intermediaries');
 insert into public.intermediaries(id,name,kind,contact,phone,active) values(rid,trim(p_data->>'name'),p_data->>'kind',coalesce(p_data->>'contact',''),coalesce(p_data->>'phone',''),act)
 on conflict(id) do update set name=excluded.name,kind=excluded.kind,contact=excluded.contact,phone=excluded.phone,active=excluded.active;
 when 'providers' then
 perform private.require_module('providers');
 insert into public.providers(id,name,contact,phone,active) values(rid,trim(p_data->>'name'),coalesce(p_data->>'contact',''),coalesce(p_data->>'phone',''),act)
 on conflict(id) do update set name=excluded.name,contact=excluded.contact,phone=excluded.phone,active=excluded.active;
 when 'vehicles' then
 perform private.require_module('operations');
 perform 1 from public.vehicles where id=rid for update;
 perform 1 from public.departures where vehicle_id=rid order by id for update;
 if exists(select 1 from public.departures d join public.assignments a on a.departure_id=d.id join public.passengers p on p.id=a.passenger_id join public.bookings b on b.id=p.booking_id where d.vehicle_id=rid and d.departure_date>=(now() at time zone 'America/Lima')::date and b.status<>'cancelled' and p.attendance<>'cancelled' group by d.id having count(*)>(p_data->>'capacity')::int) then raise exception 'La capacidad no puede ser menor que los pasajeros ya asignados.'; end if;
 insert into public.vehicles(id,name,plate,capacity,active) values(rid,trim(p_data->>'name'),upper(p_data->>'plate'),(p_data->>'capacity')::int,act)
 on conflict(id) do update set name=excluded.name,plate=excluded.plate,capacity=excluded.capacity,active=excluded.active;
 when 'crew' then
 perform private.require_module('operations');
 insert into public.crew(id,name,kind,phone,active) values(rid,trim(p_data->>'name'),p_data->>'kind',coalesce(p_data->>'phone',''),act)
 on conflict(id) do update set name=excluded.name,kind=excluded.kind,phone=excluded.phone,active=excluded.active;
 when 'services' then
 perform private.require_module('settings');
 insert into public.services(id,name,code,days,nights,active) values(rid,trim(p_data->>'name'),p_data->>'code',(p_data->>'days')::int,(p_data->>'nights')::int,act)
 on conflict(id) do update set name=excluded.name,code=excluded.code,days=excluded.days,nights=excluded.nights,active=excluded.active;
 when 'extras' then
 perform private.require_module('settings');
 insert into public.extras(id,name,amount,active) values(rid,trim(p_data->>'name'),(p_data->>'amount')::numeric,act)
 on conflict(id) do update set name=excluded.name,amount=excluded.amount,active=excluded.active;
 else raise exception 'Catálogo no permitido.';
 end case;
 return rid;
end $$;

create function public.save_tariff(p_intermediary uuid,p_service uuid,p_amount numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin perform private.require_module('intermediaries');
 insert into public.tariffs(intermediary_id,service_id,amount,created_by) values(p_intermediary,p_service,p_amount,auth.uid()) returning id into rid;
 return rid;
end $$;

create function public.manage_link(p_intermediary uuid,p_token text,p_revoke uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin perform private.require_module('intermediaries');
 if p_revoke is not null then update public.booking_links set active=false where id=p_revoke and intermediary_id=p_intermediary returning id into rid;
 else insert into public.booking_links(intermediary_id,token) values(p_intermediary,p_token) returning id into rid; end if;
 insert into public.audit(entity,record_id,actor,operation) values('booking_links',rid::text,auth.uid(),case when p_revoke is null then 'CREATE' else 'REVOKE' end);
 return rid;
end $$;

create function public.booking_context(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare iid uuid;
begin
 select l.intermediary_id into iid from public.booking_links l join public.intermediaries i on i.id=l.intermediary_id where l.token=p_token and l.active and i.active;
 if iid is null then raise exception 'Enlace inválido o revocado.'; end if;
 return jsonb_build_object('intermediary',(select name from public.intermediaries where id=iid),
 'services',coalesce((select jsonb_agg(to_jsonb(s)) from (select s.id,s.name,t.amount from public.services s join lateral (select amount from public.tariffs where intermediary_id=iid and service_id=s.id order by version desc limit 1)t on true where s.active)s),'[]'::jsonb),
 'extras',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'amount',amount)) from public.extras where active),'[]'::jsonb));
end $$;

create function private.create_booking(iid uuid,p_data jsonb,actor uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid; pid uuid; tid uuid; rate numeric; item jsonb; ex jsonb; e public.extras; s public.services; request uuid:=(p_data->>'request_id')::uuid; n int;
begin
 if octet_length(p_data::text)>65536 then raise exception 'Reserva demasiado extensa.'; end if;
 perform 1 from public.intermediaries where id=iid and active for update;
 if not found then raise exception 'Intermediario inactivo.'; end if;
 perform private.check_request(request,'booking:'||iid::text,p_data);
 select id into bid from public.bookings where intermediary_id=iid and request_id=request;
 if bid is not null then return bid; end if;
 select * into s from public.services where id=(p_data->>'service_id')::uuid and active;
 if not found then raise exception 'Servicio no disponible.'; end if;
 select id,amount into tid,rate from public.tariffs where intermediary_id=iid and service_id=s.id order by version desc limit 1;
 if tid is null then raise exception 'No existe una tarifa acordada para este servicio.'; end if;
 if p_data->>'expected_rate' is not null and (p_data->>'expected_rate')::numeric<>rate then raise exception 'La tarifa cambió. Revisa el importe actualizado antes de enviar de nuevo.'; end if;
 n:=jsonb_array_length(p_data->'passengers');
 if n is null or n<1 or n>50 then raise exception 'Registra entre 1 y 50 pasajeros.'; end if;
 insert into public.bookings(intermediary_id,service_id,departure_date,tour_rate,service_name,duration_days,duration_nights,tariff_id,request_id,created_by,notes)
 values(iid,s.id,(p_data->>'departure_date')::date,rate,s.name,s.days,s.nights,tid,request,actor,coalesce(p_data->>'notes','')) returning id into bid;
 for item in select value from jsonb_array_elements(p_data->'passengers') loop
 insert into public.passengers(booking_id,full_name,phone,pickup,notes,dietary) values(bid,trim(item->>'full_name'),coalesce(item->>'phone',''),item->>'pickup',coalesce(item->>'notes',''),coalesce(item->>'dietary','')) returning id into pid;
 insert into public.passenger_health(passenger_id,allergies,medication) values(pid,coalesce(item->>'allergies',''),coalesce(item->>'medication',''));
 for ex in select value from jsonb_array_elements(coalesce(item->'extras','[]'::jsonb)) loop
 select * into e from public.extras where id=(ex->>'extra_id')::uuid and active;
 if not found then raise exception 'Adicional no disponible.'; end if;
 if ex->>'expected_price' is not null and (ex->>'expected_price')::numeric<>e.amount then raise exception 'El precio de un adicional cambió. Revisa el importe actualizado.'; end if;
 insert into public.passenger_extras(passenger_id,extra_id,name,quantity,unit_price) values(pid,e.id,e.name,(ex->>'quantity')::int,e.amount);
 end loop;
 if coalesce((item->>'puno')::boolean,false) then
 insert into public.connections(passenger_id,coordinator,notes) values(pid,coalesce(item->>'coordinator','unconfirmed'),'Solicitada al registrar reserva. Responsable por confirmar.');
 end if;
 end loop;
 if rate*n>0 then insert into public.ledger(direction,intermediary_id,kind,amount,concept,booking_id,request_id,created_by,origin)
 values('receivable',iid,'charge',rate*n,s.name||' · '||n||' pasajeros',bid,gen_random_uuid(),actor,'tour'); end if;
 return bid;
end $$;
create function public.create_internal_booking(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
begin perform private.require_module('bookings'); return private.create_booking((p_data->>'intermediary_id')::uuid,p_data,auth.uid()); end $$;
create function public.create_public_booking(p_token text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare iid uuid;
begin
 select l.intermediary_id into iid from public.booking_links l join public.intermediaries i on i.id=l.intermediary_id where l.token=p_token and l.active and i.active for update of l;
 if iid is null then raise exception 'Enlace inválido o revocado.'; end if;
 if (select count(*) from public.bookings where intermediary_id=iid and created_at>now()-interval '1 minute')>=10
 and not exists(select 1 from public.bookings where intermediary_id=iid and request_id=(p_data->>'request_id')::uuid) then raise exception 'Espera un minuto antes de enviar otra reserva.'; end if;
 return private.create_booking(iid,p_data,null);
end $$;

create function public.correct_booking(p_id uuid,p_service uuid,p_rate numeric,p_date date,p_reason text,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.bookings; s public.services; tid uuid; n integer; delta numeric; updated public.bookings;
begin perform private.require_module('bookings');perform private.require_module('finance');
 if p_rate<0 or p_rate<>round(p_rate,2) or length(trim(p_reason))<3 then raise exception 'Indica un importe válido y el motivo de la corrección.'; end if;
 select * into b from public.bookings where id=p_id for update;
 if not found then raise exception 'Reserva inexistente.'; end if;
 perform private.check_request(p_request,'correction:'||p_id::text,jsonb_build_object('service',p_service,'rate',p_rate,'date',p_date,'reason',p_reason));
 if exists(select 1 from public.booking_corrections where id=p_request and booking_id=p_id) then return p_request; end if;
 if b.status='cancelled' then raise exception 'La reserva está cancelada. Los ajustes financieros se registran en Finanzas.'; end if;
 if (p_date<>b.departure_date or p_service<>b.service_id) and
 (exists(select 1 from public.assignments a join public.passengers p on p.id=a.passenger_id where p.booking_id=p_id) or exists(select 1 from public.lodgings l join public.passengers p on p.id=l.passenger_id where p.booking_id=p_id)) then raise exception 'Retira las asignaciones antes de modificar fecha o servicio.'; end if;
 select * into s from public.services where id=p_service and active;
 if not found then raise exception 'Servicio no disponible.'; end if;
 select id into tid from public.tariffs where intermediary_id=b.intermediary_id and service_id=s.id order by version desc limit 1;
 if tid is null then raise exception 'Configura primero la tarifa del intermediario para este servicio.'; end if;
 select count(*) into n from public.passengers where booking_id=p_id;
 delta:=(p_rate-b.tour_rate)*n;
 update public.bookings set service_id=s.id,service_name=s.name,duration_days=s.days,duration_nights=s.nights,departure_date=p_date,tour_rate=p_rate,tariff_id=tid where id=p_id returning * into updated;
 insert into public.booking_corrections(id,booking_id,before_data,after_data,reason,created_by) values(p_request,p_id,to_jsonb(b),to_jsonb(updated),p_reason,auth.uid());
 if delta<>0 then insert into public.ledger(direction,intermediary_id,kind,amount,concept,booking_id,request_id,created_by)
 values('receivable',b.intermediary_id,'adjustment',delta,p_reason,p_id,p_request,auth.uid()); end if;
 return p_request;
end $$;

create function public.update_booking(p_id uuid,p_notes text,p_status text,p_date date default null) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_module('bookings');
 perform 1 from public.bookings where id=p_id for update;
 if p_status='registered' and exists(select 1 from public.bookings where id=p_id and status='cancelled') and exists(select 1 from public.assignments a join public.passengers p on p.id=a.passenger_id where p.booking_id=p_id) then raise exception 'Desasigna las movilidades antes de reactivar la reserva.'; end if;
 if p_date is not null and p_date<>(select departure_date from public.bookings where id=p_id) then
 if exists(select 1 from public.assignments a join public.passengers p on p.id=a.passenger_id where p.booking_id=p_id) or exists(select 1 from public.lodgings l join public.passengers p on p.id=l.passenger_id where p.booking_id=p_id) then raise exception 'Retira las asignaciones de movilidad y alojamiento antes de cambiar la fecha.'; end if;
 end if;
 update public.bookings set notes=p_notes,status=p_status,departure_date=coalesce(p_date,departure_date) where id=p_id;
 if not found then raise exception 'Reserva inexistente.'; end if;
end $$;
create function public.update_passenger(p_id uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_module('bookings');
 update public.passengers set full_name=trim(p_data->>'full_name'),phone=coalesce(p_data->>'phone',''),pickup=p_data->>'pickup',notes=coalesce(p_data->>'notes',''),dietary=coalesce(p_data->>'dietary','') where id=p_id;
 if not found then raise exception 'Pasajero inexistente.'; end if;
 insert into public.passenger_health(passenger_id,allergies,medication) values(p_id,coalesce(p_data->>'allergies',''),coalesce(p_data->>'medication',''))
 on conflict(passenger_id) do update set allergies=excluded.allergies,medication=excluded.medication;
 insert into public.audit(entity,record_id,actor,operation) values('passenger_health',p_id::text,auth.uid(),'UPDATE');
end $$;
create function public.set_passenger_extra(p_passenger uuid,p_extra uuid,p_quantity integer) returns void language plpgsql security definer set search_path='' as $$
declare e public.extras;
begin perform private.require_module('bookings');
 if p_quantity=0 then delete from public.passenger_extras where passenger_id=p_passenger and extra_id=p_extra; return; end if;
 select * into e from public.extras where id=p_extra;
 if not found or (not e.active and not exists(select 1 from public.passenger_extras where passenger_id=p_passenger and extra_id=p_extra)) then raise exception 'Adicional no disponible.'; end if;
 insert into public.passenger_extras(passenger_id,extra_id,name,quantity,unit_price) values(p_passenger,e.id,e.name,p_quantity,e.amount)
 on conflict(passenger_id,extra_id) do update set quantity=excluded.quantity;
end $$;

create function public.set_attendance(p_passenger uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_module('operations');
 if p_status<>'cancelled' and exists(select 1 from public.passengers where id=p_passenger and attendance='cancelled') and exists(select 1 from public.assignments where passenger_id=p_passenger) then raise exception 'Desasigna la movilidad antes de reactivar al pasajero.'; end if;
 update public.passengers set attendance=p_status where id=p_passenger; if not found then raise exception 'Pasajero inexistente.'; end if; end $$;

create function public.save_departure(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid:=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid()); prior public.departures; seats int; occupied int; begin perform private.require_module('operations');
 select * into prior from public.departures where id=rid for update;
 if prior.id is not null and ((p_data->>'service_id')::uuid<>prior.service_id or (p_data->>'departure_date')::date<>prior.departure_date) and exists(select 1 from public.assignments where departure_id=rid) then raise exception 'Desasigna los pasajeros antes de modificar fecha o servicio.'; end if;
 if not exists(select 1 from public.vehicles where id=(p_data->>'vehicle_id')::uuid and active) then raise exception 'Movilidad no disponible.'; end if;
 if nullif(p_data->>'driver_id','') is not null and not exists(select 1 from public.crew where id=(p_data->>'driver_id')::uuid and kind='driver' and active) then raise exception 'Conductor no válido.'; end if;
 if nullif(p_data->>'guide_id','') is not null and not exists(select 1 from public.crew where id=(p_data->>'guide_id')::uuid and kind='guide' and active) then raise exception 'Guía no válido.'; end if;
 select capacity into seats from public.vehicles where id=(p_data->>'vehicle_id')::uuid for share;
 select count(*) into occupied from public.assignments a join public.passengers p on p.id=a.passenger_id join public.bookings b on b.id=p.booking_id where a.departure_id=rid and p.attendance<>'cancelled' and b.status<>'cancelled';
 if occupied>seats then raise exception 'La movilidad elegida no tiene capacidad para los pasajeros asignados.'; end if;
 insert into public.departures(id,service_id,departure_date,vehicle_id,driver_id,guide_id,notes) values(rid,(p_data->>'service_id')::uuid,(p_data->>'departure_date')::date,(p_data->>'vehicle_id')::uuid,nullif(p_data->>'driver_id','')::uuid,nullif(p_data->>'guide_id','')::uuid,coalesce(p_data->>'notes','')) on conflict(id) do update set service_id=excluded.service_id,departure_date=excluded.departure_date,vehicle_id=excluded.vehicle_id,driver_id=excluded.driver_id,guide_id=excluded.guide_id,notes=excluded.notes returning id into rid;
 return rid; end $$;
create function public.assign_passenger(p_passenger uuid,p_departure uuid) returns void language plpgsql security definer set search_path='' as $$
declare d public.departures; b public.bookings; cap int;
begin perform private.require_module('operations');
 perform 1 from public.passengers where id=p_passenger for update;
 if not found then raise exception 'Pasajero inexistente.'; end if;
 if p_departure is null then delete from public.assignments where passenger_id=p_passenger;
 insert into public.audit(entity,record_id,actor,operation) values('assignments',p_passenger::text,auth.uid(),'UNASSIGN'); return; end if;
 select * into d from public.departures where id=p_departure for update;
 if d.id is null then raise exception 'Salida inexistente.'; end if;
 select b0.* into b from public.bookings b0 join public.passengers p on p.booking_id=b0.id where p.id=p_passenger for share of b0;
 if b.status='cancelled' or b.service_id<>d.service_id or b.departure_date<>d.departure_date then raise exception 'La salida no coincide con la reserva o está cancelada.'; end if;
 if exists(select 1 from public.passengers where id=p_passenger and attendance='cancelled') then raise exception 'Pasajero cancelado.'; end if;
 select capacity into cap from public.vehicles where id=d.vehicle_id and active for share;
 if cap is null then raise exception 'Movilidad inactiva.'; end if;
 if (select count(*) from public.assignments a join public.passengers p on p.id=a.passenger_id join public.bookings booked on booked.id=p.booking_id where a.departure_id=d.id and p.id<>p_passenger and booked.status<>'cancelled' and p.attendance<>'cancelled')>=cap then raise exception 'Movilidad sin cupos.'; end if;
 insert into public.assignments(passenger_id,departure_id) values(p_passenger,p_departure) on conflict(passenger_id) do update set departure_id=excluded.departure_id,created_at=now();
end $$;

create function public.save_connection(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; begin perform private.require_module('connections');
 insert into public.connections(passenger_id,coordinator,responsible,provider_id,transfer_point,transfer_time,status,notes)
 values((p_data->>'passenger_id')::uuid,p_data->>'coordinator',coalesce(p_data->>'responsible',''),nullif(p_data->>'provider_id','')::uuid,coalesce(p_data->>'transfer_point',''),nullif(p_data->>'transfer_time','')::time,p_data->>'status',coalesce(p_data->>'notes',''))
 on conflict(passenger_id) do update set coordinator=excluded.coordinator,responsible=excluded.responsible,provider_id=excluded.provider_id,transfer_point=excluded.transfer_point,transfer_time=excluded.transfer_time,status=excluded.status,notes=excluded.notes returning id into rid;
 return rid; end $$;
create function public.save_lodging(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; b public.bookings; s public.services;
begin perform private.require_module('operations');
 select b0.* into b from public.bookings b0 join public.passengers p on p.booking_id=b0.id where p.id=(p_data->>'passenger_id')::uuid;
 select * into s from public.services where id=b.service_id;
 if b.duration_nights=0 or (p_data->>'night')::date<b.departure_date or (p_data->>'night')::date>=b.departure_date+b.duration_nights then raise exception 'La noche no corresponde al trekking.'; end if;
 insert into public.lodgings(passenger_id,night,place,room_type,room_reference,notes) values((p_data->>'passenger_id')::uuid,(p_data->>'night')::date,p_data->>'place',p_data->>'room_type',p_data->>'room_reference',coalesce(p_data->>'notes',''))
 on conflict(passenger_id,night) do update set place=excluded.place,room_type=excluded.room_type,room_reference=excluded.room_reference,notes=excluded.notes returning id into rid;
 return rid; end $$;

create function public.record_guide_funds(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid;begin perform private.require_module('operations');
 if not exists(select 1 from public.departures where id=(p_data->>'departure_id')::uuid and guide_id is not null) then raise exception 'Asigna un guía a la salida primero.'; end if;
 insert into public.guide_funds(departure_id,guide_id,guide_amount,no_show_amount,notes,created_by) values((p_data->>'departure_id')::uuid,(select guide_id from public.departures where id=(p_data->>'departure_id')::uuid),(p_data->>'guide_amount')::numeric,nullif(p_data->>'no_show_amount','')::numeric,coalesce(p_data->>'notes',''),auth.uid()) returning id into rid;
 return rid;
end $$;

create function public.remove_lodging(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_module('operations');delete from public.lodgings where id=p_id;end $$;

create function public.record_outsourcing(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; begin perform private.require_module('providers');
 if not exists(select 1 from public.providers where id=(p_data->>'provider_id')::uuid and active) then raise exception 'Proveedor no disponible.'; end if;
 perform 1 from public.passengers where id=(p_data->>'passenger_id')::uuid for update;
 perform private.check_request((p_data->>'request_id')::uuid,'outsourcing',p_data);
 select id into rid from public.outsourcings where request_id=(p_data->>'request_id')::uuid; if rid is not null then return rid; end if;
 insert into public.outsourcings(passenger_id,provider_id,concept,covers_transport,request_id,amount,notes) values((p_data->>'passenger_id')::uuid,(p_data->>'provider_id')::uuid,p_data->>'concept',coalesce((p_data->>'covers_transport')::boolean,false),(p_data->>'request_id')::uuid,(p_data->>'amount')::numeric,coalesce(p_data->>'notes','')) returning id into rid;
 if (p_data->>'amount')::numeric>0 then insert into public.ledger(direction,provider_id,kind,amount,concept,outsourcing_id,request_id,created_by,origin) values('payable',(p_data->>'provider_id')::uuid,'charge',(p_data->>'amount')::numeric,p_data->>'concept',rid,gen_random_uuid(),auth.uid(),'outsourcing'); end if;
 return rid; end $$;

create function public.record_movement(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; amt numeric:=(p_data->>'amount')::numeric; k text:=p_data->>'kind';
begin perform private.require_module('finance');
 perform private.check_request((p_data->>'request_id')::uuid,'movement',p_data);
 select id into rid from public.ledger where request_id=(p_data->>'request_id')::uuid;
 if rid is not null then return rid; end if;
 if k in ('payment','advance') then amt:=-abs(amt); end if;
 if nullif(p_data->>'booking_id','') is not null and not exists(select 1 from public.bookings where id=(p_data->>'booking_id')::uuid and intermediary_id=nullif(p_data->>'intermediary_id','')::uuid) then raise exception 'La reserva no corresponde a esta cuenta.'; end if;
 if k='advance' and p_data->>'direction'='payable' then raise exception 'Los adelantos corresponden a intermediarios.'; end if;
 insert into public.ledger(direction,intermediary_id,provider_id,kind,amount,concept,effective_date,reference,request_id,created_by,booking_id)
 values(p_data->>'direction',nullif(p_data->>'intermediary_id','')::uuid,nullif(p_data->>'provider_id','')::uuid,k,amt,p_data->>'concept',(p_data->>'effective_date')::date,coalesce(p_data->>'reference',''),(p_data->>'request_id')::uuid,auth.uid(),nullif(p_data->>'booking_id','')::uuid) returning id into rid;
 return rid; end $$;
create function public.apply_credit(p_credit uuid,p_charge uuid,p_amount numeric,p_request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.ledger; d public.ledger; used_c numeric; used_d numeric; rid uuid;
begin perform private.require_module('finance');
 -- Orden estable de bloqueo: evita aplicaciones concurrentes y deadlocks.
 perform 1 from public.ledger where id in (p_credit,p_charge) order by id for update;
 select * into c from public.ledger where id=p_credit; select * into d from public.ledger where id=p_charge;
 if c.id is null or d.id is null or c.amount>=0 or c.kind not in ('payment','advance','adjustment') or d.amount<=0 or d.kind not in ('charge','adjustment') or c.direction<>d.direction
 or c.intermediary_id is distinct from d.intermediary_id or c.provider_id is distinct from d.provider_id then raise exception 'Crédito y cargo incompatibles.'; end if;
 perform private.check_request(p_request,'application',jsonb_build_object('credit',p_credit,'charge',p_charge,'amount',p_amount));
 select id into rid from public.applications where request_id=p_request; if rid is not null then return rid; end if;
 select coalesce(sum(amount),0) into used_c from public.applications where credit_id=p_credit;
 select coalesce(sum(amount),0) into used_d from public.applications where charge_id=p_charge;
 if p_amount<=0 or p_amount>(-c.amount-used_c) or p_amount>(d.amount-used_d) then raise exception 'El importe supera el crédito disponible o el cargo pendiente.'; end if;
 insert into public.applications(credit_id,charge_id,amount,request_id,created_by) values(p_credit,p_charge,p_amount,p_request,auth.uid()) returning id into rid;
 return rid; end $$;

create function public.update_staff(p_id uuid,p_active boolean,p_revoked text[]) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_module('staff');
 if p_id=auth.uid() then raise exception 'No puedes revocar tu propio acceso.'; end if;
 if exists(select 1 from public.staff where id=p_id and role='superadmin') then raise exception 'La administración de superadministradores se realiza por el propietario del sistema.'; end if;
 update public.staff set active=p_active,revoked_modules=p_revoked where id=p_id;
 if not found then raise exception 'Cuenta inexistente.'; end if;
end $$;

-- Snapshots por módulo sin acceso a información de módulos revocados.
create or replace function public.workspace_data(p_module text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb:='{}'; part jsonb; tbl text; tables text[];
begin perform private.require_module(p_module);
 case p_module
 when 'dashboard' then tables:=array['assignments','departures','connections'];
 when 'intermediaries' then tables:=array['intermediaries','tariffs','booking_links','bookings'];
 when 'bookings' then tables:=array['bookings','passengers','passenger_extras','passenger_health','booking_corrections'];
 when 'operations' then tables:=array['bookings','passengers','passenger_extras','passenger_health','vehicles','crew','departures','assignments','lodgings','connections','guide_funds'];
 when 'connections' then tables:=array['bookings','passengers','connections'];
 when 'providers' then tables:=array['providers','outsourcings','passengers','bookings'];
 when 'finance' then tables:=array['ledger','applications','bookings'];
 when 'settings' then tables:=array['services','extras'];
 when 'staff' then tables:=array['staff','audit'];
 else raise exception 'Módulo inexistente.';
 end case;
 if p_module='dashboard' and private.allowed('finance') then tables:=tables||array['ledger','applications']; end if;
 if p_module='dashboard' then
 result:=result||jsonb_build_object('bookings',coalesce((select jsonb_agg(jsonb_build_object('id',id,'service_id',service_id,'departure_date',departure_date,'status',status,'created_at',created_at)) from public.bookings),'[]'::jsonb),
 'passengers',coalesce((select jsonb_agg(jsonb_build_object('id',id,'booking_id',booking_id,'attendance',attendance)) from public.passengers),'[]'::jsonb));
 end if;
 if p_module='intermediaries' then
 result:=result||jsonb_build_object('passengers',coalesce((select jsonb_agg(jsonb_build_object('id',id,'booking_id',booking_id)) from public.passengers),'[]'::jsonb));
 end if;
 if p_module='bookings' then result:=result||jsonb_build_object('booking_tariffs',coalesce((select jsonb_agg(to_jsonb(t)) from public.tariffs t),'[]'::jsonb)); end if;
 if p_module='finance' then result:=result||jsonb_build_object('financial_passengers',coalesce((select jsonb_agg(jsonb_build_object('booking_id',booking_id,'full_name',full_name)) from public.passengers),'[]'::jsonb)); end if;
 if p_module in ('operations','dashboard') then result:=result||jsonb_build_object('operational_outsourcings',coalesce((select jsonb_agg(jsonb_build_object('id',id,'passenger_id',passenger_id,'provider_id',provider_id,'concept',concept,'covers_transport',covers_transport)) from public.outsourcings),'[]'::jsonb)); end if;

 foreach tbl in array tables loop
 if tbl='staff' then
 select jsonb_build_object('staff',coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('email',u.email)),'[]'::jsonb)) into part from public.staff s left join auth.users u on u.id=s.id;
 else execute format('select jsonb_build_object(%L,coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb)) from public.%I t',tbl,tbl) into part; end if;
 result:=result||part;
 end loop;

 if p_module in ('finance','dashboard','providers') then result:=result||jsonb_build_object('bookings',coalesce((select jsonb_agg(jsonb_build_object('id',id,'code',code,'intermediary_id',intermediary_id,'service_id',service_id,'service_name',service_name,'departure_date',departure_date,'created_at',created_at,'tour_rate',case when p_module='finance' then tour_rate else null end,'status',status)) from public.bookings),'[]'::jsonb)); end if;
 if p_module in ('providers','connections') then result:=result||jsonb_build_object('passengers',coalesce((select jsonb_agg(jsonb_build_object('id',id,'booking_id',booking_id,'full_name',full_name)) from public.passengers),'[]'::jsonb)); end if;
 if p_module='dashboard' then result:=result||jsonb_build_object('departures',coalesce((select jsonb_agg(jsonb_build_object('id',id,'service_id',service_id,'vehicle_id',vehicle_id,'departure_date',departure_date)) from public.departures),'[]'::jsonb),'connections',coalesce((select jsonb_agg(jsonb_build_object('passenger_id',passenger_id,'status',status)) from public.connections),'[]'::jsonb)); end if;
 -- Lookups necesarios no conceden acceso a cuentas, teléfonos, tarifas ni salud.
 return result||jsonb_build_object('intermediary_options',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'active',active)) from public.intermediaries),'[]'::jsonb),
 'service_options',coalesce((select jsonb_agg(to_jsonb(s)) from public.services s),'[]'::jsonb),
 'provider_options',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'active',active)) from public.providers),'[]'::jsonb),
 'extra_options',coalesce((select jsonb_agg(to_jsonb(e)) from public.extras e),'[]'::jsonb));
end $$;

revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.allowed(text) to authenticated;
do $$ declare r record; begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
 ('my_access','save_catalog','save_tariff','manage_link','booking_context','create_internal_booking','create_public_booking','correct_booking','update_booking','update_passenger','set_passenger_extra','set_attendance','save_departure','assign_passenger','save_connection','save_lodging','record_guide_funds','remove_lodging','record_outsourcing','record_movement','apply_credit','update_staff','workspace_data') loop
 execute format('revoke all on function %s from public,anon,authenticated',r.signature);
 execute format('grant execute on function %s to authenticated',r.signature);
 end loop;
end $$;
grant execute on function public.booking_context(text),public.create_public_booking(text,jsonb) to anon;
commit;
