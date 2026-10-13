-- Apply after fuel-control.sql. Preserve physical references after manual refuelings.
begin;
alter table public.diesel_locations add column last_verified_meter numeric check(last_verified_meter between 0 and 1e9);
update public.diesel_locations set last_verified_meter=last_meter where last_meter is not null;
create function private.preserve_verified_meter() returns trigger language plpgsql set search_path='' as $$
begin
 if new.last_meter is not null then new.last_verified_meter:=new.last_meter;end if;
 return new;
end $$;
revoke all on function private.preserve_verified_meter() from public,anon,authenticated;
create trigger diesel_verified_meter before insert or update of last_meter on public.diesel_locations for each row execute function private.preserve_verified_meter();
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
   if not found or coalesce(loc.last_meter,loc.last_verified_meter) is null or start_value<>coalesce(loc.last_meter,loc.last_verified_meter) then return jsonb_build_object('error','A leitura do local atual mudou ou está indisponível. Confira a registradora.','status',409,'recorder',coalesce(loc.last_meter,loc.last_verified_meter));end if;
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

notify pgrst, 'reload schema';
commit;
