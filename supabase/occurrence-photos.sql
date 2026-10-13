begin;
-- Photo bytes are kept out of operation lists and fetched only on request.
alter table public.diesel_operations add column has_photo boolean not null default false;
create table private.diesel_occurrence_photos(operation_id uuid primary key references public.diesel_operations(id),data_url text not null check(length(data_url)<=280000));
alter table private.diesel_occurrence_photos enable row level security;
revoke all on private.diesel_occurrence_photos from public,anon,authenticated;
alter function public.diesel_operation_submit(jsonb) rename to diesel_operation_submit_before_photos;
alter function public.diesel_operation_submit_before_photos(jsonb) set schema private;
revoke all on function private.diesel_operation_submit_before_photos(jsonb) from public,anon,authenticated;
create function public.diesel_operation_submit(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;photo text;bytes bytea;
begin
 if private.member() is null then return jsonb_build_object('error','Conta sem autorização.','status',403);end if;
 if payload ? 'photo' and payload->'photo'<>'null'::jsonb then
  photo:=payload->>'photo';
  if payload->>'kind' is distinct from 'occurrence' or jsonb_typeof(payload->'photo')<>'string' or length(photo)>280000 or photo !~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]*={0,2}$' then
   return jsonb_build_object('error','Foto inválida. Remova e adicione a imagem novamente.','status',422);
  end if;
  bytes:=decode(substr(photo,24),'base64');
  if octet_length(bytes)<5 or substring(bytes from 1 for 3)<>decode('ffd8ff','hex') or substring(bytes from octet_length(bytes)-1 for 2)<>decode('ffd9','hex') then
   return jsonb_build_object('error','Foto inválida. Remova e adicione a imagem novamente.','status',422);
  end if;
 end if;
 result:=private.diesel_operation_submit_before_photos(payload-'photo');
 if result ? 'error' then return result;end if;
 -- Retrying an accepted UUID never replaces its original attachment.
 if photo is not null and coalesce((result->>'duplicate')::boolean,false)=false then
  insert into private.diesel_occurrence_photos(operation_id,data_url) values((result->>'id')::uuid,photo);
  update public.diesel_operations set has_photo=true where id=(result->>'id')::uuid;
 end if;
 return result;
exception when invalid_parameter_value or invalid_text_representation then
 return jsonb_build_object('error','Foto ou dados inválidos. Confira o preenchimento.','status',422);
end $$;
create function public.diesel_occurrence_photo(operation_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m public.members;photo text;
begin
 m:=private.member();if m.role is distinct from 'admin' then return jsonb_build_object('error','Acesso restrito ao gestor.','status',403);end if;
 select p.data_url into photo from private.diesel_occurrence_photos p where p.operation_id=diesel_occurrence_photo.operation_id;
 if photo is null then return jsonb_build_object('error','Foto não encontrada.','status',404);end if;
 return jsonb_build_object('photo',photo);
end $$;
revoke all on function public.diesel_operation_submit(jsonb),public.diesel_occurrence_photo(uuid) from public,anon,authenticated;
grant execute on function public.diesel_operation_submit(jsonb),public.diesel_occurrence_photo(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
