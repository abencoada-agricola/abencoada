-- Apply after simulated-readings.sql. Existing history is preserved.
begin;
create or replace function private.enforce_vehicle_meters() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.type not in ('Trator','Colhedora') then
  new.meter_fields:=jsonb_set(coalesce(new.meter_fields,'{"km":true,"engine":false,"elevator":false}'::jsonb),'{elevator}','false');
  if not coalesce((new.meter_fields->>'km')::boolean,false) and not coalesce((new.meter_fields->>'engine')::boolean,false) then new.meter_fields:=jsonb_set(new.meter_fields,'{km}','true');end if;
 end if;
 return new;
end $$;
revoke all on function private.enforce_vehicle_meters() from public,anon,authenticated;
create trigger diesel_vehicle_meters before insert or update of type,meter_fields on public.fleets for each row execute function private.enforce_vehicle_meters();
update public.fleets set meter_fields=meter_fields where type not in ('Trator','Colhedora');
alter table public.fleets add constraint diesel_vehicle_no_elevator check(type in ('Trator','Colhedora') or meter_fields->'elevator'='false'::jsonb);
notify pgrst, 'reload schema';
commit;
