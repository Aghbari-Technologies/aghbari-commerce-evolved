## EXECUTION-FIRST OVERRIDE — HIGHEST PRIORITY

**Implement; do not loop.** This repository is the existing Aghbari Commerce product. Preserve active PR #72 on `fix/acceptance-hardening-cart-finance-20261015` while it is open. Do not create a replacement branch, discard existing changes, or push directly to `main` before deliberate PR integration.

**One task cursor, no duplicated task IDs:** `ops/AGHBARI-LATEST-EXECUTION-STATE.md` is the sole live task pointer. Read its first/current execution pointer and use that ID only. No other instruction, memory, registry preamble, or historical note may define a competing “current” task. When a change has failed CI, fixing that exact failure is the active task until the exact latest HEAD passes or a specifically evidenced blocker is recorded. Never skip a failing gate to move to another task.

**No discovery loop:** verify active PR/head/CI once; read the matching row in the single requirement registry and only relevant source/spec sections. Do not reread every canonical document or scan the whole repository each session. An external blocker does not stop independent source work.

**Implementation bar:** change production code or tests, run relevant checks, inspect exact failures, fix them, and continue. Planning, searching, inventories, reports, routes, stubs and status-file edits alone do not count as source implementation. Do not claim unrun tests, integrations, production changes or Lovable sync.

**Hard checkpoint rule:** save state after every coherent batch and before every response, pause, timeout, context limit or session end. Update the existing execution-state file and matching registry row with actual active branch/PR/HEAD, changed files, exact test commands/results, tested SHA/CI, current and next task, and evidence-backed blocker. If a test fails, write the error and keep the task open. If a push fails, label the checkpoint UNPUSHED. Resume from this saved cursor in a new conversation without asking the owner to repeat context.

**Lovable budget:** finish source implementation and CI first. Use free Lovable points only for a specific live-editor/database/browser/sync/publish step that Git cannot prove or complete. Verify target project identity before production writes.

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Aghbari Commerce
- Legacy Bolt UI lives in src/components (AghbariApp, Storefront, AdminPages, OperationsCenter) and src/lib (api, types); extend it, do not rewrite — the spec mandates incremental build.
- src/lib/supabase.ts re-exports the Cloud client loosely typed so api.ts keeps its hand-written contracts in types.ts.
- Admin access = user_roles role in admin/manager/staff checked by public.is_staff(); customers order only via the place_order RPC so prices are computed server-side.
- Profiles are created by the ensure_profile RPC after sign-in (no triggers on auth schema); first signed-up user becomes admin.


## Permanent session-resume protocol (repository-aware agents)

1. Verify active PR #72, branch and live HEAD once. If a local checkout exists, run `git fetch origin`, inspect `git status --short --branch`, branch/HEAD and latest commit; inspect CI for that exact active HEAD. `main` is the PR base, not the destination for in-flight work. If no checkout exists, use GitHub evidence and state that local Git commands were not run.
2. Read the first/current pointer in `ops/AGHBARI-LATEST-EXECUTION-STATE.md`; match only that task ID to its row in `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`. Read relevant source/spec clauses only. Never follow task IDs from instruction files or historical checkpoints.
3. Implement that task. A failing CI on the current source head must be inspected and fixed before the task can close or work can advance. A previous SHA passing does not waive a current failure. If a task is externally blocked, record the evidence and continue only with independent work.
4. After every coherent batch and before any response, pause, timeout, context limit or session end, update the same state file and matching registry row with active branch/PR/HEAD, changed paths, actual test commands/results, tested SHA/CI, live task cursor and evidenced blocker. Mark NOT RUN and UNPUSHED honestly.
5. Preserve in-flight changes and published history. Do not force-push. Push accepted batches/checkpoints to the active PR branch; merge to `main` only through deliberate PR integration. Git push/CI does not prove Lovable sync, live browser E2E or production DB acceptance.
6. Keep this file authoritative and other instruction files short. Lovable's documented `AGENTS.md` loader is the free persistent-instruction mechanism; live editor/deploy sync still requires direct evidence.

Execution order: `VERIFY ACTIVE PR/HEAD → READ ONE TASK CURSOR → IMPLEMENT → TEST → FIX → CHECKPOINT → PUSH ACTIVE BRANCH → CONTINUE`; integrate to `main` only when acceptance permits.
