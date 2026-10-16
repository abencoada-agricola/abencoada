import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const db=new PGlite();await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;`);
for(const f of ['schema','usernames','field-access','mobile','operations','background-sync','gmais-readings','fuel-control','transfer-baseline','occurrence-photos','test-data','simulated-readings','vehicle-meters','trial-recorder-readings','android-only','record-controls','tank-references','checklists','user-access','member-removal'])await db.exec(await readFile('supabase/'+f+'.sql','utf8'));
const manager=crypto.randomUUID(),worker=crypto.randomUUID(),other=crypto.randomUUID();await db.query('insert into auth.users values($1),($2),($3)',[manager,worker,other]);await db.exec(`insert into members(email,name,role,username) values('manager@example.com','GESTOR','admin','gestor'),('worker@example.com','OPERADOR','operator','operador'),('other@example.com','OUTRO','operator','outro');insert into fleets(id,name,type) values('1001','CAMIONETE','Outro'),('1002','TRATOR','Trator');`);
async function who(id,email,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email,role})]);await db.exec('set role '+role)}
async function rpc(name,payload){return(await db.query('select '+name+(name==='diesel_admin'?'() result':'($1::jsonb) result'),name==='diesel_admin'?[]:[JSON.stringify(payload)])).rows[0].result}
const remove=email=>rpc('diesel_admin_save',{action:'member-remove',email});
const restore=email=>rpc('diesel_admin_save',{action:'member-restore',email});
await who(worker,'worker@example.com');assert.equal((await remove('other@example.com')).status,403);assert.equal((await restore('other@example.com')).status,403);
const lease=(await db.query('select diesel_device_register($1) result',[crypto.randomUUID()])).rows[0].result;
const entry={id:crypto.randomUUID(),kind:'refuel',fleet:'1001',mode:'manual',date:'2026-01-01',createdAt:new Date().toISOString(),localCode:'1',materialCode:'9',km:100,liters:30,measuredFields:{km:true,engine:false,elevator:false}};
assert.equal((await rpc('diesel_operation_submit',entry)).id,entry.id);
await who(manager,'manager@example.com');assert.equal((await remove('manager@example.com')).status,422);assert.equal((await remove('missing@example.com')).status,404);
assert.equal((await remove(' WORKER@EXAMPLE.COM ')).ok,true);assert.equal((await remove('worker@example.com')).status,404);
let team=await rpc('diesel_admin');assert.equal(team.members.some(m=>m.email==='worker@example.com'),false);assert.equal(team.removedMembers[0].username,'operador');
assert.equal((await rpc('diesel_admin_save',{action:'member',email:'worker@example.com',name:'RECRIADO',username:'operador',role:'operator'})).status,409);
await who(worker,'worker@example.com');assert.equal((await db.query('select diesel_session() result')).rows[0].result.status,403);assert.equal((await rpc('diesel_admin')).status,403);assert.equal((await rpc('diesel_operation_submit',{...entry,id:crypto.randomUUID()})).status,403);
assert.equal((await rpc('diesel_operation_submit',{id:crypto.randomUUID(),kind:'occurrence',text:'TESTE'})).status,403);
assert.equal((await db.query('select diesel_device_register($1) result',[crypto.randomUUID()])).rows[0].result.status,403);
await assert.rejects(()=>db.query('select * from private.removed_members'),/permission denied/);await assert.rejects(()=>db.query('select private.admin_save_before_member_removal($1::jsonb)',[JSON.stringify({action:'member',email:'worker@example.com'})]),/permission denied/);
await who(null,null,'anon');assert.equal((await db.query('select diesel_device_submit($1,$2::jsonb) result',[lease.token,JSON.stringify({...entry,id:crypto.randomUUID()})])).rows[0].result.status,403);
await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from records where id=$1',[entry.id])).rows[0].n,1);assert.equal((await db.query('select count(*)::int n from auth.users where id=$1',[worker])).rows[0].n,1);
assert.equal((await db.query("select diesel_login_target('operador','test') result")).rows[0].result.email,null);
// Restoration is explicit, recovers the previous profile and does not revive device leases.
await who(manager,'manager@example.com');assert.equal((await restore('worker@example.com')).ok,true);team=await rpc('diesel_admin');assert.equal(team.removedMembers.length,0);assert.equal(team.members.find(m=>m.email==='worker@example.com').role,'operator');assert.equal((await restore('worker@example.com')).status,404);
await who(worker,'worker@example.com');assert.equal((await db.query('select diesel_session() result')).rows[0].result.user.name,'OPERADOR');
await who(null,null,'anon');assert.equal((await db.query('select diesel_device_submit($1,$2::jsonb) result',[lease.token,JSON.stringify({...entry,id:crypto.randomUUID()})])).rows[0].result.status,403);
// Username conflicts roll back restoration and keep the recoverable archive.
await who(manager,'manager@example.com');await remove('worker@example.com');await rpc('diesel_admin_save',{action:'member',email:'new@example.com',name:'NOVO',username:'operador',role:'operator'});assert.equal((await restore('worker@example.com')).status,409);assert.equal((await rpc('diesel_admin')).removedMembers.length,1);
// Another administrator may be removed, but the acting administrator always remains.
await rpc('diesel_admin_save',{action:'member-access',email:'other@example.com',role:'admin',permissions:{refuel:true,transfer:true,checklist:true}});assert.equal((await remove('other@example.com')).ok,true);
await db.exec('reset role');assert.ok((await db.query("select count(*)::int n from private.user_access_audit where new_access->>'removed'='true'")).rows[0].n>=3);
await db.close();console.log('Administrator-only recoverable member removal, self-protection, history preservation, login and device revocation, restoration and conflict rollback passed.');
