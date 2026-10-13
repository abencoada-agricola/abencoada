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


await db.exec("insert into fleets(id,name,type,meter_fields,gmais_readings) values('1001','NOME ORIGINAL','Outro','{\"km\":true,\"engine\":false,\"elevator\":false}','{\"km\":12345,\"engine\":0,\"elevator\":0}'),('1002','COLHEDORA ORIGINAL','Colhedora','{\"km\":false,\"engine\":true,\"elevator\":true}','{\"km\":0,\"engine\":500,\"elevator\":0}');");
const sql=await readFile('supabase/simulated-readings.sql','utf8');await db.exec(sql);
await who(worker,'worker@example.com');
let session=(await db.query('select diesel_session() result')).rows[0].result;
const pickup=session.fleets.find(f=>f.id==='1001'),harvester=session.fleets.find(f=>f.id==='1002');
assert.equal(pickup.name,'NOME ORIGINAL');assert.equal(pickup.last_km,12345);assert.ok(pickup.last_engine>0);assert.ok(pickup.last_elevator>0);assert.deepEqual(pickup.gmais_readings.simulatedFields,['engine','elevator']);
assert.equal(harvester.name,'COLHEDORA ORIGINAL');assert.equal(harvester.last_engine,500);assert.ok(harvester.last_km>0);assert.ok(harvester.last_elevator>0);assert.deepEqual(harvester.gmais_readings.simulatedFields,['km','elevator']);
const record={id:crypto.randomUUID(),kind:'refuel',mode:'recorder',fleet:'1001',km:12360,measuredFields:pickup.meter_fields,localCode:'990001',materialCode:'990010',recorderStart:10000,recorderEnd:10050,liters:50,createdAt:new Date().toISOString(),date:new Date().toISOString().slice(0,10)};
assert.equal((await submit(record)).id,record.id);
let records=(await db.query('select diesel_records() result')).rows[0].result.records;assert.equal(records[0].is_test,true);
assert.equal((await submit({...record,id:crypto.randomUUID(),km:12340,recorderStart:10050,recorderEnd:10100})).status,422);
await db.exec('reset role');await db.exec("insert into diesel_locations(local_code,material_code,last_meter) values('1','9',1000)");await who(worker,'worker@example.com');
assert.equal((await submit({...record,id:crypto.randomUUID(),fleet:'990101',km:45020,localCode:'1',materialCode:'9',recorderStart:1000,recorderEnd:1050})).status,422);
await db.exec('reset role');await db.exec(sql);await who(worker,'worker@example.com');
session=(await db.query('select diesel_session() result')).rows[0].result;
assert.deepEqual(session.fleets.find(f=>f.id==='1001').gmais_readings,pickup.gmais_readings);
assert.equal(session.fleets.find(f=>f.id==='1001').last_km,12360);
assert.equal((await db.query('select diesel_records() result')).rows[0].result.records.length,1);
await db.close();console.log('Simulated catalog readings: names, positive baselines, reruns, validation and test-local tagging passed.');
