export function parseNumber(value){const text=String(value??'').trim().replace(/\./g,'').replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(text))throw Error('Informe um número válido com até duas casas decimais.');const n=Number(text);if(!Number.isFinite(n)||n>1e9)throw Error('Valor fora do limite.');return n}
export function formatInput(value){const digits=String(value).replace(/\D/g,'').slice(0,12);if(!digits)return '';return (Number(digits)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
export function recorderBase(locations,queue,local,material,exclude){const location=locations.find(l=>l.local_code===local&&l.material_code===material);let base=location?.last_meter??null;for(const r of queue){if(r.id===exclude)break;if(r.localCode===local&&r.materialCode===material&&!r.error&&(r.kind==='refuel'||r.kind==='transfer'&&r.transferVersion===2)){base=r.kind==='transfer'||r.mode==='recorder'?r.recorderEnd:null}}return base===null?null:Number(base)}
export function litersFromRecorder(start,end){if(start===null)throw Error('A registradora precisa de uma leitura inicial cadastrada pelo gestor.');const liters=Math.round((end-start)*100)/100;if(liters<=0)throw Error('O final da registradora deve superar a leitura anterior.');return liters}

export function operationDependencies(record){
 const keys=[];
 if(record.localCode&&record.materialCode)keys.push('local:'+record.localCode+':'+record.materialCode);
 if(record.fleet)keys.push('fleet:'+record.fleet);
 if(record.kind==='transfer'&&record.destination)keys.push('local:'+record.destination+':'+record.materialCode);
 return keys;
}

export function transferRecorderBase(locations,queue,local,material,exclude){
 const location=locations.find(l=>l.local_code===local&&l.material_code===material);
 let base=location?.last_meter??location?.last_verified_meter??null;
 for(const record of queue){
  if(record.id===exclude)break;
  if(record.localCode!==local||record.materialCode!==material||record.error)continue;
  if(record.kind==='transfer'&&record.transferVersion===2||record.kind==='refuel'&&record.mode==='recorder')base=record.recorderEnd;
 }
 return base===null?null:Number(base);
}
