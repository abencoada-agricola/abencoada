import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=(await readFile('mobile/system-bars.js','utf8')).replace(/^import .*;\n/gm,'').replaceAll('export ','');
const calls=[],appearance=[];let platform='android';
let login=false,reservedBottom=0;const root={dataset:{theme:'dark'},style:{getPropertyValue:()=>String(reservedBottom)}};
const state={Capacitor:{getPlatform:()=>platform},registerPlugin:()=>({apply:async value=>appearance.push(value)}),SystemBarsStyle:{Dark:'DARK',Light:'LIGHT'},SystemBarType:{StatusBar:'status',NavigationBar:'navigation'},SystemBars:{setStyle:async value=>calls.push(value),show:async()=>{}},document:{documentElement:root,body:{classList:{contains:()=>login}}},window:{addEventListener(){}},MutationObserver:class{observe(){}},console};
vm.createContext(state);vm.runInContext(source,state);
await state.configureSystemBars();assert.equal(calls[0].style,'DARK');assert.equal(calls[1].style,'DARK');assert.equal(appearance[0].dark,true);
root.dataset.theme='light';await state.configureSystemBars();assert.equal(calls[2].style,'LIGHT');assert.equal(calls[3].style,'LIGHT');assert.equal(appearance[1].dark,false);
platform='ios';root.dataset.theme='dark';await state.configureSystemBars();assert.equal(calls[4].style,'DARK');assert.equal(appearance.length,2);
platform='web';await state.configureSystemBars();assert.equal(calls.length,5);
console.log('Dark backgrounds use light system icons; light backgrounds use dark icons on Android and iOS.');

platform='android';login=true;root.dataset.theme='dark';await state.configureSystemBars();assert.equal(calls[5].style,'LIGHT');assert.equal(calls[6].style,'DARK');assert.equal(appearance.at(-1).login,true);
login=false;await state.configureSystemBars();assert.equal(calls[7].style,'DARK');assert.equal(appearance.at(-1).login,false);
console.log('White login header uses dark status icons; the dark app keeps light status icons and its navigation style.');

login=true;reservedBottom=24;await state.configureSystemBars();assert.equal(calls.at(-1).style,'LIGHT');console.log('Reserved white login navigation insets retain dark, readable navigation icons.');
