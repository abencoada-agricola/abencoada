# Abençoada — estrutura do banco de dados

Estrutura do banco de dados. Revisão: 19/10/2026.

## Resumo

A Abençoada usa PostgreSQL hospedado no Supabase. O aplicativo Android foi feito com JavaScript e Capacitor; a administração web fica no GitHub Pages. Foram criadas 15 tabelas próprias: 9 no schema public e 6 no schema private, somando 125 colunas. A autenticação fica no Supabase Auth, separado dessas 15 tabelas. O app não se conecta diretamente ao SQL: envia dados por HTTPS para funções RPC, que validam usuário, permissões e leituras. Sem internet, guarda os registros no celular e sincroniza depois. Hoje o banco é independente do GMAIS; a integração ainda precisa ser definida.

## 1. O que existe em cada camada

| Camada | Implementação |
| --- | --- |
| Aplicativo Android | JavaScript/HTML/CSS com Capacitor; leitura de QR Code, câmera e fila offline. |
| Administração web | JavaScript no GitHub Pages; consulta, gestão de usuários/frotas, checklists e relatórios. |
| Banco | PostgreSQL no Supabase, com tabelas relacionais e campos JSONB. |
| Autenticação | Supabase Auth; login por usuário traduzido para a conta no servidor pela função diesel-login. |
| Comunicação com o banco | HTTPS/PostgREST RPC e Edge Function para o login/gestão de senha. |
| Envio sem interface aberta | WorkManager no Android, usando autorização restrita de dispositivo. |
| Integração GMAIS | Ainda não existe integração operacional em tempo real. |

Schemas são divisões lógicas do mesmo banco; não são dois bancos diferentes. O nome public não significa leitura livre: as tabelas têm RLS e não recebem acesso direto dos clientes públicos/autenticados. As funções autorizadas fazem a intermediação. O schema private concentra apoio e dados que não devem ser expostos diretamente.

As 15 tabelas são da aplicação. Não entram nessa conta as tabelas gerenciadas pelo Supabase, como auth.users, sessões, refresh tokens, catálogo do PostgreSQL e estruturas internas do serviço.

## 2. Quantidade e finalidade das tabelas

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

## 3. Relacionamentos e chaves

- members usa o e-mail como chave e mantém o username único. A ligação com a conta do Supabase é feita pela lógica do servidor; members não usa o UUID de Auth como chave primária.
- records.fleet referencia fleets.id; records.user_id referencia auth.users.id; previous_record_id pode apontar para outro abastecimento.
- diesel_checklist_templates tem chave composta (fleet, version) e referencia a frota.
- diesel_checklists referencia a combinação (fleet, template_version), preservando a configuração usada na resposta.
- diesel_operations.fleet referencia fleets.id, mas é opcional.
- diesel_occurrence_photos.operation_id referencia diesel_operations.id e permite uma foto por ocorrência.
- diesel_locations tem chave composta (local_code, material_code). Neste modelo, não há chave estrangeira declarada ligando material_code ao catálogo diesel_materials; a coerência é tratada nos fluxos e nas funções.
- Vários campos de autor/operador são UUIDs ou cópias de nomes sem chave estrangeira declarada. O vínculo lógico é validado no servidor. Isso deve ser considerado no mapeamento para outro banco.

Os lançamentos usam UUID gerado no aparelho. A mesma tentativa reenviada mantém o mesmo UUID; o servidor reconhece a repetição e não cria outro lançamento.

## 4. Dicionário dos campos

“Não nulo” descreve a coluna do banco, não necessariamente um campo que o funcionário deve digitar. Muitos valores vêm da conta, do relógio, de valores padrão ou do cálculo do servidor. numeric é usado para litros e leituras; o app aceita KM inteiro. timestamptz guarda instantes com fuso, apresentados em horário de Brasília na interface/relatórios.

### 4.1. public.members

Cadastro de acesso do aplicativo. Liga o e-mail do Supabase Auth ao nome de usuário, perfil e funções liberadas.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `email` | text | Sim | E-mail de vínculo com a autenticação. |
| `name` | text | Sim | Nome de exibição. |
| `role` | text | Sim | Perfil: admin ou operator. |
| `username` | text | Sim | Nome utilizado no login; comparação sem diferença entre maiúsculas/minúsculas. |
| `permissions` | jsonb | Sim | JSONB com refuel, transfer e checklist, cada um true/false. |

