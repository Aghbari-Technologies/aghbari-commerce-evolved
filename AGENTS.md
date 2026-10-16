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

1. At startup, verify the **active work branch and active PR head** once. If a local checkout exists, run `git fetch origin`, inspect `git status --short --branch`, `git branch --show-current`, `git rev-parse HEAD`, and `git log -1 --oneline`; inspect the active branch's remote HEAD and exact-SHA CI. Check `origin/main` as the PR base/comparison only. If no checkout exists, use GitHub evidence and explicitly state that local Git commands were not run.
2. Resume from the **first/current pointer** in `ops/AGHBARI-LATEST-EXECUTION-STATE.md`; match just that task ID to its row in `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`. Read only source files and specific specification clauses required by that task. Do not reread every canonical document, rescan the whole repository, recreate plans, or follow task IDs in historical checkpoint sections.
3. Preserve the active work branch and any in-flight changes. For PR #72, continue on `fix/acceptance-hardening-cart-finance-20261015`. Do not commit this work directly to `main` while the PR is open. Push tested batches and checkpoints to the active PR branch; update `main` only through deliberate PR integration or an explicit owner instruction.
4. Implement the next open task directly: make the code/test change, run focused relevant tests, fix failures, then perform applicable quality gates. A report, scan, route, placeholder, source inventory, or plan is not implementation. Treat `DONE_VERIFIED` as closed unless its exact-SHA proof is invalidated by a relevant code/dependency/input change, regression, security finding, or failed test.
5. After every coherent batch and **before any response, timeout, context limit, session end, or pause**, update the existing state file and matching requirement row. Record active branch/PR and actual HEAD; changed paths; real test commands and results; exact tested SHA and matching CI; next task ID; concrete blocker and evidence. Explicitly mark tests NOT RUN and checkpoints UNPUSHED where applicable. A subsequent session must resume from the saved cursor without asking the owner to resend context.
6. Never overwrite dirty work, force-push, rewrite published history, fabricate test/production/integration success, or apply production migrations before confirming project identity and authorization. Source push does not prove Lovable synchronization or production publication.
7. The root `AGENTS.md` is the shared execution policy; `.github/copilot-instructions.md` is Copilot's entry point. Keep Lovable free points for genuine live-editor/database/browser integration and sync/publish work after source code and tests are ready.

Execution order: `VERIFY ACTIVE PR/HEAD → RESUME CURRENT TASK → IMPLEMENT → TEST → FIX → CHECKPOINT → COMMIT/PUSH ACTIVE BRANCH → CONTINUE`; integrate to `main` and sync/publish only when acceptance and access permit.

## Permanent session-resume protocol (repository-aware agents)

1. Verify active PR #72, the work branch and its live HEAD once. If a local checkout exists, run `git fetch origin`, inspect `git status --short --branch`, branch, HEAD and latest commit. Check CI for the exact active HEAD. `main` is the PR base, not the destination for in-flight work. If no checkout exists, use GitHub evidence and state that local Git commands were not run.
2. Read the first/current pointer in `ops/AGHBARI-LATEST-EXECUTION-STATE.md`; match only that task ID to its row in `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`. Read relevant source/spec clauses only. Do not follow hard-coded task IDs from any other file or historical checkpoint.
3. Implement that task. For a failing latest CI, inspect its logs and fix the first real failure; rerun required gates. A previous SHA passing does not waive a current failure. Do not jump to the next task until the current acceptance gate passes, or a concrete external blocker is documented and independent work can proceed.
4. After every coherent batch and before every run/session boundary, update the same state file and the matching registry row with branch/PR/HEAD, changed paths, actual test commands/results, tested SHA/CI, task cursor and blocker. Mark NOT RUN or UNPUSHED honestly. Verify the resulting commit is on the remote branch.
5. Preserve in-flight changes and published Git history. Do not force-push. Push accepted batches/checkpoints to the active PR branch; merge to `main` only through deliberate PR integration. A push/CI does not prove Lovable sync, live browser E2E, or production database acceptance.
6. Lovable's root `AGENTS.md` instruction-loader support is the free persistent rule mechanism; keep this file authoritative and other instruction files short. Live editor/deploy sync requires separate direct evidence.

Execution order: `VERIFY ACTIVE PR/HEAD → READ ONE TASK CURSOR → IMPLEMENT → TEST → FIX → CHECKPOINT → PUSH ACTIVE BRANCH → CONTINUE`; integrate to `main` only when acceptance permits.
