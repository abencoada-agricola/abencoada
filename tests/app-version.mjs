import assert from 'node:assert/strict';
import {nextVersionCode,versionForBuild} from '../scripts/app-version.mjs';
assert.deepEqual(versionForBuild(),{name:'2.0.54',code:54,buildNumber:54});
for(const [before,after] of [[59,60],[60,62],[62,64],[99,200],[299,400],[999,2000]])assert.equal(nextVersionCode(before),after);
let previous=53;
for(let build=54;build<250;build++){
 const version=versionForBuild(build);
 assert.ok(version.code>previous);assert.doesNotMatch(version.name,/[13]/);assert.doesNotMatch(String(version.code),/[13]/);
 assert.equal(Number(version.name.split('.').at(-1)),version.code);previous=version.code;
}
assert.throws(()=>versionForBuild(53));assert.throws(()=>versionForBuild('invalid'));
console.log('App versions skip digits 1/3, remain strictly increasing, and match the displayed release version.');
