# Change log

## 2026-10-28 — Aparência, carregamento e confirmações de envio

Paleta compartilhada com o site, temas claro/escuro persistentes e botão Ajustes ao lado de Ocorrências. Rótulos flutuantes no login, animação local de carregamento e bloqueio do botão durante a validação. Avisos distinguem gravação local de recebimento confirmado, com resumo da fila, data/hora da confirmação e retorno visual acessível.

Android possui canal de notificações de envio, permissão solicitada após login e opção de solicitar novamente em Ajustes. Confirmações do envio em primeiro ou segundo plano geram notificação nativa, inclusive com tela bloqueada quando permitido pelo sistema. Duplicatas são evitadas por identidade/registro em armazenamento nativo persistente. Erros de rede, recibos divergentes e simples gravação local não disparam confirmação. O agendamento de fundo depende do Android e de suas restrições de bateria/rede.

Validação: regressões de confirmação/recibo divergente, permissão recusada/repetida, deduplicação, login e acesso offline; suíte completa e builds. Fluxo de navegador isolado validou temas, persistência, saída/retorno/reinício offline e conservação de pendências com dados fictícios.

Validação nativa adicional: APK assinado instalado por atualização no emulador Android, sem limpar dados. Permissão recusada/permitida e notificação nativa com tela bloqueada verificadas usando identificador fictício, sem criar ou enviar registro operacional. Repetir a confirmação não publicou nova notificação. Corrigido o contraste de ícones das barras em cada tema e adicionada regressão Android/iOS; a data de confirmação permanece após atualização da sessão.

## 2026-10-28 — Desbloqueio offline com a senha do login

Primeiro acesso online habilita desbloqueio local com a mesma senha validada, sem armazenar senha legível. Catálogo/sessão passam a ser cifrados com AES-GCM e chave derivada por PBKDF2; filas e rascunhos são preservados. SAIR fecha a sessão visível preservando o acesso offline, rascunhos e pendências; trocar de usuário com registros pendentes é impedido. Prazo inicial de 30 dias renovado por validação de sessão online; token local expirado não equivale a revogação de acesso offline. Autenticação GMAIS permanece responsabilidade da futura conexão do servidor.

Campos de usuário e senha adaptados à referência de rótulo flutuante do Bencho, com CSS local e acessibilidade. Regras e limites documentados em `docs/offline-access.md`. Validação: testes criptográficos/estados, suíte existente, fluxo de navegador em modo avião com registro/reinício/bloqueio, revisão visual e builds web/móvel.

## 2026-10-28 — Barra de status e disposição das telas Android

Fixado o contraste da barra de status sobre o cabeçalho branco, inclusive no tema escuro do aparelho, usando SystemBars do Capacitor. O tema inicial e o fundo nativo acompanham a configuração; a navegação considera a área reservada por WebViews antigos e a área verde em edge-to-edge. Insets fornecidos pelo Capacitor passam a ser respeitados no CSS.

O formulário de login fica centralizado no espaço disponível abaixo da logo com teclado fechado e permanece rolável em áreas menores. A logo se adapta em telas baixas. Aumentado o intervalo entre os botões de abastecimento, transferência e checklist, mantendo botões acessíveis em telas menores.

Validação: suíte completa; build e sincronização Android; revisão visual em 390×844, 360×640, paisagem e altura reduzida por teclado; compilação assinada e conferência Android.

## 2026-10-28 — Preparação para catálogo dinâmico GMAIS

Adicionado contrato opcional e versionado de metadados por frota na resposta de sessão, com adaptação compartilhada entre web e Android. A unidade e a finalidade confirmada do medidor adicional definem os campos exigidos; capacidade desconhecida não vira estimativa. Catálogos locais, leituras existentes, rascunhos e pendências são preservados. Nenhum catálogo real foi incluído/importado e nenhuma conexão GMAIS foi ativada.

Documentado em `docs/gmais-integration.md` o mapeamento esperado para a futura conexão do Luiz e as adaptações ainda necessárias no servidor (identidade, validação de envios, histórico e fonte de leituras). Validação: testes de contrato e sessão RPC, suíte completa, builds web/Android e atualização do mapa de arquitetura.

