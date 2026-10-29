import {deliveryNotificationsSupported,requestDeliveryNotifications} from './delivery.js';
export const THEME_KEY='diesel-theme';
export const getTheme=()=>document.documentElement.dataset.theme==='light'?'light':'dark';
export function setTheme(theme){
 if(!['light','dark'].includes(theme))return;
 document.documentElement.dataset.theme=theme;
 try{localStorage.setItem(THEME_KEY,theme)}catch{}
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#ffffff');
 window.dispatchEvent(new Event('app-theme-change'));
}
export function installThemeSettings(){
 setTheme(getTheme());
 const button=document.querySelector('#open-settings');
 button.innerHTML='<svg class="settings-cog" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M9.93 4.27 L10.61 2.10 L13.39 2.10 L14.07 4.27 L16.00 5.07 L18.02 4.01 L19.99 5.98 L18.93 8.00 L19.73 9.93 L21.90 10.61 L21.90 13.39 L19.73 14.07 L18.93 16.00 L19.99 18.02 L18.02 19.99 L16.00 18.93 L14.07 19.73 L13.39 21.90 L10.61 21.90 L9.93 19.73 L8.00 18.93 L5.98 19.99 L4.01 18.02 L5.07 16.00 L4.27 14.07 L2.10 13.39 L2.10 10.61 L4.27 9.93 L5.07 8.00 L4.01 5.98 L5.98 4.01 L8.00 5.07 Z M12 8.5 a3.5 3.5 0 1 0 0 7 a3.5 3.5 0 1 0 0 -7 Z"/></svg>';
 button.onclick=()=>{
  const dialog=document.createElement('dialog');dialog.className='capacity-dialog settings-dialog';
  dialog.innerHTML='<h2>AJUSTES</h2><p>Escolha a aparência do aplicativo.</p><div class="settings-options" role="radiogroup" aria-label="Tema do aplicativo"><button type="button" role="radio" data-theme-choice="light">CLARO</button><button type="button" role="radio" data-theme-choice="dark">ESCURO</button></div><button class="secondary back-button" type="button" data-close>FECHAR</button>';
  const update=()=>dialog.querySelectorAll('[data-theme-choice]').forEach(option=>option.setAttribute('aria-checked',String(option.dataset.themeChoice===getTheme())));
  dialog.querySelectorAll('[data-theme-choice]').forEach(option=>option.onclick=()=>{setTheme(option.dataset.themeChoice);update()});
  if(deliveryNotificationsSupported()){const notifications=document.createElement('button');notifications.className='notification-setting';notifications.type='button';notifications.textContent='ATIVAR AVISOS DE ENVIO';notifications.onclick=async()=>{const result=await requestDeliveryNotifications(true);notifications.textContent=result.enabled?'AVISOS ATIVADOS':'PERMITA NOTIFICAÇÕES NOS AJUSTES DO CELULAR'};dialog.querySelector('[data-close]').before(notifications)}
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();document.body.append(dialog);update();dialog.showModal();
 };
}
