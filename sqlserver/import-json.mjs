import {Database,Store,manifest} from './database.mjs';
import {readFile} from 'node:fs/promises';
const file=process.argv[2];if(!file)throw Error('Uso: node sqlserver/import-json.mjs caminho-do-backup.json [--apply]');
const backup=JSON.parse(await readFile(file,'utf8'));if(backup.format!=='abencoada-migration-v1'||!backup.tables||!Array.isArray(backup.users))throw Error('Formato de backup inválido. Use export-supabase.sql.');
for(const t of manifest){const rows=backup.tables[t.name];if(!Array.isArray(rows))throw Error('Tabela ausente: '+t.name);for(const row of rows)for(const key of Object.keys(row))if(!t.columns.some(c=>c.name===key))throw Error('Coluna desconhecida: '+t.name+'.'+key)}
const counts=Object.fromEntries(manifest.map(t=>[t.name,backup.tables[t.name].length]));console.log(JSON.stringify(counts,null,2));
const db=new Database(),rollback=Error('DRY_RUN');
try{await db.transaction(async()=>{const s=await new Store(db).load();for(const t of ['fleets','records','diesel_operations','diesel_checklists','diesel_locations','diesel_materials','diesel_checklist_templates'])if(s.rows(t).length)throw Error('Destino já contém dados operacionais; importação interrompida: '+t);
 for(const u of backup.users){if(!u.id||!u.email)throw Error('Identidade incompleta.');await db.query('IF NOT EXISTS(SELECT 1 FROM app_auth.users WHERE id=@id) INSERT INTO app_auth.users(id,email,password_hash) VALUES(@id,@email,NULL)',{id:u.id,email:u.email.toLowerCase()})}
 // Cloud device credentials and login throttles expire at migration. Existing local admin is retained.
 for(const t of manifest){if(['private.diesel_devices','private.login_attempts'].includes(t.name))continue;for(const source of backup.tables[t.name]){const data=structuredClone(source);if(t.name==='public.settings'){const existing=s.rows(t.name).find(r=>r.id===data.id);if(existing){Object.assign(existing,data);continue}}if(t.name==='public.members'&&s.rows(t.name).some(r=>r.email===data.email||r.username===data.username))throw Error('Conflito com conta local: '+data.email);s.add(t.name,data)}}
 await s.flush();const saved=await new Store(db).load();for(const t of manifest){if(['private.diesel_devices','private.login_attempts'].includes(t.name))continue;const expected=counts[t.name]+(t.name==='public.members'?1:0);if(saved.rows(t.name).length!==expected)throw Error('Contagem divergente: '+t.name)}
 if(!process.argv.includes('--apply'))throw rollback;console.log('Importação confirmada. Defina novas senhas locais em Equipe e acessos.');
})}catch(e){if(e!==rollback)throw e;console.log('Simulação aprovada. Transação desfeita; nenhum dado importado. Use --apply para confirmar.')}finally{db.close()}
