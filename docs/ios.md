# Abençoada para iPhone

O projeto `ios/App/App.xcodeproj` usa Capacitor 8.5.3 e a mesma interface `mobile/` do Android. Abastecimento manual/registradora, transferência, checklist, QR da frota, ocorrência com foto, permissões por usuário, rascunhos e fila offline usam as mesmas regras e o mesmo Supabase. Requer iOS 15 ou posterior. Não altera o banco nem acessa GMAIS.

## Preparar e abrir

No macOS com Xcode e Node.js 22 ou posterior:

```sh
npm ci
export SUPABASE_URL='https://seu-projeto.supabase.co'
export SUPABASE_PUBLISHABLE_KEY='sua-chave-publica'
export SUPABASE_LOGIN_KEY='sua-chave-publica-de-login'
npm run ios:sync
npm run ios:open
```

Use as mesmas variáveis públicas configuradas no build Android. Não use service_role, sb_secret ou credenciais de administração. Um build sem variáveis abre a interface, mas não consegue autenticar. O bundle gerado não é versionado.

No Xcode selecione o projeto **App**, target **App**, aba **Signing & Capabilities**, a equipe Apple e um iPhone ou simulador. O identificador é `br.com.abencoada.diesel`. Para instalar no aparelho, é preciso configurar a assinatura Apple. Distribuição por TestFlight/App Store exige uma conta Apple Developer e um archive assinado; nenhum envio é realizado automaticamente.

```sh
npm run ios:test
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/DerivedData CODE_SIGNING_ALLOWED=NO build
```

## Armazenamento e envio

A interface mantém IndexedDB com as mesmas chaves e regras do Android. A fila também é espelhada em arquivo local criptografado com AES-GCM; a chave fica no Keychain deste dispositivo. O arquivo é protegido até o primeiro desbloqueio e excluído do backup. Falhas ao abrir o arquivo não apagam nem recriam os dados existentes.

O plugin nativo `OfflineSync` implementa configure/mirror/acknowledge. Só remove um registro da fila nativa depois de receber o mesmo ID do servidor. Recibos persistem até a interface confirmar a remoção; erros persistem vinculados ao conteúdo enviado. Renovações de credencial preservam os registros. A troca de usuário é bloqueada se houver registros ou recibos pendentes. Dependências por local/material e frota impedem ultrapassar lançamentos anteriores com erro. O endpoint de envio é limitado ao Supabase já usado pelo Android.

A interface tenta sincronizar ao abrir, retornar e recuperar conexão, além do intervalo de 15 segundos enquanto estiver ativa. O componente nativo observa conectividade e solicita processamento em segundo plano. O iOS decide quando executar essa solicitação: não existe garantia de envio imediato com o app suspenso, encerrado pelo usuário, sem bateria suficiente ou com processamento em segundo plano desabilitado. Reabrir o app retoma as tentativas. Nunca limpe os dados/reinstale para resolver pendências.

## Validação em aparelho

A compilação e o simulador verificam a integração; câmera real e execução em segundo plano exigem iPhone. Antes de distribuir, validar com conta de teste autorizada: login, permissões, abastecimento manual e registradora, transferência, checklist, QR da frota, foto pela câmera/galeria, modo avião, fechamento/reabertura com rascunhos e pendências, reconexão e confirmação no painel. Não criar lançamentos de teste na operação real sem autorização.

## Conexão do login no iPhone

O endpoint legado de login aceita as origens web/Android, mas rejeita `capacitor://localhost` em chamadas do WebView. No iPhone, apenas a requisição de login por usuário usa `CapacitorHttp.request` por HTTPS nativo, com os mesmos cabeçalhos públicos e as mesmas validações de credenciais no servidor. O cliente Supabase recebe os tokens normalmente. Navegador e Android continuam usando fetch. Não é necessário liberar origens arbitrárias ou instalar certificados. O teste `tests/ios-login.mjs` cobre transporte, rejeições, falhas e cancelamento.
