import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {normalizeGmaisSession} from '../web/gmais-fleet.js';
let methods,mode='network',rpcMode='network';
const source=(await readFile('web/backend.js','utf8')).replace(/^import .*;$/gm,'').replaceAll('export ','');
// Return exported functions without touching browser or native application state.
const context={normalizeGmaisSession,config:{url:'https://db.example',publishableKey:'public',loginKey:'public-jwt'},createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'token'}}}),setSession:async()=>({})},rpc:()=>({abortSignal:async()=>{if(rpcMode==='wrapped-abort')return {status:0,error:{message:'AbortError: The user aborted a request.'}};if(rpcMode==='denied')return {status:403,error:{message:'Not allowed',code:'42501'}};if(rpcMode==='server')return {status:503,error:{message:'Server unavailable'}};if(rpcMode==='gmais')return {data:{fleets:[{id:'EXAMPLE',type:'Outro',gmais:{version:1,companyCode:'ORG',branchCode:'BRANCH',fleetCode:'EXAMPLE',modelCode:'MODEL',meterUnit:'HR',additionalMeter:'none',tankCapacityConfirmed:false}}]}};throw new TypeError('Failed to fetch')}})}),fetch:async()=>{if(mode==='network')throw new TypeError('Failed to fetch');if(mode==='timeout')throw Object.assign(new Error('timeout'),{name:'AbortError'});return Response.json({error:'invalid'},{status:401})},Response,AbortController,URLSearchParams,setTimeout,clearTimeout};
vm.runInNewContext(source+'\nmethods={signIn,api};',context);methods=context.methods;
for(mode of ['network','timeout'])await assert.rejects(methods.signIn('admin','test-only'),/Conecte o celular à internet/);
mode='invalid';await assert.rejects(methods.signIn('admin','test-only'),/Usuário ou senha inválidos/);
await assert.rejects(methods.api('session'),/registros continuam salvos/);
console.log('Connection failures show Portuguese guidance; invalid credentials remain distinct.');

rpcMode='wrapped-abort';await assert.rejects(methods.api('session'),error=>error.code==='REQUEST_ABORTED'&&!/AbortError|The user aborted/.test(error.message));
rpcMode='denied';await assert.rejects(methods.api('session'),error=>error.status===403);
rpcMode='server';await assert.rejects(methods.api('session'),error=>error.status===503);
console.log('Supabase status-zero abort responses are normalized; permission and server statuses are preserved.');

rpcMode='gmais';const externalSession=await methods.api('session');assert.equal(externalSession.fleets[0].meter_fields.engine,true);assert.equal(externalSession.fleets[0].meter_fields.km,false);assert.equal(externalSession.fleets[0].tank_capacity,null);console.log('Session RPC adapts optional GMAIS metadata before returning the catalog.');
