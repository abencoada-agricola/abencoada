# Configuração do banco de dados

Abençoada · 28/10/2026

## Ambiente

| Componente | Configuração |
| --- | --- |
| Banco | PostgreSQL no Supabase |
| Projeto | `pqsbcwmtemlwvcpkcyum` |
| URL | `https://pqsbcwmtemlwvcpkcyum.supabase.co` |
| Autenticação | Supabase Auth e função `diesel-login` |
| Aplicativo | Android, JavaScript e Capacitor |
| Administração | GitHub Pages |
| Comunicação | HTTPS, funções RPC e Edge Function |
| GMAIS | Sem integração ativa |

## Links

- [Repositório](https://github.com/abencoada-agricola/Abencoada)
- [Administração](https://abencoada-agricola.github.io/Abencoada/admin.html)
- [APK Android](https://github.com/abencoada-agricola/Abencoada/releases/latest/download/abencoada.apk)
- [Supabase](https://supabase.com/dashboard/project/pqsbcwmtemlwvcpkcyum)
- [SQL Editor](https://supabase.com/dashboard/project/pqsbcwmtemlwvcpkcyum/sql/new)
- [GitHub Actions](https://github.com/abencoada-agricola/Abencoada/actions)
- [Variáveis e secrets](https://github.com/abencoada-agricola/Abencoada/settings/secrets/actions)
- [GitHub Pages](https://github.com/abencoada-agricola/Abencoada/settings/pages)
- [SQLs](supabase/)

## Database Tables

**15 tabelas, 125 colunas: 9 em `public` e 6 em `private`.** Tabelas internas do Supabase, como `auth.users`, não estão nessa contagem.

| Database Tables | Finalidade | Colunas |
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

## Migrações

Ordem de aplicação em banco vazio:

| Ordem | SQL |
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
| 22 | [general-occurrences.sql](supabase/general-occurrences.sql) |

Em banco existente, somente migrações pendentes. `schema.sql` não é reaplicável.

| Carga / manutenção | Uso |
| --- | --- |
| [fleets.sql](supabase/fleets.sql) | Catálogo histórico de 246 frotas. Opcional, após `schema.sql` e antes das demais migrações. Fora da base reduzida atual. |
| `test-data.sql` e migrações de simulação | Incluem cadastros e leituras fictícias; quatro frotas reservadas de `990101` a `990104`. |
| [reset-test-workspace.sql](supabase/maintenance/reset-test-workspace.sql) | Limpeza pontual de 19/10/2026, já executada. Apaga movimentos e valida o inventário anterior. Fora da instalação; sem reexecução. |

As migrações recriam a estrutura e as cargas nelas contidas. A base atual de dez frotas e as contas dependem de restauração dos cadastros; não são reproduzidas integralmente pela sequência SQL.

## Acesso

| Item | Definição |
| --- | --- |
| Conta | Supabase Auth, e-mail confirmado |
| Cadastro público | Desativado |
| Vínculo | `members.email` corresponde ao e-mail do Auth |
| Login | `members.username`, entre 3 e 30 caracteres: letras sem acento, números, ponto, traço e sublinhado |
| Caixa do login | Armazenado em minúsculas; comparação sem diferença entre maiúsculas e minúsculas |
| Senha | Gerenciada pelo Auth, com diferença entre maiúsculas e minúsculas |
| Perfis | `admin` e `operator` |
| Permissões | `refuel`, `transfer` e `checklist`, independentes por usuário |
| Gestão da equipe | Configurações → Equipe e acessos |

Cadastro inicial de administrador, após as migrações e a criação da conta correspondente no Auth. Valores de exemplo:

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

## Função de login

| Item | Valor |
| --- | --- |
| Nome | `diesel-login` |
| Código | [index.ts](supabase/functions/diesel-login/index.ts) |
| Configuração | [config.toml](supabase/config.toml), `verify_jwt = true` |
| Ambiente reservado | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Origens autorizadas | `https://abencoada-agricola.github.io` e `https://localhost` |
| Funções | Resolução de username, validação de senha, limite de tentativas e definição de senha pela administração |

Publicação via Supabase CLI, na raiz do repositório, com acesso ao projeto de destino:

```sh
supabase login
supabase link --project-ref IDENTIFICADOR_DO_PROJETO
supabase functions deploy diesel-login
```

Mudança de domínio exige atualização das origens autorizadas. A chave `service_role` permanece no servidor.

## Publicação

Variáveis públicas do GitHub Actions:

| Variável | Conteúdo |
| --- | --- |
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública publishable |
| `SUPABASE_LOGIN_KEY` | Chave pública legada `anon`, formato JWT, para a função de login |

| Publicação | Configuração |
| --- | --- |
| Site | Pages com origem GitHub Actions; workflow `Publicar sistema`; saída `dist/` |
| Android | Workflow `Build Android APK` |
| Secret Android | `ANDROID_KEYSTORE_BASE64`: keystore PKCS12 em base64, alias `abencoada` |
| Secret Android | `ANDROID_KEYSTORE_PASSWORD`: senha do keystore |
| Application ID | `br.com.abencoada.diesel` |
| Assinatura | Mesmo keystore nas atualizações |
| Build local | Node.js 22+, `npm ci`, `npm test`, `npm run build` |
| Build Android | Java 21, Android SDK e `npm run android:sync` |

As chaves públicas vêm das configurações de API do Supabase. Chaves secretas e `service_role` ficam fora do site e do APK. Mudança do projeto Supabase exige nova publicação do site e novo APK; a configuração é embutida no build.

## Base de teste

Estado após a limpeza de 19/10/2026: **10 frotas, 3 usuários, 2 locais e 1 material**, sem movimentos anteriores. Novos lançamentos alteram esse estado.

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

| Local | Material | Registradora inicial |
| --- | --- | --- |
| 2 — TANQUE CFM | 9 — ÓLEO DIESEL S-10 | 10.000 |
| 12 — ABASTECIMENTO EXTERNO | 9 — ÓLEO DIESEL S-10 | 20.000 |

KM, horímetros e registradoras são fictícios. Algumas capacidades também são valores de teste. O campo `gmais_readings` contém referências locais, sem consulta ativa ao GMAIS.

Cadastros de frota incluem leituras habilitadas, capacidade e referências iniciais. Locais/materiais são mantidos por SQL; não há tela de edição desses cadastros nas configurações web. `is_test` deve ser compatível entre frota e local.

Checklists têm perguntas por frota, cópia entre modelos e versões preservadas nas respostas.

## Campos

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
| `local_code` | text | Não | Obrigatório em transferência; opcional apenas para compatibilidade com ocorrências antigas. |
| `material_code` | text | Não | Obrigatório em transferência; ocorrências gerais não exigem material. |
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
Ocorrências novas são relatos gerais sem local, material ou frota. A migração `general-occurrences.sql` preserva vínculos antigos e exige local/material somente para transferências.

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

## Relacionamentos

- `members.email`: vínculo lógico com a conta Auth.
- `records.fleet` → `fleets.id`.
- `records.user_id` → `auth.users.id`.
- `records.previous_record_id` → `records.id`.
- `diesel_operations.fleet` → `fleets.id`, opcional.
- `diesel_checklist_templates`: chave composta `(fleet, version)`, com frota vinculada a `fleets.id`.
- `diesel_checklists`: referência a `(fleet, template_version)` do modelo de perguntas.
- `diesel_occurrence_photos.operation_id` → `diesel_operations.id`.
- `diesel_locations`: chave composta `(local_code, material_code)`.

Códigos de material e vários campos de autoria têm vínculo lógico sem chave estrangeira declarada. Permissões, leituras, perguntas, respostas e resoluções usam JSONB.

## Funções e regras

| Função | Uso |
| --- | --- |
| `diesel_session` | Conta, permissões, catálogo e referências |
| `diesel_operation_submit` | Recebimento dos lançamentos |
| `diesel_device_register` / `diesel_device_submit` | Autorização e sincronização do dispositivo |
| `diesel_admin` / `diesel_admin_save` | Administração de cadastros e regras |
| `diesel_operations_admin` | Gestão de operações |
| `diesel_checklists_admin` | Perguntas, respostas e resolução de itens |
| `diesel_record_controls` | Exclusão lógica, restauração e auditoria |
| `diesel_occurrence_photo` | Consulta autorizada da foto |

- RLS habilitada nas 15 tabelas. Acesso dos clientes por RPC com validação de conta e permissão. Schema `private` fora da API pública.
- KM e horímetros não podem diminuir. Litros positivos; diferença da registradora conferida no servidor.
- Litragem acima da capacidade gera aviso e permite confirmação.
- Frota obrigatória no abastecimento/checklist e opcional em transferência/ocorrência.
- Horímetro de elevador habilitado somente nas máquinas aplicáveis.
- UUID preservado nos reenvios para evitar duplicação.
- Captura e recebimento com horários separados; instantes em `timestamptz`, exibição em horário de Brasília.
- Exclusão de movimentos com motivo, responsável e restauração. Remoção de usuário preserva histórico e revoga o acesso.
- Uma foto JPEG comprimida por ocorrência, em tabela privada, até 280.000 caracteres em data URL/base64. Sem bucket de Storage.
- Notificações verificadas a cada 15 segundos com a administração aberta. Sem tabela própria de notificações.

## Offline

Primeiro login online. Catálogo, rascunhos e fila armazenados no aparelho. Remoção da fila somente após confirmação do servidor. Autorização restrita de dispositivo válida por 90 dias, renovada com conexão.

Dados do aplicativo e instalação preservados enquanto houver lançamentos pendentes.

## Validação

| Fluxo | Resultado esperado |
| --- | --- |
| Login e permissões | Funções disponíveis conforme perfil e permissões do usuário |
| Frota por código/QR | Identificação, leituras e perguntas correspondentes |
| Abastecimento e transferência | Leituras, litros, local, operador e data corretos |
| Ocorrência | Texto e foto disponíveis na administração |
| Checklist | Respostas, operador, versão, data e PDF disponíveis |
| Leitura inferior | Envio recusado |
| Excesso de litros | Aviso com confirmação permitida |
| Offline e reconexão | Envio automático, inclusive foto, sem duplicação |
| Exclusão/restauração | Histórico de responsável, motivo e data |

Consulta das tabelas próprias:

```sql
select table_schema, table_name
from information_schema.tables
where table_type = 'BASE TABLE'
  and table_schema in ('public', 'private')
order by table_schema, table_name;
```

## Integração com o GMAIS

Pendente de interface oficial e definição da origem dos cadastros e leituras.

| Dados | Definição pendente |
| --- | --- |
| Frotas | Código, descrição, modelo, situação, capacidade e leituras aplicáveis |
| Leituras | KM, horímetros, data e identificador do último movimento |
| Locais/materiais | Códigos, descrições, vínculos e registradoras |
| Usuários | Identificadores e autenticação oficial: SSO, OAuth 2.0, OpenID Connect ou método suportado |
| Consultas | API ou views autorizadas, filtros, paginação e alterações incrementais |
| Envio futuro | Campos, permissões, UUID externo, confirmação, conflitos e estornos |
| Ambiente | Homologação, documentação e credenciais de integração |

Acesso atual ao GMAIS somente de leitura. Credenciais do banco fora do APK; integração por serviço no servidor. Migração de autenticação depende do método oficial, sem pressupor importação de senhas.

## Backup

Backup dos dados, estrutura, Auth e configurações do projeto, com cópia separada da assinatura Android. O export das 15 tabelas não cobre todo o ambiente Supabase.

Backup anterior à limpeza guardado fora do GitHub. Senhas, fotos, tokens, chaves de serviço e keystore fora do repositório público.

[Documentação da estrutura](docs/database-architecture.pt-BR.md) · [Histórico](docs/changes.md)
