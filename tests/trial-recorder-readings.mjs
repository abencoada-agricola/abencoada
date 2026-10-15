import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {recorderBase,transferRecorderBase,formatNumericInput,finishNumericInput,parseNumber} from '../mobile/operations.js';
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;`);
for(const f of ['schema','usernames','field-access','mobile','operations','background-sync','gmais-readings','fuel-control','transfer-baseline','occurrence-photos','test-data','simulated-readings','vehicle-meters'])await db.exec(await readFile('supabase/'+f+'.sql','utf8'));
const manager=crypto.randomUUID(),worker=crypto.randomUUID(),outsider=crypto.randomUUID();
await db.query('insert into auth.users values($1),($2),($3)',[manager,worker,outsider]);
await db.exec("insert into members(email,name,role,username) values('manager@example.com','GESTOR','admin','gestor'),('worker@example.com','OPERADOR','operator','operador');");
async function who(id,email,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email,role})]);await db.exec('set role '+role)}
async function submit(payload){return(await db.query('select diesel_operation_submit($1::jsonb) result',[JSON.stringify(payload)])).rows[0].result}
async function getPhoto(id){return(await db.query('select diesel_occurrence_photo($1) result',[id])).rows[0].result}


await db.exec("insert into diesel_locations(local_code,material_code,last_meter,last_verified_meter) values('10','9',null,null),('11','9',null,700),('12','9',500,500);insert into fleets(id,name,type) values('123','CAMIONETE','Outro');");
await db.exec(await readFile('supabase/trial-recorder-readings.sql','utf8'));
let locations=(await db.query('select * from diesel_locations')).rows;
const seeded=Number(locations.find(l=>l.local_code==='10').last_meter);
assert.ok(seeded>=10000&&seeded<50000);
assert.equal(Number(locations.find(l=>l.local_code==='11').last_meter),700);
assert.equal(locations.find(l=>l.local_code==='12').simulated_meter,false);
assert.equal(Number(locations.find(l=>l.local_code==='12').last_meter),500);
await who(worker,'worker@example.com');
const catalog=(await db.query('select diesel_session() result')).rows[0].result;
assert.equal(catalog.locations.find(l=>l.local_code==='10').simulated_meter,true);
const base={kind:'refuel',mode:'manual',fleet:'123',localCode:'10',materialCode:'9',km:10,liters:20.5,measuredFields:{km:true,engine:false,elevator:false},createdAt:new Date().toISOString(),date:new Date().toISOString().slice(0,10)};
const r={...base,id:crypto.randomUUID()};
assert.equal((await submit(r)).recorderEnd,seeded+20.5);
assert.equal((await submit(r)).duplicate,true);
assert.equal((await submit(r)).recorderEnd,seeded+20.5);
assert.equal((await submit({...base,id:crypto.randomUUID(),liters:-1})).status,422);
const second={...base,id:crypto.randomUUID(),mode:'recorder',recorderStart:seeded+20.5,recorderEnd:seeded+40.5,liters:20};
assert.equal((await submit(second)).id,second.id);
assert.equal((await submit({...second,id:crypto.randomUUID()})).status,409);
const lease=(await db.query('select diesel_device_register($1) result',[crypto.randomUUID()])).rows[0].result;
await who(null,null,'anon');
const bg={...base,id:crypto.randomUUID(),liters:10};
const deviceSubmit=async()=>(await db.query('select diesel_device_submit($1,$2::jsonb) result',[lease.token,JSON.stringify(bg)])).rows[0].result;
assert.equal((await deviceSubmit()).recorderEnd,seeded+50.5);
assert.equal((await deviceSubmit()).duplicate,true);
await who(outsider,'outsider@example.com');assert.equal((await submit({...base,id:crypto.randomUUID()})).status,403);
await who(worker,'worker@example.com');
const save=async payload=>(await db.query('select diesel_operations_admin($1::jsonb) result',[JSON.stringify(payload)])).rows[0].result;
assert.equal((await save({action:'location',localCode:'10',materialCode:'9',lastMeter:500})).status,403);
const transfer={id:crypto.randomUUID(),kind:'transfer',transferVersion:2,localCode:'10',materialCode:'9',destination:'11',createdAt:base.createdAt,recorderStart:seeded+50.5,recorderEnd:seeded+60.5};
assert.equal((await submit(transfer)).id,transfer.id);
await who(manager,'manager@example.com');
const verified=await save({action:'location',localCode:'10',materialCode:'9',lastMeter:60000});
assert.equal(verified.locations.find(l=>l.local_code==='10').simulated_meter,false);
await who(worker,'worker@example.com');
assert.ok((await submit({...base,id:crypto.randomUUID()})).id);
await who(manager,'manager@example.com');
assert.equal((await save(null)).locations.find(l=>l.local_code==='10').last_meter,null);
await db.close();
const loc=[{local_code:'10',material_code:'9',last_meter:100,simulated_meter:true}];
const queue=[{...base,id:'a',liters:20},{...base,id:'b',liters:30}];
assert.equal(recorderBase(loc,queue,'10','9'),150);
assert.equal(recorderBase(loc,queue,'10','9','b'),120);
assert.equal(transferRecorderBase(loc,queue,'10','9'),150);
assert.equal(recorderBase([{...loc[0],simulated_meter:false}],queue,'10','9'),null);
function input(value){return {value,hasAttribute:()=>false,selectionStart:value.length,validity:'',setCustomValidity(s){this.validity=s},setSelectionRange(s){this.selectionStart=s}}}
let field=input('100');formatNumericInput(field,{inputType:'insertText',data:'0'});assert.equal(field.value,'100');finishNumericInput(field);assert.equal(field.value,'100,00');assert.equal(parseNumber(field.value),100);
field=input('100.');formatNumericInput(field,{inputType:'insertText',data:'.'});assert.equal(field.value,'100,');field.value+='5';field.selectionStart=field.value.length;formatNumericInput(field,{});finishNumericInput(field);assert.equal(field.value,'100,50');
field=input('12345');field.selectionStart=3;formatNumericInput(field,{});assert.equal(field.value,'12.345');assert.equal(field.selectionStart,4);
field=input('-10');finishNumericInput(field);assert.ok(field.validity);assert.throws(()=>parseNumber(field.value));
console.log('Trial recorder baselines, preserved readings, retries, background delivery, physical verification, offline queues and normal numeric input passed.');
