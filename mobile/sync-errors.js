export function describeSyncFailure(error,wasConnected=false){
 const status=Number(error?.status||0),message=String(error?.message||'Não foi possível confirmar o envio.');
 if(status===401)return {connected:true,requiresLogin:true,label:'ENTRAR NOVAMENTE',message:'A SESSÃO EXPIROU. ENTRE NOVAMENTE NA MESMA CONTA. OS REGISTROS CONTINUAM SALVOS.'};
 if(status===403)return {connected:true,requiresLogin:false,label:'SEM PERMISSÃO',message:'O SERVIDOR RECUSOU O ACESSO: '+message+' OS REGISTROS CONTINUAM SALVOS. CONSULTE O GESTOR.'};
 if(status>=500)return {connected:true,requiresLogin:false,label:'SERVIDOR INDISPONÍVEL',message:'O SERVIDOR NÃO CONCLUIU O ENVIO. O APP VAI TENTAR NOVAMENTE. OS REGISTROS CONTINUAM SALVOS.'};
 if(status===429)return {connected:true,requiresLogin:false,label:'AGUARDE O ENVIO',message:'O SERVIDOR RECEBEU MUITAS TENTATIVAS. AGUARDE; O APP VAI TENTAR NOVAMENTE.'};
 const network=error?.name==='AbortError'||error?.name==='TypeError'||/failed to fetch|networkerror|não foi possível conectar|fetch failed|network request failed/i.test(message);
 return {connected:network?false:wasConnected,requiresLogin:false,label:network?'SEM CONEXÃO':'FALHA NO ENVIO',message:network?'NÃO FOI POSSÍVEL CONECTAR AO SERVIDOR. OS REGISTROS CONTINUAM SALVOS E SERÃO REENVIADOS.':'NÃO FOI POSSÍVEL CONCLUIR O ENVIO: '+message+' OS REGISTROS CONTINUAM SALVOS.'};
}
// A failure in the native background service must not stop foreground delivery.
export async function prepareBackgroundSync(mirror,configure){
 let error=null;try{await mirror()}catch(e){error=e}
 try{await configure()}catch(e){error=e}
 return error;
}

export function recoverCredentialFailure(record){
 if(record.error==='Entre novamente para renovar o envio automático.'){record.lastSendError=record.error;delete record.error;return true}return false;
}
