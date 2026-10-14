-- Apply after android-only.sql. Exclusion is recoverable and manager-only.
begin;
alter table public.records add column removed_at timestamptz;
alter table public.records add column removed_by uuid;
alter table public.records add column removed_by_name text;
alter table public.records add column removal_reason text;
alter table public.diesel_operations add column removed_at timestamptz;
alter table public.diesel_operations add column removed_by uuid;
alter table public.diesel_operations add column removed_by_name text;
alter table public.diesel_operations add column removal_reason text;
create table private.record_control_audit(id bigint generated always as identity primary key,record_id uuid not null,kind text not null,action text not null,reason text,actor_id uuid not null,actor_name text not null,created_at timestamptz not null default now());
alter table private.record_control_audit enable row level security;
revoke all on private.record_control_audit from public,anon,authenticated;

-- Preserve the installed validation functions, excluding removed readings from their baselines.
do $$
declare signature text;definition text;updated text;
begin
 foreach signature in array array['private.session_data_before_operations()','public.diesel_field_session()','public.diesel_mobile_submit_before_capacity(jsonb)','private.submit_record_before_capacity(jsonb,text,uuid,text,uuid)'] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  updated:=replace(definition,'left join public.records r on r.fleet=f.id','left join public.records r on r.fleet=f.id and r.removed_at is null');
  updated:=replace(updated,'from public.records where fleet=r.fleet','from public.records where removed_at is null and fleet=r.fleet');
  if updated=definition then raise exception 'Reading filter missing in %',signature;end if;
  execute updated;
 end loop;
 definition:=pg_get_functiondef('private.operations_admin_before_trial_meters(jsonb)'::regprocedure);
 updated:=replace(definition,'select * from public.diesel_operations order by received_at desc limit 1000','select * from public.diesel_operations where removed_at is null order by received_at desc limit 1000');
 if updated=definition then raise exception 'Operation filter missing';end if;
 execute updated;
end $$;
create or replace function private.read_records(record_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;rs jsonb;
begin
 m:=private.member();if m.email is null then return jsonb_build_object('error','Acesso não autorizado.','status',403);end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.received_at desc),'[]'::jsonb) into rs from public.records r where r.removed_at is null and (m.role='admin' or r.user_id=auth.uid()) and (record_id is null or r.id::text=record_id);
 if record_id is not null then if jsonb_array_length(rs)=0 then return jsonb_build_object('error','Registro não encontrado.','status',404);end if;return rs->0;end if;
 return jsonb_build_object('records',rs);
end $$;
-- Capacity remains recorded for review; exceeding it never prevents sending.
create or replace function private.capacity_check(payload jsonb) returns jsonb language sql immutable set search_path='' as $$select null::jsonb$$;
create function public.diesel_record_controls(payload jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;rid uuid;record_kind text;operation text;reason text;changed integer;rs jsonb;fleet_id text;
begin
 m:=private.member();if m.role is distinct from 'admin' then return jsonb_build_object('error','Acesso restrito ao gestor.','status',403);end if;
 if payload is not null and payload<>'null'::jsonb then
  rid:=(payload->>'id')::uuid;record_kind:=payload->>'kind';operation:=payload->>'action';reason:=trim(payload->>'reason');
  if rid is null or record_kind is null or record_kind not in ('refuel','transfer','occurrence') or operation is null or operation not in ('remove','restore') then return jsonb_build_object('error','Operação inválida.','status',422);end if;
  if operation='remove' and coalesce(length(reason),0) not between 3 and 500 then return jsonb_build_object('error','Informe o motivo com 3 a 500 caracteres.','status',422);end if;
  if record_kind='refuel' then
   select fleet into fleet_id from public.records where id=rid;
   perform 1 from public.fleets where id=fleet_id for update;
   update public.records set removed_at=case when operation='remove' then now() end,removed_by=case when operation='remove' then auth.uid() end,removed_by_name=case when operation='remove' then m.name end,removal_reason=case when operation='remove' then reason end where id=rid and ((operation='remove' and removed_at is null) or (operation='restore' and removed_at is not null));
  else
   update public.diesel_operations set removed_at=case when operation='remove' then now() end,removed_by=case when operation='remove' then auth.uid() end,removed_by_name=case when operation='remove' then m.name end,removal_reason=case when operation='remove' then reason end where id=rid and public.diesel_operations.kind=record_kind and ((operation='remove' and removed_at is null) or (operation='restore' and removed_at is not null));
  end if;
  get diagnostics changed=row_count;
  if changed=0 then return jsonb_build_object('error','Registro não encontrado ou já alterado. Atualize a página.','status',409);end if;
  insert into private.record_control_audit(record_id,kind,action,reason,actor_id,actor_name) values(rid,record_kind,operation,reason,auth.uid(),m.name);
  return jsonb_build_object('ok',true);
 end if;
 select coalesce(jsonb_agg(r order by r->>'removed_at' desc),'[]'::jsonb) into rs from (
  select to_jsonb(r)||jsonb_build_object('kind','refuel') r from public.records r where removed_at is not null
  union all select to_jsonb(o) from public.diesel_operations o where removed_at is not null
 ) excluded;
 return jsonb_build_object('records',rs);
exception when invalid_text_representation then return jsonb_build_object('error','Identificador inválido.','status',422);
end $$;
revoke all on function public.diesel_record_controls(jsonb) from public,anon,authenticated;
grant execute on function public.diesel_record_controls(jsonb) to authenticated;
commit;
notify pgrst, 'reload schema';
