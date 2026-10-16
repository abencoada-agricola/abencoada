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