## 2026-10-28 — Administração na raiz do site

Administração e login passam a abrir diretamente em `https://abencoada-agricola.github.io/abencoada/`, sem redirecionar para `admin.html`. O endereço anterior redireciona à raiz para preservar favoritos. Saída da conta, abertura do aplicativo web instalado e links atuais acompanham o endereço simplificado. Armazenamento e sessão existentes permanecem no mesmo domínio e banco local.

Validação: testes completos, build de produção e verificação no navegador da raiz e do redirecionamento legado.

## 2026-10-28 — Nome técnico em minúsculas

Repositório renomeado de `Abencoada` para `abencoada`, conforme solicitado. Links atuais de documentação, downloads e GitHub Pages atualizados para `https://abencoada-agricola.github.io/abencoada/admin.html`. Nome público do aplicativo continua Abençoada. Validação: nome confirmado pela API do GitHub e publicação do Pages acompanhada.

## 2026-10-28 — Abençoada: nome e ícone

Nome público unificado para Abençoada no Android, títulos web, manifesto, documentação e releases. Ícone fornecido em `icone-app.png` aplicado ao launcher Android (adaptativo e legado), abertura do app, favicon e instalação web. Pacote npm e APK passam a `abencoada` e `abencoada.apk`. Repositório passa a `Abencoada` (GitHub não aceita ç/acentos no nome técnico), com a marca Abençoada no README e descrição. Links de administração atualizados para `https://abencoada-agricola.github.io/Abencoada/admin.html`.

Identidade Android, assinatura, armazenamento offline, chaves de sincronização e contratos de QR/login permanecem compatíveis com instalações existentes. Ícones e manifesto agora participam da versão do cache web.

Validação: testes completos, builds web/Android e atualização do mapa de arquitetura.

## 2026-10-19 — Nome do repositório

Repositório renomeado para `app-abencoada`, apresentado como APP Abençoada. Atualizados os links de administração, downloads e documentação. O endereço da administração passa a ser `https://abencoada-agricola.github.io/app-abencoada/admin.html`. Identificadores do Android, banco e fila offline foram preservados.


Record material changes here with the request, resulting behavior, affected areas and validation. Git history contains the full diff and authorship.

## 2026-10-16 — Per-user feature access

- Request: configure each login as an operator or administrator and allow any combination of refueling, transfer and checklist.
- Added a member permission editor and new-account choices, filtered Android menus, cached access and current-permission checks at server submission boundaries. Existing accounts keep their previous access by default.
- Added `user-access.sql` after `checklists.sql`, with role/feature validation, self-demotion protection and an administrator audit trail. Global Checklist availability remains independent.
- Revoked access preserves drafts and queued records. Previously accepted records can still be acknowledged; feature-level denials do not become network errors or stop unrelated queue items.
- Validation: access combinations, operator privilege escalation, native and legacy RPC enforcement, role promotion/demotion, restored access, duplicate receipts and audit permissions; full application suite; administration and mobile previews.

## 2026-10-16 — Simplify administration settings

- Request: remove the locations, materials and recorder-reading controls while the database contains fictitious trial data.
- Removed the settings card, its reading/cadastro dialogs and its settings-only data request. Existing database values and Android workflows are preserved.
- Renamed the rules card to Regras and removed the static mandatory-fields and decreasing-readings explanations. Validation behavior remains in place.
- Validation: production build and visual review of Configurações; architecture map updated. Standard deployment checks run in GitHub Actions.

## 2026-10-16 — Project architecture tracking

- Request: use Graphify to improve control of future project changes.
- Added a project-scoped skill, source map instructions, pinned local installation and a command wrapper.
- Added a local post-commit refresh and a GitHub workflow publishing architecture snapshots with the source commit and diagnostics.
- Code/SQL analysis runs locally without model calls or live database access. Generated maps and excluded files are not committed.
- Baseline: existing Android version 1.0.40 and checklist availability control, source commit `c9ffdd5`.
- Validation: first extraction and incremental refresh; focused login, offline queue and checklist queries; graph health inspection; local hook and GitHub workflow verification.
- Known limits: partial Gradle extraction, historical SQL definitions and some grouped graph relationships. See `docs/development.md`.

