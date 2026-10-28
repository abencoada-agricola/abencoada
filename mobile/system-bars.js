import {Capacitor,SystemBars,SystemBarsStyle,SystemBarType} from '@capacitor/core';

let appliedNavigationStyle;
export async function configureSystemBars(force=true){
 if(Capacitor.getPlatform()!=='android')return;
 // New WebViews draw the green page behind the gesture bar. Older versions
 // reserve a native inset, painted white by the activity's window background.
 const bottomInset=parseFloat(document.documentElement.style.getPropertyValue('--safe-area-inset-bottom'))||0;
 const navigationStyle=bottomInset>0?SystemBarsStyle.Dark:SystemBarsStyle.Light;
 if(!force&&appliedNavigationStyle===navigationStyle)return;
 appliedNavigationStyle=navigationStyle;
 try{
  await SystemBars.setStyle({style:SystemBarsStyle.Light,bar:SystemBarType.StatusBar});
  await SystemBars.setStyle({style:navigationStyle,bar:SystemBarType.NavigationBar});
  await SystemBars.show({bar:SystemBarType.StatusBar});
 }catch(error){appliedNavigationStyle=undefined;console.warn('Não foi possível ajustar a barra de status.',error)}
}

if(Capacitor.getPlatform()==='android'){
 // Capacitor supplies these insets after the WebView commits the page and when
 // the keyboard/system bars change. Ignore repeated identical native values.
 new MutationObserver(()=>configureSystemBars(false)).observe(document.documentElement,{attributes:true,attributeFilter:['style']});
}
