import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const db=new PGlite();await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;`);
for(const f of ['schema','usernames','field-access','mobile','operations','background-sync','gmais-readings','fuel-control','transfer-baseline','occurrence-photos','test-data','simulated-readings','vehicle-meters','trial-recorder-readings','android-only','record-controls','tank-references','checklists','user-access','member-removal','operation-fleets'])await db.exec(await readFile('supabase/'+f+'.sql','utf8'));
const manager=crypto.randomUUID(),worker=crypto.randomUUID(),other=crypto.randomUUID();await db.query('insert into auth.users values($1),($2),($3)',[manager,worker,other]);await db.exec(`insert into members(email,name,role,username) values('manager@example.com','GESTOR','admin','gestor'),('worker@example.com','OPERADOR','operator','operador'),('other@example.com','OUTRO','operator','outro');insert into fleets(id,name,type) values('1001','CAMIONETE','Outro'),('1002','TRATOR','Trator');`);
async function who(id,email,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email,role})]);await db.exec('set role '+role)}
async function rpc(name,payload){return(await db.query('select '+name+(name==='diesel_admin'?'() result':'($1::jsonb) result'),name==='diesel_admin'?[]:[JSON.stringify(payload)])).rows[0].result}
await who(worker,'worker@example.com');
const occurrence={id:crypto.randomUUID(),kind:'occurrence',localCode:'1',materialCode:'9',notes:'CONFERIR BOMBA',createdAt:new Date().toISOString(),fleet:' 1001 '};
assert.equal((await rpc('diesel_operation_submit',occurrence)).id,occurrence.id);
const transfer={id:crypto.randomUUID(),kind:'transfer',localCode:'1',materialCode:'9',destination:'2',createdAt:new Date().toISOString(),fleet:'1002'};
assert.equal((await rpc('diesel_operation_submit',transfer)).id,transfer.id);
for(const fleet of [undefined,'',null])assert.ok((await rpc('diesel_operation_submit',{...occurrence,id:crypto.randomUUID(),fleet})).id);
for(const fleet of ['9999',1001,{},['1001']])assert.equal((await rpc('diesel_operation_submit',{...occurrence,id:crypto.randomUUID(),fleet})).status,422);
assert.equal((await rpc('diesel_operation_submit',{...occurrence,fleet:'1002'})).duplicate,true);
await assert.rejects(()=>db.query('select private.operation_submit_before_fleet_link($1::jsonb)',[JSON.stringify(occurrence)]),/permission denied/);
const lease=(await db.query('select diesel_device_register($1) result',[crypto.randomUUID()])).rows[0].result;
await who(null,null,'anon');const queued={...occurrence,id:crypto.randomUUID(),fleet:'1002'};assert.equal((await db.query('select diesel_device_submit($1,$2::jsonb) result',[lease.token,JSON.stringify(queued)])).rows[0].result.id,queued.id);
await who(manager,'manager@example.com');const operations=(await rpc('diesel_operations_admin',null)).operations;assert.equal(operations.find(o=>o.id===occurrence.id).fleet,'1001');assert.equal(operations.find(o=>o.id===transfer.id).fleet,'1002');assert.equal(operations.find(o=>o.id===queued.id).fleet,'1002');
await rpc('diesel_admin_save',{action:'member-access',email:'worker@example.com',role:'operator',permissions:{refuel:true,transfer:false,checklist:true}});
await who(worker,'worker@example.com');assert.equal((await rpc('diesel_operation_submit',{...transfer,id:crypto.randomUUID()})).status,403);assert.equal((await rpc('diesel_operation_submit',transfer)).duplicate,true);
await who(other,'other@example.com');assert.equal((await rpc('diesel_operation_submit',occurrence)).status,409);
await db.close();console.log('Optional operation fleets, legacy payloads, validation, immutable retry links, current permissions and native background delivery passed.');
