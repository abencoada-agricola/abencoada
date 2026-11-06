import {readFile,writeFile,mkdir} from 'node:fs/promises';
const csv=await readFile(process.argv[2],'utf8');
let value=csv.slice(csv.indexOf('\n')+1).trim();if(value.startsWith('"'))value=value.slice(1,-1).replaceAll('""','"');
const raw=Buffer.from(value.replace(/\s/g,''),'base64').toString('utf8'),data=JSON.parse(raw);
await mkdir('sqlserver/exports',{recursive:true});await writeFile('sqlserver/exports/supabase-2026-11-05.json',raw);
console.log(JSON.stringify({format:data.format,tables:Object.fromEntries(Object.entries(data.tables).map(([k,v])=>[k,v.length])),users:data.users.length,columns:data.columns.length,constraints:data.constraints.length,functions:data.functions.length,triggers:data.triggers.length,indexes:data.indexes.length,policies:data.policies?.length||0},null,2));
