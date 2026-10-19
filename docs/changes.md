# Change log

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
