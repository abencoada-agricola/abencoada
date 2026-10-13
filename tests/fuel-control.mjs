import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {capacityWarning,consumptionSummary} from '../web/fuel-utils.js';
import {recorderBase,operationDependencies,transferRecorderBase} from '../mobile/operations.js';
assert.equal(capacityWarning({tank_capacity:70},70),null);
assert.equal(capacityWarning({tank_capacity:null},100),null);
assert.deepEqual(capacityWarning({tank_capacity:70},70.01),{capacity:70,liters:70.01});
assert.equal(capacityWarning({tank_capacity:900},800),null);
const stats=consumptionSummary([
 {id:'a',fleet:'1',date:'2026-09-30',km:100,engine:10,liters:50},
 {id:'b',fleet:'1',date:'2026-10-01',km:400,engine:20,liters:100},
 {id:'c',fleet:'1',date:'2026-10-02',km:500,engine:22,liters:20},
 {id:'d',fleet:'1',date:'2026-10-03',km:500,engine:22,liters:10},
 {id:'pending',fleet:'1',date:'2026-10-04',km:600,engine:30,liters:1000,status:'pending'},
 {id:'first',fleet:'2',date:'2026-10-03',capture_mode:'quick',measured_fields:{engine:true},engine:100,previous_readings:{engine:0},liters:70}
],'2026-10-01');
assert.equal(stats[0].averageLiters,130/3);assert.equal(stats[0].kmPerLiter,400/120);assert.equal(stats[0].litersPerHour,120/12);assert.equal(stats[0].kmSamples,2);assert.equal(stats[1].litersPerHour,null);assert.equal(stats[1].kmPerLiter,null);
assert.equal(recorderBase([{local_code:'1',material_code:'9',last_meter:100}],[{id:'t',kind:'transfer',transferVersion:2,localCode:'1',materialCode:'9',recorderEnd:110}], '1','9'),110);
assert.deepEqual(operationDependencies({kind:'transfer',localCode:'1',materialCode:'9',destination:'2'}),['local:1:9','local:2:9']);
assert.deepEqual(operationDependencies({kind:'refuel',localCode:'2',materialCode:'9',fleet:'1001'}),['local:2:9','fleet:1001']);
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;`);
for(const f of ['schema','usernames','field-access','mobile','operations','background-sync','gmais-readings'])await db.exec(await readFile('supabase/'+f+'.sql','utf8'));
const manager=crypto.randomUUID(),worker=crypto.randomUUID();
await db.query('insert into auth.users values($1),($2)',[manager,worker]);
await db.exec(`insert into members(email,name,role,username) values('manager@example.com','GESTOR','admin','gestor'),('worker@example.com','OPERADOR','operator','operador');insert into fleets(id,name,type,meter_fields) values('1001','CAMIONETE','Outro','{"km":true,"engine":false,"elevator":false}');insert into diesel_locations(local_code,material_code,last_meter) values('1','9',1000),('2','9',2000);`);
async function who(id,email,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email,role})]);await db.exec('set role '+role)}
async function rpc(name,payload){return(await db.query('select '+name+'($1::jsonb) result',[JSON.stringify(payload)])).rows[0].result}
await who(manager,'manager@example.com');await rpc('diesel_admin_save',{action:'fleet',id:'1001',name:'CAMIONETE',type:'Outro'});
await db.exec('reset role');await db.exec(await readFile('supabase/fuel-control.sql','utf8'));await db.exec(await readFile('supabase/transfer-baseline.sql','utf8'));
const edit={action:'fleet-edit',id:'1001',name:'CAMIONETE',model:'MODELO TESTE',type:'Outro',active:true,tankCapacity:70};
await who(worker,'worker@example.com');assert.equal((await rpc('diesel_admin_save',edit)).status,403);
await who(manager,'manager@example.com');assert.equal((await rpc('diesel_admin_save',edit)).ok,true);assert.equal((await rpc('diesel_admin_save',{...edit,tankCapacity:-1})).status,422);
let session=(await db.query('select diesel_session() result')).rows[0].result;assert.equal(session.fleets[0].tank_capacity,70);assert.equal(session.fleets[0].model,'MODELO TESTE');
await who(worker,'worker@example.com');const createdAt=new Date().toISOString(),date=createdAt.slice(0,10);
const refuel={id:crypto.randomUUID(),kind:'refuel',mode:'recorder',localCode:'1',materialCode:'9',fleet:'1001',date,createdAt,km:100,measuredFields:{km:true,engine:false,elevator:false},recorderStart:1000,recorderEnd:1100,liters:100};
assert.equal((await rpc('diesel_operation_submit',refuel)).capacityWarning,true);
let locations=(await db.query('select diesel_session() result')).rows[0].result.locations;assert.equal(locations.find(l=>l.local_code==='1').last_meter,1000);
assert.equal((await rpc('diesel_operation_submit',{...refuel,capacityConfirmed:true,capacityAtConfirmation:69,confirmedLiters:100})).capacityWarning,true);
const confirmed={...refuel,capacityConfirmed:true,capacityAtConfirmation:70,confirmedLiters:100};assert.equal((await rpc('diesel_operation_submit',confirmed)).id,refuel.id);assert.equal((await rpc('diesel_operation_submit',confirmed)).duplicate,true);
const saved=(await db.query('select diesel_records() result')).rows[0].result.records[0];assert.equal(saved.capacity_warning_confirmed,true);assert.equal(saved.tank_capacity_at_record,70);assert.equal(saved.operator,'OPERADOR');
const transfer={id:crypto.randomUUID(),kind:'transfer',transferVersion:2,localCode:'1',materialCode:'9',destination:'2',createdAt,recorderStart:1100,recorderEnd:1120};
assert.equal((await rpc('diesel_operation_submit',{...transfer,recorderStart:1000})).status,409);
assert.equal((await rpc('diesel_operation_submit',{...transfer,recorderEnd:1090})).status,422);
assert.equal((await rpc('diesel_operation_submit',transfer)).id,transfer.id);assert.equal((await rpc('diesel_operation_submit',transfer)).duplicate,true);
locations=(await db.query('select diesel_session() result')).rows[0].result.locations;assert.equal(locations.find(l=>l.local_code==='1').last_meter,1120);assert.equal(locations.find(l=>l.local_code==='2').last_meter,2000);
assert.equal((await rpc('diesel_operation_submit',{...transfer,id:crypto.randomUUID(),recorderStart:1120,recorderEnd:1120})).id!==undefined,true);
assert.equal((await rpc('diesel_operation_submit',{...transfer,id:crypto.randomUUID(),transferVersion:undefined,recorderStart:undefined,recorderEnd:undefined})).id!==undefined,true);
await who(manager,'manager@example.com');const operations=(await rpc('diesel_operations_admin',null)).operations;assert.equal(operations.find(o=>o.id===transfer.id).recorder_liters,20);
// Public web submissions must confirm capacity too, while preserving declared signatures.
await who(null,null,'anon');const full={id:crypto.randomUUID(),submissionKey:crypto.randomUUID(),operator:'Trabalhador',fleet:'1001',date,createdAt,engine:0,elevator:0,km:101,start:1,end:101,liters:100};assert.equal((await rpc('diesel_field_submit',full)).capacityWarning,true);assert.equal((await rpc('diesel_field_submit',{...full,capacityConfirmed:true,capacityAtConfirmation:70,confirmedLiters:100})).id,full.id);
await assert.rejects(()=>db.query('select private.capacity_check($1::jsonb)',[JSON.stringify(full)]),/permission denied/);
await who(worker,'worker@example.com');const lease=(await db.query('select diesel_device_register($1) result',[crypto.randomUUID()])).rows[0].result;await who(null,null,'anon');const bg={...refuel,id:crypto.randomUUID(),mode:'manual',km:102};let receipt=(await db.query('select diesel_device_submit($1,$2::jsonb) result',[lease.token,JSON.stringify(bg)])).rows[0].result;assert.equal(receipt.capacityWarning,true);
receipt=(await db.query('select diesel_device_submit($1,$2::jsonb) result',[lease.token,JSON.stringify({...bg,capacityConfirmed:true,capacityAtConfirmation:70,confirmedLiters:100})])).rows[0].result;assert.equal(receipt.id,bg.id);
await who(worker,'worker@example.com');const afterManual={...transfer,id:crypto.randomUUID(),recorderStart:1120,recorderEnd:1150};assert.equal((await rpc('diesel_operation_submit',afterManual)).id,afterManual.id);locations=(await db.query('select diesel_session() result')).rows[0].result.locations;assert.equal(locations.find(l=>l.local_code==='1').last_verified_meter,1150);assert.equal(transferRecorderBase([{local_code:'1',material_code:'9',last_meter:null,last_verified_meter:1120}],[],'1','9'),1120);assert.equal(recorderBase([{local_code:'1',material_code:'9',last_meter:null,last_verified_meter:1120}],[],'1','9'),null);await db.close();console.log('Capacity warnings, fleet editing, consumption estimates, transfer readings and background validation passed.');
