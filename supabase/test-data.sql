-- Apply after occurrence-photos.sql. Seeds can be rerun without resetting readings.
begin;
alter table public.fleets add column if not exists is_test boolean not null default false;
alter table public.diesel_locations add column if not exists is_test boolean not null default false;
alter table public.records add column if not exists is_test boolean not null default false;
alter table public.diesel_operations add column if not exists is_test boolean not null default false;
-- Refuse to reuse any reserved code already owned by the real catalog.
do $$begin
 if exists(select 1 from public.fleets where id in ('990101','990102','990103','990104') and not is_test)
 or exists(select 1 from public.diesel_locations where local_code in ('990001','990002') and not is_test)
 or exists(select 1 from public.diesel_materials where material_code='990010' and material_name<>'TESTE - DIESEL S10') then
  raise exception 'Código de teste já utilizado. Nenhum dado foi alterado.';
 end if;
end $$;
insert into public.diesel_materials(material_code,material_name) values('990010','TESTE - DIESEL S10') on conflict do nothing;
insert into public.diesel_locations(local_code,material_code,name,material_name,last_meter,last_verified_meter,is_test) values
 ('990001','990010','TESTE - REGISTRADORA A','TESTE - DIESEL S10',10000,10000,true),
 ('990002','990010','TESTE - REGISTRADORA B','TESTE - DIESEL S10',20000,20000,true)
on conflict do nothing;
insert into public.fleets(id,name,type,model,tank_capacity,meter_fields,gmais_readings,is_test) values
 ('990101','TESTE - CAMIONETE','Outro','VEÍCULO FICTÍCIO',70,'{"km":true,"engine":false,"elevator":false}',jsonb_build_object('km',45000,'engine',0,'elevator',0,'source','TESTE','recordedAt',now()),true),
 ('990102','TESTE - CAMINHÃO','Caminhão','VEÍCULO FICTÍCIO',900,'{"km":true,"engine":true,"elevator":false}',jsonb_build_object('km',180000,'engine',8500,'elevator',0,'source','TESTE','recordedAt',now()),true),
 ('990103','TESTE - TRATOR','Trator','MÁQUINA FICTÍCIA',300,'{"km":false,"engine":true,"elevator":false}',jsonb_build_object('km',0,'engine',3200,'elevator',0,'source','TESTE','recordedAt',now()),true),
 ('990104','TESTE - COLHEDORA','Colhedora','MÁQUINA FICTÍCIA',600,'{"km":false,"engine":true,"elevator":true}',jsonb_build_object('km',0,'engine',5600,'elevator',4200,'source','TESTE','recordedAt',now()),true)
on conflict do nothing;
-- Stamp all entry paths on the server; a client cannot hide a test entry.
create or replace function private.mark_test_record() returns trigger language plpgsql security definer set search_path='' as $$
declare local_test boolean;
begin
 select f.is_test into new.is_test from public.fleets f where f.id=new.fleet;
 new.is_test:=coalesce(new.is_test,false);
 if new.local_code is not null then
  select l.is_test into local_test from public.diesel_locations l where l.local_code=new.local_code and l.material_code=new.material_code;
  if new.is_test<>coalesce(local_test,false) then raise exception 'Use frota e local de teste juntos, ou frota e local reais juntos.' using errcode='23514';end if;
 end if;
 return new;
end $$;
create or replace function private.mark_test_operation() returns trigger language plpgsql security definer set search_path='' as $$
declare destination_test boolean;
begin
 select l.is_test into new.is_test from public.diesel_locations l where l.local_code=new.local_code and l.material_code=new.material_code;
 new.is_test:=coalesce(new.is_test,false);
 if new.kind='transfer' then
  select l.is_test into destination_test from public.diesel_locations l where l.local_code=new.destination and l.material_code=new.material_code;
  if new.is_test<>coalesce(destination_test,false) then raise exception 'Transfira entre locais de teste ou entre locais reais.' using errcode='23514';end if;
 end if;
 return new;
end $$;
revoke all on function private.mark_test_record(),private.mark_test_operation() from public,anon,authenticated;
do $$begin
 if not exists(select 1 from pg_trigger where tgname='diesel_mark_test_record' and tgrelid='public.records'::regclass) then
  create trigger diesel_mark_test_record before insert or update on public.records for each row execute function private.mark_test_record();
 end if;
 if not exists(select 1 from pg_trigger where tgname='diesel_mark_test_operation' and tgrelid='public.diesel_operations'::regclass) then
  create trigger diesel_mark_test_operation before insert or update on public.diesel_operations for each row execute function private.mark_test_operation();
 end if;
end $$;
notify pgrst, 'reload schema';
commit;
