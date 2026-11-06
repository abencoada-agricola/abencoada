import {Database,Store} from './database.mjs';
import {passwordHash} from './auth.mjs';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile,access} from 'node:fs/promises';
const db=new Database();
try{await db.transaction(async()=>{const s=await new Store(db).load();if(s.rows('members').length){console.log('Existing accounts preserved.');return}const password=randomBytes(18).toString('base64url'),email='gestor@abencoada.local',id=randomUUID();await db.query('INSERT INTO app_auth.users(id,email,password_hash) VALUES(@id,@email,@hash)',{id,email,hash:passwordHash(password)});s.add('members',{email,name:'GESTOR LOCAL',role:'admin',username:'gestor.local',permissions:{refuel:true,transfer:true,checklist:true}});await s.flush();await writeFile(new URL('./local-credentials.txt',import.meta.url),`ACESSO LOCAL DE TESTES\nEndereço: http://127.0.0.1:4780\nUsuário: gestor.local\nSenha: ${password}\n\nEsta conta pertence apenas à instalação local. Não é a conta do Supabase.\n`,{flag:'wx'});console.log('Local administrator created. Credentials saved to sqlserver/local-credentials.txt (not tracked).')})}finally{db.close()}