Chaves declaradas: `PRIMARY KEY (email)`; `UNIQUE (username)`.
### 4.2. public.fleets

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
### 4.3. public.settings

Configurações globais armazenadas como pares de identificador e documento JSONB.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `id` | text | Sim | Identificador da configuração, por exemplo rules. |
| `value` | jsonb | Sim | Documento JSONB com as regras da operação. |

Chaves declaradas: `PRIMARY KEY (id)`.
### 4.4. public.records

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
### 4.5. public.diesel_materials

Catálogo de materiais/combustíveis identificados por código.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `material_code` | text | Sim | Código do combustível/material. |
| `material_name` | text | Sim | Descrição do combustível/material. |

Chaves declaradas: `PRIMARY KEY (material_code)`.
### 4.6. public.diesel_locations

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
### 4.7. public.diesel_operations

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

### 4.8. public.diesel_checklist_templates

Versões das perguntas configuradas para cada frota. Uma nova configuração gera uma nova versão.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `fleet` | text | Sim | Código da frota vinculada. |
| `version` | integer | Sim | Número da versão das perguntas. |
| `questions` | jsonb | Sim | Lista JSONB de perguntas, com identificador UUID e texto. |
| `created_at` | timestamptz | Sim | Data/hora de criação ou captura. |
| `created_by` | uuid | Sim | UUID do administrador que criou a versão. |

Chaves declaradas: `PRIMARY KEY (fleet, version)`; `FOREIGN KEY (fleet) REFERENCES fleets(id)`.
### 4.9. public.diesel_checklists

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
### 4.10. private.diesel_devices

Autoriza o envio em segundo plano por dispositivo. Guarda o hash do token, e não o token em texto aberto.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `user_id` | uuid | Sim | UUID da conta autenticada responsável. |
| `device_id` | uuid | Sim | Identificador UUID do dispositivo. |
| `email` | text | Sim | E-mail de vínculo com a autenticação. |
| `token_hash` | bytea | Sim | Resumo SHA-256 do token de envio. |
| `expires_at` | timestamptz | Sim | Validade da autorização de sincronização. |

Chaves declaradas: `PRIMARY KEY (user_id, device_id)`; `UNIQUE (token_hash)`.
### 4.11. private.diesel_occurrence_photos

Uma foto JPEG comprimida por ocorrência, guardada como data URL/base64 e consultada separadamente da lista.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `operation_id` | uuid | Sim | UUID da ocorrência; também é a chave primária. |
| `data_url` | text | Sim | JPEG comprimido em base64/data URL; limite de 280.000 caracteres. |

Chaves declaradas: `PRIMARY KEY (operation_id)`; `FOREIGN KEY (operation_id) REFERENCES diesel_operations(id)`.
### 4.12. private.login_attempts

Contadores temporários por IP e usuário, usados para limitar tentativas de autenticação.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `bucket` | text | Sim | Chave de contagem com resumo do IP ou do nome de login. |
| `window_start` | timestamptz | Sim | Início da janela de contagem. |
| `attempts` | integer | Sim | Quantidade de tentativas na janela. |

Chaves declaradas: `PRIMARY KEY (bucket)`.
### 4.13. private.record_control_audit

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
### 4.14. private.user_access_audit

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
### 4.15. private.removed_members

Preserva o cadastro anterior para permitir restaurar o acesso sem apagar o histórico operacional.

| Campo | Tipo PostgreSQL | Não nulo | Uso |
| --- | --- | --- | --- |
| `email` | text | Sim | E-mail de vínculo com a autenticação. |
| `member_data` | jsonb | Sim | Cópia JSONB do cadastro removido. |
| `removed_at` | timestamptz | Sim | Data/hora da exclusão lógica. |
| `removed_by` | uuid | Sim | UUID do administrador que excluiu. |
| `removed_by_name` | text | Sim | Nome do administrador que excluiu. |

Chaves declaradas: `PRIMARY KEY (email)`.

## 5. Uso do JSONB

JSONB foi usado para campos cuja composição varia: permissões de funções, leituras habilitadas por frota, regras, referências anteriores e perguntas/respostas. As entidades principais continuam em tabelas relacionais. Essa escolha reduz a necessidade de criar colunas novas para cada pergunta, mas exige mapear os documentos ao integrar com um sistema que usa tabelas de perguntas e itens separados.

