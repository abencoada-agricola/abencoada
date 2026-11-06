import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Database,Store} from './database.mjs';
import {dispatch,ApiError} from './domain.mjs';
import {login,authenticate,setPassword,registerDevice,digest} from './auth.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),db=new Database();
const host=process.env.SQL_API_HOST||'127.0.0.1',port=Number(process.env.PORT||4780);
if(!['127.0.0.1','localhost'].includes(host)&&!process.env.SQL_ALLOWED_ORIGINS)throw Error('Configure SQL_ALLOWED_ORIGINS and HTTPS reverse proxy before network use.');
const origins=new Set((process.env.SQL_ALLOWED_ORIGINS||`http://127.0.0.1:${port},http://localhost:${port}`).split(','));
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
async function body(req){let chunks=[],length=0;for await(const chunk of req){length+=chunk.length;if(length>1200000)throw new ApiError('Conteúdo muito grande.',413);chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}')}catch{throw new ApiError('JSON inválido.',400)}}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,`http://localhost:${port}`),origin=req.headers.origin;
 if(origin&&!origins.has(origin))throw new ApiError('Origem não autorizada.',403);
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization,apikey');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS')}
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
 if(url.pathname==='/health'){await db.exclusive(()=>db.query('SELECT 1 AS ok'));return json(res,200,{ok:true,backend:'sqlserver',database:process.env.SQL_DATABASE||'app_abencoada'})}
 if(url.pathname.startsWith('/api/')||url.pathname==='/rest/v1/rpc/diesel_device_submit'){
  if(req.method!=='POST')throw new ApiError('Use POST.',405);if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new ApiError('Use application/json.',415);
  const p=await body(req),token=String(req.headers.authorization||'').replace(/^Bearer /,'');
  const result=await db.transaction(async()=>{const store=await new Store(db).load();
   if(url.pathname==='/api/login')return login(db,store,p,req.socket.remoteAddress||'local');
   if(url.pathname==='/rest/v1/rpc/diesel_device_submit'){
    const lease=store.rows('private.diesel_devices').find(d=>d.token_hash==='\\x'+digest(String(p.device_token||''))&&Date.parse(d.expires_at)>Date.now());if(!lease)throw new ApiError('Entre novamente para renovar o envio automático.',403);const result=dispatch(store,{id:lease.user_id,email:lease.email},p.payload?.kind?'operation-submit':'mobile-submit',p.payload);await store.flush();return result;
   }
   const user=await authenticate(db,token);
   if(url.pathname==='/api/logout'){await db.query('DELETE FROM app_auth.sessions WHERE token_hash=@hash',{hash:digest(token)});return {ok:true}}
   if(url.pathname==='/api/team-password')return setPassword(db,store,user,p);
   if(url.pathname==='/api/device-register'){const result=await registerDevice(store,user,p.deviceId);await store.flush();return result}
   const route=url.pathname.slice('/api/'.length);const result=dispatch(store,user,route,p.payload??null,new URLSearchParams(p.query||''));await store.flush();return result;
  });return json(res,result.status||200,result);
 }
 if(!['GET','HEAD'].includes(req.method))throw new ApiError('Método inválido.',405);
 const mobile=url.pathname.startsWith('/mobile/'),base=resolve(root,mobile?'mobile-dist':'dist');const path=decodeURIComponent(mobile?url.pathname.slice(8):url.pathname.slice(1))||'index.html';const file=resolve(base,path);
 if(!file.startsWith(base+sep)||!mime[extname(file)]||(await stat(file)).isDirectory())throw new ApiError('Arquivo não encontrado.',404);
 res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch(e){if(e instanceof ApiError)json(res,e.status,{error:e.message,status:e.status,...e.data});else if(e.code==='ENOENT')json(res,404,{error:'Arquivo não encontrado.'});else{console.error(new Date().toISOString(),e.message);json(res,500,{error:'Não foi possível concluir a operação no banco local.'})}}});
server.requestTimeout=60000;server.headersTimeout=15000;server.listen(port,host,()=>console.log(`Abençoada SQL Server: http://${host}:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit()}));
