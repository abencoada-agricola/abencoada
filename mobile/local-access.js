const ITERATIONS=600000,DAY=86400000;
export const OFFLINE_ACCESS_DAYS=30;
const encoder=new TextEncoder(),decoder=new TextDecoder();
const encode=bytes=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text)};
const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
export const normalizeUsername=value=>String(value||'').trim().toLowerCase();
const failure=(code,message)=>Object.assign(Error(message),{code});
const credentialsError=()=>failure('OFFLINE_CREDENTIALS','Usuário ou senha inválidos para este aparelho.');

// The login password exists only during derivation. A non-extractable AES key
// and an authenticated encrypted session replace a saved plaintext password.
export class LocalAccess {
 constructor({read,write,crypto=globalThis.crypto,now=()=>Date.now()}){this.read=read;this.write=write;this.crypto=crypto;this.now=now;this.key=null;this.profile=null;this.pending=Promise.resolve();}
 async load(){this.profile=await this.read('offline-access');return this.profile;}
 async derive(password,salt){
  const material=await this.crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
  return this.crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:decode(salt),iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 }
 additional(profile=this.profile){return encoder.encode(JSON.stringify(['abencoada-offline-v1',profile.userId,profile.username]));}
 async seal(session,key=this.key,profile=this.profile){
  if(!key||!profile||session.user.id!==profile.userId)throw failure('OFFLINE_LOCKED','Desbloqueie o aplicativo para continuar.');
  const iv=this.crypto.getRandomValues(new Uint8Array(12));
  const data=await this.crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:this.additional(profile)},key,encoder.encode(JSON.stringify(session)));
  return {encrypted:true,version:1,iv:encode(iv),data:encode(new Uint8Array(data))};
 }
 async enable({username,password,session}){
  if(!password||!session?.user?.id||!normalizeUsername(username))throw credentialsError();
  const time=this.now(),profile={version:1,userId:session.user.id,username:normalizeUsername(username),salt:encode(this.crypto.getRandomValues(new Uint8Array(32))),verifiedAt:time,lastUsedAt:time,requiresOnline:false,failedAttempts:0,retryAfter:0};
  const key=await this.derive(password,profile.salt),sealed=await this.seal(session,key,profile);
  // Preserve the old profile/cache together if the IndexedDB transaction fails.
  await this.write({'offline-access':profile,'last-session':sealed});this.profile=profile;this.key=key;
 }
 assertAvailable(profile=this.profile){
  const time=this.now();
  if(!profile||profile.version!==1)throw failure('OFFLINE_NOT_ENABLED','Entre com internet uma vez para habilitar o acesso neste aparelho.');
  if(profile.requiresOnline||!Number.isFinite(profile.verifiedAt)||time-profile.verifiedAt>OFFLINE_ACCESS_DAYS*DAY||time<profile.lastUsedAt-300000)throw failure('OFFLINE_REVALIDATE','Conecte à internet para validar sua conta novamente. Seus registros continuam salvos.');
 }
 async unlock({username,password}){
  await this.pending;const profile=await this.load(),time=this.now();this.assertAvailable(profile);
  if(profile.retryAfter>time)throw failure('OFFLINE_RETRY','Aguarde um minuto antes de tentar novamente.');
  let key,session;
  try{
   if(normalizeUsername(username)!==profile.username||!password)throw credentialsError();
   key=await this.derive(password,profile.salt);const sealed=await this.read('last-session');
   if(sealed?.version!==1||sealed.encrypted!==true)throw credentialsError();
   const bytes=await this.crypto.subtle.decrypt({name:'AES-GCM',iv:decode(sealed.iv),additionalData:this.additional(profile)},key,decode(sealed.data));
   session=JSON.parse(decoder.decode(bytes));if(session.user?.id!==profile.userId)throw credentialsError();
  }catch{
   profile.failedAttempts=(profile.failedAttempts||0)+1;profile.retryAfter=profile.failedAttempts>=5?time+60000:0;
   await this.write({'offline-access':profile});throw credentialsError();
  }
  profile.failedAttempts=0;profile.retryAfter=0;profile.lastUsedAt=time;
  await this.write({'offline-access':profile});this.key=key;return session;
 }
 async saveSession(session){
  if(session===null){await this.write({'last-session':null});return;}
  const snapshot=structuredClone(session),key=this.key,profile=this.profile;
  const save=async()=>{const sealed=await this.seal(snapshot,key,profile);await this.write({'last-session':sealed});};
  this.pending=this.pending.catch(()=>{}).then(save);return this.pending;
 }
 async readSession(){await this.pending;const sealed=await this.read('last-session');if(!sealed?.encrypted)return sealed;
  if(!this.key||!this.profile)throw failure('OFFLINE_LOCKED','Desbloqueie o aplicativo para continuar.');
  const bytes=await this.crypto.subtle.decrypt({name:'AES-GCM',iv:decode(sealed.iv),additionalData:this.additional()},this.key,decode(sealed.data));return JSON.parse(decoder.decode(bytes));
 }
 async refresh(session){
  if(!this.key||session?.user?.id!==this.profile?.userId)return;
  const time=this.now();this.profile={...this.profile,verifiedAt:time,lastUsedAt:time,requiresOnline:false};await this.write({'offline-access':this.profile});
 }
 async requireOnline(){if(!this.profile)return;this.profile={...this.profile,requiresOnline:true};await this.write({'offline-access':this.profile});}
 async lock(){await this.pending.catch(()=>{});this.key=null;}
 async forget(){await this.pending.catch(()=>{});await this.write({'offline-access':null,'last-session':null});this.key=null;this.profile=null;}
}