Exemplo de permissão: {"refuel": true, "transfer": false, "checklist": true}.

Exemplo de leituras: {"km": true, "engine": false, "elevator": false}.

Uma pergunta tem UUID e texto. A resposta guarda o UUID, o texto vigente e o status. Alterar perguntas cria nova versão; respostas antigas não são reescritas. Serviços registrados ficam no JSONB resolutions com identificação do responsável e data.

## 6. Fluxo de dados

1. O funcionário entra online. A função de login resolve o username e valida a senha no Supabase Auth. As senhas não ficam em members nem em uma tabela própria da Abençoada.
2. O app recebe a conta, as permissões, o catálogo de frotas, as leituras de referência, locais/materiais e perguntas de checklist.
3. A escolha da frota é pelo QR Code ou pelo código digitado. O QR identifica a frota; ele não é a fonte atualizada do último KM/horímetro.
4. O app calcula as referências usando os dados já recebidos e os registros pendentes anteriores do próprio aparelho.
5. O registro é salvo localmente com UUID, data/hora de captura e dados da operação, mesmo sem internet.
6. Com conexão, o app ou o worker envia o mesmo conteúdo ao servidor. As funções verificam a autorização atual e as regras.
7. O banco confirma o UUID recebido. Só depois dessa confirmação o app remove o item da fila.
8. A administração consulta os registros e verifica novidades a cada 15 segundos enquanto está aberta. Não há uma tabela separada de notificações.

A fila, os rascunhos e o catálogo do app usam IndexedDB. O worker mantém uma cópia protegida da fila e a credencial restrita usando armazenamento apoiado no Android Keystore. O banco guarda apenas o hash da credencial e sua validade. A credencial de dispositivo serve para envio; não permite administração. A validade atual é de 90 dias, com renovação quando o aplicativo conecta. Atualização de permissões no celular depende de conexão, e o servidor verifica novamente no recebimento.

## 7. Funções principais do servidor

| Função | Responsabilidade |
| --- | --- |
| diesel_session | Conta, permissões e dados para uso do aplicativo. |
| diesel_login_target | Resolução de username e limitação de tentativas; uso restrito ao serviço de login. |
| diesel_operation_submit | Recebimento de abastecimento, transferência, ocorrência e checklist, conforme o tipo. |
| diesel_mobile_submit | Compatibilidade com o formato anterior de abastecimento móvel. |
| diesel_device_register | Emissão/renovação da credencial restrita para o dispositivo. |
| diesel_device_submit | Recebimento da fila pelo worker, verificando o acesso atual. |
| diesel_records | Consulta de abastecimentos autorizados. |
| diesel_admin / diesel_admin_save | Equipe, permissões, frotas e regras, restritas a administrador. |
| diesel_operations_admin | Consulta e gestão de operações/locais conforme a ação autorizada. |
| diesel_checklists_admin | Configuração de perguntas, consulta e resolução de itens. |
| diesel_occurrence_photo | Consulta da foto autorizada, separada da listagem. |
| diesel_record_controls | Exclusão lógica, restauração e auditoria de lançamentos. |

Há funções históricas e auxiliares para compatibilidade entre migrações. A quantidade de funções SQL não é a quantidade de tabelas. A lista acima descreve os pontos principais em uso, e não concede acesso direto a todas as funções existentes.

## 8. Regras e segurança

- Todas as 15 tabelas próprias têm RLS habilitada. O cliente não faz INSERT/UPDATE/DELETE livre nas tabelas.
- As funções de servidor usam verificações explícitas de conta e perfil; um usuário não pode se promover a administrador pelo app.
- Perfil admin permite administração web. As permissões refuel/transfer/checklist são independentes por login.
- KM e horímetros não podem diminuir em relação às referências aplicáveis. A conferência ocorre no app e novamente no servidor.
- Litros devem ser positivos. No modo de registradora, a diferença das leituras é conferida; conflitos permanecem para correção.
- Acima da capacidade do tanque há aviso e marcação do registro; o envio não é bloqueado por esse motivo.
- Só máquinas habilitadas pedem horímetro de elevador; veículos leves, ônibus e caminhões não o exigem.
- Exclusões normais da administração são lógicas: guardam motivo, responsável e data e permitem restauração.
- Remover um usuário arquiva seu cadastro e revoga o envio; não apaga os lançamentos nem a identidade no Auth. O administrador não pode remover a própria conta.
- Fotos são JPEGs comprimidos, guardados em tabela privada com limite de tamanho. Não foi implementado um bucket de Supabase Storage para essas fotos.
- A chave pública do projeto pode estar no cliente. Senhas, chaves de serviço e credenciais privilegiadas não devem ser colocadas no app ou no GitHub.

