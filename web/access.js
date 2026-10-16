export const featureLabels={refuel:'ABASTECIMENTO',transfer:'TRANSFERÊNCIA',checklist:'CHECKLIST'};
export function memberPermissions(member){
 if(member?.permissions===undefined)return {refuel:true,transfer:true,checklist:true};
 return Object.fromEntries(Object.keys(featureLabels).map(key=>[key,member.permissions?.[key]===true]));
}
export const canUseFeature=(session,feature)=>Boolean(session?.user)&&memberPermissions(session.user)[feature]===true;
export function requireFeature(session,feature){if(!canUseFeature(session,feature))throw Error('ACESSO A '+featureLabels[feature]+' NÃO LIBERADO. CONSULTE O ADMINISTRADOR.')}
export const accessSignature=session=>JSON.stringify({role:session?.user?.role,permissions:memberPermissions(session?.user)});
