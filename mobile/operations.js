export function parseNumber(value){const text=String(value??'').trim().replace(/\./g,'').replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(text))throw Error('Informe um número válido com até duas casas decimais.');const n=Number(text);if(!Number.isFinite(n)||n>1e9)throw Error('Valor fora do limite.');return n}
export function formatInput(value){
 const raw=String(value??''),negative=raw.trim().startsWith('-');
 const cleaned=raw.replace(/[^0-9,]/g,''),parts=cleaned.split(',');
 if(!cleaned)return negative?'-':'';
 const integer=parts[0].replace(/^0+(?=\d)/,'')||'0';
 const grouped=integer.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
 return (negative?'-':'')+grouped+(parts.length>1?','+parts.slice(1).join('').slice(0,2):'');
}
export function formatNumericInput(input,event){
 let raw=input.value;const cursor=input.selectionStart??raw.length;
 if(event?.data==='.'&&event.inputType==='insertText')raw=raw.slice(0,cursor-1)+','+raw.slice(cursor);
 const before=raw.slice(0,cursor).replace(/[^0-9,-]/g,'').length;
 input.value=formatInput(raw);input.setCustomValidity('');
 let seen=0,position=0;while(position<input.value.length&&seen<before){if(/[0-9,-]/.test(input.value[position]))seen++;position++}
 input.setSelectionRange(position,position);
}
export function finishNumericInput(input){
 if(!input.value||input.value.endsWith(','))input.value=input.value.replace(/,$/,'');
 if(!input.value)return;
 try{input.value=parseNumber(input.value).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});input.setCustomValidity('')}
 catch(error){input.setCustomValidity(error.message)}
}

export function recorderBase(locations,queue,local,material,exclude){const location=locations.find(l=>l.local_code===local&&l.material_code===material);let base=location?.last_meter??null;for(const r of queue){if(r.id===exclude)break;if(r.localCode===local&&r.materialCode===material&&!r.error&&(r.kind==='refuel'||r.kind==='transfer'&&r.transferVersion===2)){base=r.kind==='transfer'||r.mode==='recorder'?r.recorderEnd:location?.simulated_meter&&base!==null?Math.round((Number(base)+Number(r.liters))*100)/100:null}}return base===null?null:Number(base)}
export function litersFromRecorder(start,end){if(start===null)throw Error('A registradora precisa de uma leitura inicial cadastrada pelo gestor.');const liters=Math.round((end-start)*100)/100;if(liters<=0)throw Error('O final da registradora deve superar a leitura anterior.');return liters}

export function operationDependencies(record){
 if(record.kind==='checklist')return record.fleet?['checklist:'+record.fleet]:[];
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
  if(record.kind==='transfer'&&record.transferVersion===2||record.kind==='refuel'&&record.mode==='recorder')base=record.recorderEnd;else if(record.kind==='refuel'&&record.mode==='manual'&&location?.simulated_meter&&base!==null)base=Math.round((Number(base)+Number(record.liters))*100)/100;
 }
 return base===null?null:Number(base);
}
