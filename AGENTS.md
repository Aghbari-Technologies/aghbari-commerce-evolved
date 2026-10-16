## EXECUTION-FIRST OVERRIDE — 2026-10-16 (takes precedence over older notes below)

**Do work; do not restart discovery.** The active workstream is PR [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72), branch `fix/acceptance-hardening-cart-finance-20261015`, based on `main`. Preserve this branch and all existing changes. Do not switch to another work branch, create a duplicate branch, or push work to `main` while this PR is open. Continue on this PR branch until its work is complete and the PR is deliberately integrated.

**Single task cursor:** read only the topmost `Current execution pointer` in `ops/AGHBARI-LATEST-EXECUTION-STATE.md`. Source acceptance and exact SHAs are recorded in the registry. The outbox worker request/retry/idempotency/redaction source is accepted by CI; deployed runtime is still blocked by intended project access. Current source task: `AGH-AI-GATEWAY-001`; replace the handler's unbounded `request.text()` read with the tested bounded byte reader and add the missing regression before continuing.

**No discovery loop:** at session start, verify the active branch/PR and its current HEAD once; read the current state pointer, the exact registry row for the task, and only the source/spec sections needed to implement it. Do not re-read the entire specification or scan the repository broadly each session. A blocker on a separate external integration never blocks independent source work.

**Implementation bar:** write or change production code/tests, run focused tests and relevant project gates, fix failures, and keep moving to the next open task. A plan, search, source inventory, report, route, or stub is not implementation. Keep existing behavior and uncommitted work safe. Never fake data, PASS, production access, or Lovable synchronization.

**Mandatory checkpoint at every boundary:** after each coherent batch and *before any response, timeout, context limit, session end, or pause*, update the existing `ops/AGHBARI-LATEST-EXECUTION-STATE.md` and the matching registry row. Record branch/PR, actual current HEAD, changed paths, real commands/results, tested SHA, exact CI link/status when available, the next task ID, and a precise blocker. If tests were not run, state that plainly. Commit/push the checkpoint to the active PR branch when possible; if network access fails, save locally where possible and mark it UNPUSHED. Never end an execution run with the cursor unsaved. On a new conversation, resume from that checkpoint without asking the owner to repeat it.

**Lovable budget:** finish source implementation and automated tests in Git first. Use Lovable's free points only for specific environment/database/browser integration, synchronization, or publishing work that cannot be proven or completed from source. Never spend them on rediscovery or rewriting instructions. Production DB writes require verified project identity and authorization.

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
