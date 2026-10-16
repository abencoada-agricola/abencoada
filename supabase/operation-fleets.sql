-- Apply once after member-removal.sql. Older app payloads remain valid.
begin;
alter table public.diesel_operations add column fleet text references public.fleets(id);
alter function public.diesel_operation_submit(jsonb) rename to operation_submit_before_fleet_link;
alter function public.operation_submit_before_fleet_link(jsonb) set schema private;
revoke all on function private.operation_submit_before_fleet_link(jsonb) from public,anon,authenticated;
create function public.diesel_operation_submit(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;code text:=nullif(upper(trim(payload->>'fleet')),'');rid uuid;
begin
 if payload->>'kind' not in ('occurrence','transfer') or payload->>'kind' is null then return private.operation_submit_before_fleet_link(payload);end if;
 if private.member() is null then return jsonb_build_object('error','Conta sem autorização.','status',403);end if;
 if payload->>'kind'='transfer' and not private.feature_allowed('transfer') then return private.operation_submit_before_fleet_link(payload);end if;
 rid:=(payload->>'id')::uuid;
 -- Retries preserve the originally accepted association and existing ownership checks.
 if exists(select 1 from public.diesel_operations where id=rid) then return private.operation_submit_before_fleet_link(payload);end if;
 if code is not null and (jsonb_typeof(payload->'fleet')<>'string' or not exists(select 1 from public.fleets where id=code)) then return jsonb_build_object('error','Frota não encontrada. Confira o código ou deixe o campo vazio.','status',422);end if;
 result:=private.operation_submit_before_fleet_link(payload);
 if not result ? 'error' and not coalesce((result->>'duplicate')::boolean,false) then
  update public.diesel_operations set fleet=code where id=(result->>'id')::uuid and user_id=auth.uid();
 end if;
 return result;
exception when invalid_text_representation then return jsonb_build_object('error','Identificador inválido.','status',422);
end $$;
revoke all on function public.diesel_operation_submit(jsonb) from public,anon,authenticated;
grant execute on function public.diesel_operation_submit(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
