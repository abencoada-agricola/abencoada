import {Capacitor,CapacitorHttp} from '@capacitor/core';

// iOS uses capacitor://localhost, which the legacy login endpoint does not
// accept as a browser origin. Native HTTPS keeps server authentication intact.
export function loginRequest(url,options={}){
 if(Capacitor.getPlatform()!=='ios')return fetch(url,options);
 const signal=options.signal;
 return new Promise((resolve,reject)=>{
  const aborted=()=>reject(new DOMException('Login cancelado.','AbortError'));
  if(signal?.aborted){aborted();return}
  signal?.addEventListener('abort',aborted,{once:true});
  Promise.resolve().then(()=>CapacitorHttp.request({url,method:options.method||'POST',headers:options.headers,
   data:JSON.parse(options.body||'{}'),responseType:'json',connectTimeout:18000,readTimeout:18000
  })).then(result=>resolve(new Response(JSON.stringify(result.data),{status:result.status,headers:result.headers}))).catch(()=>reject(new TypeError('Não foi possível conectar.')))
   .finally(()=>signal?.removeEventListener('abort',aborted));
 });
}
