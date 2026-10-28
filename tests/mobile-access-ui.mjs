import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {canUseFeature,requireFeature,accessSignature} from '../web/access.js';
import {checklistEnabled} from '../mobile/checklist.js';
import {navigationSvg} from '../web/navigation-icons.js';
import {describeSyncFailure,prepareBackgroundSync} from '../mobile/sync-errors.js';
const source=await readFile('mobile/app.js','utf8');
const ui=source.slice(source.indexOf('function activeFeature(){'),source.indexOf("function optionalEventFleet(value='')"));
const save=source.slice(source.indexOf('async function saveEvent('),source.indexOf('async function configureNative('));
const sync=source.slice(source.indexOf('async function sync(){'),source.indexOf('function passwordEye'));
const all={refuel:true,transfer:true,checklist:true},none={refuel:false,transfer:false,checklist:false};
const nodes=new Map();
const element=()=>({hidden:false,disabled:false,innerHTML:'',classList:{toggle(){},add(){},remove(){}},focus(){this.focused=true}});
for(const id of ['#login-logo','#header-logo','#open-observation','#form-error','#occurrence-form [name="notes"]'])nodes.set(id,element());
const captured=[],saved=[];
const state={reportDelivery(){},requestDeliveryNotifications:async()=>({enabled:false}),loginLoading:(button,loading)=>{button.disabled=loading},locked:false,localAccess:{refresh:async()=>{},requireOnline:async()=>{}},screen:'menu',context:{},fixedContext:null,contextNext:'methods',mode:'manual',draft:{},editId:null,occurrenceReturn:null,photoBusy:false,queue:[],selected:null,message:'',syncIssue:null,connected:true,busy:false,needsLogin:false,nativeConfigured:false,
 session:{user:{id:'operator',name:'OPERADOR',permissions:all},fleets:[],locations:[],materials:[],rules:{checklistEnabled:true}},
 app:{...element(),scrollTop:0},logout:element(),connectionStatus:element(),
 document:{body:element(),querySelector:selector=>nodes.get(selector)||null,querySelectorAll:()=>[]},
 navigationSvg,canUseFeature,requireFeature,accessSignature,checklistEnabled,describeSyncFailure,prepareBackgroundSync,
 esc:value=>String(value??''),num:String,decimal:()=>'',formHTML:()=>'',checklistFormHTML:()=>'',optionalEventFleet:()=>'',photoHTML:()=>'',statusHTML:()=>'',pendingHTML:()=>'',connectionHTML:()=>'',
 bindPending(){},bindChecklist(){},bindPhotoControls(){},updateCalculated(){},updatePanels(){},operationDependencies:()=>[],
 transferRecorderBase:()=>10000,recorderBase:()=>10000,parseNumber:Number,isPhoto:()=>false,
 saveDraft:async()=>saved.push(structuredClone(state.draft)),put:async(key,value)=>saved.push({key,value:structuredClone(value)}),key:name=>'operator:'+name,
 enqueue:async record=>captured.push(structuredClone(record)),crypto:{randomUUID:()=>String(captured.length+1)},
 FormData:class{constructor(form){this.values=form.values}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]()}},
 render(){state.renderFlow()},sync:async()=>{},mirrorQueue:async()=>{},configureNative:async()=>{},login(){}};
