import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {canUseElevator,fleetMeters} from '../mobile/fleet-qr.js';
for(const type of ['Outro','Caminhão']){assert.equal(canUseElevator({type}),false);assert.deepEqual(fleetMeters({type,meter_fields:{km:true,engine:true,elevator:true}}),{km:true,engine:true,elevator:false})}
assert.deepEqual(fleetMeters({type:'Outro',meter_fields:{km:false,engine:false,elevator:true}}),{km:true,engine:false,elevator:false});
assert.equal(fleetMeters({type:'Colhedora',meter_fields:{km:false,engine:true,elevator:true}}).elevator,true);
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;`);
for(const f of ['schema','usernames','field-access','mobile','operations','background-sync','gmais-readings','fuel-control','transfer-baseline','occurrence-photos','test-data','simulated-readings','vehicle-meters'])await db.exec(await readFile('supabase/'+f+'.sql','utf8'));
const manager=crypto.randomUUID(),worker=crypto.randomUUID(),outsider=crypto.randomUUID();
await db.query('insert into auth.users values($1),($2),($3)',[manager,worker,outsider]);
await db.exec("insert into members(email,name,role,username) values('manager@example.com','GESTOR','admin','gestor'),('worker@example.com','OPERADOR','operator','operador');");
async function who(id,email,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email,role})]);await db.exec('set role '+role)}
async function submit(payload){return(await db.query('select diesel_operation_submit($1::jsonb) result',[JSON.stringify(payload)])).rows[0].result}
async function getPhoto(id){return(await db.query('select diesel_occurrence_photo($1) result',[id])).rows[0].result}

await who(manager,'manager@example.com');
const save=async payload=>(await db.query('select diesel_admin_save($1::jsonb) result',[JSON.stringify(payload)])).rows[0].result;
assert.equal((await save({action:'fleet',id:'123',name:'CAMIONETE',type:'Outro'})).ok,true);
assert.equal((await save({action:'fleet-meters',id:'123',meterFields:{km:true,engine:true,elevator:true}})).ok,true);
let catalog=(await db.query('select diesel_session() result')).rows[0].result;
assert.equal(catalog.fleets.find(f=>f.id==='123').meter_fields.elevator,false);
assert.equal(catalog.fleets.find(f=>f.id==='990104').meter_fields.elevator,true);
assert.equal((await save({action:'fleet',id:'124',name:'ÔNIBUS',type:'Outro'})).ok,true);
assert.equal((await save({action:'fleet-meters',id:'124',meterFields:{km:false,engine:false,elevator:true}})).ok,true);
catalog=(await db.query('select diesel_session() result')).rows[0].result;
assert.deepEqual(catalog.fleets.find(f=>f.id==='124').meter_fields,{km:true,engine:false,elevator:false});
assert.equal((await save({action:'fleet-edit',id:'990104',name:'CAMINHÃO',model:'',active:true,type:'Caminhão',tankCapacity:600})).ok,true);
catalog=(await db.query('select diesel_session() result')).rows[0].result;assert.equal(catalog.fleets.find(f=>f.id==='990104').meter_fields.elevator,false);
await who(worker,'worker@example.com');
const payload={id:crypto.randomUUID(),kind:'refuel',mode:'manual',fleet:'123',localCode:'1',materialCode:'9',km:10,engine:1,liters:10,measuredFields:{km:true,engine:true,elevator:false},createdAt:new Date().toISOString(),date:new Date().toISOString().slice(0,10)};
assert.equal((await submit(payload)).id,payload.id);
assert.equal((await submit({...payload,id:crypto.randomUUID(),measuredFields:{km:true,engine:true,elevator:true},elevator:1})).status,422);
await db.close();console.log('Vehicle meters: machine eligibility, cached catalogs, admin edits, type changes and submissions passed.');
