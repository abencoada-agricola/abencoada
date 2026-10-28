let timer;
function notice(kind,title,detail){
 let element=document.querySelector('#delivery-feedback');
 if(!element){element=document.createElement('div');element.id='delivery-feedback';element.className='delivery-feedback';element.setAttribute('role','status');element.setAttribute('aria-live','polite');document.body.append(element);}
 element.dataset.kind=kind;element.replaceChildren();
 const icon=document.createElement('span');icon.className='delivery-feedback-icon';icon.textContent=kind==='sent'?'✓':'↓';icon.setAttribute('aria-hidden','true');
 const text=document.createElement('div'),heading=document.createElement('strong'),description=document.createElement('span');heading.textContent=title;description.textContent=detail;text.append(heading,description);element.append(icon,text);element.hidden=false;
 clearTimeout(timer);timer=setTimeout(()=>{element.hidden=true},7000);
}
export const showSaved=()=>notice('saved','Salvo no aparelho','Seus dados estão seguros aqui. Aguardando confirmação do envio.');
export const showDelivered=count=>notice('sent',count===1?'Enviado com sucesso':`${count} registros enviados`,'A administração confirmou o recebimento.');
export function loginLoading(button,loading,label){
 button.disabled=loading;button.replaceChildren();button.setAttribute('aria-busy',String(loading));
 if(loading){const spinner=document.createElement('span');spinner.className='auth-spinner';spinner.setAttribute('aria-hidden','true');button.append(spinner);}
 button.append(document.createTextNode(label));
}
