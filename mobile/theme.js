import {deliveryNotificationsSupported,requestDeliveryNotifications} from './delivery.js';
export const THEME_KEY='diesel-theme';
export const getTheme=()=>document.documentElement.dataset.theme==='light'?'light':'dark';
export function setTheme(theme){
 if(!['light','dark'].includes(theme))return;
 document.documentElement.dataset.theme=theme;
 try{localStorage.setItem(THEME_KEY,theme)}catch{}
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0e3024':'#f3f6f2');
 window.dispatchEvent(new Event('app-theme-change'));
}
export function installThemeSettings(){
 setTheme(getTheme());
 const button=document.querySelector('#open-settings');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 4 4 1 1 5-4 3-1 5H9l-1-4-4-1-1-5 4-3Z"/><circle cx="12" cy="12" r="3"/></svg>';
 button.onclick=()=>{
  const dialog=document.createElement('dialog');dialog.className='capacity-dialog settings-dialog';
  dialog.innerHTML='<h2>AJUSTES</h2><p>Escolha a aparência do aplicativo.</p><div class="settings-options" role="radiogroup" aria-label="Tema do aplicativo"><button type="button" role="radio" data-theme-choice="light">CLARO</button><button type="button" role="radio" data-theme-choice="dark">ESCURO</button></div><button class="secondary back-button" type="button" data-close>FECHAR</button>';
  const update=()=>dialog.querySelectorAll('[data-theme-choice]').forEach(option=>option.setAttribute('aria-checked',String(option.dataset.themeChoice===getTheme())));
  dialog.querySelectorAll('[data-theme-choice]').forEach(option=>option.onclick=()=>{setTheme(option.dataset.themeChoice);update()});
  if(deliveryNotificationsSupported()){const notifications=document.createElement('button');notifications.className='notification-setting';notifications.type='button';notifications.textContent='ATIVAR AVISOS DE ENVIO';notifications.onclick=async()=>{const result=await requestDeliveryNotifications(true);notifications.textContent=result.enabled?'AVISOS ATIVADOS':'PERMITA NOTIFICAÇÕES NOS AJUSTES DO CELULAR'};dialog.querySelector('[data-close]').before(notifications)}
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();document.body.append(dialog);update();dialog.showModal();
 };
}
