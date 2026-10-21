export function describeSyncFailure(error,wasConnected=false,hasPending=true){
 const status=Number(error?.status||0),detail=String(error?.message||'');
 const saved=hasPending?' OS REGISTROS CONTINUAM SALVOS.':'';
 if(status===401)return {connected:true,requiresLogin:true,label:'ENTRAR NOVAMENTE',message:'A SESSÃO EXPIROU. ENTRE NOVAMENTE NA MESMA CONTA.'+saved};
 if(status===403)return {connected:true,requiresLogin:false,label:'SEM PERMISSÃO',message:'O SERVIDOR RECUSOU O ACESSO.'+saved+' CONSULTE O GESTOR.'};
 if(status>=500)return {connected:true,requiresLogin:false,label:'SERVIDOR INDISPONÍVEL',message:hasPending?'O SERVIDOR NÃO CONCLUIU O ENVIO. O APP VAI TENTAR NOVAMENTE.'+saved:''};
 if(status===429)return {connected:true,requiresLogin:false,label:hasPending?'AGUARDE O ENVIO':'AGUARDE A ATUALIZAÇÃO',message:hasPending?'O SERVIDOR RECEBEU MUITAS TENTATIVAS. AGUARDE; O APP VAI TENTAR NOVAMENTE.':''};
 // Supabase may return an aborted fetch as a plain error message instead of a DOMException.
 const network=error?.name==='AbortError'||error?.name==='TypeError'||['REQUEST_ABORTED','NETWORK_ERROR'].includes(error?.code)||/aborterror|the user aborted a request|operation was aborted|failed to fetch|networkerror|não foi possível conectar|fetch failed|network request failed/i.test(detail);
 return {connected:network?false:wasConnected,requiresLogin:false,label:network?'SEM CONEXÃO':hasPending?'FALHA NO ENVIO':'ATUALIZAÇÃO PENDENTE',message:network?(hasPending?'NÃO FOI POSSÍVEL CONECTAR AO SERVIDOR. OS REGISTROS CONTINUAM SALVOS E SERÃO REENVIADOS.':''):(hasPending?'NÃO FOI POSSÍVEL CONCLUIR O ENVIO. O APP VAI TENTAR NOVAMENTE.'+saved:'NÃO FOI POSSÍVEL ATUALIZAR OS DADOS DO APP. TENTE NOVAMENTE.')};
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