## 2026-10-16 — Remove the global checklist control

- Removed the Aplicativo Android settings card and its checklist toggle handler. Administrators manage each login through Equipe e acessos → Permissões.
- Existing operation settings, Android compatibility and pending records are preserved.
- Validation: production build and settings preview; deployment checks run in GitHub Actions.

## 2026-10-16 — Recoverable user removal

- Added administrator-only Remove and Restore actions under Equipe e acessos, with a confirmation dialog and self-removal protection.
- New member-removal.sql archives the membership and revokes device leases, retaining authentication identities and submitted history. Server authorization denies removed accounts even with existing sessions. Removed accounts require explicit restoration.
- Restoration recovers the previous role and permissions; username conflicts preserve the archive. Every removal/restoration is audited.
- Validation: database authorization, session/device revocation, history retention, restoration, conflicts and UI preview; standard build and deployment checks.

## 2026-10-16 — Type fleet codes in Checklist

- Replaced the fleet dropdowns in received checklists and question configuration with editable fleet-code fields and catalog suggestions. Received records filter as the user types; clearing the field shows all fleets.
- Question editing opens only for an existing catalog code.
- Validation: production build and browser checks for typed filters, clearing, catalog selection and unknown codes.

## 2026-10-16 — Compact overview controls

- Moved the overview period selector and CSV export below the final data card, with a compact inline layout. Preserved the 7/30/60/90-day choices and export scope.
- Kept 44px touch targets on smaller screens.
- Validation: production build and visual overview review; deployment runs the standard test suite.

## 2026-10-16 — Operation search filters

- Added independent employee-name and inclusive date-range filters to Occurrences and Transfers, with a Clear filters action. Employee search ignores case and accents; dates use São Paulo time.
- Periodic refresh updates results without replacing active filter fields. Existing detail, photo and recoverable deletion controls remain available.
- Added fleet-code filtering and optional fleet entry on Android occurrences/transfers after the user confirmed that capture approach. Legacy records remain unlinked; no association is inferred from locations. Apply operation-fleets.sql after member-removal.sql. Links are validated on server submission, retained offline and preserved on retries.
- Validation: production build and browser checks for employee/date combinations, local date boundaries, empty matches and independent tab filters. Deployment runs the full existing suite.

## 2026-10-16 — Branded report headers

- Added the Abençoada logo and issuance date/time in Brasília time to checklist PDFs, refueling printouts and QR-label printouts. Multi-page reports repeat the header with the same issuance timestamp. Capture/reception timestamps remain separate.
- Shared report header code waits for print images to load and prevents checklist downloads without the logo. Included the shared module in versioned assets and offline caching.
- Validation: multi-page checklist PDF rendering, embedded image and timestamp checks on every page, timezone boundary check, production build and print-layout preview.

## 2026-10-19 — Database documentation and smaller test workspace

- Documented the 15 application tables (9 public, 6 private), 125 columns, declared relationships, authentication, RPCs and offline synchronization in database-architecture.pt-BR.md. Managed Supabase Auth tables are counted separately.
- User confirmed clearing operational trial history while retaining 10 representative fleets, accounts and necessary configuration. Saved a private local snapshot of all 15 tables and a recovery script outside Git before changing the live test data.
- Added a one-time maintenance script with expected-inventory checks and a transaction. Reduced the live catalog from 250 to 10 fleets, retained 3 members, 2 locations and material 9, and cleared 15 refuelings, 7 transfer/occurrence events, 4 submitted checklists and 2 photos. Security/access audit and device credentials were preserved.
- Retained checklist versions for selected fleets and added basic questions where missing. Reset initial meter values for testing; known capacities remain and missing capacities have trial values. All selected fleets/locations are internally flagged as test data. Updated the bundled catalog to the same 10 fleet codes.
- Validation: restored the private snapshot into local PostgreSQL-compatible storage, rehearsed reset, tested refueling/transfer/occurrence/checklist submission, rejected a second reset and restored the original data successfully. Existing application test suite passed. Verified live result counts and reviewed the technical PDF.
- Offline queues on phones are preserved; phones must connect to refresh the reduced catalog. GMAIS was not modified.

