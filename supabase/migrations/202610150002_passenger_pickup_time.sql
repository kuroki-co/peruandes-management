begin;

-- Unknown pickup times remain null; times are local to the tour, without timezone conversion.
alter table public.passengers add column pickup_time time(0)
 check (pickup_time < time '24:00' and extract(second from pickup_time) = 0);

create or replace function private.create_booking(iid uuid,p_data jsonb,actor uuid) returns uuid language plpgsql security definer set search_path='' as $$
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
 insert into public.passengers(booking_id,full_name,phone,pickup,pickup_time,notes,dietary) values(bid,trim(item->>'full_name'),coalesce(item->>'phone',''),item->>'pickup',nullif(item->>'pickup_time','')::time,coalesce(item->>'notes',''),coalesce(item->>'dietary','')) returning id into pid;
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

create or replace function public.update_passenger(p_id uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin perform private.require_module('bookings');
 update public.passengers set full_name=trim(p_data->>'full_name'),phone=coalesce(p_data->>'phone',''),pickup=p_data->>'pickup',pickup_time=case when p_data ? 'pickup_time' then nullif(p_data->>'pickup_time','')::time else pickup_time end,notes=coalesce(p_data->>'notes',''),dietary=coalesce(p_data->>'dietary','') where id=p_id;
 if not found then raise exception 'Pasajero inexistente.'; end if;
 insert into public.passenger_health(passenger_id,allergies,medication) values(p_id,coalesce(p_data->>'allergies',''),coalesce(p_data->>'medication',''))
 on conflict(passenger_id) do update set allergies=excluded.allergies,medication=excluded.medication;
 insert into public.audit(entity,record_id,actor,operation) values('passenger_health',p_id::text,auth.uid(),'UPDATE');
end $$;

commit;