vm.createContext(state);vm.runInContext(ui+save,state);
// Every combination of permissions renders only the enabled entry points.
for(let bits=0;bits<8;bits++){
 state.session.user.permissions={refuel:!!(bits&1),transfer:!!(bits&2),checklist:!!(bits&4)};state.screen='menu';state.renderFlow();
 assert.equal(state.app.innerHTML.includes('data-workflow="methods"'),!!(bits&1));
 assert.equal(state.app.innerHTML.includes('data-workflow="transfer"'),!!(bits&2));
 assert.equal(state.app.innerHTML.includes('data-screen="checklist-fleet"'),!!(bits&4));
 assert.equal(nodes.get('#open-observation').disabled,false);
}
state.session.user.permissions=all;state.session.rules.checklistEnabled=false;state.renderFlow();assert.ok(!state.app.innerHTML.includes('data-screen="checklist-fleet"'));state.session.rules.checklistEnabled=true;
for(const screen of ['menu','context','methods','scan','refuel','transfer','checklist-fleet','checklist-form','occurrence']){
 state.screen=screen;state.context={};state.draft={};state.renderFlow();assert.equal(nodes.get('#open-observation').hidden,false);assert.equal(nodes.get('#open-observation').disabled,false);
}
// Revocation ejects an open restricted form without dropping its draft or pending records.
state.session.user.permissions=none;state.screen='refuel';state.draft={fleet:'1001',km:'500'};state.queue=[{id:'pending'}];state.renderFlow();assert.equal(state.screen,'menu');assert.equal(state.draft.km,'500');assert.equal(state.queue.length,1);
state.queue=[];state.screen='context';state.contextNext='methods';state.session.user.permissions=all;state.draft={context:{localCode:'1',materialCode:'9'},km:'500'};state.renderFlow();
nodes.get('#open-observation').onclick();assert.equal(state.screen,'occurrence');assert.doesNotMatch(state.app.innerHTML,/name="(?:localCode|materialCode|fleet)"/);
const returnTarget=state.occurrenceReturn;state.draft.notes='RASCUNHO';nodes.get('#open-observation').onclick();assert.equal(state.occurrenceReturn,returnTarget);assert.equal(state.draft.notes,'RASCUNHO');assert.equal(nodes.get('#occurrence-form [name="notes"]').focused,true);
state.context={localCode:'2',materialCode:'9'};state.renderFlow();assert.doesNotMatch(state.app.innerHTML,/name="(?:localCode|materialCode|fleet)"|context-box/);
state.session.user.permissions=none;const submitButton={disabled:false};
const event=values=>({preventDefault(){},target:{values,querySelector:()=>submitButton}});
await state.saveEvent(event({notes:'OCORRÊNCIA INDEPENDENTE'}),'occurrence');
assert.equal(captured.length,1);assert.equal(captured[0].kind,'occurrence');assert.equal(captured[0].localCode,undefined);assert.equal(captured[0].materialCode,undefined);assert.equal(captured[0].fleet,undefined);assert.equal(state.fixedContext,null);assert.equal(state.draft.km,'500');assert.equal(state.draft.context.localCode,'1');
await state.saveEvent(event({notes:'SEM LOCAL'}),'occurrence');assert.equal(captured.length,2);assert.equal(captured[1].localCode,undefined);
state.editId='legacy';state.queue=[{id:'legacy',localCode:'1',materialCode:'9',fleet:'1001',createdAt:new Date().toISOString()}];await state.saveEvent(event({notes:'CORREÇÃO ANTIGA'}),'occurrence');assert.equal(captured[2].localCode,'1');assert.equal(captured[2].fleet,'1001');state.queue=[];state.editId=null;
// Exercise the actual refresh flow: hide/re-enable without logout, persist permissions,
// keep the last known restrictions offline and preserve an open occurrence draft.
let fresh={...state.session,user:{...state.session.user,permissions:none}},offline=false;
state.screen='menu';state.draft={};state.message='';state.session={...fresh,user:{...fresh.user,permissions:all}};
state.api=async()=>{if(offline)throw Error('AbortError: The user aborted a request.');return structuredClone(fresh)};
vm.runInContext(sync,state);await state.sync();assert.ok(!state.app.innerHTML.includes('data-workflow='));assert.ok(!state.app.innerHTML.includes('data-screen="checklist-fleet"'));
assert.ok(saved.some(entry=>entry.key==='last-session'&&entry.value.user.permissions.refuel===false));
fresh.user.permissions={refuel:true,transfer:false,checklist:true};await state.sync();assert.ok(state.app.innerHTML.includes('data-workflow="methods"'));assert.ok(!state.app.innerHTML.includes('data-workflow="transfer"'));assert.ok(state.app.innerHTML.includes('data-screen="checklist-fleet"'));
offline=true;await state.sync();assert.equal(state.session.user.permissions.transfer,false);
offline=false;state.screen='occurrence';state.draft={notes:'NÃO DESCARTAR'};fresh.user.permissions=none;await state.sync();assert.equal(state.screen,'occurrence');assert.equal(state.draft.notes,'NÃO DESCARTAR');
console.log('Mobile menus follow all permission combinations and live refreshes; occurrences remain available on every authenticated screen with drafts and queues preserved.');

// Offline credentials are separate from an expired/missing network auth token.
state.needsLogin=false;state.locked=false;state.busy=false;let checks=0,revoked=0;
state.navigator={onLine:false};state.api=async()=>{checks++;throw Error('Should not call the server offline')};await state.sync();assert.equal(checks,0);
state.navigator.onLine=true;state.localAccess.requireOnline=async()=>{revoked++};
state.api=async()=>{throw Object.assign(Error('Network session missing'),{status:401,code:'LOCAL_AUTH_REQUIRED'})};await state.sync();assert.equal(state.needsLogin,false);assert.equal(revoked,0);assert.equal(state.syncIssue.label,'VALIDAR PARA ENVIAR');
state.api=async()=>{throw Object.assign(Error('Access revoked'),{status:403})};await state.sync();assert.equal(state.needsLogin,true);assert.equal(revoked,1);
console.log('Airplane mode skips auth refresh; missing local tokens preserve offline access; known server revocation requires online validation.');
