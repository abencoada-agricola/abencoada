-- Apply after tank-references.sql. Immutable question revisions preserve offline captures.
begin;
create table public.diesel_checklist_templates(fleet text not null references public.fleets(id),version integer not null check(version>0),questions jsonb not null,created_at timestamptz not null default now(),created_by uuid not null,primary key(fleet,version));
create table public.diesel_checklists(id uuid primary key,fleet text not null,template_version integer not null,user_id uuid not null,operator text not null,created_at timestamptz not null,received_at timestamptz not null default now(),answers jsonb not null,grade text not null check(grade in ('PERFEITO','ATENCAO','CRITICO')),resolutions jsonb not null default '{}',foreign key(fleet,template_version) references public.diesel_checklist_templates(fleet,version));
create index diesel_checklists_fleet_received on public.diesel_checklists(fleet,received_at desc);
alter table public.diesel_checklist_templates enable row level security;
alter table public.diesel_checklists enable row level security;
revoke all on public.diesel_checklist_templates,public.diesel_checklists from public,anon,authenticated;
create function private.checklist_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(t) order by t.fleet),'[]'::jsonb) from (select distinct on (fleet) fleet,version,questions from public.diesel_checklist_templates order by fleet,version desc)t;
$$;
revoke all on function private.checklist_catalog() from public,anon,authenticated;
alter function private.session_data() rename to session_data_before_checklists;
create function private.session_data() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result:=private.session_data_before_checklists();if result ? 'error' then return result;end if;
 return result||jsonb_build_object('checklistTemplates',private.checklist_catalog());
end $$;
revoke all on function private.session_data(),private.session_data_before_checklists() from public,anon,authenticated;
grant execute on function private.session_data() to authenticated;

