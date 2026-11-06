import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {Database} from './database.mjs';
import {digest} from './auth.mjs';
const modulePath=process.env.PLAYWRIGHT_MODULE||'file:///C:/Users/Usuario/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const {chromium}=await import(modulePath),browser=await chromium.launch({channel:'chrome',headless:true}),db=new Database(),token=randomBytes(48).toString('base64url');
try{
 const [admin]=await db.query("SELECT u.id,m.name FROM app_auth.users u JOIN [app].members m ON m.email=u.email WHERE m.role='admin'");assert(admin);
 const expires=new Date(Date.now()+60000).toISOString();await db.transaction(()=>db.query('INSERT INTO app_auth.sessions(token_hash,user_id,expires_at) VALUES(@hash,@id,@expires)',{hash:digest(token),id:admin.id,expires}));
 const context=await browser.newContext();await context.addInitScript(value=>localStorage.setItem('abencoada-sqlserver-auth:http://127.0.0.1:4780',JSON.stringify(value)),{token,user:{id:admin.id},expires_at:expires});
 const page=await context.newPage(),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url()+':'+r.status())});
 await page.goto('http://127.0.0.1:4780');await page.waitForFunction(()=>document.querySelector('body').innerText.toUpperCase().includes('SAIR'),{timeout:15000});
 const visible=(await page.locator('body').innerText()).toUpperCase();assert(visible.includes(admin.name.toUpperCase()));assert.equal(errors.length,0,errors.join('\n'));assert.equal(missing.length,0,missing.join('\n'));
 await page.screenshot({path:fileURLToPath(new URL('./local-preview.png',import.meta.url)),fullPage:true});console.log('Migrated administrator session and dashboard passed in isolated Chrome.');await context.close();
}finally{await db.transaction(()=>db.query('DELETE FROM app_auth.sessions WHERE token_hash=@hash',{hash:digest(token)}));db.close();await browser.close()}
