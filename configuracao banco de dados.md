# Configuração do banco de dados — Abastece

Luiz, este arquivo reúne a estrutura e os passos para montar o ambiente do Abastece. A referência é o código de 19/10/2026.

Hoje usamos PostgreSQL no Supabase, com login pelo Supabase Auth. O aplicativo Android envia os lançamentos e o site faz a administração. O banco ainda é separado do GMAIS. Os cadastros e leituras atuais servem para testar as funções.

## Links de acesso

| Acesso | Link |
| --- | --- |
| Código do projeto | [Repositório](https://github.com/abencoada-agricola/diesel) |
| Administração | [Controle de Combustível](https://abencoada-agricola.github.io/diesel/admin.html) |
| Aplicativo Android | [Baixar APK](https://github.com/abencoada-agricola/diesel/releases/latest/download/abencoada-diesel.apk) |
| Projeto Supabase atual | [Painel do projeto](https://supabase.com/dashboard/project/pqsbcwmtemlwvcpkcyum) |
| Executar SQL | [SQL Editor](https://supabase.com/dashboard/project/pqsbcwmtemlwvcpkcyum/sql/new) |
| Publicações e builds | [GitHub Actions](https://github.com/abencoada-agricola/diesel/actions) |
| Variáveis e segredos de publicação | [Configuração do Actions](https://github.com/abencoada-agricola/diesel/settings/secrets/actions) |
| Hospedagem do site | [GitHub Pages](https://github.com/abencoada-agricola/diesel/settings/pages) |
| Arquivos SQL | [Pasta supabase](supabase/) |
| Histórico de alterações | [Alterações do projeto](docs/changes.md) |

Os painéis administrativos exigem acesso à organização/projeto. A URL pública do banco atual é `https://pqsbcwmtemlwvcpkcyum.supabase.co`. Em outro ambiente, essa URL e as chaves precisam ser as do novo projeto.

## Quantas tabelas foram criadas

São **15 tabelas próprias, com 125 colunas**: 9 no schema `public` e 6 no schema `private`. Os schemas são divisões do mesmo banco. As tabelas internas do Supabase Auth, como `auth.users`, ficam fora dessa contagem.


| Schema/tabela | Finalidade | Colunas |
| --- | --- | --- |
| `public.members` | Usuários e permissões | 5 |
| `public.fleets` | Frotas e equipamentos | 10 |
| `public.settings` | Regras da operação | 2 |
| `public.records` | Abastecimentos | 32 |
| `public.diesel_materials` | Materiais | 2 |
| `public.diesel_locations` | Locais e registradoras | 9 |
| `public.diesel_operations` | Transferências e ocorrências | 20 |
| `public.diesel_checklist_templates` | Perguntas dos checklists | 5 |
| `public.diesel_checklists` | Checklists respondidos | 10 |
| `private.diesel_devices` | Credenciais de sincronização | 5 |
| `private.diesel_occurrence_photos` | Fotos de ocorrências | 2 |
| `private.login_attempts` | Controle de tentativas de login | 3 |
| `private.record_control_audit` | Auditoria de exclusão/restauração | 8 |
| `private.user_access_audit` | Auditoria de permissões | 7 |
| `private.removed_members` | Usuários removidos recuperáveis | 5 |

## Como criar um ambiente novo

Este procedimento é para um projeto Supabase vazio. No projeto que já está funcionando, aplicar somente as migrações ainda não executadas. Não executar novamente o `schema.sql`.

1. Criar o projeto Supabase e guardar a senha do banco em local privado.
2. Abrir o SQL Editor e executar os arquivos abaixo, **um por vez, na ordem indicada**, com a conta proprietária do banco. Conferir o resultado antes de seguir. Eles criam tabelas, índices, funções, validações e permissões; copiar apenas os comandos `CREATE TABLE` não monta o sistema completo.

| Ordem | Arquivo |
| --- | --- |
| 1 | [schema.sql](supabase/schema.sql) |
| 2 | [usernames.sql](supabase/usernames.sql) |
| 3 | [field-access.sql](supabase/field-access.sql) |
| 4 | [mobile.sql](supabase/mobile.sql) |
| 5 | [operations.sql](supabase/operations.sql) |
| 6 | [background-sync.sql](supabase/background-sync.sql) |
| 7 | [gmais-readings.sql](supabase/gmais-readings.sql) |
| 8 | [fuel-control.sql](supabase/fuel-control.sql) |
| 9 | [transfer-baseline.sql](supabase/transfer-baseline.sql) |
| 10 | [occurrence-photos.sql](supabase/occurrence-photos.sql) |
| 11 | [test-data.sql](supabase/test-data.sql) |
| 12 | [simulated-readings.sql](supabase/simulated-readings.sql) |
| 13 | [vehicle-meters.sql](supabase/vehicle-meters.sql) |
| 14 | [trial-recorder-readings.sql](supabase/trial-recorder-readings.sql) |
| 15 | [android-only.sql](supabase/android-only.sql) |
| 16 | [record-controls.sql](supabase/record-controls.sql) |
| 17 | [tank-references.sql](supabase/tank-references.sql) |
| 18 | [checklists.sql](supabase/checklists.sql) |
| 19 | [user-access.sql](supabase/user-access.sql) |
| 20 | [member-removal.sql](supabase/member-removal.sql) |
| 21 | [operation-fleets.sql](supabase/operation-fleets.sql) |

Alguns desses arquivos também inserem cadastros e leituras de exemplo. A sequência cria quatro frotas reservadas para teste (`990101` a `990104`) e dados de locais/materiais. Ela **não reproduz sozinha a base atual de dez frotas**.

O arquivo [fleets.sql](supabase/fleets.sql) é uma carga histórica de 246 frotas. É opcional; se for utilizado para reconstruir o catálogo antigo, executar depois de `schema.sql` e antes das demais migrações. Não usar essa carga se a intenção for manter só dez frotas.

O arquivo [reset-test-workspace.sql](supabase/maintenance/reset-test-workspace.sql) registra a limpeza pontual já feita em 19/10/2026. Ele verifica o inventário anterior e apaga movimentos. **Não faz parte da instalação e não deve ser reexecutado.**

Para reproduzir exatamente os dados de uma instalação, é necessário restaurar um backup autorizado dos cadastros além de aplicar a estrutura. Os SQLs versionados não contêm as contas, senhas nem uma cópia completa dos dados atuais.

## Criar o primeiro administrador

Depois de aplicar os 21 arquivos:

1. No Supabase, abrir **Authentication → Users** e criar a conta do responsável, com e-mail confirmado e senha definida por ele.
2. Desativar o cadastro público de novas contas nas configurações de Authentication. A equipe será cadastrada pelo administrador.
3. No SQL Editor, cadastrar o mesmo e-mail em `members`. Substituir os valores do exemplo; o e-mail e o username devem ficar em minúsculas no banco.

```sql
insert into public.members (email, name, role, username, permissions)
values (
  'responsavel@example.com',
  'NOME DO RESPONSÁVEL',
  'admin',
  'administrador',
  '{"refuel":true,"transfer":true,"checklist":true}'::jsonb
);
```

O username aceita de 3 a 30 caracteres: letras sem acento, números, ponto, traço e sublinhado. A tela mostra os textos em maiúsculas; o login não diferencia maiúsculas de minúsculas. A senha diferencia e não deve ser convertida.

As próximas pessoas podem ser cadastradas em **Configurações → Equipe e acessos**, com perfil `admin` ou `operator` e permissão individual para abastecimento, transferência e checklist. A opção de definir senha usa o Supabase Auth. Não existe coluna de senha em `members`.

## Publicar a função de login

Código: [diesel-login/index.ts](supabase/functions/diesel-login/index.ts). Configuração: [config.toml](supabase/config.toml).

Com o Supabase CLI instalado e autorizado na conta correta, executar na raiz do repositório, trocando o identificador pelo projeto de destino:

```sh
supabase login
supabase link --project-ref IDENTIFICADOR_DO_PROJETO
supabase functions deploy diesel-login
```

Manter `verify_jwt = true`, conforme `config.toml`. A função usa `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` do ambiente reservado das Edge Functions. Conferir a disponibilidade dessas variáveis no projeto. A chave de serviço fica somente no servidor.

A função resolve o username, valida a senha no Auth, limita tentativas e permite ao administrador definir senhas da equipe. Os endereços autorizados no código são `https://abencoada-agricola.github.io` e `https://localhost` (aplicativo Android). Se mudar o domínio do site, atualizar essa lista e publicar a função novamente.

## Conectar o site e o Android

No GitHub, em **Settings → Secrets and variables → Actions → Variables**, cadastrar:

| Variável | Valor necessário |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase. |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública publishable do projeto. |
| `SUPABASE_LOGIN_KEY` | Chave pública legada `anon`, no formato JWT, para o gateway da função de login. |

As chaves são obtidas nas configurações de API do projeto Supabase. Não usar a chave `service_role` nem uma chave secreta nessas três variáveis.

Em **Settings → Pages**, selecionar **GitHub Actions**. Executar o workflow **Publicar sistema** para gerar e publicar o site. O workflow roda os testes e publica a pasta `dist/`.

Para gerar APK, usar o workflow **Build Android APK**. Além das três variáveis públicas, ele precisa destes **Secrets**:

| Secret | Conteúdo |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Keystore PKCS12 de assinatura, codificado em base64, com alias `abencoada`. |
| `ANDROID_KEYSTORE_PASSWORD` | Senha desse keystore. |

O identificador do aplicativo é `br.com.abencoada.diesel`. As atualizações precisam usar a mesma assinatura da versão instalada. Guardar o keystore original e a senha fora do repositório. Trocar o banco nas variáveis exige publicar o site e gerar um novo APK; os aplicativos já instalados continuam com a configuração embutida anteriormente.

Para desenvolvimento local: Node.js 22 ou superior, `npm ci`, `npm test` e `npm run build`. Para Android, também Java 21 e Android SDK; usar `npm run android:sync`. Mais detalhes em [setup](docs/setup.md).

## Cadastros necessários para testar

A base atual ficou com **10 frotas, 3 usuários, 2 locais e 1 material**. Os movimentos anteriores foram removidos na limpeza de 19/10/2026. Novos testes podem alterar essas quantidades de movimentos.

| Frota | Equipamento |
| --- | --- |
| 22 | FORD F150 |
| 85 | JD TRATOR 5078E |
| 509 | S10 LTS DD4A AUTOMATICA |
| 511 | FIAT UNO ATTRACTIVE |
| 551 | ONIBUS VW/15190 EOD ESCOLAR HD |
| 600 | JD TRATOR 6180J |
| 707 | MB ATEGO 2730/48 HS |
| 802 | MB ATEGO 1418 |
| 1001 | JD COLHEDORA 3520 |
| 1003 | JD COLHEDORA CH570 |

Material: código **9**, ÓLEO DIESEL S-10. Locais: **2**, TANQUE CFM, leitura inicial **10.000**; e **12**, ABASTECIMENTO EXTERNO, leitura inicial **20.000**.

Essas leituras são fictícias. KM e horímetros também receberam valores de teste; algumas capacidades foram preenchidas apenas para exercitar o aviso. Antes de uso real, conferir cada cadastro, capacidade e leitura física. O campo `gmais_readings` guarda referências; seu nome não significa que há consulta ativa ao GMAIS.

Em um novo ambiente, cadastrar as frotas, escolher quais leituras cada uma usa, definir capacidade e referência inicial. Cadastrar o material e os pares local/material com leitura inicial de registradora pelo SQL de preparação autorizado. As telas de locais/materiais foram retiradas das configurações web. Manter `is_test` coerente entre frota e local; as funções impedem misturar os dois grupos.

As perguntas do checklist são configuradas no site por frota e podem ser copiadas de outra. Cada alteração gera uma versão; as respostas preservam a versão utilizada.

## Estrutura completa dos campos


“Não nulo” descreve a coluna do banco, não necessariamente um campo que o funcionário deve digitar. Muitos valores vêm da conta, do relógio, de valores padrão ou do cálculo do servidor. numeric é usado para litros e leituras; o app aceita KM inteiro. timestamptz guarda instantes com fuso, apresentados em horário de Brasília na interface/relatórios.

### public.members

Cadastro de acesso do aplicativo. Liga o e-mail do Supabase Auth ao nome de usuário, perfil e funções liberadas.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `email` | text | Sim | E-mail de vínculo com a autenticação. |
| `name` | text | Sim | Nome de exibição. |
| `role` | text | Sim | Perfil: admin ou operator. |
| `username` | text | Sim | Nome utilizado no login; comparação sem diferença entre maiúsculas/minúsculas. |
| `permissions` | jsonb | Sim | JSONB com refuel, transfer e checklist, cada um true/false. |

Chaves declaradas: `PRIMARY KEY (email)`; `UNIQUE (username)`.
### public.fleets

Código da frota, identificação, tipo, leituras exigidas, capacidade do tanque e leituras de referência.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `id` | text | Sim | Código de frota, armazenado como texto para preservar o código original. |
| `name` | text | Sim | Nome de exibição. |
| `type` | text | Sim | Categoria: Outro, Caminhão, Trator ou Colhedora. |
| `active` | boolean | Sim | Indica se a frota está disponível para seleção. |
| `meter_fields` | jsonb | Sim | JSONB que define quais leituras são exigidas: km, engine e elevator. |
| `gmais_readings` | jsonb | Não | JSONB de leituras de referência e sua origem. O nome do campo não significa conexão ativa ao GMAIS; atualmente contém referências de teste. |
| `model` | text | Sim | Modelo informado na administração. |
| `tank_capacity` | numeric | Não | Capacidade total dos tanques em litros; usada no aviso de excesso. |
| `is_test` | boolean | Sim | Marca interna de dados de teste. |
| `tank_reference` | jsonb | Não | Referência e observações sobre a capacidade cadastrada. |

Chaves declaradas: `PRIMARY KEY (id)`.
### public.settings

Configurações globais armazenadas como pares de identificador e documento JSONB.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `id` | text | Sim | Identificador da configuração, por exemplo rules. |
| `value` | jsonb | Sim | Documento JSONB com as regras da operação. |

Chaves declaradas: `PRIMARY KEY (id)`.
### public.records

Histórico de abastecimentos, leituras, litros, operador, identificação do local/material e confirmação do servidor.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `id` | uuid | Sim | Identificador da linha; UUID nos lançamentos, código textual na frota e identidade numérica nas auditorias. |
| `fleet` | text | Sim | Código da frota vinculada. |
| `date` | date | Sim | Data operacional do abastecimento. |
| `operator` | text | Sim | Nome do operador no momento do registro; permanece como histórico. |
| `user_id` | uuid | Não | UUID da conta autenticada responsável. |
| `engine` | numeric | Sim | Horímetro atual do motor. |
| `elevator` | numeric | Sim | Horímetro atual do elevador. |
| `km` | numeric | Sim | Quilometragem atual. |
| `start` | numeric | Não | Leitura inicial no formato antigo completo; pode ser nula no lançamento rápido. |
| `end` | numeric | Não | Leitura final no formato antigo completo; pode ser nula no lançamento rápido. |
| `liters` | numeric | Sim | Quantidade abastecida em litros. |
| `signature` | text | Sim | Nome associado à assinatura do registro; não é uma imagem de assinatura manuscrita. |
| `notes` | text | Sim | Texto da ocorrência ou observação. |
| `created_at` | timestamptz | Sim | Data/hora de criação ou captura. |
| `received_at` | timestamptz | Sim | Data/hora de recebimento definida pelo servidor. |
| `signature_source` | text | Sim | Origem da identificação: account ou declared, para compatibilidade histórica. |
| `submission_key` | uuid | Não | Chave usada no antigo fluxo de lançamento web. |
| `capture_mode` | text | Sim | Formato do registro: full ou quick. |
| `measured_fields` | jsonb | Sim | JSONB que informa quais leituras foram efetivamente medidas. |
| `previous_readings` | jsonb | Não | JSONB com a referência anterior usada na captura. |
| `previous_record_id` | uuid | Não | Referência opcional ao abastecimento anterior. |
| `local_code` | text | Não | Código do local de origem/registradora. |
| `material_code` | text | Não | Código do combustível/material. |
| `recorder_start` | numeric | Não | Leitura inicial da registradora. |
| `recorder_end` | numeric | Não | Leitura final da registradora. |
| `tank_capacity_at_record` | numeric | Não | Capacidade vigente na frota no momento do abastecimento. |
| `capacity_warning_confirmed` | boolean | Sim | Sinalizador histórico de abastecimento acima da capacidade; não bloqueia o envio. |
| `is_test` | boolean | Sim | Marca interna de dados de teste. |
| `removed_at` | timestamptz | Não | Data/hora da exclusão lógica. |
| `removed_by` | uuid | Não | UUID do administrador que excluiu. |
| `removed_by_name` | text | Não | Nome do administrador que excluiu. |
| `removal_reason` | text | Não | Motivo da exclusão lógica. |

Chaves declaradas: `FOREIGN KEY (user_id) REFERENCES auth.users(id)`; `PRIMARY KEY (id)`; `FOREIGN KEY (fleet) REFERENCES fleets(id)`; `FOREIGN KEY (previous_record_id) REFERENCES records(id)`.
### public.diesel_materials

Catálogo de materiais/combustíveis identificados por código.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `material_code` | text | Sim | Código do combustível/material. |
| `material_name` | text | Sim | Descrição do combustível/material. |

Chaves declaradas: `PRIMARY KEY (material_code)`.
### public.diesel_locations

Uma linha para cada combinação de local e material. Guarda a leitura atual e a última leitura física conhecida.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `local_code` | text | Sim | Código do local de origem/registradora. |
| `material_code` | text | Sim | Código do combustível/material. |
| `name` | text | Sim | Nome de exibição. |
| `material_name` | text | Sim | Descrição do combustível/material. |
| `last_meter` | numeric | Não | Leitura usada como referência atual da registradora. |
| `updated_at` | timestamptz | Sim | Data/hora da última atualização. |
| `last_verified_meter` | numeric | Não | Última leitura física preservada, mesmo quando uma operação invalida o cálculo atual. |
| `is_test` | boolean | Sim | Marca interna de dados de teste. |
| `simulated_meter` | boolean | Sim | Indica contador simulado que pode avançar com litros manuais durante os testes. |

Chaves declaradas: `PRIMARY KEY (local_code, material_code)`.
### public.diesel_operations

Reúne os dois tipos de evento na mesma tabela, diferenciados pelo campo kind.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `id` | uuid | Sim | Identificador da linha; UUID nos lançamentos, código textual na frota e identidade numérica nas auditorias. |
| `user_id` | uuid | Sim | UUID da conta autenticada responsável. |
| `operator` | text | Sim | Nome do operador no momento do registro; permanece como histórico. |
| `kind` | text | Sim | Tipo de evento: transfer ou occurrence. |
| `local_code` | text | Sim | Código do local de origem/registradora. |
| `material_code` | text | Sim | Código do combustível/material. |
| `destination` | text | Não | Código do novo local em uma transferência. |
| `notes` | text | Não | Texto da ocorrência ou observação. |
| `created_at` | timestamptz | Sim | Data/hora de criação ou captura. |
| `received_at` | timestamptz | Sim | Data/hora de recebimento definida pelo servidor. |
| `recorder_start` | numeric | Não | Leitura inicial da registradora. |
| `recorder_end` | numeric | Não | Leitura final da registradora. |
| `recorder_liters` | numeric | Não | Diferença calculada entre leitura final e inicial. |
| `has_photo` | boolean | Sim | Informa se existe foto na tabela privada. |
| `is_test` | boolean | Sim | Marca interna de dados de teste. |
| `removed_at` | timestamptz | Não | Data/hora da exclusão lógica. |
| `removed_by` | uuid | Não | UUID do administrador que excluiu. |
| `removed_by_name` | text | Não | Nome do administrador que excluiu. |
| `removal_reason` | text | Não | Motivo da exclusão lógica. |
| `fleet` | text | Não | Frota opcional. Registros antigos podem não ter vínculo com frota. |

Chaves declaradas: `PRIMARY KEY (id)`; `FOREIGN KEY (fleet) REFERENCES fleets(id)`.
### public.diesel_checklist_templates

Versões das perguntas configuradas para cada frota. Uma nova configuração gera uma nova versão.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `fleet` | text | Sim | Código da frota vinculada. |
| `version` | integer | Sim | Número da versão das perguntas. |
| `questions` | jsonb | Sim | Lista JSONB de perguntas, com identificador UUID e texto. |
| `created_at` | timestamptz | Sim | Data/hora de criação ou captura. |
| `created_by` | uuid | Sim | UUID do administrador que criou a versão. |

Chaves declaradas: `PRIMARY KEY (fleet, version)`; `FOREIGN KEY (fleet) REFERENCES fleets(id)`.
### public.diesel_checklists

Respostas recebidas, operador, versão das perguntas, classificação e serviços/resoluções.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `id` | uuid | Sim | Identificador da linha; UUID nos lançamentos, código textual na frota e identidade numérica nas auditorias. |
| `fleet` | text | Sim | Código da frota vinculada. |
| `template_version` | integer | Sim | Versão das perguntas usada na resposta. |
| `user_id` | uuid | Sim | UUID da conta autenticada responsável. |
| `operator` | text | Sim | Nome do operador no momento do registro; permanece como histórico. |
| `created_at` | timestamptz | Sim | Data/hora de criação ou captura. |
| `received_at` | timestamptz | Sim | Data/hora de recebimento definida pelo servidor. |
| `answers` | jsonb | Sim | JSONB com identificador, texto e status de cada resposta. |
| `grade` | text | Sim | Pior classificação entre as respostas: PERFEITO, ATENCAO ou CRITICO. |
| `resolutions` | jsonb | Sim | JSONB com serviço/troca, responsável e data/hora dos itens resolvidos. |

Chaves declaradas: `PRIMARY KEY (id)`; `FOREIGN KEY (fleet, template_version) REFERENCES diesel_checklist_templates(fleet, version)`.
### private.diesel_devices

Autoriza o envio em segundo plano por dispositivo. Guarda o hash do token, e não o token em texto aberto.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `user_id` | uuid | Sim | UUID da conta autenticada responsável. |
| `device_id` | uuid | Sim | Identificador UUID do dispositivo. |
| `email` | text | Sim | E-mail de vínculo com a autenticação. |
| `token_hash` | bytea | Sim | Resumo SHA-256 do token de envio. |
| `expires_at` | timestamptz | Sim | Validade da autorização de sincronização. |

Chaves declaradas: `PRIMARY KEY (user_id, device_id)`; `UNIQUE (token_hash)`.
### private.diesel_occurrence_photos

Uma foto JPEG comprimida por ocorrência, guardada como data URL/base64 e consultada separadamente da lista.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `operation_id` | uuid | Sim | UUID da ocorrência; também é a chave primária. |
| `data_url` | text | Sim | JPEG comprimido em base64/data URL; limite de 280.000 caracteres. |

Chaves declaradas: `PRIMARY KEY (operation_id)`; `FOREIGN KEY (operation_id) REFERENCES diesel_operations(id)`.
### private.login_attempts

Contadores temporários por IP e usuário, usados para limitar tentativas de autenticação.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `bucket` | text | Sim | Chave de contagem com resumo do IP ou do nome de login. |
| `window_start` | timestamptz | Sim | Início da janela de contagem. |
| `attempts` | integer | Sim | Quantidade de tentativas na janela. |

Chaves declaradas: `PRIMARY KEY (bucket)`.
### private.record_control_audit

Registra quem excluiu ou restaurou um lançamento, a data e o motivo.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `id` | bigint | Sim | Identificador da linha; UUID nos lançamentos, código textual na frota e identidade numérica nas auditorias. |
| `record_id` | uuid | Sim | UUID do lançamento afetado. |
| `kind` | text | Sim | Tipo do lançamento afetado. |
| `action` | text | Sim | Ação de exclusão ou restauração. |
| `reason` | text | Não | Justificativa informada pelo administrador. |
| `actor_id` | uuid | Sim | UUID do administrador que executou a ação. |
| `actor_name` | text | Sim | Nome do administrador no momento da ação. |
| `created_at` | timestamptz | Sim | Data/hora de criação ou captura. |

Chaves declaradas: `PRIMARY KEY (id)`.
### private.user_access_audit

Guarda o estado anterior e o novo estado das permissões, com o administrador responsável.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `id` | bigint | Sim | Identificador da linha; UUID nos lançamentos, código textual na frota e identidade numérica nas auditorias. |
| `email` | text | Sim | E-mail de vínculo com a autenticação. |
| `previous_access` | jsonb | Não | Estado anterior do cadastro/permissões em JSONB. |
| `new_access` | jsonb | Sim | Estado novo do cadastro/permissões em JSONB. |
| `actor_id` | uuid | Sim | UUID do administrador que executou a ação. |
| `actor_name` | text | Sim | Nome do administrador no momento da ação. |
| `created_at` | timestamptz | Sim | Data/hora de criação ou captura. |

Chaves declaradas: `PRIMARY KEY (id)`.
### private.removed_members

Preserva o cadastro anterior para permitir restaurar o acesso sem apagar o histórico operacional.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `email` | text | Sim | E-mail de vínculo com a autenticação. |
| `member_data` | jsonb | Sim | Cópia JSONB do cadastro removido. |
| `removed_at` | timestamptz | Sim | Data/hora da exclusão lógica. |
| `removed_by` | uuid | Sim | UUID do administrador que excluiu. |
| `removed_by_name` | text | Sim | Nome do administrador que excluiu. |

Chaves declaradas: `PRIMARY KEY (email)`.

## Regras que precisam continuar no servidor

- Todas as tabelas próprias usam RLS. Os clientes não recebem acesso livre de escrita; usam funções RPC com conferência de conta e permissão. Não expor o schema `private` na API.
- `diesel_session` entrega conta, permissões, catálogo e referências. `diesel_operation_submit` recebe os lançamentos. `diesel_device_register` e `diesel_device_submit` atendem à sincronização do Android em segundo plano.
- `diesel_admin`/`diesel_admin_save`, `diesel_operations_admin`, `diesel_checklists_admin` e `diesel_record_controls` atendem à administração, respeitando as permissões de cada ação. `diesel_occurrence_photo` consulta a foto separadamente.
- KM e horímetros não podem diminuir. Litros precisam ser positivos. Pela registradora, conferir a diferença entre leitura final e inicial. Abastecimento acima da capacidade gera aviso, sem bloquear o envio.
- A frota é obrigatória no abastecimento/checklist e opcional em transferência/ocorrência. Horímetro de elevador só deve ser habilitado nas máquinas que o utilizam.
- UUID do lançamento precisa permanecer igual nas tentativas de envio. Confirmar o recebimento e reconhecer repetição para não duplicar registros.
- Data/hora da captura e do recebimento são distintas. Instantes usam `timestamptz`; a interface e os relatórios mostram horário de Brasília.
- Exclusão normal de movimentos é lógica, com responsável, motivo e possibilidade de restaurar. Remover usuário preserva o histórico e revoga o envio daquele acesso.

`members.email` liga o cadastro à conta Auth; o vínculo é conferido no servidor. `records.fleet` referencia `fleets.id`. Checklists respondidos referenciam a combinação frota/versão do modelo de perguntas. Fotos referenciam a ocorrência. A chave de `diesel_locations` é o par local/material. Nem todo vínculo lógico tem uma chave estrangeira declarada: os códigos de material e vários identificadores de autor precisam ser considerados no mapeamento.

Permissões, leituras exigidas, perguntas, respostas e resoluções usam JSONB. As fotos ficam em tabela privada como JPEG comprimido em base64, até 280.000 caracteres por foto; não há bucket de Storage configurado para elas. As notificações do site são verificadas por consulta periódica a cada 15 segundos enquanto a página está aberta; não existe tabela própria de notificações.

## Conferência depois da configuração

1. Entrar no site como administrador e no Android com uma conta de operador. Conferir as funções liberadas para cada login.
2. Carregar o catálogo com internet. Selecionar frota pelo código e pelo QR Code; conferir a última leitura e as perguntas do checklist.
3. Registrar abastecimento, transferência, ocorrência com foto e checklist. Conferir operador, data, leituras e litros no site; abrir a foto e gerar o PDF.
4. Testar leituras inferiores, litros acima da capacidade e troca do local na transferência. A leitura inferior deve ser recusada; o excesso de litros deve avisar e permitir confirmação.
5. Depois de preparar o app online, desligar a conexão, registrar e fechar o aplicativo. Ao reconectar, conferir o envio automático, inclusive da foto, sem duplicar movimentos.
6. Alterar permissões e conferir o comportamento após o app conectar. Testar exclusão/restauração de um lançamento pela administração.

O primeiro login precisa de internet. O app guarda catálogo, rascunhos e fila local; só retira um item depois da confirmação do servidor. A autorização restrita de dispositivo tem validade de 90 dias, renovada ao conectar. Não limpar os dados do aparelho nem desinstalar o app com lançamentos pendentes.

Para conferir as tabelas no SQL Editor:

```sql
select table_schema, table_name
from information_schema.tables
where table_type = 'BASE TABLE'
  and table_schema in ('public', 'private')
order by table_schema, table_name;
```

A referência deste documento é de 15 tabelas próprias. Outros produtos instalados no mesmo projeto podem acrescentar tabelas. Conferir também RLS, permissões e funções; a contagem sozinha não valida a instalação.

## O que precisamos definir para conectar ao GMAIS

Luiz, precisamos combinar a interface oficial de integração e o mapeamento destes dados:

| Informação | O que precisamos receber/definir |
| --- | --- |
| Frotas | Código estável, descrição, modelo, situação, capacidade e leituras aplicáveis. |
| Últimas leituras | KM, horímetro motor, elevador quando houver, data e identificador do último movimento. |
| Materiais e locais | Código oficial, descrição, vínculo local/material e última leitura da registradora. |
| Usuários | Método oficial de autenticação e vínculo dos identificadores; se existe SSO, OAuth 2.0, OpenID Connect ou outro método suportado. |
| Consultas | Endpoints ou views autorizadas, filtros, paginação, consulta de alterações e limites de acesso. |
| Envio futuro | Campos obrigatórios, autenticação, permissões, UUID externo contra duplicação, confirmação e tratamento de conflitos/estornos. |
| Ambiente | Endereço de homologação, documentação disponível e credenciais específicas para a integração. |

Também precisamos definir quem será a fonte de cada cadastro e de cada leitura. Se houver acesso ao banco, combinar views e permissões com o responsável antes de implementar consultas. O APK não deve carregar credenciais diretas do banco do GMAIS; essa comunicação fica em um serviço no servidor.

Até isso ser definido, o Abastece continua no banco atual e qualquer análise do GMAIS permanece somente de leitura. Não é necessário copiar as 15 tabelas para dentro do GMAIS: podemos manter a estrutura do Abastece e integrar por uma interface oficial. Senhas existentes não devem ser tratadas como dados importáveis sem conhecer o método de autenticação suportado.

## Backup e documentação de apoio

Guardar backup dos dados e da estrutura antes de mudar o ambiente. Incluir separadamente os requisitos de restauração do Auth, configurações das funções e a assinatura Android. Um export das tabelas próprias não substitui um backup completo do projeto Supabase.

O backup feito antes da limpeza está fora do GitHub. Não publicar e-mails da equipe, senhas, fotos, tokens, chaves de serviço ou o keystore neste arquivo.

Referência complementar: [estrutura e decisões do banco](docs/database-architecture.pt-BR.md). Os arquivos SQL do repositório são a fonte para criação das funções, índices, restrições e permissões.
