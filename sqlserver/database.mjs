import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export const manifest=JSON.parse(await readFile(new URL('./manifest.json',import.meta.url),'utf8'));
const q=x=>'['+x+']';
export const qname=x=>x.replace(/^public\./,'app.').split('.').map(q).join('.');
export class Database{
 constructor(name=process.env.SQL_DATABASE||'app_abencoada'){
  if(!/^[\p{L}][\p{L}\p{N} _-]{0,100}$/u.test(name))throw Error('Invalid database name');
  this.process=spawn('powershell.exe',['-NoProfile','-File',fileURLToPath(new URL('./bridge.ps1',import.meta.url)),'-Database',name,'-Server',process.env.SQL_SERVER||'localhost'],{windowsHide:true,stdio:['pipe','pipe','pipe']});this.pending=[];this.tail=Promise.resolve();this.failure=null;
  createInterface({input:this.process.stdout}).on('line',line=>{const p=this.pending.shift();if(!p)return;try{const r=JSON.parse(line.replace(/^\uFEFF/,''));r.error?p.reject(Error(r.error)):p.resolve(r)}catch(e){p.reject(e)}});
  this.process.stderr.on('data',d=>{this.failure=Error(String(d))});
  this.process.on('error',e=>this.fail(e));this.process.on('exit',code=>this.fail(this.failure||Error('SQL bridge exited: '+code)));
 }
 fail(e){this.failure=e;for(const p of this.pending.splice(0))p.reject(e)}
 send(request){if(this.failure)return Promise.reject(this.failure);return new Promise((resolve,reject)=>{this.pending.push({resolve,reject});this.process.stdin.write(JSON.stringify(request)+'\n')})}
 async query(sql,params={}){return (await this.send({sql,params})).rows||[]}
 exclusive(fn){const run=this.tail.then(fn);this.tail=run.catch(()=>{});return run}
 transaction(fn){return this.exclusive(async()=>{await this.send({action:'begin'});try{await this.query("DECLARE @r int; EXEC @r=sp_getapplock @Resource='AbencoadaLocalAPI',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=15000; IF @r<0 THROW 51000,'Database busy',1;");const result=await fn(this);await this.send({action:'commit'});return result}catch(e){await this.send({action:'rollback'});throw e}})}
 close(){this.process.stdin.end()}
}
export function decodeRow(t,row){for(const c of t.columns)if(row[c.name]!=null){if(c.type==='jsonb')row[c.name]=JSON.parse(row[c.name]);if(c.type==='boolean')row[c.name]=Boolean(row[c.name]);if(c.type==='date')row[c.name]=row[c.name].slice(0,10)}return row}
export function defaultRow(t,data){const row={};for(const c of t.columns){if(c.identity)continue;if(c.name in data)row[c.name]=data[c.name];else if(c.default==='now()')row[c.name]=new Date().toISOString();else if(c.default==='true'||c.default==='false')row[c.name]=c.default==='true';else if(c.default){const v=c.default.replace(/::(text|jsonb|numeric|integer|boolean)$/,'');row[c.name]=c.type==='jsonb'?JSON.parse(v.slice(1,-1)):v.startsWith("'")?v.slice(1,-1).replaceAll("''","'"):Number(v)}else row[c.name]=null}return row}
export class Store{
 constructor(db){this.db=db;this.tables={};this.before={}}
 async load(){for(const t of manifest){this.tables[t.name]=(await this.db.query(`SELECT * FROM ${qname(t.name)}`)).map(r=>decodeRow(t,r));this.before[t.name]=structuredClone(this.tables[t.name])}return this}
 rows(name){return this.tables[name.includes('.')?name:'public.'+name]}
 add(name,data){const full=name.includes('.')?name:'public.'+name,t=manifest.find(t=>t.name===full),row=defaultRow(t,data);if(t.columns.some(c=>c.identity))row.id=Math.max(0,...this.rows(full).map(r=>Number(r.id)))+1;this.rows(full).push(row);return row}
 async flush(){
  // Child removals first; parent inserts first. Identities are supplied only by SQL Server.
  const order=['public.members','public.fleets','public.settings','public.diesel_materials','public.diesel_locations','public.records','public.diesel_operations','public.diesel_checklist_templates','public.diesel_checklists','private.diesel_devices','private.diesel_occurrence_photos','private.login_attempts','private.record_control_audit','private.user_access_audit','private.removed_members'];
  const pk=t=>t.keys.find(k=>k.type==='p').definition.match(/\(([^)]+)\)/)[1].split(', ').map(x=>x.replaceAll('"',''));
  const key=(row,keys)=>JSON.stringify(keys.map(k=>row[k]));
  for(const name of [...order].reverse()){const t=manifest.find(t=>t.name===name),keys=pk(t),now=new Set(this.rows(name).map(r=>key(r,keys)));for(const row of this.before[name])if(!now.has(key(row,keys)))await this.db.query(`DELETE FROM ${qname(name)} WHERE ${keys.map((k,i)=>q(k)+'=@k'+i).join(' AND ')}`,Object.fromEntries(keys.map((k,i)=>['k'+i,row[k]])))}
  for(const name of order){const t=manifest.find(t=>t.name===name),keys=pk(t),old=new Map(this.before[name].map(r=>[key(r,keys),r]));for(const row of this.rows(name)){const previous=old.get(key(row,keys));if(JSON.stringify(previous)===JSON.stringify(row))continue;const cols=t.columns.filter(c=>!c.identity&&(!previous||!keys.includes(c.name)));const params={};for(const c of cols)params[c.name]=c.type==='jsonb'&&row[c.name]!=null?JSON.stringify(row[c.name]):row[c.name];const value=c=>c.type==='bytea'?`CONVERT(varbinary(32),SUBSTRING(@${c.name},3,64),2)`:'@'+c.name;if(previous){keys.forEach((k,i)=>params['key'+i]=row[k]);await this.db.query(`UPDATE ${qname(name)} SET ${cols.map(c=>q(c.name)+'='+value(c)).join(',')} WHERE ${keys.map((k,i)=>q(k)+'=@key'+i).join(' AND ')}`,params)}else await this.db.query(`INSERT INTO ${qname(name)}(${cols.map(c=>q(c.name)).join(',')}) VALUES(${cols.map(value).join(',')})`,params)}}
  this.before=structuredClone(this.tables);
 }
}
