# Development workflow

Graphify maps the maintained JavaScript, Java and SQL source. Git records each code change; `docs/changes.md` records the reason and validation of material behavior changes.

## Setup

Requires Node.js and Python 3.10 or newer. From this repository:

```sh
node scripts/project-graph.mjs setup
node scripts/project-graph.mjs update
```

Setup installs `graphifyy[sql]` at the version in `tools/graphify-requirements.txt`, inside a separate environment under `~/.local/share/abastece/graphify-venv`. It installs a local post-commit hook. Existing unrelated hooks are preserved; setup reports if chaining is needed. Clones need their own setup. No cloud account or API key is needed.

The project-scoped skill is in `.codex/skills/graphify/`. Repository instructions use the Node wrapper so a global `graphify` executable is unnecessary. `GRAPHIFY_BIN` can select another installation, as the CI workflow does. `GRAPHIFY_SETUP_PYTHON` can select the Python interpreter when creating the environment.

## Before changing source

```sh
node scripts/project-graph.mjs query "offline queue synchronization"
node scripts/project-graph.mjs query "checklistEnabled"
node scripts/project-graph.mjs explain "diesel_operation_submit"
node scripts/project-graph.mjs affected "mobile/app.js"
```

Use the returned source files and line numbers to inspect the code. Narrow ambiguous queries by file or symbol. The graph identifies candidates and relationships; it does not establish that a proposed change is correct.

## After a change

1. Run the checks required by the change.
2. Update `docs/changes.md` for material behavior, schema or workflow changes.
3. Run `node scripts/project-graph.mjs update` and inspect the affected flow.
4. Commit the change. The local hook refreshes the graph and records the commit in `graphify-out/BUILD.json`.

If a hook update fails, the commit is retained and a warning is printed. Inspect `.git/graphify-update.log` and rerun the update. The hook only runs for this clone. To remove it, remove the marked `.git/hooks/post-commit` file; do not delete an unrelated hook.

Useful commands:

```sh
node scripts/project-graph.mjs status
node scripts/project-graph.mjs health
node scripts/project-graph.mjs rebuild
```

`rebuild` performs a fresh code-only extraction and local clustering without model labeling. It keeps the library's shrink guard; review unexpected reductions before forcing a rebuild through the underlying tool.

## Outputs and history

Generated outputs are ignored by Git:

- `graphify-out/graph.html`: interactive source map.
- `graphify-out/graph.json`: queryable graph.
- `graphify-out/GRAPH_REPORT.md`: architecture summary.
- `graphify-out/BUILD.json`: tool version, source commit, time and counts.
- `graphify-out/HEALTH.txt`: graph diagnostics.

GitHub Actions **Project architecture map** rebuilds from main after relevant source changes. Download the `project-architecture` artifact from the workflow run. Artifacts are retained for 14 days; Git history and the pinned setup allow older revisions to be analyzed again. The graph is not included in the site or Android package.

## Scope and limitations

`.graphifyignore` excludes generated bundles, dependencies, secrets, catalog data, media and documentation. Documentation stays readable and versioned separately. Analysis uses local parsers; no live Supabase/GMAIS database is queried and no model backend is configured. Structural extraction uses zero LLM/API tokens; development and review have their own costs.

The baseline parser reports partial/no-symbol extraction for some Android Gradle files. SQL scripts containing only data or permission changes may produce no symbols. Historical definitions across SQL migrations are all visible; the graph does not decide which definition is currently deployed. Browser event handlers, dynamic RPC dispatch and cross-language calls may be incomplete or inferred.

The health report also identifies self-loops and same-endpoint relationships that can be collapsed during traversal/clustering. Check the source and relevant tests when an exact relationship matters. These limitations do not indicate an application test failure.

Do not index credentials, operational exports or GMAIS captures. Keep all future GMAIS investigation read-only unless the user explicitly changes that requirement.
