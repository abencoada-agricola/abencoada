-- One-time test-data reset approved for 2026-10-19.
-- Requires a verified private backup. Not a schema migration; never run automatically.
begin;
lock table public.fleets,public.records,public.diesel_operations,public.diesel_checklists,public.diesel_checklist_templates,public.diesel_locations,public.diesel_materials,private.diesel_occurrence_photos in access exclusive mode;
do $$
declare keep_ids text[]:=array['22','509','511','551','707','802','85','600','1001','1003'];author uuid;
begin
 -- Abort if the database has changed since the backed-up inventory, or if already reset.
 if (select count(*) from public.fleets)<>250 or (select count(*) from public.records)<>15 or (select count(*) from public.diesel_operations)<>7 or (select count(*) from public.diesel_checklists)<>4 or (select count(*) from private.diesel_occurrence_photos)<>2 or (select count(*) from public.diesel_checklist_templates)<>7 or (select count(*) from public.diesel_locations)<>31 or (select count(*) from public.diesel_materials)<>12 then raise exception 'Inventory changed. Take a new backup and review the reset before continuing.';end if;
 if (select count(*) from public.fleets where id=any(keep_ids))<>10 then raise exception 'A selected fleet is missing.';end if;
 if (select count(*) from public.diesel_locations where local_code in ('2','12') and material_code='9')<>2 then raise exception 'Required test locations are missing.';end if;
 select u.id into author from auth.users u join public.members m on m.email=lower(u.email) where m.role='admin' order by m.email limit 1;
 if author is null then raise exception 'An existing administrator is required.';end if;
 delete from private.diesel_occurrence_photos;
 delete from public.diesel_checklists;
 delete from public.records;
 delete from public.diesel_operations;
 delete from public.diesel_checklist_templates where fleet<>all(keep_ids);
 delete from public.fleets where id<>all(keep_ids);
 delete from public.diesel_locations where material_code<>'9' or local_code not in ('2','12');
 delete from public.diesel_materials where material_code<>'9';
 update public.diesel_locations set last_meter=case local_code when '2' then 10000 else 20000 end,simulated_meter=true,is_test=true,updated_at=now();
 update public.fleets f set active=true,is_test=true,
  gmais_readings=jsonb_build_object('source','TEST_RESET','recordedAt','2026-10-19','km',case when meter_fields->'km'='true'::jsonb then 50000+array_position(keep_ids,id)*1000 else 0 end,'engine',case when meter_fields->'engine'='true'::jsonb then 2000+array_position(keep_ids,id)*100 else 0 end,'elevator',case when meter_fields->'elevator'='true'::jsonb then 1000+array_position(keep_ids,id)*50 else 0 end,'simulatedFields',array['km','engine','elevator']),
  tank_reference=case when tank_capacity is not null then tank_reference else jsonb_build_object('source','TEST_RESET','note','CAPACIDADE FICTÍCIA PARA TESTE') end,
  tank_capacity=coalesce(tank_capacity,case id when '22' then 80 when '511' then 48 when '551' then 275 when '707' then 500 when '802' then 300 when '85' then 80 when '1001' then 480 end);
 insert into public.diesel_checklist_templates(fleet,version,questions,created_by)
 select f.id,1,case when f.type in ('Trator','Colhedora') then '[{"id":"10000000-0000-4000-8000-000000000001","text":"CONDIÇÃO DOS PNEUS OU ESTEIRAS"},{"id":"10000000-0000-4000-8000-000000000002","text":"NÍVEL DE ÓLEO E VAZAMENTOS"},{"id":"10000000-0000-4000-8000-000000000003","text":"DISPOSITIVOS DE SEGURANÇA"}]'::jsonb else '[{"id":"10000000-0000-4000-8000-000000000001","text":"CONDIÇÃO DOS PNEUS"},{"id":"10000000-0000-4000-8000-000000000002","text":"FUNCIONAMENTO DOS FREIOS"},{"id":"10000000-0000-4000-8000-000000000003","text":"LUZES E SINALIZAÇÃO"}]'::jsonb end,author
 from public.fleets f where not exists(select 1 from public.diesel_checklist_templates t where t.fleet=f.id);
 if (select count(*) from public.fleets)<>10 then raise exception 'Unexpected final fleet count.';end if;
end $$;
commit;
select (select count(*) from public.fleets) fleets,(select count(*) from public.records) refuelings,(select count(*) from public.diesel_operations) operations,(select count(*) from public.diesel_checklists) completed_checklists,(select count(*) from public.members) members,(select count(*) from public.diesel_locations) locations,(select count(*) from public.diesel_materials) materials;
