import {Capacitor,registerPlugin,SystemBars,SystemBarsStyle,SystemBarType} from '@capacitor/core';
const Appearance=registerPlugin('AppAppearance');
let appliedStyle;
export async function configureSystemBars(force=true){
 const platform=Capacitor.getPlatform();if(!['android','ios'].includes(platform))return;
 const dark=document.documentElement.dataset.theme!=='light';
 const style=dark?SystemBarsStyle.Light:SystemBarsStyle.Dark;
 try{
  if(force||appliedStyle!==style){
   await SystemBars.setStyle({style,bar:SystemBarType.StatusBar});
   if(platform==='android')await SystemBars.setStyle({style,bar:SystemBarType.NavigationBar});
   await SystemBars.show({bar:SystemBarType.StatusBar});appliedStyle=style;
  }
  if(platform==='android')await Appearance.apply({dark});
 }catch(error){appliedStyle=undefined;console.warn('Não foi possível ajustar a barra de status.',error)}
}
if(Capacitor.getPlatform()==='android')new MutationObserver(()=>configureSystemBars(false)).observe(document.documentElement,{attributes:true,attributeFilter:['style']});
window.addEventListener('app-theme-change',()=>configureSystemBars());
