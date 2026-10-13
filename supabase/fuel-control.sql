-- Apply once, after gmais-readings.sql. Compatible with existing APK queues.
begin;
alter table public.fleets add column model text not null default '' check(length(model)<=120);
alter table public.fleets add column tank_capacity numeric check(tank_capacity>0 and tank_capacity<=100000);
alter table public.records add column tank_capacity_at_record numeric;
alter table public.records add column capacity_warning_confirmed boolean not null default false;
alter table public.diesel_operations add column recorder_start numeric;
alter table public.diesel_operations add column recorder_end numeric;
alter table public.diesel_operations add column recorder_liters numeric;
alter table public.diesel_operations add constraint operation_recorder_readings check(
 (recorder_start is null and recorder_end is null and recorder_liters is null) or
 (kind='transfer' and recorder_start>=0 and recorder_end>=recorder_start and recorder_end<=1e9 and recorder_liters=recorder_end-recorder_start));

create function private.capacity_check(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare cap numeric;liters numeric;
begin
 if jsonb_typeof(payload->'liters') is distinct from 'number' then return null;end if;
 liters:=(payload->>'liters')::numeric;
 select tank_capacity into cap from public.fleets where id=upper(payload->>'fleet');
 if cap is null or liters<=cap then return null;end if;
 if payload->'capacityConfirmed'='true'::jsonb and payload->'capacityAtConfirmation'=to_jsonb(cap) and payload->'confirmedLiters'=to_jsonb(liters) then return null;end if;
 return jsonb_build_object('error','Os litros ultrapassam a capacidade cadastrada da frota. Confira e confirme o valor.','status',422,'capacityWarning',true,'tankCapacity',cap);
end $$;
revoke all on function private.capacity_check(jsonb) from public,anon,authenticated;

alter function private.admin_save(jsonb) rename to admin_save_before_fleet_details;
create function private.admin_save(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;cap numeric;
begin
 m:=private.member();if m.role is distinct from 'admin' then return jsonb_build_object('error','Acesso restrito ao gestor.','status',403);end if;
 if payload->>'action'<>'fleet-edit' then return private.admin_save_before_fleet_details(payload);end if;
 if coalesce(length(trim(payload->>'name')),0) not between 2 and 80 or coalesce(payload->>'type','') not in ('Trator','Colhedora','Caminhão','Outro') or jsonb_typeof(payload->'active') is distinct from 'boolean' or coalesce(length(payload->>'model'),0)>120 then return jsonb_build_object('error','Confira nome, modelo, tipo e situação da frota.','status',422);end if;
 if payload->'tankCapacity' is not null and payload->'tankCapacity'<>'null'::jsonb then
  if jsonb_typeof(payload->'tankCapacity') is distinct from 'number' then return jsonb_build_object('error','Informe a capacidade em litros.','status',422);end if;
  cap:=(payload->>'tankCapacity')::numeric;
  if cap<=0 or cap>100000 then return jsonb_build_object('error','A capacidade deve ser maior que zero e no máximo 100.000 litros.','status',422);end if;
 end if;
 update public.fleets set name=trim(payload->>'name'),type=payload->>'type',model=trim(coalesce(payload->>'model','')),tank_capacity=cap,active=(payload->>'active')::boolean where id=upper(payload->>'id');
 if not found then return jsonb_build_object('error','Frota não encontrada.','status',404);end if;
 return jsonb_build_object('ok',true);
exception when invalid_text_representation or numeric_value_out_of_range or check_violation then return jsonb_build_object('error','Dados da frota inválidos.','status',422);
end $$;
revoke all on function private.admin_save(jsonb),private.admin_save_before_fleet_details(jsonb) from public,anon,authenticated;
grant execute on function private.admin_save(jsonb) to authenticated;

alter function public.diesel_mobile_submit(jsonb) rename to diesel_mobile_submit_before_capacity;
create function public.diesel_mobile_submit(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;warning jsonb;existed boolean;cap numeric;
begin
 existed:=exists(select 1 from public.records where id=(payload->>'id')::uuid);
 if not existed then
  select tank_capacity into cap from public.fleets where id=upper(payload->>'fleet') for update;
  warning:=private.capacity_check(payload);if warning is not null then return warning;end if;
 end if;
 result:=public.diesel_mobile_submit_before_capacity(payload);
 if not (result ? 'error') and not existed then
  select tank_capacity into cap from public.fleets where id=upper(payload->>'fleet');
  update public.records set tank_capacity_at_record=cap,capacity_warning_confirmed=coalesce((payload->>'liters')::numeric>cap,false) where id=(payload->>'id')::uuid;
 end if;
 return result;
exception when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('error','Dados inválidos. Confira o preenchimento.','status',422);
end $$;
revoke all on function public.diesel_mobile_submit(jsonb),public.diesel_mobile_submit_before_capacity(jsonb) from public,anon,authenticated;
grant execute on function public.diesel_mobile_submit(jsonb) to authenticated;

alter function private.submit_record(jsonb,text,uuid,text,uuid) rename to submit_record_before_capacity;
create function private.submit_record(payload jsonb,operator_name text,account_id uuid,source_name text,receipt_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;warning jsonb;existed boolean;cap numeric;
begin
 existed:=exists(select 1 from public.records where id=(payload->>'id')::uuid);
 if not existed then
  select tank_capacity into cap from public.fleets where id=upper(payload->>'fleet') for update;
  warning:=private.capacity_check(payload);if warning is not null then return warning;end if;
 end if;
 result:=private.submit_record_before_capacity(payload,operator_name,account_id,source_name,receipt_key);
 if not (result ? 'error') and not existed then
  select tank_capacity into cap from public.fleets where id=upper(payload->>'fleet');
  update public.records set tank_capacity_at_record=cap,capacity_warning_confirmed=coalesce((payload->>'liters')::numeric>cap,false) where id=(payload->>'id')::uuid;
 end if;
 return result;
exception when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('error','Dados inválidos. Confira o preenchimento.','status',422);
end $$;
revoke all on function private.submit_record(jsonb,text,uuid,text,uuid),private.submit_record_before_capacity(jsonb,text,uuid,text,uuid) from public,anon,authenticated;
create or replace function public.diesel_operation_submit(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;r jsonb;previous public.records;existing public.diesel_operations;loc public.diesel_locations;lid text;mat text;start_value numeric;end_value numeric;kind text;rid uuid;transfer_liters numeric;
begin
 m:=private.member();if m.email is null then return jsonb_build_object('error','Conta sem autorização.','status',403);end if;
 rid:=(payload->>'id')::uuid;kind:=payload->>'kind';lid:=payload->>'localCode';mat:=payload->>'materialCode';
 if lid is null or lid !~ '^[0-9]{1,30}$' or mat is null or mat !~ '^[0-9]{1,30}$' then return jsonb_build_object('error','Informe códigos numéricos de local e material.','status',422);end if;
 if (payload->>'createdAt')::timestamptz is null or (payload->>'createdAt')::timestamptz>now()+interval '5 minutes' then return jsonb_build_object('error','Confira a data e hora do aparelho.','status',422);end if;
 -- Serialize both local-meter and UUID writes, including retries from the background worker.
 perform pg_advisory_xact_lock(hashtextextended(rid::text,0));
 if kind='refuel' then
  select * into previous from public.records where id=rid;
  if found then if previous.user_id=auth.uid() and previous.fleet=upper(payload->>'fleet') then return jsonb_build_object('id',rid,'duplicate',true);else return jsonb_build_object('error','Identificador já utilizado.','status',409);end if;end if;
  if exists(select 1 from public.diesel_operations where id=rid) then return jsonb_build_object('error','Identificador já utilizado.','status',409);end if;
  insert into public.diesel_locations(local_code,material_code) values(lid,mat) on conflict do nothing;
  select * into loc from public.diesel_locations where local_code=lid and material_code=mat for update;
  if payload->>'mode'='recorder' then
   if jsonb_typeof(payload->'recorderStart') is distinct from 'number' or jsonb_typeof(payload->'recorderEnd') is distinct from 'number' then return jsonb_build_object('error','Informe a leitura da registradora.','status',422);end if;
   start_value:=(payload->>'recorderStart')::numeric;end_value:=(payload->>'recorderEnd')::numeric;
   if loc.last_meter is null or start_value<>loc.last_meter then return jsonb_build_object('error','A registradora foi atualizada ou precisa de leitura inicial. Confira com o gestor.','status',409,'recorder',loc.last_meter);end if;
   if end_value<=start_value or end_value>1e9 or abs(end_value-start_value-(payload->>'liters')::numeric)>0.02 then return jsonb_build_object('error','Confira o final da registradora e os litros calculados.','status',422);end if;
  elsif payload->>'mode' is distinct from 'manual' then return jsonb_build_object('error','Modo de abastecimento inválido.','status',422);end if;
  r:=public.diesel_mobile_submit(payload);if r ? 'error' then return r;end if;
  update public.records set local_code=lid,material_code=mat,recorder_start=start_value,recorder_end=end_value where id=rid;
  -- Manual liters do not establish a physical meter reading. Require a verified baseline again.
  update public.diesel_locations set last_meter=end_value,updated_at=now() where local_code=lid and material_code=mat;
  return r;
 elsif kind in ('transfer','occurrence') then
  if exists(select 1 from public.records where id=rid) then return jsonb_build_object('error','Identificador já utilizado.','status',409);end if;
  select * into existing from public.diesel_operations where id=rid;
  if found then if existing.user_id=auth.uid() and existing.kind=kind then return jsonb_build_object('id',rid,'duplicate',true);else return jsonb_build_object('error','Identificador já utilizado.','status',409);end if;end if;
  if kind='transfer' and (coalesce(payload->>'destination','') !~ '^[0-9]{1,30}$' or payload->>'destination'=lid) then return jsonb_build_object('error','Informe um novo local válido.','status',422);end if;
  if kind='occurrence' and coalesce(length(trim(payload->>'notes')),0) not between 3 and 2000 then return jsonb_build_object('error','Descreva a ocorrência com 3 a 2000 caracteres.','status',422);end if;
  -- Version 2 closes the source meter. Old APK entries remain legacy events.
  if kind='transfer' and payload ? 'transferVersion' then
   if payload->'transferVersion'<>'2'::jsonb or jsonb_typeof(payload->'recorderStart') is distinct from 'number' or jsonb_typeof(payload->'recorderEnd') is distinct from 'number' then return jsonb_build_object('error','Confira as leituras da transferência.','status',422);end if;
   start_value:=(payload->>'recorderStart')::numeric;end_value:=(payload->>'recorderEnd')::numeric;
   select * into loc from public.diesel_locations where local_code=lid and material_code=mat for update;
   if not found or loc.last_meter is null or start_value<>loc.last_meter then return jsonb_build_object('error','A leitura do local atual mudou ou está indisponível. Confira a registradora.','status',409,'recorder',loc.last_meter);end if;
   if start_value<0 or end_value<start_value or end_value>1e9 then return jsonb_build_object('error','O final da registradora não pode ser menor que a leitura anterior.','status',422);end if;
   transfer_liters:=end_value-start_value;
  end if;
  insert into public.diesel_operations(id,user_id,operator,kind,local_code,material_code,destination,notes,created_at,recorder_start,recorder_end,recorder_liters) values(rid,auth.uid(),m.name,kind,lid,mat,case when kind='transfer' then payload->>'destination' end,case when kind='occurrence' then trim(payload->>'notes') end,(payload->>'createdAt')::timestamptz,start_value,end_value,transfer_liters);
  if kind='transfer' and payload ? 'transferVersion' then update public.diesel_locations set last_meter=end_value,updated_at=now() where local_code=lid and material_code=mat;end if;
  return jsonb_build_object('id',rid,'receivedAt',now());
 end if;
 return jsonb_build_object('error','Operação inválida.','status',422);
exception when invalid_text_representation or datetime_field_overflow or not_null_violation or numeric_value_out_of_range or check_violation then return jsonb_build_object('error','Dados inválidos. Confira o preenchimento.','status',422);
end $$;

create or replace function public.diesel_admin_save(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.admin_save(payload)$$;
create or replace function private.submit(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;
begin
 m:=private.member();if m.email is null then return jsonb_build_object('error','Conta sem autorização. Consulte o gestor.','status',403);end if;
 return private.submit_record(payload,m.name,auth.uid(),'account',null);
end $$;
notify pgrst, 'reload schema';
commit;
