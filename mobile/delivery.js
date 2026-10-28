import {Capacitor,registerPlugin} from '@capacitor/core';
import {showDelivered} from './feedback.js';
const native=registerPlugin('DeliveryNotifications');
const seen=new Set();
export const deliveryNotificationsSupported=()=>Capacitor.getPlatform()==='android';
export async function requestDeliveryNotifications(explicit=false){
 if(!deliveryNotificationsSupported())return {enabled:false,supported:false};
 try{
  if(!explicit&&localStorage.getItem('delivery-permission-asked')==='yes')return native.status();
  localStorage.setItem('delivery-permission-asked','yes');return await native.request();
 }catch{return {enabled:false}}
}
export function reportDelivery(userId,ids){
 const fresh=[...new Set(ids)].filter(id=>typeof id==='string'&&id&&!seen.has(userId+':'+id));
 for(const id of fresh)seen.add(userId+':'+id);
 if(!fresh.length)return;
 while(seen.size>4096)seen.delete(seen.values().next().value);
 showDelivered(fresh.length);
 if(deliveryNotificationsSupported())native.delivered({userId,ids:fresh}).catch(()=>{});
}
