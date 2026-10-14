import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;`);
for(const f of ['schema','usernames','field-access','mobile','operations','background-sync','gmais-readings','fuel-control','transfer-baseline','occurrence-photos','test-data','simulated-readings','vehicle-meters'])await db.exec(await readFile('supabase/'+f+'.sql','utf8'));
const manager=crypto.randomUUID(),worker=crypto.randomUUID(),outsider=crypto.randomUUID();
await db.query('insert into auth.users values($1),($2),($3)',[manager,worker,outsider]);
await db.exec("insert into members(email,name,role,username) values('manager@example.com','GESTOR','admin','gestor'),('worker@example.com','OPERADOR','operator','operador');");
async function who(id,email,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email,role})]);await db.exec('set role '+role)}
async function submit(payload){return(await db.query('select diesel_operation_submit($1::jsonb) result',[JSON.stringify(payload)])).rows[0].result}
async function getPhoto(id){return(await db.query('select diesel_occurrence_photo($1) result',[id])).rows[0].result}



await db.exec(await readFile('supabase/trial-recorder-readings.sql','utf8'));
await db.exec(await readFile('supabase/android-only.sql','utf8'));
await db.exec("insert into fleets(id,name,type) values('123','CAMIONETE','Outro');insert into diesel_locations(local_code,material_code,last_meter) values('1','9',1000);");
await who(worker,'worker@example.com');
for(const name of ['diesel_submit','diesel_field_submit'])await assert.rejects(()=>db.query('select '+name+'($1::jsonb)',[JSON.stringify({})]),/permission denied/);
const record={id:crypto.randomUUID(),kind:'refuel',mode:'manual',fleet:'123',localCode:'1',materialCode:'9',km:10,liters:20,measuredFields:{km:true,engine:false,elevator:false},createdAt:new Date().toISOString(),date:new Date().toISOString().slice(0,10)};
assert.equal((await submit(record)).id,record.id);
assert.equal((await submit(record)).duplicate,true);
const photo='data:image/jpeg;base64,'+Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64');
const occurrence={id:crypto.randomUUID(),kind:'occurrence',localCode:'1',materialCode:'9',createdAt:new Date().toISOString(),notes:'OCORRÊNCIA COM FOTO',photo};
assert.equal((await submit(occurrence)).id,occurrence.id);assert.equal((await submit(occurrence)).duplicate,true);
assert.equal((await submit({...occurrence,id:crypto.randomUUID(),photo:null})).id!==undefined,true);

const lease=(await db.query('select diesel_device_register($1) result',[crypto.randomUUID()])).rows[0].result;
await who(null,null,'anon');
for(const name of ['diesel_submit','diesel_field_submit'])await assert.rejects(()=>db.query('select '+name+'($1::jsonb)',[JSON.stringify({})]),/permission denied/);
const background={...record,id:crypto.randomUUID(),km:20};
assert.equal((await db.query('select diesel_device_submit($1,$2::jsonb) result',[lease.token,JSON.stringify(background)])).rows[0].result.id,background.id);
assert.ok((await db.query('select diesel_field_session() result')).rows[0].result.fleets.length);
const bgOccurrence={...occurrence,id:crypto.randomUUID()};assert.equal((await db.query('select diesel_device_submit($1,$2::jsonb) result',[lease.token,JSON.stringify(bgOccurrence)])).rows[0].result.id,bgOccurrence.id);
await who(manager,'manager@example.com');assert.equal((await db.query('select diesel_records() result')).rows[0].result.records.length,2);
await db.close();console.log('Web entry disabled; Android foreground, background, retries, catalog and administration passed.');
