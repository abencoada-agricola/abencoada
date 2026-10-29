# Login e desbloqueio offline

## Funcionamento

O primeiro acesso nesta versão exige internet. O usuário informa as credenciais ao servidor de autenticação existente; somente uma resposta de sessão válida habilita o desbloqueio offline. O app guarda o usuário e usa a mesma senha do último login online para desbloquear o catálogo local, sem guardar a senha legível.

Hoje o login online continua no servidor do Abençoada. Quando o Luiz conectar a autenticação do GMAIS, a validação continuará no servidor: o cliente não se conecta ao banco do GMAIS, não consulta hashes de senha desse banco e não recebe credenciais administrativas. A identidade retornada para cada pessoa precisa continuar estável, para preservar a autoria e as filas existentes.

- **Sair:** o botão do cabeçalho fecha a sessão visível e volta aos campos de usuário e senha, preservando o acesso offline criptografado. É possível sair e entrar novamente sem internet com o mesmo usuário e senha. Rascunhos e registros pendentes são preservados, e uma conta diferente não pode substituir a conta original enquanto houver registros dela aguardando envio. Não há menu de conta nem opção separada de bloqueio. Um envio em andamento termina antes de liberar novo acesso.
- **Ao iniciar o app:** pede usuário e senha para abrir o catálogo local. Após cada autenticação, o usuário deve escolher novamente Local e Material, mesmo sem internet. A seleção anterior não é reutilizada; pendências mantêm os códigos originais e rascunhos de operações são preservados. Alternar para câmera/QR ou outro app não introduz um bloqueio automático que interrompa a captura.
- **Sem rede:** aceita somente o usuário e a senha previamente validados neste aparelho. Outros usuários e uma senha alterada no servidor precisam de validação online antes de funcionar offline.
- **Com rede:** tenta validar as credenciais no servidor. Uma falha de transporte permite tentar o desbloqueio local; credenciais recusadas não autorizam fallback. Recusas conhecidas do servidor invalidam o acesso offline até novo login online.

O prazo inicial é de 30 dias desde a última resposta de sessão autenticada válida. O valor está em `OFFLINE_ACCESS_DAYS`, em `mobile/local-access.js`. Uma validação online renova o prazo; desconectar, abrir o app ou desbloquear localmente não o renovam. Depois do prazo, o app pede internet e preserva os registros. Uma alteração significativa do relógio para trás também pede validação online. Essa política local não substitui decisões de autorização do servidor nem proporciona revogação imediata enquanto o aparelho estiver isolado da rede.

## Armazenamento

`LocalAccess` deriva uma chave AES-GCM de 256 bits usando PBKDF2-HMAC-SHA256, salt aleatório de 32 bytes e 600000 iterações. A chave não é exportável. O resultado autenticado da descriptografia verifica a senha sem precisar gravá-la. Cada gravação usa IV aleatório de 12 bytes e vincula usuário/conta aos dados autenticados adicionais.

O catálogo/sessão em `last-session` fica cifrado. A chave derivada só permanece em memória enquanto o app está desbloqueado; bloquear aguarda as gravações em andamento e libera essa chave. A habilitação inicial grava perfil e sessão cifrada em uma transação IndexedDB, preservando o estado anterior se a gravação falhar. Cinco erros consecutivos impõem uma espera local de um minuto, sem apagar registros.

Os metadados de conta, prazo e tentativas são locais e não contêm senha. As filas e rascunhos continuam no armazenamento privado do aplicativo como antes; a fila nativa de segundo plano conserva sua proteção existente. A sessão de rede permanece sob gerenciamento do SDK de autenticação existente. Não se presume proteção contra adulteração por alguém que controle o sistema operacional ou modifique o aplicativo. O servidor continua validando a conta, as permissões e os registros quando forem enviados.

## Falta de sessão de rede versus acesso revogado

O acesso offline não depende de um token de rede ainda válido. Em modo avião, o app não tenta renovar a sessão. Se o SDK já não possuir uma sessão local de rede, `LOCAL_AUTH_REQUIRED` mantém o uso offline e orienta validar com internet antes de enviar. Isso é diferente de uma resposta autenticada de recusa do servidor, que exige novo login. Uma atualização local das permissões só é aceita após resposta de sessão válida do servidor.

Trocar de usuário com registros de outra pessoa pendentes é impedido, mesmo que o login da nova conta seja válido. Mudanças de senha, falhas de armazenamento, prazo vencido e revogações não removem a fila. Nenhum registro é atribuído automaticamente a uma conta diferente.

## Design dos campos

Os campos de usuário e senha seguem a referência de [label input do Bencho](https://bencho.dev/blocks/label-input?c=label-input&theme=light): o rótulo fica dentro do campo vazio e sobe à borda quando há foco ou conteúdo. O estilo foi adaptado à identidade do app com CSS local, sem React, fontes externas ou dependência da página de referência. O botão de mostrar senha mantém foco, descrição acessível e a digitação original. O movimento respeita a preferência por animação reduzida.

## Validação

- `tests/local-access.mjs`: senha correta/incorreta, sessão cifrada, reinício sem chave, bloqueio, gravações ordenadas, espera entre tentativas, revogação, prazo, alteração de relógio, erro de armazenamento e preservação de registros.
- `tests/mobile-access-ui.mjs`: modo avião sem tentativa de rede, token local ausente sem bloquear a captura offline, recusa real do servidor e regressões de permissões/menus.
- Fluxo de navegador isolado: desbloqueio sem rede, criação de ocorrência offline, saída/retorno com pendências, desbloqueio, reinício e conservação da pendência. Apenas dados fictícios de teste foram usados.
- Revisão visual dos rótulos e da disposição em 390×844, 360×640 e altura reduzida para teclado; builds web e móvel e testes existentes.

## Aparência e avisos

O app usa aparência verde fixa, com cabeçalho branco e sem painel Ajustes ou seleção de tema. O resumo de Local/Material é somente informativo durante a entrada atual. O login mostra animação local durante a validação, sem baixar GIF externo. “Salvo no aparelho” aparece depois da gravação durável, enquanto “Envio confirmado” exige recibo com o identificador correto.

No Android, os avisos são automáticos e não há opção de desligamento no app. Após cada login, o cliente verifica a permissão do canal “Registros enviados” e a solicita quando necessário. O Android continua controlando essa autorização: se o sistema bloqueou a permissão ou o canal, é necessário habilitar nas configurações do celular. Recusar notificações não impede salvar ou enviar registros. O Worker nativo publica confirmações mesmo com o app em segundo plano ou a tela bloqueada, conforme as permissões de tela de bloqueio. O Android determina quando pode executar envios e pode adiá-los por economia de bateria. Não é uma notificação push remota nem garantia de envio instantâneo. Sem conexão, os registros continuam pendentes. O iPhone mantém o aviso dentro do aplicativo; o canal nativo implementado aqui é Android.
