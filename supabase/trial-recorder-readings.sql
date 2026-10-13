-- Trial baselines only. Apply after vehicle-meters.sql.
begin;
alter table public.diesel_locations add column simulated_meter boolean not null default false;
update public.diesel_locations set last_meter=coalesce(last_verified_meter,floor(10000+random()*40000)),simulated_meter=true,updated_at=now() where last_meter is null;
update public.diesel_locations set last_verified_meter=last_meter where simulated_meter;
update public.diesel_locations set simulated_meter=true where is_test;
alter function public.diesel_operation_submit(jsonb) rename to operation_submit_before_trial_meters;
alter function public.operation_submit_before_trial_meters(jsonb) set schema private;
revoke all on function private.operation_submit_before_trial_meters(jsonb) from public,anon,authenticated;
create function public.diesel_operation_submit(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare loc public.diesel_locations;result jsonb;reading numeric;
begin
 if private.member() is null then return jsonb_build_object('error','Conta sem autorização.','status',403);end if;
 if payload->>'kind'='refuel' and payload->>'mode'='manual' then
  perform pg_advisory_xact_lock(hashtextextended((payload->>'id')::uuid::text,0));
  -- Simulated counters can advance by the typed liters during field trials.
  -- Physical/verified counters still require their actual final reading.
  select * into loc from public.diesel_locations where local_code=payload->>'localCode' and material_code=payload->>'materialCode' for update;
  if loc.simulated_meter and loc.last_meter is not null then
   payload:=payload||jsonb_build_object('mode','recorder','recorderStart',loc.last_meter,'recorderEnd',loc.last_meter+(payload->>'liters')::numeric);
  end if;
 end if;
 result:=private.operation_submit_before_trial_meters(payload);
 if not result ? 'error' and loc.simulated_meter then
  select recorder_end into reading from public.records where id=(result->>'id')::uuid;
  result:=result||jsonb_build_object('recorderEnd',reading);
 end if;
 return result;
exception when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('error','Confira os valores informados.','status',422);
end $$;
alter function public.diesel_operations_admin(jsonb) rename to operations_admin_before_trial_meters;
alter function public.operations_admin_before_trial_meters(jsonb) set schema private;
revoke all on function private.operations_admin_before_trial_meters(jsonb) from public,anon,authenticated;
create function public.diesel_operations_admin(payload jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.operations_admin_before_trial_meters(payload);
 if result ? 'error' then return result;end if;
 if payload->>'action'='location' then
  update public.diesel_locations set simulated_meter=false where local_code=payload->>'localCode' and material_code=payload->>'materialCode';
  result:=private.operations_admin_before_trial_meters(null);
 end if;
 return result;
end $$;
revoke all on function public.diesel_operation_submit(jsonb),public.diesel_operations_admin(jsonb) from public,anon,authenticated;
grant execute on function public.diesel_operation_submit(jsonb),public.diesel_operations_admin(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
