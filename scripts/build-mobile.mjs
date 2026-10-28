import {build} from 'esbuild';
import {versionForBuild} from './app-version.mjs';
const appVersion=versionForBuild(process.env.APP_BUILD_NUMBER);
import {mkdir,rm,cp,readFile,writeFile} from 'node:fs/promises';
const config={url:process.env.SUPABASE_URL||'',publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY||'',loginKey:process.env.SUPABASE_LOGIN_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||''};
for(const key of [config.publishableKey,config.loginKey]){if(key.startsWith('sb_secret_'))throw Error('Use somente chaves públicas.');if(key.includes('.')&&JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role')throw Error('Chave administrativa proibida no aplicativo.')}
await rm('mobile-dist',{recursive:true,force:true});await mkdir('mobile-dist');
await writeFile('mobile-dist/index.html',(await readFile('mobile/index.html','utf8')).replaceAll('__APP_VERSION__',appVersion.name));await cp('mobile/mobile.css','mobile-dist/mobile.css');await cp('mobile/material.css','mobile-dist/material.css');await cp('mobile/app-icon.png','mobile-dist/app-icon.png');await cp('mobile/login-logo.png','mobile-dist/login-logo.png');await cp('mobile/header-logo.png','mobile-dist/header-logo.png');
for(const file of ['logo.png','fleets.json'])await cp('web/'+file,'mobile-dist/'+file);
await build({entryPoints:['mobile/app.js'],outfile:'mobile-dist/mobile.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,plugins:[{name:'public-config',setup(b){b.onLoad({filter:/web\/config\.js$/},()=>({contents:'export const config='+JSON.stringify(config),loader:'js'}))}}]});
console.log('Interface Android/iOS preparada.');
