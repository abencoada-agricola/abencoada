// Optional, versioned contract supplied by the authenticated integration server.
// These are application/API fields, not assumed GMAIS database column names.
const invalid=message=>Object.assign(Error('Configuração da frota no GMAIS: '+message),{code:'GMAIS_CONFIGURATION_INVALID'});
const identifier=value=>typeof value==='string'&&/^[A-Za-z0-9_.-]{1,30}$/.test(value);

export function gmaisMeterFields(fleet){
 const source=fleet?.gmais;
 if(source===undefined||source===null)return null;
 if(typeof source!=='object'||Array.isArray(source)||source.version!==1)throw invalid('versão de integração inválida.');
 for(const key of ['companyCode','branchCode','fleetCode','modelCode'])if(!identifier(source[key]))throw invalid('identificação incompleta da frota ou do modelo.');
 if(source.fleetCode!==fleet.id)throw invalid('o código recebido não corresponde à frota.');
 if(!['KM','HR'].includes(source.meterUnit))throw invalid('confirme a unidade KM/Hora do modelo.');
 if(!['none','elevator'].includes(source.additionalMeter))throw invalid('confirme a finalidade do medidor adicional.');
 return {km:source.meterUnit==='KM',engine:source.meterUnit==='HR',elevator:source.additionalMeter==='elevator'};
}

export function normalizeGmaisFleet(fleet){
 const meters=gmaisMeterFields(fleet);
 if(!meters)return fleet;
 const source=fleet.gmais;
 if(typeof source.tankCapacityConfirmed!=='boolean')throw invalid('informe se a capacidade do tanque foi confirmada.');
 let capacity=null;
 if(source.tankCapacityConfirmed){
  capacity=source.tankCapacityLiters;
  if(typeof capacity!=='number'||!Number.isFinite(capacity)||capacity<=0||capacity>100000)throw invalid('capacidade do tanque inválida.');
 }
 // Preserve readings, identity and session data. Unknown capacity is never inferred.
 return {...fleet,meter_fields:meters,tank_capacity:capacity};
}

export function normalizeGmaisSession(data){
 if(!Array.isArray(data?.fleets)||!data.fleets.some(f=>f?.gmais!=null))return data;
 if(data.fleets.some(f=>!f||typeof f!=='object'||!identifier(f.id)))throw invalid('catálogo de frotas inválido.');
 const fleets=data.fleets.map(normalizeGmaisFleet),ids=new Set();
 for(const fleet of fleets){
  if(ids.has(fleet.id))throw invalid('código de frota duplicado. O servidor deve delimitar a empresa antes de enviar o catálogo.');
  ids.add(fleet.id);
 }
 return {...data,fleets};
}
