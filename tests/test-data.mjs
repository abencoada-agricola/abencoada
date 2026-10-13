import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;`);
for(const f of ['schema','usernames','field-access','mobile','operations','background-sync','gmais-readings','fuel-control','transfer-baseline','occurrence-photos','test-data'])await db.exec(await readFile('supabase/'+f+'.sql','utf8'));
const manager=crypto.randomUUID(),worker=crypto.randomUUID(),outsider=crypto.randomUUID();
await db.query('insert into auth.users values($1),($2),($3)',[manager,worker,outsider]);
await db.exec("insert into members(email,name,role,username) values('manager@example.com','GESTOR','admin','gestor'),('worker@example.com','OPERADOR','operator','operador');");
async function who(id,email,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email,role})]);await db.exec('set role '+role)}
async function submit(payload){return(await db.query('select diesel_operation_submit($1::jsonb) result',[JSON.stringify(payload)])).rows[0].result}
async function getPhoto(id){return(await db.query('select diesel_occurrence_photo($1) result',[id])).rows[0].result}

await who(worker,'worker@example.com');
const catalog=(await db.query('select diesel_session() result')).rows[0].result;
assert.equal(catalog.fleets.filter(f=>f.is_test).length,4);
assert.equal(catalog.fleets.find(f=>f.id==='990101').last_km,45000);
assert.equal(catalog.fleets.find(f=>f.id==='990102').last_engine,8500);
assert.equal(catalog.fleets.find(f=>f.id==='990104').last_elevator,4200);
assert.equal(catalog.locations.find(l=>l.local_code==='990001').last_meter,10000);
const createdAt=new Date().toISOString(),date=createdAt.slice(0,10);
const base={kind:'refuel',mode:'recorder',localCode:'990001',materialCode:'990010',date,createdAt};
let meter=10000;
for(const [fleet,values,liters] of [['990101',{km:45020},50],['990102',{km:180010,engine:8501},100],['990103',{engine:3201},50],['990104',{engine:5601,elevator:4201},100]]){
 const record={...base,id:crypto.randomUUID(),fleet,...values,liters,measuredFields:catalog.fleets.find(f=>f.id===fleet).meter_fields,recorderStart:meter,recorderEnd:meter+liters};
 assert.equal((await submit({...record,...Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v-100]))})).status,422);
 assert.equal((await submit(record)).id,record.id);assert.equal((await submit(record)).duplicate,true);meter+=liters;
}
const records=(await db.query('select diesel_records() result')).rows[0].result.records;
assert.equal(records.length,4);assert.ok(records.every(r=>r.is_test));
await db.exec('reset role');await db.exec("insert into fleets(id,name,type) values('1001','FROTA REAL','Outro');insert into diesel_locations(local_code,material_code,last_meter) values('1','990010',500);");
await who(worker,'worker@example.com');
const mismatch={...base,id:crypto.randomUUID(),fleet:'990101',km:45050,liters:10,measuredFields:{km:true,engine:false,elevator:false},localCode:'1',recorderStart:500,recorderEnd:510};
assert.equal((await submit(mismatch)).status,422);
assert.equal((await db.query('select diesel_records() result')).rows[0].result.records.length,4);
const transfer={id:crypto.randomUUID(),kind:'transfer',transferVersion:2,localCode:'990001',materialCode:'990010',destination:'1',createdAt,recorderStart:meter,recorderEnd:meter+25};
assert.equal((await submit(transfer)).status,422);
assert.equal((await submit({...transfer,destination:'990002'})).id,transfer.id);
const occurrence={id:crypto.randomUUID(),kind:'occurrence',localCode:'990002',materialCode:'990010',createdAt,notes:'TESTE DE OCORRÊNCIA'};
assert.equal((await submit(occurrence)).id,occurrence.id);
await who(manager,'manager@example.com');
const operations=(await db.query('select diesel_operations_admin() result')).rows[0].result.operations;
assert.ok(operations.every(o=>o.is_test));
await db.exec('reset role');await db.exec(await readFile('supabase/test-data.sql','utf8'));
assert.equal(Number((await db.query("select last_meter from diesel_locations where local_code='990001'")).rows[0].last_meter),meter+25);
assert.equal(Number((await db.query("select last_meter from diesel_locations where local_code='1'")).rows[0].last_meter),500);
assert.equal(Number((await db.query("select count(*) n from records")).rows[0].n),4);
const seed=await readFile('supabase/test-data.sql','utf8');await db.exec("update fleets set is_test=false where id='990101'");
await assert.rejects(()=>db.exec(seed),/Código de teste já utilizado/);await db.exec('rollback');
await db.close();console.log('Test fleet seeds: previous readings, all meter types, submissions, transfers, test tagging and non-resetting seed passed.');
