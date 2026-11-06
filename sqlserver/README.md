# Abençoada no SQL Server — instalação local de testes

## Destino novo e emulador — 06/11/2026

Decisão atual: criar um banco próprio do app ao lado do banco GMAIS. Levar somente estrutura e regras equivalentes do Supabase; os dados atuais são testes e não serão importados no novo destino. Os relatos de importação abaixo são históricos da cópia local, não instruções para o banco novo. Confirmar servidor, nome do destino, permissões e acesso à API antes da instalação. Não executar importadores no novo destino.

Para testar o Android localmente, use JDK 21, Android SDK, Node.js e dependências instaladas. Configure `JAVA_HOME` e `ANDROID_HOME`, execute `sqlserver/build-emulator.ps1` e inicie `sqlserver/start-emulator-api.ps1` em outro terminal. Instale `android/app/build/outputs/apk/sqlEmulator/app-sqlEmulator.apk` com `adb install -r`. O app separado **Abençoada SQL** acessa `http://10.0.2.2:4782`, a API na máquina hospedeira, restrita ao loopback. Configuração exclusiva do emulador, não de celulares físicos. Não distribuir este APK de desenvolvimento.

O worker nativo atual aceita somente o endereço Supabase: neste teste SQL, mantenha o app aberto para sincronizar. O envio em segundo plano para SQL requer adaptação e validação antes da substituição em produção.

Pasta: `C:\Users\Usuario\Documents\APP Abençoada`.
Banco: `app_abencoada`, servidor `localhost`, autenticação integrada do Windows.
Abra `Iniciar Abençoada.cmd` e acesse http://127.0.0.1:4780.
O login local está em `sqlserver/local-credentials.txt`, ignorado pelo Git.

As 15 tabelas e 125 colunas da configuração do Supabase foram convertidas. O esquema PostgreSQL `public` aparece como `app` no SQL Server. `private` foi preservado. `app_auth.users` e `app_auth.sessions` substituem a autenticação de nuvem nesta cópia. A API usa consultas parametrizadas, senhas com scrypt, tokens aleatórios com hash, limite de login e transações serializadas para sincronização idempotente.

Esta instalação é uma base de testes separada. Nenhum dado atual foi baixado do Supabase, nenhum APK foi distribuído e nenhuma alteração foi enviada ao GitHub. O banco tem somente administrador local, configurações e controle de acesso. As tabelas operacionais começam vazias.

## Dados atuais

1. No SQL Editor do seu Supabase, execute `sqlserver/export-supabase.sql` como proprietário e baixe o campo JSON completo em um arquivo. A consulta somente lê dados. O arquivo é reservado: contém cadastros, operações, fotos e auditorias. Não publique no GitHub. Para bases grandes, especialmente fotos, solicite um backup completo e confira se o resultado foi truncado pelo editor.
2. Guarde o backup original em local separado. A exportação é um pacote de migração, não substitui um backup completo do projeto Supabase.
3. Execute `node sqlserver/import-json.mjs "caminho\backup.json"`. Primeiro ele simula a importação e reverte a transação. Confira as contagens.
4. Execute com `--apply` somente após revisar o resultado. A ferramenta recusa importar sobre dados operacionais existentes. Preserva IDs de usuários e referências, mas não exporta senhas. O gestor local deve definir novas senhas em Equipe e acessos. Credenciais de dispositivos e bloqueios temporários de login não são importados; os aparelhos devem fazer login novamente.

Auditorias recebem novos IDs sequenciais no destino e mantêm os dados de evento. Campos numeric foram convertidos para decimal(28,8): revise precisão antes de aprovar a migração real. Datas com fuso usam datetimeoffset; a interface apresenta horário de Brasília. As regras foram portadas para a API, não para funções PL/pgSQL no SQL Server. Escritas diretas no banco não passam por essas regras.

## Validação e limites

- `node sqlserver/test.mjs`: integração real com SQL Server, sem deixar dados de teste.
- `node sqlserver/browser-test.mjs`: login e painel em Chrome isolado, usando a conta local.
- `powershell -File sqlserver/build-local.ps1`: prepara web e interface móvel locais.
- `node sqlserver/generate-schema.mjs`: gera esquema/manifesto a partir das 22 migrações, sem acessar o Supabase ao vivo.
- `node sqlserver/install.mjs`: instala somente se o banco ainda não contém a estrutura; não substitui banco existente.

A API fica em 127.0.0.1 e usa o Windows PowerShell/.NET como conexão integrada ao SQL Server. Não exige senha de SQL Server. Esta implementação lê tabelas para executar regras em transação serializada; deve passar por otimização e testes de volume antes de uso com uma base grande. Para celulares fora da máquina, configure servidor estável, HTTPS, origens autorizadas e gere um APK apontando à API. O APK atual continua no Supabase; não apague filas ou rascunhos. Faça migração em uma janela controlada, com backup e reconciliação dos dados. A edição Developer instalada é para desenvolvimento/testes.

O arquivo `.gitattributes` preserva LF em JavaScript/SQL, necessário para os testes do repositório no Windows. O Graphify é local e determinístico; limitações de extração Gradle constam em `graphify-out/HEALTH.txt`.

## Estado após migração de 05/11/2026

A instalação agora contém as 15 tabelas e os 76 registros exportados da origem, com fotos, auditorias e os três usuários. A conta de bootstrap gestor.local foi substituída. Use seus usuários/senhas existentes: os hashes bcrypt foram preservados, sem exportar senhas em texto.

O procedimento executado foi migrate-live.mjs, com simulação anterior e confirmação transacional; o import-json.mjs antigo continua destinado ao formato v1 e não deve ser usado para esta fotografia v2. O relatório em exports/migration-result.json registra todos os valores conferidos. Não reexecute a importação sobre uma base em uso: ela recusa destinos com dados operacionais.

As instruções anteriores sobre começar com base vazia/desfazer credenciais de dispositivos descrevem o bootstrap e o importador v1. Na importação v2, todos os registros das 15 tabelas foram preservados, inclusive dispositivos e bloqueios. Os registros de auditoria mantêm seus IDs. Passwords existentes são validados por bcrypt; novas senhas usam scrypt e aceitam os mesmos 6 a 128 caracteres da função administrativa original.

Validação atual: verify-migration.mjs (igualdade por valor), test.mjs (28 verificações SQL), parity-test.mjs (33 cenários contra funções vivas exportadas), http-test.mjs e browser-test.mjs (sessão de administrador isolada, sem conhecer/exibir sua senha), além da suíte original do projeto. Os testes revertem operações e removem suas sessões temporárias.

Os 31 CHECKs da origem têm traduções no SQL Server. As cinco regras de gatilhos foram implementadas em quatro gatilhos: as regras de leituras e capacidade da frota compartilham um gatilho INSTEAD OF. Os demais PKs, UNIQUEs e FKs preservam os vínculos. Controle por usuário e RPC são fornecidos pela API local, não por políticas RLS do PostgreSQL. Isso é equivalência adaptada; não constitui uma instalação da plataforma Supabase inteira. Valores numeric são decimal(28,8), JSONB é texto JSON validado, timestamptz é datetimeoffset. A fotografia atual foi conferida sem perdas nos valores existentes; novos valores precisam respeitar os tipos do destino.

O site público e o APK atual continuam no Supabase. Esta cópia local é independente, sem sincronização contínua. Para trocar o ambiente em operação, ainda são necessários hospedagem/API HTTPS, novo build e publicação controlada. SQL Server Developer é para desenvolvimento/testes.
