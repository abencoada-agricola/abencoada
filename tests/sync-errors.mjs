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
