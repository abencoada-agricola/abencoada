import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {Database,Store} from './database.mjs';
import {dispatch,ApiError} from './domain.mjs';
import {applyParitySchema} from './parity-schema.mjs';
import {passwordHash,passwordMatches} from './auth.mjs';
import {hashSync} from 'bcryptjs';
const source=JSON.parse(await readFile('sqlserver/exports/supabase-2026-11-05.json','utf8')),pg=new PGlite(),sql=new Database(),rollback=Error('EXPECTED_ROLLBACK');let checks=0;
await pg.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email',current_setting('test.email',true))$$;grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;`);
const order=['schema','usernames','field-access','mobile','operations','background-sync','gmais-readings','fuel-control','transfer-baseline','occurrence-photos','test-data','simulated-readings','vehicle-meters','trial-recorder-readings','android-only','record-controls','tank-references','checklists','user-access','member-removal','operation-fleets','general-occurrences'];
for(const name of order)await pg.exec(await readFile('supabase/'+name+'.sql','utf8'));
for(const f of source.functions)await pg.exec(f.definition);
try{await sql.transaction(async()=>{
 await applyParitySchema(sql,source);const s=await new Store(sql).load();
 const admin={id:randomUUID(),email:'parity-admin@example.test'},operator={id:randomUUID(),email:'parity-operator@example.test'};
 for(const [user,role] of [[admin,'admin'],[operator,'operator']]){const m={email:user.email,name:role,role,username:role==='admin'?'parity.admin':'parity.operator',permissions:{refuel:true,transfer:true,checklist:true}};await pg.query('INSERT INTO auth.users(id) VALUES($1)',[user.id]);await pg.query('INSERT INTO public.members(email,name,role,username,permissions) VALUES($1,$2,$3,$4,$5)',[m.email,m.name,m.role,m.username,JSON.stringify(m.permissions)]);await sql.query('INSERT INTO app_auth.users(id,email,password_hash) VALUES(@id,@email,@hash)',{id:user.id,email:user.email,hash:passwordHash('ParityPassword')});s.add('members',m)}
 const rpc={admin:'diesel_admin_save','operations-admin':'diesel_operations_admin','operation-submit':'diesel_operation_submit','mobile-submit':'diesel_mobile_submit','checklists-admin':'diesel_checklists_admin','record-controls':'diesel_record_controls'};
 async function both(user,route,p,expect=200){await pg.query("SELECT set_config('test.uid',$1,false),set_config('test.email',$2,false)",[user.id,user.email]);const remote=(await pg.query(`SELECT public.${rpc[route]}($1::jsonb) result`,[JSON.stringify(p)])).rows[0].result;let local;try{local=dispatch(s,user,route,structuredClone(p))}catch(e){if(!(e instanceof ApiError))throw e;local={error:e.message,status:e.status,...e.data}}assert.equal(remote.status||200,expect,'Source status: '+route);assert.equal(local.status||200,expect,'Local status: '+route+' '+local.error);for(const key of ['id','duplicate','ok','code','feature'])if(key in remote)assert.deepEqual(local[key],remote[key],route+':'+key);checks++;return {remote,local}}
 await both(operator,'admin',{action:'rules',rules:{futureDate:true,matchMeter:false}},403);
 await both(admin,'admin',{action:'fleet',id:'QA_PARITY',name:'FROTA EQUIVALENCIA',type:'Trator'});
 await both(admin,'operations-admin',{action:'location',localCode:'998866',materialCode:'9',name:'LOCAL PARIDADE',lastMeter:500});
 const p={id:randomUUID(),kind:'refuel',mode:'recorder',localCode:'998866',materialCode:'9',fleet:'QA_PARITY',date:'2026-01-01',createdAt:new Date().toISOString(),liters:20,engine:100,measuredFields:{km:false,engine:true,elevator:false},recorderStart:500,recorderEnd:520};
 await both(operator,'operation-submit',p);await both(operator,'operation-submit',p);
 await both(operator,'operation-submit',{...p,id:randomUUID()},409);
 await both(operator,'operation-submit',{...p,id:randomUUID(),engine:99,recorderStart:520,recorderEnd:540},422);
 await both(operator,'operation-submit',{...p,id:randomUUID(),engine:110,recorderStart:520,recorderEnd:540,measuredFields:{km:true,engine:false,elevator:false}},422);
 await both(operator,'operation-submit',{...p,id:randomUUID(),engine:110,mode:'manual'});
 await both(admin,'operations-admin',{action:'location',localCode:'998866',materialCode:'9',lastMeter:600});
 await both(operator,'operation-submit',{id:randomUUID(),kind:'transfer',localCode:'998866',materialCode:'9',destination:'998867',createdAt:p.createdAt,transferVersion:2,recorderStart:600,recorderEnd:650});
 const occurrence={id:randomUUID(),kind:'occurrence',createdAt:p.createdAt,notes:'OCORRENCIA GERAL'};await both(operator,'operation-submit',occurrence);await both(operator,'operation-submit',occurrence);await both(operator,'operation-submit',{...occurrence,id:randomUUID(),photo:'data:image/jpeg;base64,/9j/2Q=='},422);
 const question=randomUUID();await both(admin,'checklists-admin',{action:'save-template',fleet:'QA_PARITY',expectedVersion:0,questions:[{id:question,text:'Óleo do motor'}]});await both(admin,'checklists-admin',{action:'save-template',fleet:'QA_PARITY',expectedVersion:0,questions:[]},409);
 const checklist={id:randomUUID(),kind:'checklist',fleet:'QA_PARITY',templateVersion:1,createdAt:p.createdAt,answers:[{id:question,status:'CRITICO'}]};await both(operator,'operation-submit',{...checklist,answers:[]},422);await both(operator,'operation-submit',checklist);await both(operator,'operation-submit',checklist);await both(admin,'checklists-admin',{action:'resolve',id:checklist.id,questionId:question,notes:'Óleo substituído'});
 await both(admin,'admin',{action:'member-access',email:operator.email,role:'operator',permissions:{refuel:false,transfer:false,checklist:false}});await both(operator,'operation-submit',p);await both(operator,'operation-submit',{...p,id:randomUUID()},403);
 await both(admin,'record-controls',{action:'remove',kind:'refuel',id:p.id,reason:'CORRECAO DE TESTE'});await both(admin,'record-controls',{action:'restore',kind:'refuel',id:p.id});
 await both(admin,'admin',{action:'member-username',email:operator.email,username:'.usuario'},422);
 await both(admin,'admin',{action:'member-remove',email:operator.email});await both(admin,'admin',{action:'member-restore',email:operator.email});
 await s.flush();
 const localRecords=(await sql.query("SELECT * FROM [app].records WHERE fleet='QA_PARITY'"));const pgRecords=(await pg.query("SELECT * FROM public.records WHERE fleet='QA_PARITY' ORDER BY id")).rows;
 for(const r of pgRecords){const l=localRecords.find(x=>x.id===r.id);for(const k of ['id','fleet','engine','km','elevator','liters','signature','operator','capture_mode','is_test','user_id','recorder_start','recorder_end'])assert.deepEqual(l[k],typeof l[k]==='number'&&r[k]!=null?Number(r[k]):r[k],'Persisted value: '+k);checks++}
 // Exercise database validation through direct SQL as well as the API.
 await assert.rejects(()=>sql.query("INSERT INTO [app].members(email,name,role,username,permissions) VALUES('INVALID@EXAMPLE.TEST','AB','admin','invalid-user',N'{\"refuel\":true,\"transfer\":true,\"checklist\":true}')"));checks++;
 // XACT_ABORT may mark that transaction uncommittable; rollback is the intended outcome.
 const bcrypt=hashSync('existing-password',4);assert(passwordMatches('existing-password',bcrypt));assert(!passwordMatches('wrong-password',bcrypt));checks+=2;
 throw rollback;
})}catch(e){if(e!==rollback)throw e}finally{sql.close();await pg.close()}
console.log(`${checks} differential checks passed against exported live PostgreSQL functions; SQL test transaction rolled back.`);
