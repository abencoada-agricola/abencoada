-- Apply once after checklists.sql. Keep existing accounts and offline queues.
begin;
create function private.valid_feature_access(value jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(value)='object' and value-array['refuel','transfer','checklist']='{}'::jsonb and jsonb_typeof(value->'refuel')='boolean' and jsonb_typeof(value->'transfer')='boolean' and jsonb_typeof(value->'checklist')='boolean',false);
$$;
revoke all on function private.valid_feature_access(jsonb) from public,anon,authenticated;
alter table public.members add column permissions jsonb not null default '{"refuel":true,"transfer":true,"checklist":true}' check(private.valid_feature_access(permissions));
create table private.user_access_audit(id bigint generated always as identity primary key,email text not null,previous_access jsonb,new_access jsonb not null,actor_id uuid not null,actor_name text not null,created_at timestamptz not null default now());
alter table private.user_access_audit enable row level security;
revoke all on private.user_access_audit from public,anon,authenticated;

alter function private.session_data() rename to session_data_before_user_access;
create function private.session_data() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;m public.members;
begin
 result:=private.session_data_before_user_access();if result ? 'error' then return result;end if;
 m:=private.member();return jsonb_set(result,'{user,permissions}',m.permissions);
end $$;
revoke all on function private.session_data(),private.session_data_before_user_access() from public,anon,authenticated;
grant execute on function private.session_data() to authenticated;

alter function private.admin_save(jsonb) rename to admin_save_before_user_access;
create function private.admin_save(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;old public.members;updated public.members;result jsonb;target_email text;access jsonb;role_name text;
begin
 m:=private.member();if m.role is distinct from 'admin' then return jsonb_build_object('error','Acesso restrito ao administrador.','status',403);end if;
 if payload->>'action' not in ('member','member-access') then return private.admin_save_before_user_access(payload);end if;
 lock table public.members in share row exclusive mode;
 target_email:=lower(trim(payload->>'email'));select * into old from public.members where members.email=target_email;
 access:=case when payload ? 'permissions' then payload->'permissions' when old.email is not null then old.permissions else '{"refuel":true,"transfer":true,"checklist":true}'::jsonb end;
 if not private.valid_feature_access(access) then return jsonb_build_object('error','Permissões inválidas. Confira as funções liberadas.','status',422);end if;
 if payload->>'action'='member-access' then
  if old.email is null then return jsonb_build_object('error','Usuário não encontrado.','status',404);end if;
  role_name:=payload->>'role';if role_name is null or role_name not in ('admin','operator') then return jsonb_build_object('error','Perfil inválido.','status',422);end if;
  if target_email=m.email and role_name<>'admin' then return jsonb_build_object('error','Você não pode remover seu próprio acesso de administrador.','status',422);end if;
  update public.members set role=role_name,permissions=access where members.email=target_email returning * into updated;
 else
  result:=private.admin_save_before_user_access(payload);if result ? 'error' then return result;end if;
  update public.members set permissions=access where members.email=target_email returning * into updated;
 end if;
 insert into private.user_access_audit(email,previous_access,new_access,actor_id,actor_name) values(target_email,case when old.email is null then null else jsonb_build_object('role',old.role,'permissions',old.permissions) end,jsonb_build_object('role',updated.role,'permissions',updated.permissions),auth.uid(),m.name);
 return jsonb_build_object('ok',true);
end $$;
revoke all on function private.admin_save(jsonb),private.admin_save_before_user_access(jsonb) from public,anon,authenticated;
grant execute on function private.admin_save(jsonb) to authenticated;

create function private.feature_allowed(feature text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((private.member()).permissions->feature='true'::jsonb,false);
$$;
create function private.feature_denial(feature text) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('error','Seu usuário não tem acesso a '||case feature when 'refuel' then 'abastecimento' when 'transfer' then 'transferência' else 'checklist' end||'. Consulte o administrador.','status',403,'code','FEATURE_FORBIDDEN','feature',feature);
$$;
revoke all on function private.feature_allowed(text),private.feature_denial(text) from public,anon,authenticated;

alter function public.diesel_mobile_submit(jsonb) rename to mobile_submit_before_user_access;
alter function public.mobile_submit_before_user_access(jsonb) set schema private;
revoke all on function private.mobile_submit_before_user_access(jsonb) from public,anon,authenticated;
create function public.diesel_mobile_submit(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.feature_allowed('refuel') then
  if exists(select 1 from public.records where id=(payload->>'id')::uuid and user_id=auth.uid() and fleet=upper(payload->>'fleet')) then return jsonb_build_object('id',payload->>'id','duplicate',true);end if;
  return private.feature_denial('refuel');
 end if;
 return private.mobile_submit_before_user_access(payload);
exception when invalid_text_representation then return jsonb_build_object('error','Identificador inválido.','status',422);
end $$;
revoke all on function public.diesel_mobile_submit(jsonb) from public,anon,authenticated;
grant execute on function public.diesel_mobile_submit(jsonb) to authenticated;

alter function public.diesel_operation_submit(jsonb) rename to operation_submit_before_user_access;
alter function public.operation_submit_before_user_access(jsonb) set schema private;
revoke all on function private.operation_submit_before_user_access(jsonb) from public,anon,authenticated;
create function public.diesel_operation_submit(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare feature text:=payload->>'kind';rid uuid;
begin
 if feature in ('refuel','transfer','checklist') and not private.feature_allowed(feature) then
  rid:=(payload->>'id')::uuid;
  -- Acknowledge an already accepted record even after revocation; never create a new one.
  if feature='refuel' and exists(select 1 from public.records where id=rid and user_id=auth.uid() and fleet=upper(payload->>'fleet')) or feature='checklist' and exists(select 1 from public.diesel_checklists where id=rid and user_id=auth.uid() and fleet=upper(payload->>'fleet')) or feature='transfer' and exists(select 1 from public.diesel_operations where id=rid and user_id=auth.uid() and kind='transfer') then return jsonb_build_object('id',rid,'duplicate',true);end if;
  return private.feature_denial(feature);
 end if;
 return private.operation_submit_before_user_access(payload);
exception when invalid_text_representation then return jsonb_build_object('error','Identificador inválido.','status',422);
end $$;
revoke all on function public.diesel_operation_submit(jsonb) from public,anon,authenticated;
grant execute on function public.diesel_operation_submit(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
