import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {isPhoto,MAX_PHOTO_LENGTH} from '../mobile/photo.js';
const photo='data:image/jpeg;base64,'+Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64');
assert.equal(isPhoto(photo),true);assert.equal(isPhoto('data:image/svg+xml;base64,PHN2Zz4='),false);assert.equal(isPhoto(photo+'A'.repeat(MAX_PHOTO_LENGTH)),false);
const db=new PGlite();
await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;`);
for(const f of ['schema','usernames','field-access','mobile','operations','background-sync','gmais-readings','fuel-control','transfer-baseline','occurrence-photos'])await db.exec(await readFile('supabase/'+f+'.sql','utf8'));
const manager=crypto.randomUUID(),worker=crypto.randomUUID(),outsider=crypto.randomUUID();
await db.query('insert into auth.users values($1),($2),($3)',[manager,worker,outsider]);
await db.exec("insert into members(email,name,role,username) values('manager@example.com','GESTOR','admin','gestor'),('worker@example.com','OPERADOR','operator','operador');");
async function who(id,email,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,email,role})]);await db.exec('set role '+role)}
async function submit(payload){return(await db.query('select diesel_operation_submit($1::jsonb) result',[JSON.stringify(payload)])).rows[0].result}
async function getPhoto(id){return(await db.query('select diesel_occurrence_photo($1) result',[id])).rows[0].result}
const record={id:crypto.randomUUID(),kind:'occurrence',localCode:'1',materialCode:'9',createdAt:new Date().toISOString(),notes:'FOTO DA OCORRÊNCIA',photo};
await who(outsider,'outsider@example.com');assert.equal((await submit(record)).status,403);
await who(worker,'worker@example.com');
for(const invalid of ['data:image/svg+xml;base64,PHN2Zz4=',photo+'A'.repeat(MAX_PHOTO_LENGTH),'data:image/jpeg;base64,/9j/AAAA',123])assert.equal((await submit({...record,photo:invalid})).status,422);
assert.equal((await submit({...record,kind:'transfer'})).status,422);
assert.equal((await submit({...record,notes:''})).status,422);
assert.equal((await submit(record)).id,record.id);assert.equal((await submit(record)).duplicate,true);
assert.equal((await getPhoto(record.id)).status,403);
await assert.rejects(()=>db.query('select * from private.diesel_occurrence_photos'),/permission denied/);
await assert.rejects(()=>db.query('select private.diesel_operation_submit_before_photos($1::jsonb)',[JSON.stringify(record)]),/permission denied/);
const lease=(await db.query('select diesel_device_register($1) result',[crypto.randomUUID()])).rows[0].result;
await who(null,null,'anon');await assert.rejects(()=>getPhoto(record.id),/permission denied/);
const background={...record,id:crypto.randomUUID()};
assert.equal((await db.query('select diesel_device_submit($1,$2::jsonb) result',[lease.token,JSON.stringify(background)])).rows[0].result.id,background.id);
await who(manager,'manager@example.com');
assert.equal((await getPhoto(record.id)).photo,photo);assert.equal((await getPhoto(background.id)).photo,photo);
assert.equal((await getPhoto(crypto.randomUUID())).status,404);
const ops=(await db.query('select diesel_operations_admin() result')).rows[0].result.operations;
assert.equal(ops.length,2);assert.ok(ops.every(o=>o.has_photo));assert.ok(!JSON.stringify(ops).includes('base64'));
await who(worker,'worker@example.com');assert.equal((await submit({...record,id:crypto.randomUUID(),photo:null})).id!==undefined,true);
await who(manager,'manager@example.com');assert.equal((await submit({...record,photo:'data:image/jpeg;base64,/9j/AAAA/9k='})).status,409);
assert.equal((await getPhoto(record.id)).photo,photo);
await db.close();console.log('Occurrence photos: validation, access, atomic queue delivery, duplicates and lazy admin retrieval passed.');
