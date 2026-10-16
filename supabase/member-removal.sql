-- Apply once after user-access.sql. Archive access; retain identities and operation history.
begin;
create table private.removed_members(email text primary key,member_data jsonb not null,removed_at timestamptz not null default now(),removed_by uuid not null,removed_by_name text not null);
alter table private.removed_members enable row level security;
revoke all on private.removed_members from public,anon,authenticated;

alter function private.admin_data() rename to admin_data_before_member_removal;
create function private.admin_data() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.admin_data_before_member_removal();if result ? 'error' then return result;end if;
 return result||jsonb_build_object('removedMembers',(select coalesce(jsonb_agg(jsonb_build_object('email',r.email,'name',r.member_data->>'name','username',r.member_data->>'username','removedAt',r.removed_at) order by r.removed_at desc),'[]'::jsonb) from private.removed_members r));
end $$;
revoke all on function private.admin_data(),private.admin_data_before_member_removal() from public,anon,authenticated;
grant execute on function private.admin_data() to authenticated;

alter function private.admin_save(jsonb) rename to admin_save_before_member_removal;
create function private.admin_save(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;target public.members;snapshot jsonb;target_email text:=lower(trim(payload->>'email'));action text:=payload->>'action';
begin
 -- Lock before checking the actor: concurrent removals cannot invalidate this authorization.
 lock table public.members in share row exclusive mode;
 m:=private.member();if m.role is distinct from 'admin' then return jsonb_build_object('error','Acesso restrito ao administrador.','status',403);end if;
 if action='member' and exists(select 1 from private.removed_members where email=target_email) then return jsonb_build_object('error','Usuário removido. Use RESTAURAR na lista de usuários removidos.','status',409);end if;
 if action not in ('member-remove','member-restore') or action is null then return private.admin_save_before_member_removal(payload);end if;
 if target_email=m.email then return jsonb_build_object('error','Você não pode remover sua própria conta.','status',422);end if;
 if action='member-remove' then
  select * into target from public.members where email=target_email;
  if target.email is null then return jsonb_build_object('error','Usuário não encontrado.','status',404);end if;
  snapshot:=to_jsonb(target);
  insert into private.removed_members(email,member_data,removed_by,removed_by_name) values(target_email,snapshot,auth.uid(),m.name);
  delete from private.diesel_devices where email=target_email;
  delete from public.members where email=target_email;
  insert into private.user_access_audit(email,previous_access,new_access,actor_id,actor_name) values(target_email,snapshot,jsonb_build_object('removed',true),auth.uid(),m.name);
 else
  select member_data into snapshot from private.removed_members where email=target_email;
  if snapshot is null then return jsonb_build_object('error','Usuário removido não encontrado.','status',404);end if;
  insert into public.members(email,name,role,username,permissions) values(target_email,snapshot->>'name',snapshot->>'role',snapshot->>'username',snapshot->'permissions');
  delete from private.removed_members where email=target_email;
  insert into private.user_access_audit(email,previous_access,new_access,actor_id,actor_name) values(target_email,jsonb_build_object('removed',true),snapshot,auth.uid(),m.name);
 end if;
 return jsonb_build_object('ok',true);
exception when unique_violation then return jsonb_build_object('error','E-mail ou usuário já está em uso. Confira o cadastro antes de restaurar.','status',409);
end $$;
revoke all on function private.admin_save(jsonb),private.admin_save_before_member_removal(jsonb) from public,anon,authenticated;
grant execute on function private.admin_save(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
