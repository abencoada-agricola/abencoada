-- Optional field trial data; apply after test-data.sql. Names and codes stay unchanged.
begin;
do $$
declare f record;baseline jsonb;simulated jsonb;k text;n integer:=0;current_value numeric;generated numeric;
begin
 for f in select catalog.*,coalesce(max(r.km),0) record_km,coalesce(max(r.engine),0) record_engine,coalesce(max(r.elevator),0) record_elevator from public.fleets catalog left join public.records r on r.fleet=catalog.id group by catalog.id order by catalog.id loop
  n:=n+1;
  baseline:=case when jsonb_typeof(f.gmais_readings)='object' then f.gmais_readings else '{}'::jsonb end;
  simulated:=case when jsonb_typeof(baseline->'simulatedFields')='array' then baseline->'simulatedFields' else '[]'::jsonb end;
  foreach k in array array['km','engine','elevator'] loop
   current_value:=greatest(coalesce((baseline->>k)::numeric,0),case k when 'km' then f.record_km when 'engine' then f.record_engine else f.record_elevator end);
   if current_value=0 then
    generated:=case k when 'km' then 25000+n*1200 when 'engine' then 1000+n*35 else 600+n*20 end;
    baseline:=baseline||jsonb_build_object(k,generated);
    if not simulated ? k then simulated:=simulated||jsonb_build_array(k);end if;
   end if;
  end loop;
  if simulated<>'[]'::jsonb then
   baseline:=baseline||jsonb_build_object('simulatedFields',simulated,'simulatedAt',coalesce(baseline->>'simulatedAt',now()::text));
   update public.fleets set gmais_readings=baseline where id=f.id and gmais_readings is distinct from baseline;
  end if;
 end loop;
end $$;
-- Any catalog fleet can be tried at a test dispenser without renaming it.
-- The source local marks the resulting entry as a test on the server.
create or replace function private.mark_test_record() returns trigger language plpgsql security definer set search_path='' as $$
declare fleet_test boolean;local_test boolean;
begin
 select f.is_test into fleet_test from public.fleets f where f.id=new.fleet;
 new.is_test:=coalesce(fleet_test,false);
 if new.local_code is not null then
  select l.is_test into local_test from public.diesel_locations l where l.local_code=new.local_code and l.material_code=new.material_code;
  if coalesce(fleet_test,false) and not coalesce(local_test,false) then raise exception 'Use um local de teste para esta frota.' using errcode='23514';end if;
  new.is_test:=new.is_test or coalesce(local_test,false);
 end if;
 return new;
end $$;
revoke all on function private.mark_test_record() from public,anon,authenticated;
notify pgrst, 'reload schema';
commit;
