import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;`);
for(const f of ['schema','usernames','field-access','mobile','operations','background-sync','gmais-readings','fuel-control','transfer-baseline','occurrence-photos','test-data','simulated-readings','vehicle-meters','trial-recorder-readings','android-only','record-controls'])await db.exec(await readFile('supabase/'+f+'.sql','utf8'));
const manager=crypto.randomUUID(),worker=crypto.randomUUID();
await db.query('insert into auth.users values($1),($2)',[manager,worker]);
await db.exec(`insert into members(email,name,role,username) values('manager@example.com','GESTOR','admin','gestor'),('worker@example.com','OPERADOR','operator','operador');insert into fleets(id,name,type,tank_capacity) values('123','CAMIONETE','Outro',70);insert into diesel_locations(local_code,material_code,last_meter) values('1','9',1000);`);
async function who(id,email,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email,role})]);await db.exec('set role '+role)}
async function rpc(name,payload){return(await db.query('select '+name+'($1::jsonb) result',[JSON.stringify(payload)])).rows[0].result}
async function records(){return(await db.query('select diesel_records() result')).rows[0].result.records}
async function session(){return(await db.query('select diesel_session() result')).rows[0].result}
await who(worker,'worker@example.com');
const record={id:crypto.randomUUID(),kind:'refuel',mode:'recorder',fleet:'123',localCode:'1',materialCode:'9',km:100,liters:100,recorderStart:1000,recorderEnd:1100,measuredFields:{km:true,engine:false,elevator:false},createdAt:new Date().toISOString(),date:new Date().toISOString().slice(0,10)};
// Exceeding capacity is accepted without any confirmation field.
assert.equal((await rpc('diesel_operation_submit',record)).id,record.id);assert.equal((await records())[0].capacity_warning_confirmed,true);
const occurrence={id:crypto.randomUUID(),kind:'occurrence',localCode:'1',materialCode:'9',createdAt:new Date().toISOString(),notes:'FOTO DO EQUIPAMENTO',photo:'data:image/jpeg;base64,'+Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')};
assert.equal((await rpc('diesel_operation_submit',occurrence)).id,occurrence.id);
const removal={action:'remove',kind:'refuel',id:record.id,reason:'LEITURA INCORRETA'};
assert.equal((await rpc('diesel_record_controls',removal)).status,403);
await who(null,null,'anon');await assert.rejects(()=>rpc('diesel_record_controls',removal),/permission denied/);
await who(manager,'manager@example.com');assert.equal((await rpc('diesel_record_controls',{...removal,reason:''})).status,422);
assert.equal((await rpc('diesel_record_controls',removal)).ok,true);assert.equal((await records()).length,0);assert.equal((await session()).fleets.find(f=>f.id==='123').last_km,0);
// Retry acknowledges the excluded original instead of inserting it again.
await who(worker,'worker@example.com');assert.equal((await rpc('diesel_operation_submit',record)).duplicate,true);
const next={...record,id:crypto.randomUUID(),km:10,liters:20,recorderStart:1100,recorderEnd:1120};assert.equal((await rpc('diesel_operation_submit',next)).id,next.id);
await who(manager,'manager@example.com');assert.equal((await rpc('diesel_record_controls',{action:'restore',kind:'refuel',id:record.id})).ok,true);assert.equal((await records()).length,2);assert.equal((await session()).fleets.find(f=>f.id==='123').last_km,100);
assert.equal((await rpc('diesel_record_controls',{...removal,kind:'occurrence',id:occurrence.id})).ok,true);assert.equal((await rpc('diesel_operations_admin',null)).operations.length,0);
let removed=(await rpc('diesel_record_controls',null)).records;assert.equal(removed[0].id,occurrence.id);assert.equal(removed[0].removed_by_name,'GESTOR');assert.equal(removed[0].removal_reason,'LEITURA INCORRETA');
assert.equal((await rpc('diesel_record_controls',{action:'restore',kind:'occurrence',id:occurrence.id})).ok,true);assert.equal((await rpc('diesel_operations_admin',null)).operations[0].has_photo,true);assert.equal((await db.query('select diesel_occurrence_photo($1) result',[occurrence.id])).rows[0].result.photo,occurrence.photo);
await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from private.record_control_audit')).rows[0].n,4);
await db.exec("insert into fleets(id,name,type) values('CH','JD COLHEDORA CH570','Colhedora'),('OLD','JD COLHEDORA 3520','Colhedora'),('CUSTOM','JD TRATOR 7200J','Trator');update fleets set tank_capacity=450 where id='CUSTOM';");
await db.exec(await readFile('supabase/tank-references.sql','utf8'));
let reference=(await db.query("select tank_capacity,tank_reference from fleets where id='CH'")).rows[0];assert.equal(reference.tank_capacity,'605');assert.ok(reference.tank_reference.source.includes('deere'));
assert.equal((await db.query("select tank_capacity from fleets where id='OLD'")).rows[0].tank_capacity,null);assert.equal((await db.query("select tank_capacity from fleets where id='CUSTOM'")).rows[0].tank_capacity,'450');
await db.exec("update fleets set tank_capacity=610 where id='CH'");assert.equal((await db.query("select tank_reference from fleets where id='CH'")).rows[0].tank_reference.manual,true);
await db.close();console.log('Manager exclusion/restoration, audit, corrected meter baselines, photos, retry idempotency and nonblocking capacity passed.');
