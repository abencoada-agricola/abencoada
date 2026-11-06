import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const path=process.argv[2]||'sqlserver/exports/supabase-2026-11-05.json',raw=await readFile(path),data=JSON.parse(raw);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const tables={};
for(const [name,rows] of Object.entries(data.tables)){assert(Array.isArray(rows));tables[name]={rows:rows.length,sha256:hash(rows.map(r=>JSON.stringify(canonical(r))).sort())}}
const users=new Set(data.users.map(u=>u.id)),fleets=new Set(data.tables['public.fleets'].map(f=>f.id)),records=new Set(data.tables['public.records'].map(r=>r.id)),operations=new Set(data.tables['public.diesel_operations'].map(r=>r.id));
for(const r of data.tables['public.records']){assert(fleets.has(r.fleet));assert(!r.user_id||users.has(r.user_id));assert(!r.previous_record_id||records.has(r.previous_record_id));assert.equal(typeof r.liters,'number')}
for(const r of data.tables['private.diesel_occurrence_photos']){assert(operations.has(r.operation_id));assert(r.data_url.startsWith('data:image/jpeg;base64,'));const bytes=Buffer.from(r.data_url.slice(23),'base64');assert.equal(bytes.subarray(0,3).toString('hex'),'ffd8ff');assert.equal(bytes.subarray(-2).toString('hex'),'ffd9')}
for(const r of data.tables['public.diesel_checklists'])assert(data.tables['public.diesel_checklist_templates'].some(t=>t.fleet===r.fleet&&t.version===r.template_version));
const result={exportedAt:data.exportedAt,packageSha256:createHash('sha256').update(raw).digest('hex'),tableCount:Object.keys(tables).length,columnCount:data.columns.length,totalRows:Object.values(tables).reduce((n,t)=>n+t.rows,0),users:data.users.length,foreignKeySamples:'passed',jpegIntegrity:'passed',tables};
await writeFile('sqlserver/exports/integrity-report.json',JSON.stringify(result,null,2)+'\n');console.log('Export integrity passed: '+result.tableCount+' tables, '+result.totalRows+' rows, '+result.users+' identities.');
