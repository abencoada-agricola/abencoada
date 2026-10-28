import assert from 'node:assert/strict';
import {describeSyncFailure,prepareBackgroundSync,recoverCredentialFailure} from '../mobile/sync-errors.js';
assert.equal(describeSyncFailure({status:401},true).requiresLogin,true);
assert.equal(describeSyncFailure({status:403,message:'Conta sem autorização.'},false).connected,true);
assert.equal(describeSyncFailure({status:503},false).label,'SERVIDOR INDISPONÍVEL');
assert.equal(describeSyncFailure(new TypeError('Failed to fetch'),true).connected,false);
assert.equal(describeSyncFailure(new Error('Não foi possível conectar.'),true).label,'SEM CONEXÃO');
assert.equal(describeSyncFailure(new Error('Armazenamento indisponível.'),true).label,'FALHA NO ENVIO');
const calls=[];const failure=await prepareBackgroundSync(async()=>{calls.push('mirror');throw Error('Native store failed')},async()=>{calls.push('configure');throw Error('Native configure failed')});
assert.deepEqual(calls,['mirror','configure']);assert.equal(failure.message,'Native configure failed');
assert.equal(await prepareBackgroundSync(async()=>{},async()=>{}),null);
console.log('Session, permission, server and network failures stay distinct; native setup failures allow foreground delivery.');

const expired={error:'Entre novamente para renovar o envio automático.'};assert.equal(recoverCredentialFailure(expired),true);assert.equal(expired.error,undefined);assert.ok(expired.lastSendError);assert.equal(recoverCredentialFailure({error:'Leitura abaixo do último registro.'}),false);

// Empty-queue refreshes must not pretend that a record failed to upload.
for(const error of [new Error('AbortError: The user aborted a request.'),Object.assign(new Error('Interrupted'),{name:'AbortError'}),new TypeError('Failed to fetch'),{status:503},{status:429}]){
 const idle=describeSyncFailure(error,true,false);
 assert.equal(idle.message,'');
 assert.equal(idle.requiresLogin,false);
 const pending=describeSyncFailure(error,true,true);
 assert.ok(pending.message);
 assert.doesNotMatch(pending.message,/AbortError|The user aborted/i);
}
assert.doesNotMatch(describeSyncFailure({status:401},true,false).message,/REGISTROS|ENVIO/);
assert.equal(describeSyncFailure({status:401},true,false).requiresLogin,true);
assert.equal(describeSyncFailure({status:403},true,false).label,'SEM PERMISSÃO');
assert.doesNotMatch(describeSyncFailure({status:403},true,false).message,/REGISTROS|ENVIO/);
assert.equal(describeSyncFailure(new Error('Local storage failure'),true,false).label,'ATUALIZAÇÃO PENDENTE');

// Exercise the actual sync control flow without browser storage or production access.
const {readFile}=await import('node:fs/promises');
const vm=await import('node:vm');
const appSource=await readFile('mobile/app.js','utf8');
const syncSource=appSource.slice(appSource.indexOf('async function sync(){'),appSource.indexOf('function passwordEye'));
let failRefresh=true,failUpload=false,mismatch=false;
const stored=[];
const fresh={user:{id:'worker'},fleets:[],locations:[],rules:{checklistEnabled:true}};
const state={locked:false,localAccess:{refresh:async()=>{},requireOnline:async()=>{}},busy:false,session:structuredClone(fresh),needsLogin:false,nativeConfigured:false,connected:true,syncIssue:null,message:'',queue:[],selected:null,screen:'menu',
 describeSyncFailure,prepareBackgroundSync,accessSignature:()=>'',checklistEnabled:()=>true,operationDependencies:()=>[],
 mirrorQueue:async()=>{},configureNative:async()=>{},updatePanels:()=>{},render:()=>{},login:()=>{},
 put:async(key,value)=>stored.push({key,value:structuredClone(value)}),op:async(_store,_mode,fn)=>fn({put:record=>stored.push(structuredClone(record)),delete:id=>stored.push({deleted:id})}),
 api:async(route,options)=>{if(route==='session'){if(failRefresh)throw Error('AbortError: The user aborted a request.');return structuredClone(fresh)}if(failUpload)throw Error('AbortError: The user aborted a request.');const record=JSON.parse(options.body);return {id:mismatch?'wrong-id':record.id}}};
vm.createContext(state);vm.runInContext(syncSource,state);
await state.sync();assert.equal(state.message,'');assert.equal(state.queue.length,0);assert.equal(state.syncIssue.label,'SEM CONEXÃO');assert.equal(stored.length,0);
const pending={id:'pending-one',kind:'occurrence',userId:'worker'};state.queue=[pending];
await state.sync();assert.equal(state.queue[0],pending);assert.match(state.message,/REGISTROS CONTINUAM SALVOS/);
failRefresh=false;state.queue=[];await state.sync();assert.equal(state.syncIssue,null);assert.equal(state.message,'');assert.equal(state.connected,true);
state.message='RASCUNHO SALVO';await state.sync();assert.equal(state.message,'RASCUNHO SALVO');
state.queue=[pending];failUpload=true;await state.sync();assert.equal(state.queue[0],pending);assert.match(pending.lastSendError,/REGISTROS CONTINUAM SALVOS/);assert.doesNotMatch(pending.lastSendError,/AbortError/);
failUpload=false;mismatch=true;await state.sync();assert.equal(state.queue.length,1);assert.ok(!stored.some(entry=>entry.deleted));
mismatch=false;await state.sync();assert.equal(state.queue.length,0);assert.ok(stored.some(entry=>entry.deleted===pending.id));assert.equal(state.syncIssue,null);assert.match(state.message,/REGISTRO ENVIADO/);
console.log('Empty refreshes stay quiet, wrapped aborts are sanitized, recovery clears stale errors and pending uploads require a matching receipt.');