create function private.submit_checklist(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;rid uuid;existing public.diesel_checklists;template public.diesel_checklist_templates;q jsonb;response jsonb;answers jsonb:='[]';grade text:='PERFEITO';captured timestamptz;status text;
begin
 m:=private.member();if m.email is null then return jsonb_build_object('error','Conta sem autorização.','status',403);end if;
 rid:=(payload->>'id')::uuid;captured:=(payload->>'createdAt')::timestamptz;
 if rid is null then return jsonb_build_object('error','Identificador inválido.','status',422);end if;
 perform pg_advisory_xact_lock(hashtextextended(rid::text,0));
 select * into existing from public.diesel_checklists where id=rid;
 if found then if existing.user_id=auth.uid() and existing.fleet=upper(payload->>'fleet') then return jsonb_build_object('id',rid,'duplicate',true);else return jsonb_build_object('error','Identificador já utilizado.','status',409);end if;end if;
 if exists(select 1 from public.records where id=rid) or exists(select 1 from public.diesel_operations where id=rid) then return jsonb_build_object('error','Identificador já utilizado.','status',409);end if;
 if captured is null or captured>now()+interval '5 minutes' then return jsonb_build_object('error','Confira a data e hora do aparelho.','status',422);end if;
 select * into template from public.diesel_checklist_templates where fleet=upper(payload->>'fleet') and version=(payload->>'templateVersion')::integer;
 if not found or jsonb_array_length(template.questions)=0 then return jsonb_build_object('error','Perguntas não disponíveis para esta frota. Consulte o gestor.','status',422);end if;
 if jsonb_typeof(payload->'answers') is distinct from 'array' then return jsonb_build_object('error','Responda todas as perguntas.','status',422);end if;
 if jsonb_array_length(payload->'answers')<>jsonb_array_length(template.questions) or (select count(distinct a->>'id') from jsonb_array_elements(payload->'answers')a)<>jsonb_array_length(template.questions) then return jsonb_build_object('error','Responda todas as perguntas uma única vez.','status',422);end if;
 for q in select value from jsonb_array_elements(template.questions) loop
  select value into response from jsonb_array_elements(payload->'answers') where value->>'id'=q->>'id';status:=response->>'status';
  if status is null or status not in ('PERFEITO','ATENCAO','CRITICO') then return jsonb_build_object('error','Responda todas as perguntas com perfeito, atenção ou crítico.','status',422);end if;
  if status='CRITICO' then grade:='CRITICO';elsif status='ATENCAO' and grade='PERFEITO' then grade:='ATENCAO';end if;
  answers:=answers||jsonb_build_array(jsonb_build_object('id',q->>'id','text',q->>'text','status',status));
 end loop;
 insert into public.diesel_checklists(id,fleet,template_version,user_id,operator,created_at,answers,grade) values(rid,template.fleet,template.version,auth.uid(),m.name,captured,answers,grade);
 return jsonb_build_object('id',rid,'receivedAt',now());
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or check_violation then return jsonb_build_object('error','Checklist inválido. Confira os campos.','status',422);
end $$;
revoke all on function private.submit_checklist(jsonb) from public,anon,authenticated;
alter function public.diesel_operation_submit(jsonb) rename to operation_submit_before_checklists;
alter function public.operation_submit_before_checklists(jsonb) set schema private;
revoke all on function private.operation_submit_before_checklists(jsonb) from public,anon,authenticated;
create function public.diesel_operation_submit(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if payload->>'kind'='checklist' then return private.submit_checklist(payload);end if;
 if exists(select 1 from public.diesel_checklists where id=(payload->>'id')::uuid) then return jsonb_build_object('error','Identificador já utilizado.','status',409);end if;
 return private.operation_submit_before_checklists(payload);
exception when invalid_text_representation then return jsonb_build_object('error','Identificador inválido.','status',422);
end $$;
revoke all on function public.diesel_operation_submit(jsonb) from public,anon,authenticated;
grant execute on function public.diesel_operation_submit(jsonb) to authenticated;

create function public.diesel_checklists_admin(payload jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;fid text;next_version integer;current_version integer;questions jsonb;q jsonb;normalized jsonb:='[]';rid uuid;record public.diesel_checklists;question_id text;reason text;
begin
 m:=private.member();if m.role is distinct from 'admin' then return jsonb_build_object('error','Acesso restrito ao gestor.','status',403);end if;
 if payload is not null and payload<>'null'::jsonb then
  if payload->>'action'='save-template' then
   fid:=upper(trim(payload->>'fleet'));perform 1 from public.fleets where id=fid for update;
   if not found then return jsonb_build_object('error','Frota não encontrada.','status',404);end if;
   select coalesce(max(version),0) into current_version from public.diesel_checklist_templates where fleet=fid;
   if payload->>'expectedVersion' is null or (payload->>'expectedVersion')::integer<>current_version then return jsonb_build_object('error','As perguntas foram alteradas por outro gestor. Atualize a página antes de salvar.','status',409);end if;
   questions:=payload->'questions';
   if jsonb_typeof(questions) is distinct from 'array' or length(questions::text)>500000 then return jsonb_build_object('error','Perguntas inválidas ou conteúdo muito grande.','status',422);end if;
   for q in select value from jsonb_array_elements(questions) loop
    if coalesce(q->>'id','') !~ '^[a-f0-9-]{36}$' or coalesce(length(trim(q->>'text')),0) not between 1 and 500 then return jsonb_build_object('error','Preencha o texto de cada pergunta, com até 500 caracteres.','status',422);end if;
    normalized:=normalized||jsonb_build_array(jsonb_build_object('id',q->>'id','text',upper(trim(q->>'text'))));
   end loop;
   if (select count(distinct a->>'id') from jsonb_array_elements(normalized)a)<>jsonb_array_length(normalized) then return jsonb_build_object('error','Identificadores de perguntas duplicados.','status',422);end if;
   next_version:=current_version+1;
   insert into public.diesel_checklist_templates(fleet,version,questions,created_by) values(fid,next_version,normalized,auth.uid());
  elsif payload->>'action'='resolve' then
   rid:=(payload->>'id')::uuid;question_id:=payload->>'questionId';reason:=upper(trim(payload->>'notes'));
   if coalesce(length(reason),0) not between 3 and 1000 then return jsonb_build_object('error','Informe o serviço ou a troca realizada, com 3 a 1.000 caracteres.','status',422);end if;
   select * into record from public.diesel_checklists where id=rid for update;
   if not found or not exists(select 1 from jsonb_array_elements(record.answers)a where a->>'id'=question_id and a->>'status' in ('ATENCAO','CRITICO')) then return jsonb_build_object('error','Item de atenção ou crítico não encontrado.','status',404);end if;
   if record.resolutions ? question_id then return jsonb_build_object('error','Este item já foi resolvido. Atualize a página.','status',409);end if;
   update public.diesel_checklists set resolutions=resolutions||jsonb_build_object(question_id,jsonb_build_object('notes',reason,'operator',m.name,'resolvedAt',now(),'userId',auth.uid())) where id=rid;
  else return jsonb_build_object('error','Operação inválida.','status',422);end if;
 end if;
 return jsonb_build_object('templates',private.checklist_catalog(),'records',(select coalesce(jsonb_agg(to_jsonb(r) order by r.received_at desc),'[]'::jsonb) from public.diesel_checklists r));
exception when invalid_text_representation or numeric_value_out_of_range then return jsonb_build_object('error','Dados inválidos.','status',422);
end $$;
revoke all on function public.diesel_checklists_admin(jsonb) from public,anon,authenticated;
grant execute on function public.diesel_checklists_admin(jsonb) to authenticated;
commit;
notify pgrst,'reload schema';
