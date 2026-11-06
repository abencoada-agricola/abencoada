import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Database,manifest,qname,decodeRow} from './database.mjs';
import {applyParitySchema} from './parity-schema.mjs';
const source=JSON.parse(await readFile(process.argv.slice(2).find(arg=>!arg.startsWith('--'))||'sqlserver/exports/supabase-2026-11-05.json','utf8'));
assert.equal(source.format,'abencoada-migration-v2');assert.equal(source.columns.length,125);
const order=['public.members','public.fleets','public.settings','public.diesel_materials','public.diesel_locations','public.records','public.diesel_operations','public.diesel_checklist_templates','public.diesel_checklists','private.diesel_devices','private.diesel_occurrence_photos','private.login_attempts','private.record_control_audit','private.user_access_audit','private.removed_members'];
function normalize(value,c){if(value==null)return null;if(c.type==='timestamp with time zone'){const fraction=(value.match(/\.(\d+)/)?.[1]||'').padEnd(7,'0');return String(BigInt(Date.parse(value))*10000n+BigInt(fraction.slice(3)))}if(c.type==='jsonb')return canonical(value);if(c.type==='date')return value.slice(0,10);return value}
function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v}
export function compareRows(t,a,b){const normalized=rows=>rows.map(row=>JSON.stringify(Object.fromEntries(t.columns.map(c=>[c.name,normalize(row[c.name],c)])))).sort();assert.deepEqual(normalized(a),normalized(b),'Data differs: '+t.name)}
const db=new Database(),rollback=Error('DRY_RUN');let report;
try{await db.transaction(async()=>{
 for(const name of order.filter(x=>!['public.members','public.settings','private.login_attempts'].includes(x))){const [r]=await db.query(`SELECT COUNT(*) n FROM ${qname(name)}`);assert.equal(r.n,0,'Target already contains operational data: '+name)}
 // The prior bootstrap account/settings are replaced by the exact exported application rows.
 await db.query('DELETE FROM app_auth.sessions; DELETE FROM [app].members; DELETE FROM [app].settings; DELETE FROM [private].login_attempts; DELETE FROM app_auth.users;');
 for(const u of source.users){assert(/^\$2[aby]\$/.test(u.encrypted_password),'Unsupported source password hash');await db.query('INSERT INTO app_auth.users(id,email,password_hash) VALUES(@id,@email,@hash)',{id:u.id,email:u.email,hash:u.encrypted_password})}
 for(const name of order){const t=manifest.find(t=>t.name===name),rows=structuredClone(source.tables[name]);assert(Array.isArray(rows));for(const c of t.columns){const live=source.columns.find(l=>l.table_schema+'.'+l.table_name===name&&l.column_name===c.name);assert(live&&live.data_type===c.type&&(live.is_nullable==='YES')===c.nullable,'Column drift: '+name+'.'+c.name)}
  if(name==='public.records'){const pending=[...rows],sorted=[],done=new Set();while(pending.length){const i=pending.findIndex(r=>!r.previous_record_id||done.has(r.previous_record_id));assert(i>=0,'Cyclic previous_record_id');const [r]=pending.splice(i,1);sorted.push(r);done.add(r.id)}rows.splice(0,rows.length,...sorted)}
  const identity=t.columns.some(c=>c.identity);if(identity)await db.query(`SET IDENTITY_INSERT ${qname(name)} ON`);
  for(const row of rows){const params={};for(const c of t.columns)params[c.name]=c.type==='jsonb'&&row[c.name]!=null?JSON.stringify(row[c.name]):row[c.name];await db.query(`INSERT INTO ${qname(name)}(${t.columns.map(c=>'['+c.name+']').join(',')}) VALUES(${t.columns.map(c=>c.type==='bytea'?`CONVERT(varbinary(32),SUBSTRING(@${c.name},3,64),2)`:'@'+c.name).join(',')})`,params)}
  if(identity)await db.query(`SET IDENTITY_INSERT ${qname(name)} OFF`);
 }
 const schema=await applyParitySchema(db,source),tables={};
 for(const t of manifest){const actual=(await db.query(`SELECT * FROM ${qname(t.name)}`)).map(r=>decodeRow(t,r));compareRows(t,source.tables[t.name],actual);tables[t.name]={rows:actual.length,everyColumnEqual:true}}
 const users=await db.query('SELECT id,email,password_hash FROM app_auth.users');assert.equal(users.length,source.users.length);for(const u of source.users)assert(users.some(a=>a.id===u.id&&a.email===u.email&&a.password_hash===u.encrypted_password),'Identity or password hash mismatch');
 report={exportedAt:source.exportedAt,validatedAt:new Date().toISOString(),database:process.env.SQL_DATABASE||'app_abencoada',mode:process.argv.includes('--apply')?'committed':'dry-run',tables,users:users.length,passwordHashesPreserved:true,...schema,limitations:['PostgreSQL types converted to SQL Server types','PL/pgSQL RPC and RLS behavior implemented by local API; not byte-identical database functions','Supabase cloud sessions, external services and APK deployment are not replaced']};
 if(!process.argv.includes('--apply'))throw rollback;
})}catch(e){if(e!==rollback)throw e}finally{db.close()}
await writeFile('sqlserver/exports/migration-result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({mode:report.mode,tables:Object.keys(report.tables).length,rows:Object.values(report.tables).reduce((n,t)=>n+t.rows,0),users:report.users,allValuesEqual:true,sourceChecks:report.sourceChecks,triggerRules:report.triggerRules},null,2));