## 2026-10-20 — Shared website and Android icons

- Replaced the Android menu PNGs with the website's SVG icons for refueling, transfers and checklists; occurrences use the same warning triangle. Both interfaces import one icon module with matching rounded strokes.
- Bundled SVGs work offline. Added the shared module to website asset versioning and service-worker caching.
- Validation: website/mobile production builds, existing application tests and mobile-size visual review.

## 2026-10-20 — Larger Android button labels

- Increased button font sizes by 20%, including main actions, menu, sign-out, photo actions and checklist choices.
- Kept flexible button heights and wrapped long labels at spaces; narrow menus use two columns so icons do not squeeze the larger labels.
- Validation: mobile build and visual checks at narrow phone, standard phone and tablet widths.

### Publication verification

- Full application suite passed, including permissions, offline submission, retries, photos and checklist revisions. Website and mobile production builds passed.
- Verified real login/menu, local/material selection, refueling methods and checklist screens in a browser using an isolated local backend fixture at 320, 360, 390 and 600px. Button overflow measurements were clear on these screens. Earlier visual review also covered long action labels and photo controls.
- Included shared icon changes in Android workflow triggers. No database migrations or offline-storage changes.

## 2026-10-21 — Quiet empty-queue refresh failures

- Opening/resuming the Android app also refreshes session/catalog data. Failed refreshes previously used upload wording even when no records were pending; Supabase status-zero abort responses could lose their error type and leak technical AbortError text.
- Normalize wrapped abort responses, keep idle network/server/rate-limit failures in the header, and reserve record-preservation/upload messages for nonempty queues. Session-expiry and authorization notices remain actionable. Clear the previous synchronization notice after recovery without erasing unrelated feedback.
- Validation: full application suite, web/mobile production builds, focused regressions for empty/pending queues, wrapped aborts, recovery, access statuses and matching receipts. Browser review with an isolated interrupted-request fixture confirmed the empty-queue menu has no upload error banner. No storage schema, pending-record deletion rules or GMAIS data changed.

## 2026-10-21 — Always-available authenticated occurrences

- Kept the occurrence toolbar action enabled on every authenticated screen, including initial local/material selection, checklist-only access and accounts with all three optional features disabled. Clicking it while already editing an occurrence focuses the current notes instead of resetting navigation or drafts.
- When no operational context is selected, the occurrence form collects its own required local/material codes. These codes are saved in its offline draft and payload without fixing or changing the refueling/transfer context. Initial context inputs now retain their draft when opening and returning from an occurrence.
- Verified all eight combinations of per-user feature permissions: disabled menu entries are absent, live session refresh hides/restores them without logout, restricted forms cannot remain open, offline sessions keep last received access and drafts/queues survive access changes. Occurrences remain authorized on the server when all optional permissions are false.
- Validation: full application suite with mobile-access-ui regressions, web/mobile production builds, and browser checks of live permission toggles, occurrence entry without context and draft retention. No schema migration or GMAIS changes.

## 2026-10-21 — General incident reports without operational codes

- Removed local, material and fleet inputs and the operational-context banner from the occurrence form. New reports contain the authenticated operator, capture time, text and/or optional photo. Existing queued occurrences retain their original links when corrected.
- Added general-occurrences.sql after operation-fleets.sql: occurrence context columns are nullable, transfer context remains required, and general submissions retain authentication, duplicate receipts, photo validation, atomic photo storage and removal/restoration. Other operation types continue through the existing validation chain. Dashboard lists/details omit absent metadata.
- Validation: full suite and builds, new migration/legacy/photo/device/idempotency tests, mobile context-free payload tests and dashboard rendering checks. Browser simulation saved a report offline, reopened it with the pending queue intact and confirmed delivery after reconnection.
- Applied the migration to the existing Supabase project after verifying the previous schema. A live transactional submission without codes and a duplicate retry succeeded, then were rolled back. Existing operation/photo counts remained 2/1. No GMAIS changes.
