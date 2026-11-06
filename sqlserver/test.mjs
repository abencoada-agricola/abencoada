import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database,Store} from './database.mjs';
import {dispatch,ApiError} from './domain.mjs';
import {passwordHash,passwordMatches,login,authenticate,registerDevice} from './auth.mjs';
const db=new Database(),rollback=Error('EXPECTED_ROLLBACK');let checks=0;
try{await db.transaction(async()=>{
 const s=await new Store(db).load(),adminId=randomUUID(),operatorId=randomUUID();
 for(const [id,email,role] of [[adminId,'qa-admin@example.test','admin'],[operatorId,'qa-operator@example.test','operator']]){await db.query('INSERT INTO app_auth.users(id,email,password_hash) VALUES(@id,@email,@hash)',{id,email,hash:passwordHash('TestPassword-567890')});s.add('members',{email,name:role,username:role==='admin'?'qa.admin':'qa.operator',role,permissions:{refuel:true,transfer:true,checklist:true}})}
 const admin={id:adminId,email:'qa-admin@example.test'},operator={id:operatorId,email:'qa-operator@example.test'};
 assert(passwordMatches('TestPassword-567890',passwordHash('TestPassword-567890')));assert(!passwordMatches('wrong',passwordHash('TestPassword-567890')));checks+=2;
 dispatch(s,admin,'admin',{action:'fleet',id:'QA_TEST',name:'FROTA QA',type:'Trator'});
 dispatch(s,admin,'operations-admin',{action:'location',localCode:'998877',materialCode:'9',name:'LOCAL QA',lastMeter:1000});
 const base={id:randomUUID(),kind:'refuel',mode:'recorder',localCode:'998877',materialCode:'9',fleet:'QA_TEST',date:'2026-01-01',createdAt:new Date().toISOString(),liters:20,engine:100,measuredFields:{km:false,engine:true,elevator:false},recorderStart:1000,recorderEnd:1020};
 const receipt=dispatch(s,operator,'operation-submit',base);assert.equal(receipt.id,base.id);assert.equal(dispatch(s,operator,'operation-submit',base).duplicate,true);checks+=2;
 assert.throws(()=>dispatch(s,operator,'operation-submit',{...base,id:randomUUID()}),e=>e.status===409);checks++;
 assert.throws(()=>dispatch(s,operator,'operation-submit',{...base,id:randomUUID(),engine:90,recorderStart:1020,recorderEnd:1040}),e=>e.status===422);assert.equal(s.rows('records').filter(r=>r.fleet==='QA_TEST').length,1);checks++;
 const transfer={id:randomUUID(),kind:'transfer',localCode:'998877',materialCode:'9',destination:'998878',createdAt:base.createdAt,transferVersion:2,recorderStart:1020,recorderEnd:1030};assert.equal(dispatch(s,operator,'operation-submit',transfer).id,transfer.id);checks++;
 const photo='data:image/jpeg;base64,/9j/2Q==',occurrence={id:randomUUID(),kind:'occurrence',createdAt:base.createdAt,notes:'OCORRENCIA DE TESTE'};assert.equal(dispatch(s,operator,'operation-submit',occurrence).id,occurrence.id);assert.throws(()=>dispatch(s,operator,'operation-submit',{...occurrence,id:randomUUID(),photo}),e=>e.status===422);checks+=2;
 const question=randomUUID();dispatch(s,admin,'checklists-admin',{action:'save-template',fleet:'QA_TEST',expectedVersion:0,questions:[{id:question,text:'Óleo do motor'}]});
 assert.throws(()=>dispatch(s,admin,'checklists-admin',{action:'save-template',fleet:'QA_TEST',expectedVersion:0,questions:[]}),e=>e.status===409);checks++;
 const checklist={id:randomUUID(),kind:'checklist',fleet:'QA_TEST',templateVersion:1,createdAt:base.createdAt,answers:[{id:question,status:'CRITICO'}]};assert.equal(dispatch(s,operator,'operation-submit',checklist).id,checklist.id);dispatch(s,admin,'checklists-admin',{action:'resolve',id:checklist.id,questionId:question,notes:'Óleo substituído'});assert(s.rows('diesel_checklists').find(r=>r.id===checklist.id).resolutions[question]);checks+=2;
 assert.throws(()=>dispatch(s,operator,'admin'),e=>e.status===403);checks++;
 dispatch(s,admin,'record-controls',{action:'remove',kind:'refuel',id:base.id,reason:'TESTE DE EXCLUSAO'});assert.equal(dispatch(s,operator,'records').records.length,0);assert.equal(dispatch(s,admin,'record-controls').records.filter(r=>r.id===base.id).length,1);dispatch(s,admin,'record-controls',{action:'restore',kind:'refuel',id:base.id});assert.equal(dispatch(s,operator,'records').records.length,1);checks+=3;
 dispatch(s,admin,'admin',{action:'member-access',email:operator.email,role:'operator',permissions:{refuel:false,transfer:false,checklist:false}});assert.equal(dispatch(s,operator,'operation-submit',base).duplicate,true);assert.throws(()=>dispatch(s,operator,'operation-submit',{...base,id:randomUUID()}),e=>e.status===403&&e.data.code==='FEATURE_FORBIDDEN');checks+=2;
 await s.flush();const reloaded=await new Store(db).load();assert.equal(reloaded.rows('records').find(r=>r.id===base.id).engine,100);assert.equal(reloaded.rows('records').find(r=>r.id===base.id).measured_fields.engine,true);assert.equal(reloaded.rows('diesel_checklists').find(r=>r.id===checklist.id).grade,'CRITICO');checks+=3;
 const result=await login(db,reloaded,{username:'qa.operator',password:'TestPassword-567890'},'qa');assert(result.token);assert.equal((await authenticate(db,result.token)).id,operatorId);const lease=await registerDevice(reloaded,operator,randomUUID());assert(lease.token);await reloaded.flush();const leases=await new Store(db).load();assert(leases.rows('private.diesel_devices').some(x=>x.user_id===operatorId&&x.token_hash.startsWith('\\x')));checks+=4;
 dispatch(leases,admin,'admin',{action:'member-remove',email:operator.email});assert.throws(()=>dispatch(leases,operator,'session'),e=>e.status===403);dispatch(leases,admin,'admin',{action:'member-restore',email:operator.email});assert.equal(dispatch(leases,operator,'session').user.email,operator.email);await leases.flush();checks+=2;
 throw rollback;
})}catch(e){if(e!==rollback)throw e}finally{db.close()}
const verify=new Database();try{const rows=await verify.query("SELECT COUNT(*) n FROM [app].fleets WHERE id='QA_TEST'");assert.equal(rows[0].n,0);checks++}finally{verify.close()}
console.log(`${checks} SQL Server integration checks passed; all test data rolled back.`);
