## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Abençoada development workflow

- Run Graphify through `node scripts/project-graph.mjs <command>` from this repository. This wrapper uses the isolated, pinned installation; replace bare `graphify` commands above with this wrapper. Start with `query`, then inspect the source locations it returns. If a query has no result, refine it or inspect the relevant source; do not treat missing edges as proof that no dependency exists.
- Run `node scripts/project-graph.mjs update` after source changes. A local post-commit hook also updates the map. Generated `graphify-out/` files stay local; GitHub Actions publishes downloadable snapshots with their source commit and health report.
- The agreed mode is deterministic code/SQL analysis only. Use `--code-only` and `--no-label` for a full build. Do not add cloud services, model calls, live database introspection or credentials to map generation.
- Record material behavior/schema changes and their validation in `docs/changes.md`. Keep `docs/development.md` accurate when the workflow changes. Git commits remain the complete source-change history.
- The map includes historical SQL migrations, not the current state of a running database. Verify migration order and tests before drawing conclusions about deployed behavior. Inspect `graphify-out/HEALTH.txt` for extraction limitations.
- Preserve offline drafts and pending records. Never clear device/browser data to resolve a synchronization problem.
- Do not write to GMAIS or publish/alter its data. Integration remains future work until an authorized interface is available.
- Do not edit an applied migration to change production behavior; add a new ordered migration and the relevant tests.
- Run checks appropriate to the change. Graph updates do not replace application tests or manual UI verification.
