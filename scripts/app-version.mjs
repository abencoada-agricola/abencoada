import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const base=JSON.parse(readFileSync(new URL('../app-version.json',import.meta.url),'utf8'));
const allowed=value=>/^\d+(\.\d+)*$/.test(String(value))&&!/[13]/.test(String(value));
if(!allowed(base.version)||!allowed(base.versionCode)||!Number.isSafeInteger(base.versionCode))throw Error('A versão do aplicativo não pode conter os dígitos 1 ou 3.');

export function nextVersionCode(code){
 if(!Number.isSafeInteger(code)||code<0)throw Error('Código de versão inválido.');
 do{code++;if(code>2100000000)throw Error('Limite de versão Android atingido.')}while(!allowed(code));
 return code;
}
export function versionForBuild(buildNumber=base.buildNumber){
 const build=Number(buildNumber);
 if(!Number.isSafeInteger(build)||build<base.buildNumber)throw Error('Número de build anterior à versão base.');
 let code=base.versionCode;
 for(let n=base.buildNumber;n<build;n++)code=nextVersionCode(code);
 const prefix=base.version.split('.').slice(0,-1).join('.');
 return {name:prefix+'.'+code,code,buildNumber:build};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const version=versionForBuild(process.argv[2]);
 console.log(`APP_BUILD_NUMBER=${version.buildNumber}\nAPP_VERSION=${version.name}\nAPP_VERSION_CODE=${version.code}`);
}
