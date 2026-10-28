import assert from 'node:assert/strict';
import {normalizeGmaisFleet,normalizeGmaisSession} from '../web/gmais-fleet.js';
import {fleetMeters,canUseElevator} from '../mobile/fleet-qr.js';
import {capacityWarning} from '../web/fuel-utils.js';
// Synthetic contract examples; no production fleet catalog is embedded here.
const example=overrides=>({id:'EXAMPLE',name:'EXEMPLO',type:'Outro',last_km:120,last_engine:15,last_elevator:8,meter_fields:{km:true,engine:true,elevator:true},tank_capacity:999,gmais:{version:1,companyCode:'ORG',branchCode:'BRANCH',fleetCode:'EXAMPLE',modelCode:'MODEL',meterUnit:'KM',additionalMeter:'none',tankCapacityConfirmed:false,...overrides}});
const legacy={id:'LOCAL',type:'Colhedora',meter_fields:{km:false,engine:true,elevator:true},tank_capacity:100};
assert.equal(normalizeGmaisFleet(legacy),legacy);
const legacySession={user:{id:'USER'},fleets:[legacy]};assert.equal(normalizeGmaisSession(legacySession),legacySession);
const pickup=example();const before=structuredClone(pickup);const normalized=normalizeGmaisFleet(pickup);
assert.deepEqual(normalized.meter_fields,{km:true,engine:false,elevator:false});assert.deepEqual(fleetMeters(pickup),normalized.meter_fields);assert.equal(canUseElevator(pickup),false);
assert.equal(normalized.tank_capacity,null);assert.equal(capacityWarning(normalized,1000),null);assert.deepEqual(pickup,before);
assert.deepEqual(fleetMeters({...example(),type:'Colhedora'}),{km:true,engine:false,elevator:false});
assert.throws(()=>normalizeGmaisSession({fleets:[example(),null]}),e=>e.code==='GMAIS_CONFIGURATION_INVALID');
const truck=normalizeGmaisFleet({...example({meterUnit:'HR'}),type:'Caminhão'});assert.deepEqual(fleetMeters(truck),{km:false,engine:true,elevator:false});
// The future server confirms the purpose explicitly; no category/name inference.
const machine=normalizeGmaisFleet(example({meterUnit:'HR',additionalMeter:'elevator',tankCapacityConfirmed:true,tankCapacityLiters:123.5}));assert.deepEqual(fleetMeters(machine),{km:false,engine:true,elevator:true});assert.equal(canUseElevator(machine),true);assert.deepEqual(capacityWarning(machine,124),{capacity:123.5,liters:124});
for(const changes of [{version:2},{meterUnit:'Hora'},{meterUnit:null},{additionalMeter:'unconfirmed'},{additionalMeter:true},{companyCode:''},{branchCode:null},{modelCode:''},{fleetCode:'DIFFERENT'},{tankCapacityConfirmed:'true'},{tankCapacityConfirmed:true,tankCapacityLiters:0},{tankCapacityConfirmed:true,tankCapacityLiters:'123,5'},{tankCapacityConfirmed:true,tankCapacityLiters:Infinity},{tankCapacityConfirmed:true,tankCapacityLiters:100001}])assert.throws(()=>normalizeGmaisFleet(example(changes)),e=>e.code==='GMAIS_CONFIGURATION_INVALID');
const source={user:{id:'USER'},locations:[{local_code:'LOCAL'}],rules:{futureDate:false},fleets:[example()]};const sourceCopy=structuredClone(source);const session=normalizeGmaisSession(source);
assert.equal(session.user,source.user);assert.equal(session.locations,source.locations);assert.deepEqual(source,sourceCopy);for(const k of ['last_km','last_engine','last_elevator'])assert.equal(session.fleets[0][k],source.fleets[0][k]);
assert.throws(()=>normalizeGmaisSession({...source,fleets:[example(),example({companyCode:'OTHER'})]}),e=>e.code==='GMAIS_CONFIGURATION_INVALID');
// JSON round-trip is the catalog persisted offline; pending payloads stay intact.
const cached=JSON.parse(JSON.stringify(session));assert.deepEqual(fleetMeters(cached.fleets[0]),{km:true,engine:false,elevator:false});const queued={id:'RECORD',fleet:'EXAMPLE',measuredFields:{km:true,engine:false,elevator:false},km:130};const queueBefore=structuredClone(queued);
const refreshed=normalizeGmaisSession({...source,fleets:[example({meterUnit:'HR'})]});assert.notDeepEqual(fleetMeters(refreshed.fleets[0]),queued.measuredFields);assert.deepEqual(queued,queueBefore);
console.log('GMAIS contract: dynamic units/additional meter, explicit capacity, invalid and ambiguous metadata, company collisions, legacy compatibility, offline catalog and queue preservation passed.');
