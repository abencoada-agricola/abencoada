# Histórico técnico: funcionamento com Supabase

Este documento explica a arquitetura anterior do aplicativo Abençoada. É apenas documentação histórica: não configura conexões, não executa migrações, não publica o aplicativo e não contém credenciais.

## Banco e autenticação

O sistema usava PostgreSQL hospedado no Supabase. As tabelas de negócio ficavam nos esquemas `public` e `private`. Os usuários eram autenticados por Supabase Auth; os UUIDs das contas eram relacionados aos cadastros e aos históricos de operação.

A função Edge `diesel-login` resolvia o nome de usuário, validava a senha pelo serviço de autenticação, limitava tentativas e permitia ao administrador definir senhas de pessoas cadastradas. Chaves administrativas permaneciam no servidor, fora do site e do APK.

## Comunicação do site e do Android

O site administrativo era publicado no GitHub Pages. O aplicativo Android usava JavaScript com Capacitor. Ambos acessavam o Supabase por HTTPS, usando funções RPC para consultar e gravar dados.

As funções do banco identificavam a conta autenticada e aplicavam as permissões de administrador/operador e as liberações independentes de abastecimento, transferência e checklist. As tabelas privadas não eram disponibilizadas diretamente aos usuários do aplicativo.

## Estrutura de negócio

As quinze tabelas de aplicação reuniam:

- Usuários e permissões (`members`), frotas/equipamentos (`fleets`) e configurações (`settings`).
- Abastecimentos (`records`), materiais, locais e operações de transferência/ocorrência.
- Modelos versionados de perguntas e respostas de checklist.
- Autorizações de sincronização de dispositivos, fotos de ocorrências, limite de login e auditorias de acesso/exclusão.
- Cadastros de pessoas removidas, mantidos para recuperação.

Fotos de ocorrências eram guardadas separadamente dos eventos para não carregar imagens em todas as consultas. As datas registravam instantes com fuso; a interface apresentava o horário de Brasília. Litros e leituras usavam tipos numéricos de precisão decimal.

## Captura e sincronização

O Android preservava os registros e rascunhos no aparelho quando não havia conexão. A sincronização enviava os dados depois, mantendo o UUID de cada lançamento. O servidor reconhecia reenvios de um registro já aceito, evitando duplicações.

Cada conta tinha sua própria fila/cache. Tokens específicos de dispositivo permitiam o envio em segundo plano e eram guardados como hash no banco. O aplicativo não precisava conhecer uma senha de acesso direto ao PostgreSQL.

## Validações e histórico

O servidor conferia permissões, leituras anteriores de KM/horímetros, registradoras, datas, versões de checklist e consistência entre locais/frotas de teste. A capacidade do tanque era preservada no lançamento para análise posterior; excedê-la não impedia automaticamente o envio.

Exclusões de abastecimentos e operações eram lógicas, com responsável, motivo e possibilidade de restauração. As alterações de equipe/permissões tinham auditoria. Os checklists preservavam a versão e o texto das perguntas respondidas.

## Mudança de arquitetura

A decisão posterior foi adotar um único banco SQL Server, `APP_ABENCOADA`. A API passa a intermediar o acesso do site/Android ao SQL Server e mantém a credencial SQL somente no servidor. Funções, autenticação e regras específicas do PostgreSQL/Supabase exigem adaptação; os dois produtos não têm estruturas internas idênticas.

Esta documentação não ativa o sistema antigo. Também não indica que um projeto de nuvem foi excluído: desligar/excluir serviços e publicar novas versões são operações separadas, que precisam ser verificadas no ambiente efetivo.
