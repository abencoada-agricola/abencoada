-- Apply once after operation-fleets.sql. Preserve legacy offline occurrences.
begin;
alter table public.diesel_operations alter column local_code drop not null;
alter table public.diesel_operations alter column material_code drop not null;
alter table public.diesel_operations add constraint diesel_operation_context_required check(
 kind='occurrence' or (local_code is not null and local_code ~ '^[0-9]{1,30}$' and material_code is not null and material_code ~ '^[0-9]{1,30}$')
);
alter function public.diesel_operation_submit(jsonb) rename to operation_submit_before_general_occurrences;
alter function public.operation_submit_before_general_occurrences(jsonb) set schema private;
revoke all on function private.operation_submit_before_general_occurrences(jsonb) from public,anon,authenticated;
create function public.diesel_operation_submit(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;rid uuid;existing public.diesel_operations;captured timestamptz;notes text;photo text;bytes bytea;local_code text;material_code text;fleet_code text;
begin
 if payload->>'kind' is distinct from 'occurrence' then return private.operation_submit_before_general_occurrences(payload);end if;
 m:=private.member();if m.email is null then return jsonb_build_object('error','Conta sem autorização.','status',403);end if;
 rid:=(payload->>'id')::uuid;
 if rid is null then return jsonb_build_object('error','Identificador inválido.','status',422);end if;
 perform pg_advisory_xact_lock(hashtextextended(rid::text,0));
 select * into existing from public.diesel_operations where id=rid;
 if found then
  if existing.user_id=auth.uid() and existing.kind='occurrence' then return jsonb_build_object('id',rid,'receivedAt',existing.received_at,'duplicate',true);end if;
  return jsonb_build_object('error','Identificador já utilizado.','status',409);
 end if;
 if exists(select 1 from public.records where id=rid) or exists(select 1 from public.diesel_checklists where id=rid) then return jsonb_build_object('error','Identificador já utilizado.','status',409);end if;
 captured:=(payload->>'createdAt')::timestamptz;
 if captured is null or captured>now()+interval '5 minutes' then return jsonb_build_object('error','Confira a data e hora do aparelho.','status',422);end if;
 if payload ? 'photo' and payload->'photo'<>'null'::jsonb then
  photo:=payload->>'photo';
  if jsonb_typeof(payload->'photo')<>'string' or length(photo)>280000 or photo !~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]*={0,2}$' then return jsonb_build_object('error','Foto inválida. Remova e adicione a imagem novamente.','status',422);end if;
  bytes:=decode(substr(photo,24),'base64');
  if octet_length(bytes)<5 or substring(bytes from 1 for 3)<>decode('ffd8ff','hex') or substring(bytes from octet_length(bytes)-1 for 2)<>decode('ffd9','hex') then return jsonb_build_object('error','Foto inválida. Remova e adicione a imagem novamente.','status',422);end if;
 end if;
 if payload ? 'notes' and payload->'notes'<>'null'::jsonb and jsonb_typeof(payload->'notes')<>'string' then return jsonb_build_object('error','Descreva a ocorrência.','status',422);end if;
 notes:=trim(coalesce(payload->>'notes',''));
 if notes='' and photo is not null then notes:='FOTO ANEXADA';end if;
 if length(notes) not between 3 and 2000 then return jsonb_build_object('error','Descreva a ocorrência com 3 a 2000 caracteres ou adicione uma foto.','status',422);end if;
 -- Older APKs can still send legitimate optional links; do not change old pending payloads.
 local_code:=nullif(trim(payload->>'localCode'),'');material_code:=nullif(trim(payload->>'materialCode'),'');fleet_code:=nullif(upper(trim(payload->>'fleet')),'');
 if (local_code is not null and local_code !~ '^[0-9]{1,30}$') or (material_code is not null and material_code !~ '^[0-9]{1,30}$') then return jsonb_build_object('error','Códigos da ocorrência inválidos.','status',422);end if;
 if fleet_code is not null and (jsonb_typeof(payload->'fleet')<>'string' or not exists(select 1 from public.fleets where id=fleet_code)) then return jsonb_build_object('error','Frota não encontrada. Confira o código ou deixe o campo vazio.','status',422);end if;
 insert into public.diesel_operations(id,user_id,operator,kind,local_code,material_code,fleet,notes,created_at,has_photo)
 values(rid,auth.uid(),m.name,'occurrence',local_code,material_code,fleet_code,notes,captured,photo is not null);
 if photo is not null then insert into private.diesel_occurrence_photos(operation_id,data_url) values(rid,photo);end if;
 return jsonb_build_object('id',rid,'receivedAt',now());
exception when invalid_parameter_value or invalid_text_representation or invalid_datetime_format or datetime_field_overflow or not_null_violation or check_violation then
 return jsonb_build_object('error','Ocorrência inválida. Confira os dados.','status',422);
end $$;
revoke all on function public.diesel_operation_submit(jsonb) from public,anon,authenticated;
grant execute on function public.diesel_operation_submit(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
