import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {LocalAccess} from '../mobile/local-access.js';
import {loginFields} from '../mobile/login-fields.js';
const source=await readFile('mobile/app.js','utf8');
const auth=source.slice(source.indexOf("function login(error='')"),source.indexOf("window.addEventListener('online',sync)"));
const values=new Map(),read=async key=>structuredClone(values.get(key)),write=async batch=>{for(const[k,v]of Object.entries(batch))values.set(k,structuredClone(v))};
const localAccess=new LocalAccess({read,write,crypto:webcrypto});
let mode='accept',onlineCalls=0,logoutCalls=0,records=[];
const initial={user:{id:'TEST-USER',name:'TESTE'},fleets:[],locations:[],rules:{}};let returned=initial;
const input={type:'password',value:'',focus(){}};const error={textContent:''};const button={disabled:false};const form={querySelector:()=>button};const toggle={setAttribute(){},innerHTML:''};
const node=()=>({hidden:false,classList:{add(){},remove(){}},setAttribute(){}});
const state={context:{localCode:'1',materialCode:'9'},fixedContext:{localCode:'1',materialCode:'9'},contextNext:'methods',configureSystemBars(){},reportDelivery(){},requestDeliveryNotifications:async()=>({enabled:false}),loginLoading:(button,loading)=>{button.disabled=loading},localAccess,loginFields,locked:true,busy:false,mirrorBusy:false,photoBusy:false,session:null,selected:null,draft:{},queue:[],needsLogin:false,nativeConfigured:false,connected:false,syncIssue:null,message:'',editId:null,occurrenceReturn:null,
 app:{...node(),innerHTML:'',scrollTop:0},logout:node(),connectionStatus:node(),navigator:{onLine:true},
 document:{body:node(),querySelector:s=>s==='#login'?form:s==='#login [name="password"]'?input:s==='#toggle-password'?toggle:s==='#login-error'?error:s.startsWith('#app form')?null:node()},
 esc:String,passwordEye:()=>'',isConfigured:()=>true,
 credentials:{username:'test',password:'Fictional-ui-test-password!'},FormData:class{get(name){return state.credentials[name]}},
 loginRequest:undefined,
 signIn:async()=>{onlineCalls++;if(mode==='reject')throw Object.assign(Error('Senha recusada'),{code:'INVALID_CREDENTIALS',status:401});if(mode==='network')throw Object.assign(Error('Sem rede'),{code:'NETWORK_ERROR'})},
 api:async()=>structuredClone(returned),op:async()=>structuredClone(records),signOut:async()=>{logoutCalls++},
 load:async()=>{},render:()=>{},updatePanels:()=>{},sync:async()=>{},saveDraft:async()=>{},mirrorQueue:async()=>{},console};
vm.createContext(state);vm.runInContext(auth,state);
const submit=async()=>{state.login();await form.onsubmit({preventDefault(){},target:form})};
state.login();assert.doesNotMatch(source,/open-settings/);
await submit();assert.equal(state.screen,'menu');assert.equal(state.fixedContext,null);assert.equal(Object.keys(state.context).length,0);assert.equal(state.locked,false);assert.ok((await read('last-session')).encrypted);assert.equal(onlineCalls,1);
await state.lockApp();assert.equal(state.locked,true);assert.equal(state.session,null);assert.equal(localAccess.key,null);
state.navigator.onLine=false;state.fixedContext={localCode:'7',materialCode:'8'};state.context={...state.fixedContext};await submit();assert.equal(state.screen,'menu');assert.equal(state.fixedContext,null);assert.equal(state.locked,false);assert.equal(onlineCalls,1);assert.equal(state.connected,false);
await state.lockApp();state.credentials.password='wrong';await submit();assert.equal(state.locked,true);assert.match(error.textContent,/inválidos/);
state.credentials.password='Fictional-ui-test-password!';state.navigator.onLine=true;mode='reject';await submit();assert.equal(state.locked,true);assert.equal((await read('offline-access')).requiresOnline,true);
state.navigator.onLine=false;await submit();assert.equal(state.locked,true);assert.match(error.textContent,/validar sua conta/);
state.navigator.onLine=true;mode='accept';await submit();assert.equal(state.locked,false);
await state.lockApp();mode='network';await submit();assert.equal(state.locked,false);assert.equal(state.connected,false);
records=[{id:'TEST-RECORD',userId:'TEST-USER'}];
const cachedBeforeExit=structuredClone(await read('last-session'));
values.set('TEST-USER:draft',{fleet:'123',liters:'20'});
await state.logout.onclick();
assert.equal(state.locked,true);assert.equal(state.session,null);assert.equal(localAccess.key,null);
assert.deepEqual(await read('last-session'),cachedBeforeExit);assert.ok(await read('offline-access'));
assert.equal(records.length,1);assert.deepEqual(await read('TEST-USER:draft'),{fleet:'123',liters:'20'});
const callsBeforeOffline=onlineCalls;
state.navigator.onLine=false;await submit();assert.equal(state.locked,false);assert.equal(onlineCalls,callsBeforeOffline);
await state.logout.onclick();state.credentials.password='wrong';await submit();assert.equal(state.locked,true);assert.match(error.textContent,/inválidos/);
state.credentials.password='Fictional-ui-test-password!';
// Reopening the app retains only encrypted local state, not the in-memory key.
state.localAccess=new LocalAccess({read,write,crypto:webcrypto});
await submit();assert.equal(state.locked,false);assert.equal(state.session.user.id,'TEST-USER');
await state.logout.onclick();const saved=structuredClone(await read('last-session'));
state.navigator.onLine=true;mode='accept';returned={...initial,user:{id:'OTHER'}};await submit();
assert.equal(state.locked,true);assert.match(error.textContent,/outra conta/);
assert.deepEqual(await read('last-session'),saved);assert.equal((await read('offline-access')).userId,'TEST-USER');
records=[];returned=initial;await submit();await state.logout.onclick();
assert.equal(state.locked,true);assert.equal(state.session,null);assert.ok(await read('offline-access'));assert.ok((await read('last-session')).encrypted);
assert.ok(logoutCalls>=1);const lastOnlineCalls=onlineCalls;
state.navigator.onLine=false;await submit();assert.equal(state.locked,false);assert.equal(onlineCalls,lastOnlineCalls);
state.busy=true;await state.logout.onclick();assert.equal(state.locked,true);assert.ok(await read('offline-access'));
state.busy=false;await state.finishAppLock();assert.equal(state.session,null);assert.equal(state.localAccess.key,null);
console.log('Login UI: first online activation, repeated offline sign-out/re-entry, restart, wrong password, revocation, pending drafts/records, account isolation and in-flight uploads passed.');
