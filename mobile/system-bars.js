import {Capacitor,registerPlugin,SystemBars,SystemBarsStyle,SystemBarType} from '@capacitor/core';
const Appearance=registerPlugin('AppAppearance');
let appliedStyle,appliedNavigationStyle;
export async function configureSystemBars(force=true){
 const platform=Capacitor.getPlatform();if(!['android','ios'].includes(platform))return;
 const dark=document.documentElement.dataset.theme!=='light';
 const login=document.body?.classList.contains('login-screen')===true;
 const style=SystemBarsStyle.Light;
 const reservedBottom=parseFloat(document.documentElement.style.getPropertyValue('--safe-area-inset-bottom'))||0;
 const navigationStyle=dark&&reservedBottom<=0?SystemBarsStyle.Dark:SystemBarsStyle.Light;
 try{
  if(force||appliedStyle!==style||appliedNavigationStyle!==navigationStyle){
   await SystemBars.setStyle({style,bar:SystemBarType.StatusBar});
   if(platform==='android')await SystemBars.setStyle({style:navigationStyle,bar:SystemBarType.NavigationBar});
   await SystemBars.show({bar:SystemBarType.StatusBar});appliedStyle=style;appliedNavigationStyle=navigationStyle;
  }
  if(platform==='android')await Appearance.apply({dark,login});
 }catch(error){appliedStyle=undefined;console.warn('Não foi possível ajustar a barra de status.',error)}
}
if(Capacitor.getPlatform()==='android')new MutationObserver(()=>configureSystemBars(false)).observe(document.documentElement,{attributes:true,attributeFilter:['style']});
window.addEventListener('app-theme-change',()=>configureSystemBars());