## 9. Como o banco foi construído

A estrutura foi criada por arquivos SQL versionados em supabase/, executados em ordem. As primeiras migrações criaram cadastros e abastecimentos; depois vieram login por username, uso offline, transferências/ocorrências, fotos, capacidades, exclusão recuperável, checklists, permissões e vínculo opcional de frota. Alterações em produção são acrescentadas em novos arquivos; os arquivos já aplicados não devem ser reexecutados nem editados para mudar o banco ativo.

Ordem das migrações de estrutura/comportamento usadas nesta revisão:

1. `schema.sql`
2. `usernames.sql`
3. `field-access.sql`
4. `mobile.sql`
5. `operations.sql`
6. `background-sync.sql`
7. `gmais-readings.sql`
8. `fuel-control.sql`
9. `transfer-baseline.sql`
10. `occurrence-photos.sql`
11. `test-data.sql`
12. `simulated-readings.sql`
13. `vehicle-meters.sql`
14. `trial-recorder-readings.sql`
15. `android-only.sql`
16. `record-controls.sql`
17. `tank-references.sql`
18. `checklists.sql`
19. `user-access.sql`
20. `member-removal.sql`
21. `operation-fleets.sql`
22. `general-occurrences.sql`

O arquivo fleets.sql é uma carga de catálogo, não uma tabela adicional. Os arquivos de teste inserem referências para ensaios. A limpeza pontual de 19/10/2026 fica separada em supabase/maintenance/reset-test-workspace.sql, com verificação do inventário anterior e transação; não é uma migração automática.

## 10. Base reduzida para novos testes

A limpeza de 19/10/2026 manteve 10 frotas e os 3 cadastros de usuário. Foram removidos os 15 abastecimentos, 7 transferências/ocorrências, 4 checklists respondidos e 2 fotos. A auditoria de segurança/acesso foi preservada. As perguntas de frotas mantidas foram preservadas; as demais frotas selecionadas receberam perguntas básicas para teste. Não foram criados usuários nem alteradas senhas.

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

Locais disponíveis: 2 (TANQUE CFM) e 12 (ABASTECIMENTO EXTERNO). Material: 9 (ÓLEO DIESEL S-10). Registradoras iniciais para teste: 10.000 no local 2 e 20.000 no local 12. As leituras de KM/horímetros são fictícias para esse ensaio; algumas capacidades também foram preenchidas somente para exercitar o aviso. Não representam medições atuais dos veículos.

O banco mantém 15 tabelas; reduzir o número de frotas muda linhas, não a estrutura. Foram mantidos 2 locais, 1 material, configurações e perguntas suficientes para usar as quatro funções. Os aparelhos precisam abrir com internet para receber o catálogo reduzido. Filas antigas que ainda estejam no aparelho não foram apagadas por essa limpeza do servidor.

Foi guardada uma cópia local das 15 tabelas e um script de restauração fora do repositório público. Esse backup não inclui senhas nem é um backup completo do Supabase Auth ou da infraestrutura do projeto.

## 11. O que alinhar com o GMAIS

Para a integração, o principal é mapear o código da frota, material, local/registradora e usuário aos identificadores oficiais do GMAIS, além dos campos de data, KM, horímetros e litros. Precisamos definir qual sistema será a fonte de cada cadastro e da última leitura.

O contrato também precisa estabelecer como enviar um UUID externo sem duplicar lançamentos, como consultar alterações desde a última sincronização, como tratar conflitos e estornos, qual autenticação oficial usar e quais permissões de leitura/escrita serão liberadas. Não é necessário copiar todas as tabelas do GMAIS para a Abençoada. Uma API ou interface oficial de integração pode permitir que as duas estruturas continuem diferentes.

Pontos para revisão da integração: locais/materiais não estão totalmente normalizados por chaves estrangeiras; os itens de checklist estão em JSONB; fotos estão em base64; leituras de referência usam um campo chamado gmais_readings sem integração ativa; e os dados atuais são de teste. Esses pontos são decisões do protótipo e podem ser ajustados ao contrato oficial de integração.
