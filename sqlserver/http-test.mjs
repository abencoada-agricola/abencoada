import {randomBytes} from 'node:crypto';
import {Database} from './database.mjs';
import {digest} from './auth.mjs';
import assert from 'node:assert/strict';
const db=new Database(),token=randomBytes(48).toString('base64url');
try{
 const [admin]=await db.query("SELECT u.id FROM app_auth.users u JOIN [app].members m ON m.email=u.email WHERE m.role='admin'");assert(admin);
 await db.transaction(()=>db.query('INSERT INTO app_auth.sessions(token_hash,user_id,expires_at) VALUES(@hash,@id,@expires)',{hash:digest(token),id:admin.id,expires:new Date(Date.now()+60000).toISOString()}));
 const health=await (await fetch('http://127.0.0.1:4780/health')).json();assert.equal(health.database,'app_abencoada');
 const session=await (await fetch('http://127.0.0.1:4780/api/session',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:'{}'})).json();assert.equal(session.fleets.length,10);assert.equal(session.user.id,admin.id);
 const records=await (await fetch('http://127.0.0.1:4780/api/records',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:'{}'})).json();assert(records.records.length>0);
 assert.equal((await fetch('http://127.0.0.1:4780/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
 assert.equal((await fetch('http://127.0.0.1:4780/api/session',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unauthorized.example'},body:'{}'})).status,403);
 console.log('HTTP health, migrated catalog, record access, authentication and origin checks passed.');
}finally{await db.transaction(()=>db.query('DELETE FROM app_auth.sessions WHERE token_hash=@hash',{hash:digest(token)}));db.close()}
