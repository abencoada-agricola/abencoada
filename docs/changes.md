# Change log

Record material changes here with the request, resulting behavior, affected areas and validation. Git history contains the full diff and authorship.

## 2026-10-16 — Project architecture tracking

- Request: use Graphify to improve control of future project changes.
- Added a project-scoped skill, source map instructions, pinned local installation and a command wrapper.
- Added a local post-commit refresh and a GitHub workflow publishing architecture snapshots with the source commit and diagnostics.
- Code/SQL analysis runs locally without model calls or live database access. Generated maps and excluded files are not committed.
- Baseline: existing Android version 1.0.40 and checklist availability control, source commit `c9ffdd5`.
- Validation: first extraction and incremental refresh; focused login, offline queue and checklist queries; graph health inspection; local hook and GitHub workflow verification.
- Known limits: partial Gradle extraction, historical SQL definitions and some grouped graph relationships. See `docs/development.md`.
