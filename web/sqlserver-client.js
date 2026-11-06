import {config} from './config.js';
import {normalizeGmaisSession} from './gmais-fleet.js';
const key='abencoada-sqlserver-auth:'+config.url;
function session(){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
async function request(path,body,withAuth=true,fetcher=fetch){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);try{const s=session();if(withAuth&&(!s||Date.parse(s.expires_at)<Date.now()))throw Object.assign(Error('Entre com seu usuário e senha.'),{status:401,code:'LOCAL_AUTH_REQUIRED'});const res=await fetcher(config.url+path,{method:'POST',headers:{'Content-Type':'application/json',...(withAuth?{Authorization:'Bearer '+s.token}:{})},body:JSON.stringify(body),signal:controller.signal});const data=await res.json();if(!res.ok||data.error)throw Object.assign(Error(data.error||'Não foi possível conectar.'),{status:res.status,data});return data}catch(e){if(e.name==='TypeError'||e.name==='AbortError')throw Object.assign(Error('Não foi possível conectar ao servidor local. Os registros continuam salvos neste aparelho.'),{code:'NETWORK_ERROR'});throw e}finally{clearTimeout(timer)}}
export async function sqlSignIn(username,password,fetcher){const data=await request('/api/login',{username,password},false,fetcher);localStorage.setItem(key,JSON.stringify(data))}
export async function sqlSignOut(){try{await request('/api/logout',{})}finally{localStorage.removeItem(key)}}
export async function sqlUserId(){return session()?.user?.id||null}
export async function sqlApi(path,options={}){const [route,query]=path.split('?');let payload=options.body?JSON.parse(options.body):null;
 if(route==='records'&&options.method==='POST')throw Error('Registre abastecimentos pelo aplicativo Android.');
 if(route==='admin'&&payload?.action==='import-fleets'){const res=await fetch('./fleets.json');if(!res.ok)throw Error('Catálogo indisponível.');payload.fleets=await res.json()}
 const data=await request('/api/'+route,['team-password','device-register'].includes(route)?payload:{payload,query});return route==='session'?normalizeGmaisSession(data):data;
}
