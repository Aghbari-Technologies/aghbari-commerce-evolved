## EXECUTION-FIRST OVERRIDE — 2026-10-16 (takes precedence over older notes below)

**Do work; do not restart discovery.** The active workstream is PR [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72), branch `fix/acceptance-hardening-cart-finance-20261015`, based on `main`. Preserve this branch and all existing changes. Do not switch to another work branch, create a duplicate branch, or push work to `main` while this PR is open. Continue on this PR branch until its work is complete and the PR is deliberately integrated.

**Single task cursor:** read only the topmost `Current execution pointer` in `ops/AGHBARI-LATEST-EXECUTION-STATE.md`; ignore older `next_task_id` mentions in historical sections. The current next task is `AGH-OPS-DR-001`: add focused acceptance tests for the existing 100 MB file, 100-column, 4,000-character cell, and XLSX archive-expansion boundaries; then implement/fix only what those tests prove is missing. Continue to repeatable performance/memory and backup/restore evidence when safe.

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


## Permanent session-resume protocol (mandatory for repository-aware agents)

This project must resume from repository evidence; the owner must not be asked to resend information already saved here.

1. At session start, run `git fetch origin`, `git status --short --branch`, `git branch --show-current`, `git rev-parse HEAD`, `git rev-parse origin/main`, and `git log -1 --oneline`. Inspect GitHub Actions for the exact current `main` SHA. Protect any dirty/uncommitted work; never reset or overwrite it to make the tree look clean.
2. Read `PROJECT_MEMORY.md`, `ops/AGHBARI-SESSION-RESUME.md`, `ops/AGHBARI-LATEST-EXECUTION-STATE.md`, `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`, `docs/canonical/AGHBARI-EXECUTION-MANDATE.md`, and consult `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md` only for the specific acceptance criteria needed. Treat remote `main` and exact-SHA evidence as truth; saved SHAs are checkpoints, not assumed HEAD.
3. Take `next_task_id` from the latest execution-state checkpoint and match it to the single requirement registry. Do not repeat repository-wide discovery, restate the same specification, or reopen `DONE_VERIFIED` work unless its SHA/dependency/input changed, a regression or security issue appeared, or its evidence became invalid. When the first open item is externally blocked, record the concrete blocker and continue the next safe, executable task without inventing success.
4. Implement the smallest coherent end-to-end change, run relevant real tests, fix failures, and record task ID, changed paths, commands, results, exact tested SHA, next task ID, and evidence-backed blockers. Update the existing canonical memory/resume/state/registry records in the same related batch; never create duplicate progress ledgers.
5. Commit and push safely to `origin/main` only after validation; never force-push published history. Then verify remote HEAD and Actions for that exact SHA. A push, green parent-SHA CI, Git integration, or repository text is not proof that the new SHA passed or that Lovable actually synchronized.
6. `AGENTS.md` is the shared agent-instruction source; `.github/copilot-instructions.md` provides GitHub Copilot's repository-wide entry point. Lovable's official Knowledge documentation explicitly says a root-level `AGENTS.md` is always read by its agent regardless of session length: https://docs.lovable.dev/features/knowledge. This root file is therefore the free persistent-instruction fallback; do not duplicate the full specification in Project Knowledge merely to persist resume rules. Still distinguish that documented loader behavior from proof that a particular new Git SHA has synchronized into the live Lovable project/editor. Never claim the latter without direct evidence.

Execution order: `INSPECT CURRENT STATE → RESUME NEXT OPEN TASK → IMPLEMENT → TEST → FIX → VERIFY → COMMIT → PUSH MAIN → SYNC LOVABLE`.
