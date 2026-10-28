// Editing the default context does not modify queued operations or their payloads.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function editContext({context,locations=[],materials=[],save}){
 const dialog=document.createElement('dialog');dialog.className='capacity-dialog context-dialog';dialog.setAttribute('aria-labelledby','context-dialog-title');
 const options=(items,code,name)=>[...new Map(items.map(item=>[item[code],item])).values()].map(item=>`<option value="${esc(item[code])}">${esc(item[name])}</option>`).join('');
 dialog.innerHTML=`<h2 id="context-dialog-title">ALTERAR LOCAL E MATERIAL</h2><p>Escolha os códigos para os próximos registros.</p><form id="edit-context-form"><label>LOCAL<input name="localCode" inputmode="numeric" pattern="[0-9]{1,30}" maxlength="30" required autocomplete="off" value="${esc(context.localCode)}" list="edit-context-locations"></label><datalist id="edit-context-locations">${options(locations,'local_code','name')}</datalist><label>MATERIAL<input name="materialCode" inputmode="numeric" pattern="[0-9]{1,30}" maxlength="30" required autocomplete="off" value="${esc(context.materialCode)}" list="edit-context-materials"></label><datalist id="edit-context-materials">${options(materials.length?materials:locations,'material_code','material_name')}</datalist><p class="error" role="alert" id="context-edit-error"></p><button class="primary" type="submit">SALVAR ALTERAÇÃO</button><button class="secondary" type="button" data-cancel-context>CANCELAR</button></form>`;
 let saving=false;const form=dialog.querySelector('form'),cancel=dialog.querySelector('[data-cancel-context]');
 cancel.onclick=()=>dialog.close();dialog.oncancel=event=>{if(saving)event.preventDefault()};dialog.onclose=()=>dialog.remove();
 form.onsubmit=async event=>{
  event.preventDefault();if(saving)return;
  const values=Object.fromEntries(new FormData(form));for(const key of ['localCode','materialCode'])values[key]=String(values[key]||'').trim();
  const error=dialog.querySelector('#context-edit-error');error.textContent='';
  if(!/^[0-9]{1,30}$/.test(values.localCode)||!/^[0-9]{1,30}$/.test(values.materialCode)){error.textContent='Informe os códigos de local e material usando apenas números.';return}
  saving=true;form.querySelectorAll('button').forEach(button=>button.disabled=true);
  try{await save(values);dialog.close()}catch(failure){error.textContent=failure.message||'Não foi possível salvar. Tente novamente.'}finally{saving=false;form.querySelectorAll('button').forEach(button=>button.disabled=false)}
 };
 document.body.append(dialog);dialog.showModal();return dialog;
}
