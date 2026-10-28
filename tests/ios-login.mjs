import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=(await readFile('mobile/login-request.js','utf8')).replace(/^import .*;$/gm,'').replace('export function','function');
let platform='ios',request,mode='success',browserCalls=0,nativeCalls=0;
const ctx={Capacitor:{getPlatform:()=>platform},CapacitorHttp:{request:async options=>{
 nativeCalls++;request=options;
 if(mode==='network')throw Error('native network details');
 if(mode==='pending')return new Promise(()=>{});
 return {status:mode==='rejected'?401:200,headers:{'Content-Type':'application/json'},data:mode==='rejected'?{error:'Usuário ou senha inválidos.'}:{access_token:'access',refresh_token:'refresh'}};
}},Response,DOMException,TypeError,JSON,fetch:async()=>{browserCalls++;return Response.json({browser:true})}};
vm.runInNewContext(source+'\nthis.loginRequest=loginRequest;',ctx);
const options={method:'POST',headers:{apikey:'public',Authorization:'Bearer public-login','Content-Type':'application/json'},body:JSON.stringify({username:'operator',password:'test-only'})};
let response=await ctx.loginRequest('https://db.example/functions/v1/diesel-login',options);
assert.equal(response.status,200);assert.equal((await response.json()).access_token,'access');
assert.equal(request.data.username,'operator');assert.equal(request.data.password,'test-only');
assert.equal(request.headers.Authorization,'Bearer public-login');assert.equal(request.headers.Origin,undefined);
assert.equal(request.readTimeout,18000);assert.equal(browserCalls,0);
mode='rejected';response=await ctx.loginRequest('https://db.example/functions/v1/diesel-login',options);
assert.equal(response.status,401);assert.equal((await response.json()).error,'Usuário ou senha inválidos.');
mode='network';await assert.rejects(ctx.loginRequest('https://db.example/functions/v1/diesel-login',options),TypeError);
mode='pending';const controller=new AbortController();const pending=ctx.loginRequest('https://db.example/functions/v1/diesel-login',{...options,signal:controller.signal});controller.abort();await assert.rejects(pending,error=>error.name==='AbortError');
const calls=nativeCalls;await assert.rejects(ctx.loginRequest('https://db.example/functions/v1/diesel-login',{...options,signal:controller.signal}),error=>error.name==='AbortError');assert.equal(nativeCalls,calls);
for(platform of ['android','web']){response=await ctx.loginRequest('https://db.example/functions/v1/diesel-login',options);assert.equal((await response.json()).browser,true)}
assert.equal(browserCalls,2);
console.log('iOS native login: server rejection, credentials, tokens, network failures, cancellation and Android/web transport passed.');
