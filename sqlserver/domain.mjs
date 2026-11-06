import {randomUUID} from 'node:crypto';
export class ApiError extends Error{constructor(message,status=422,data={}){super(message);this.status=status;this.data=data}}
const fail=(message,status=422,data={})=>{throw new ApiError(message,status,data)};
const check=(ok,message,status=422,data={})=>{if(!ok)fail(message,status,data)};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const code=x=>typeof x==='string'&&/^\d{1,30}$/.test(x);
const numeric=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e9;
const text=x=>typeof x==='string'?x.trim():'';
const meters=['km','engine','elevator'];
const features=['refuel','transfer','checklist'];
const fullAccess=()=>({refuel:true,transfer:true,checklist:true});
const validFlags=(v,keys,nonempty=false)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>typeof v[k]==='boolean')&&(!nonempty||keys.some(k=>v[k]));
const now=()=>new Date().toISOString();
const desc=(a,b)=>String(b.received_at||b.created_at).localeCompare(String(a.received_at||a.created_at));
const defaultMeters=type=>({km:!['Trator','Colhedora'].includes(type),engine:['Trator','Colhedora'].includes(type),elevator:type==='Colhedora'});
function enforceMeters(f){if(!['Trator','Colhedora'].includes(f.type)){f.meter_fields.elevator=false;if(!f.meter_fields.km&&!f.meter_fields.engine)f.meter_fields.km=true}}
function audit(s,table,data,m){s.add('private.'+table,{...data,actor_id:m.id,actor_name:m.name})}
function getFleet(s,id){return s.rows('fleets').find(f=>f.id===String(id||'').toUpperCase())}
function limits(s,f){const records=s.rows('records').filter(r=>r.fleet===f.id&&!r.removed_at);return Object.fromEntries(meters.map(k=>[k,Math.max(Number(f.gmais_readings?.[k]||0),0,...records.map(r=>Number(r[k]||0)))]))}
function catalog(s){return s.rows('fleets').map(f=>{const rs=s.rows('records').filter(r=>r.fleet===f.id&&!r.removed_at).sort(desc),ls=limits(s,f);return {...f,record_count:rs.length,last_record_at:rs[0]?.created_at||null,...Object.fromEntries(meters.map(k=>['last_'+k,ls[k]]))}}).sort((a,b)=>a.id.localeCompare(b.id))}
function templates(s){const result=new Map();for(const t of s.rows('diesel_checklist_templates'))if(!result.has(t.fleet)||result.get(t.fleet).version<t.version)result.set(t.fleet,{fleet:t.fleet,version:t.version,questions:t.questions});return [...result.values()]}
function member(s,user){const m=s.rows('members').find(m=>m.email===user?.email);check(m,'Conta sem autorização. Consulte o gestor.',403);return {...m,id:user.id}}
function admin(m){check(m.role==='admin','Acesso restrito ao administrador.',403)}
function validateCapture(p){check(uuid(p.id),'Identificador inválido.');check(typeof p.createdAt==='string'&&Number.isFinite(Date.parse(p.createdAt))&&Date.parse(p.createdAt)<=Date.now()+300000,'Confira a data e hora do aparelho.')}
function duplicate(s,m,p,kind){for(const [table,k] of [['records','refuel'],['diesel_operations',null],['diesel_checklists','checklist']]){const r=s.rows(table).find(r=>r.id===p.id);if(r){check(r.user_id===m.id&&(k||r.kind)===kind&&(!['refuel','checklist'].includes(kind)||r.fleet===String(p.fleet||'').toUpperCase()),'Identificador já utilizado.',409);return {id:r.id,receivedAt:r.received_at,duplicate:true}}}return null}
function permission(m,feature){if(features.includes(feature))check(m.permissions?.[feature]===true,'Seu usuário não tem acesso a esta função. Consulte o administrador.',403,{code:'FEATURE_FORBIDDEN',feature})}
function saveRefuel(s,m,p,context){
 const f=getFleet(s,p.fleet);check(f?.active,'Frota indisponível. Consulte o gestor.');
 check(typeof p.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isFinite(Date.parse(p.date))&&new Date(p.date).toISOString().slice(0,10)===p.date,'Data inválida.');
 const rules=s.rows('settings').find(r=>r.id==='rules')?.value||{};
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());check(rules.futureDate||p.date<=today,'A data não pode estar no futuro.');
 check(numeric(p.liters)&&p.liters>0,'Informe litros maiores que zero.');const last=limits(s,f);
 check(validFlags(p.measuredFields,meters,true)&&meters.every(k=>p.measuredFields[k]===f.meter_fields[k]),'As leituras exigidas para esta frota mudaram. Confira antes de reenviar.',422,{meterFields:f.meter_fields,readings:last});
 for(const k of meters)if(f.meter_fields[k])check(numeric(p[k])&&p[k]>=last[k],'Confira: KM ou horímetros estão abaixo das últimas leituras da frota.',422,{readings:last});
 if(context)check(!f.is_test||Boolean(context.is_test),'Use frota e local de teste juntos, ou frota e local reais juntos.');
 const previous=s.rows('records').filter(r=>r.fleet===f.id&&!r.removed_at).sort(desc)[0];
 const r=s.add('records',{id:p.id,fleet:f.id,date:p.date,operator:m.name,user_id:m.id,...Object.fromEntries(meters.map(k=>[k,f.meter_fields[k]?p[k]:last[k]])),start:null,end:null,liters:p.liters,signature:m.name,notes:'',created_at:p.createdAt,signature_source:'account',capture_mode:'quick',measured_fields:structuredClone(f.meter_fields),previous_readings:{...last,recordedAt:previous?.created_at||null},previous_record_id:previous?.id||null,tank_capacity_at_record:f.tank_capacity,capacity_warning_confirmed:f.tank_capacity!=null&&p.liters>f.tank_capacity,is_test:Boolean(f.is_test||context?.is_test)});
 return {id:r.id,receivedAt:r.received_at,previous:r.previous_readings};
}
function submit(s,m,p){
 validateCapture(p);const kind=p.kind||'refuel';const prior=duplicate(s,m,p,kind);if(prior)return prior;permission(m,kind);
 if(kind==='checklist'){
  const t=s.rows('diesel_checklist_templates').find(t=>t.fleet===String(p.fleet||'').toUpperCase()&&t.version===p.templateVersion);check(t&&t.questions.length,'Perguntas não disponíveis para esta frota. Consulte o gestor.');
  check(Array.isArray(p.answers)&&p.answers.length===t.questions.length&&new Set(p.answers.map(a=>a.id)).size===p.answers.length,'Responda todas as perguntas uma única vez.');
  const ranks=['PERFEITO','ATENCAO','CRITICO'];let grade=0;const answers=t.questions.map(q=>{const a=p.answers.find(a=>a.id===q.id);check(a&&ranks.includes(a.status),'Responda todas as perguntas.');grade=Math.max(grade,ranks.indexOf(a.status));return {...q,status:a.status}});
  const r=s.add('diesel_checklists',{id:p.id,fleet:t.fleet,template_version:t.version,user_id:m.id,operator:m.name,created_at:p.createdAt,answers,grade:ranks[grade]});return {id:r.id,receivedAt:r.received_at};
 }
 if(kind==='occurrence'){
  let photo=p.photo??null;if(photo!==null){check(typeof photo==='string'&&photo.length<=280000&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(photo),'Foto inválida.');const bytes=Buffer.from(photo.slice(23),'base64');check(bytes.length>=5&&bytes.subarray(0,3).toString('hex')==='ffd8ff'&&bytes.subarray(-2).toString('hex')==='ffd9','Foto inválida.')}
  check(p.notes==null||typeof p.notes==='string','Descreva a ocorrência.');const notes=text(p.notes)||(photo?'FOTO ANEXADA':'');check(notes.length>=3&&notes.length<=2000,'Descreva a ocorrência com 3 a 2000 caracteres ou adicione uma foto.');
  const local=text(p.localCode)||null,material=text(p.materialCode)||null,fleet=text(p.fleet).toUpperCase()||null;check(!local||code(local),'Código de local inválido.');check(!material||code(material),'Código de material inválido.');check(!fleet||getFleet(s,fleet),'Frota não encontrada.');
  const loc=s.rows('diesel_locations').find(l=>l.local_code===local&&l.material_code===material);
  const r=s.add('diesel_operations',{id:p.id,user_id:m.id,operator:m.name,kind,local_code:local,material_code:material,fleet,notes,created_at:p.createdAt,has_photo:!!photo,is_test:loc?.is_test||false});if(photo)s.add('private.diesel_occurrence_photos',{operation_id:r.id,data_url:photo});return {id:r.id,receivedAt:r.received_at};
 }
 check(['refuel','transfer'].includes(kind),'Operação inválida.');
 if(!p.kind)return saveRefuel(s,m,p);
 check(code(p.localCode)&&code(p.materialCode),'Informe códigos numéricos de local e material.');
 let loc=s.rows('diesel_locations').find(l=>l.local_code===p.localCode&&l.material_code===p.materialCode);
 if(!loc)loc=s.add('diesel_locations',{local_code:p.localCode,material_code:p.materialCode});
 if(kind==='refuel'){
  let mode=p.mode,start=null,end=null;const simulated=mode==='manual'&&loc.simulated_meter&&loc.last_meter!=null;
  if(simulated){mode='recorder';start=loc.last_meter;end=start+p.liters}else if(mode==='recorder'){start=p.recorderStart;end=p.recorderEnd}
  check(['manual','recorder'].includes(mode),'Modo de abastecimento inválido.');
  if(mode==='recorder'){check(numeric(start)&&numeric(end),'Informe a leitura da registradora.');check(loc.last_meter!=null&&start===loc.last_meter,'A registradora foi atualizada ou precisa de leitura inicial.',409,{recorder:loc.last_meter});check(end>start&&Math.abs(end-start-p.liters)<=0.020000001,'Confira o final da registradora e os litros calculados.')}
  const receipt=saveRefuel(s,m,p,loc),r=s.rows('records').find(r=>r.id===p.id);Object.assign(r,{local_code:p.localCode,material_code:p.materialCode,recorder_start:start,recorder_end:end});loc.last_meter=end;loc.updated_at=now();if(end!=null)loc.last_verified_meter=end;if(simulated)receipt.recorderEnd=end;return receipt;
 }
 check(code(p.destination)&&p.destination!==p.localCode,'Informe um novo local válido.');const fleet=text(p.fleet).toUpperCase()||null;check(!fleet||getFleet(s,fleet),'Frota não encontrada.');
 const destination=s.rows('diesel_locations').find(l=>l.local_code===p.destination&&l.material_code===p.materialCode);check(Boolean(loc.is_test)===Boolean(destination?.is_test),'Transfira entre locais de teste ou entre locais reais.');let start=null,end=null,liters=null;if('transferVersion'in p){check(p.transferVersion===2&&numeric(p.recorderStart)&&numeric(p.recorderEnd),'Confira as leituras da transferência.');start=p.recorderStart;end=p.recorderEnd;check(loc.last_meter!=null&&start===loc.last_meter,'A leitura do local atual mudou ou está indisponível.',409,{recorder:loc.last_meter});check(end>=start,'O final da registradora não pode ser menor que a leitura anterior.');liters=end-start}
 const r=s.add('diesel_operations',{id:p.id,user_id:m.id,operator:m.name,kind,local_code:p.localCode,material_code:p.materialCode,destination:p.destination,fleet,created_at:p.createdAt,recorder_start:start,recorder_end:end,recorder_liters:liters,is_test:loc.is_test});if(end!=null){loc.last_meter=end;loc.last_verified_meter=end;loc.updated_at=now()}return {id:r.id,receivedAt:r.received_at};
}
function adminSave(s,m,p){
 admin(m);const a=p.action,email=text(p.email).toLowerCase(),target=s.rows('members').find(x=>x.email===email),removed=s.rows('private.removed_members').find(x=>x.email===email);
 if(a==='member-remove'||a==='member-restore'){
  check(email!==m.email,'Você não pode remover sua própria conta.');
  if(a==='member-remove'){check(target,'Usuário não encontrado.',404);s.add('private.removed_members',{email,member_data:structuredClone(target),removed_by:m.id,removed_by_name:m.name});s.tables['public.members']=s.rows('members').filter(x=>x!==target);s.tables['private.diesel_devices']=s.rows('private.diesel_devices').filter(x=>x.email!==email);audit(s,'user_access_audit',{email,previous_access:target,new_access:{removed:true}},m)}
  else{check(removed,'Usuário removido não encontrado.',404);check(!target&&!s.rows('members').some(x=>x.username===removed.member_data.username),'E-mail ou usuário já está em uso.',409);s.add('members',removed.member_data);s.tables['private.removed_members']=s.rows('private.removed_members').filter(x=>x!==removed);audit(s,'user_access_audit',{email,previous_access:{removed:true},new_access:removed.member_data},m)}return {ok:true};
 }
 if(['member','member-access','member-username'].includes(a)){
  check(!removed,'Usuário removido. Use RESTAURAR.',409);check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'E-mail inválido.');
  const username=text(p.username).toLowerCase();if(a==='member'||a==='member-username')check(/^[a-z0-9][a-z0-9_.-]{2,29}$/.test(username)&&!s.rows('members').some(x=>x.email!==email&&x.username===username),'Nome de usuário indisponível ou inválido.');
  if(a==='member-username'){check(target,'Pessoa não encontrada.',404);target.username=username;return {ok:true}}
  check(['admin','operator'].includes(p.role),'Perfil inválido.');const access=p.permissions??target?.permissions??fullAccess();check(validFlags(access,features),'Permissões inválidas.');
  const before=target?{role:target.role,permissions:structuredClone(target.permissions)}:null;
  if(a==='member-access'){check(target,'Usuário não encontrado.',404);check(email!==m.email||p.role==='admin','Você não pode remover seu próprio acesso de administrador.');Object.assign(target,{role:p.role,permissions:access})}
  else{check(email!==m.email&&text(p.name).length>=2&&text(p.name).length<=120,'Nome, e-mail ou perfil inválido. Não altere seu próprio perfil.');if(target)Object.assign(target,{name:text(p.name),role:p.role,username,permissions:access});else s.add('members',{email,name:text(p.name),role:p.role,username,permissions:access})}
  audit(s,'user_access_audit',{email,previous_access:before,new_access:{role:p.role,permissions:access}},m);return {ok:true};
 }
 if(a==='rules'){check(typeof p.rules?.futureDate==='boolean'&&typeof p.rules?.matchMeter==='boolean','Regras inválidas.');s.rows('settings').find(x=>x.id==='rules').value=p.rules;return {ok:true}}
 if(a==='fleet'||a==='import-fleets'){
  const list=a==='fleet'?[p]:p.fleets;check(Array.isArray(list)&&list.length<=1000,'Catálogo inválido.');for(const item of list){check(/^[A-Za-z0-9_.-]{1,30}$/.test(item.id)&&text(item.name).length>=2&&text(item.name).length<=80&&['Outro','Caminhão','Trator','Colhedora'].includes(item.type),'Frota inválida.');let f=getFleet(s,item.id);if(f)Object.assign(f,{name:text(item.name),type:item.type});else f=s.add('fleets',{id:item.id.toUpperCase(),name:text(item.name),type:item.type,meter_fields:defaultMeters(item.type)});enforceMeters(f)}return {ok:true,count:list.length};
 }
 const f=getFleet(s,p.id);check(f,'Frota não encontrada.',404);
 if(a==='fleet-meters'){check(validFlags(p.meterFields,meters,true),'Escolha ao menos uma leitura para a frota.');f.meter_fields=structuredClone(p.meterFields);enforceMeters(f);return {ok:true}}
 if(a==='fleet-edit'){check(text(p.name).length>=2&&text(p.name).length<=80&&['Outro','Caminhão','Trator','Colhedora'].includes(p.type)&&typeof p.active==='boolean'&&text(p.model).length<=120,'Confira nome, modelo, tipo e situação da frota.');check(p.tankCapacity==null||(numeric(p.tankCapacity)&&p.tankCapacity>0&&p.tankCapacity<=100000),'Capacidade inválida.');if(f.tank_capacity!==p.tankCapacity)f.tank_reference={manual:true,updatedAt:now(),referenceLiters:p.tankCapacity??null};Object.assign(f,{name:text(p.name),type:p.type,model:text(p.model),active:p.active,tank_capacity:p.tankCapacity??null});enforceMeters(f);return {ok:true}}
 fail('Operação inválida.');
}
export function dispatch(s,user,route,p=null,query=new URLSearchParams()){
 const m=member(s,user);
 if(route==='session')return {user:m,fleets:catalog(s),rules:s.rows('settings').find(r=>r.id==='rules')?.value||{},locations:s.rows('diesel_locations'),materials:s.rows('diesel_materials'),checklistTemplates:templates(s)};
 if(route==='records'){const records=s.rows('records').filter(r=>!r.removed_at&&(m.role==='admin'||r.user_id===m.id)).sort(desc);if(query.get('id')){const r=records.find(r=>r.id===query.get('id'));check(r,'Registro não encontrado.',404);return r}return {records}}
 if(['operation-submit','mobile-submit'].includes(route))return submit(s,m,p);
 if(route==='occurrence-photo'){admin(m);const id=query.get('id'),o=s.rows('diesel_operations').find(o=>o.id===id&&!o.removed_at);check(o,'Ocorrência não encontrada.',404);const photo=s.rows('private.diesel_occurrence_photos').find(x=>x.operation_id===id);check(photo,'Foto não encontrada.',404);return {id,dataUrl:photo.data_url,photo:photo.data_url}}
 admin(m);
 if(route==='admin'){if(p)return adminSave(s,m,p);return {members:s.rows('members'),rules:s.rows('settings').find(r=>r.id==='rules')?.value,removedMembers:s.rows('private.removed_members').map(x=>({email:x.email,name:x.member_data.name,username:x.member_data.username,removedAt:x.removed_at}))}}
 if(route==='operations-admin'){
  if(p){check(p.action==='location'&&code(p.localCode)&&code(p.materialCode)&&numeric(p.lastMeter),'Confira os códigos e a leitura.');let loc=s.rows('diesel_locations').find(l=>l.local_code===p.localCode&&l.material_code===p.materialCode);const data={local_code:p.localCode,material_code:p.materialCode,name:text(p.name).slice(0,120),material_name:text(p.materialName).slice(0,120),last_meter:p.lastMeter,last_verified_meter:p.lastMeter,updated_at:now(),simulated_meter:false};if(loc)Object.assign(loc,data);else s.add('diesel_locations',data)}return {locations:s.rows('diesel_locations'),operations:s.rows('diesel_operations').filter(o=>!o.removed_at).sort(desc).slice(0,1000)};
 }
 if(route==='record-controls'){
  if(!p)return {records:[...s.rows('records').filter(r=>r.removed_at).map(r=>({...r,kind:'refuel'})),...s.rows('diesel_operations').filter(r=>r.removed_at)].sort((a,b)=>b.removed_at.localeCompare(a.removed_at))};
  check(uuid(p.id)&&['refuel','transfer','occurrence'].includes(p.kind)&&['remove','restore'].includes(p.action),'Operação inválida.');check(p.action!=='remove'||text(p.reason).length>=3&&text(p.reason).length<=500,'Informe o motivo com 3 a 500 caracteres.');const r=s.rows(p.kind==='refuel'?'records':'diesel_operations').find(r=>r.id===p.id&&(p.kind==='refuel'||r.kind===p.kind));check(r&&Boolean(r.removed_at)===(p.action==='restore'),'Registro não encontrado ou já alterado.',409);Object.assign(r,p.action==='remove'?{removed_at:now(),removed_by:m.id,removed_by_name:m.name,removal_reason:text(p.reason)}:{removed_at:null,removed_by:null,removed_by_name:null,removal_reason:null});audit(s,'record_control_audit',{record_id:r.id,kind:p.kind,action:p.action,reason:text(p.reason)||null},m);return {ok:true};
 }
 if(route==='checklists-admin'){
  if(p?.action==='save-template'){const f=getFleet(s,p.fleet);check(f,'Frota não encontrada.',404);const current=templates(s).find(t=>t.fleet===f.id)?.version||0;check(p.expectedVersion===current,'As perguntas foram alteradas por outro gestor.',409);check(Array.isArray(p.questions)&&JSON.stringify(p.questions).length<=500000,'Perguntas inválidas.');check(p.questions.every(q=>uuid(q.id)&&text(q.text).length>=1&&text(q.text).length<=500)&&new Set(p.questions.map(q=>q.id)).size===p.questions.length,'Preencha cada pergunta uma única vez.');s.add('diesel_checklist_templates',{fleet:f.id,version:current+1,questions:p.questions.map(q=>({id:q.id,text:text(q.text).toUpperCase()})),created_by:m.id})}
  else if(p?.action==='resolve'){const r=s.rows('diesel_checklists').find(r=>r.id===p.id);check(r&&r.answers.some(a=>a.id===p.questionId&&['ATENCAO','CRITICO'].includes(a.status)),'Item de atenção ou crítico não encontrado.',404);check(!r.resolutions[p.questionId],'Este item já foi resolvido.',409);check(text(p.notes).length>=3&&text(p.notes).length<=1000,'Informe o serviço realizado.');r.resolutions[p.questionId]={notes:text(p.notes).toUpperCase(),operator:m.name,resolvedAt:now(),userId:m.id}}
  else check(!p,'Operação inválida.');return {templates:templates(s),records:s.rows('diesel_checklists').sort(desc)};
 }
 fail('Operação inválida.',404);
}
export {uuid,fullAccess};
