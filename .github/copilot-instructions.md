# Aghbari Commerce — repository-wide Copilot instructions

Root `AGENTS.md` is authoritative. Do not duplicate a task ID here.

## Resume and execute
- Verify the active PR/branch/HEAD and exact-head CI once. Preserve in-flight work on `fix/acceptance-hardening-cart-finance-20261015` while PR #72 is open; do not push directly to `main`.
- Read only the first/current task pointer in `ops/AGHBARI-LATEST-EXECUTION-STATE.md`. That file is the sole authority for the current task. Ignore any task ID mentioned elsewhere except the matching requirement row.
- Read only the matching row in `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md` and relevant source/spec clauses. Do not reread every instruction file, scan the whole repository, recreate plans, or ask the owner to resend saved context.
- Implement the task, run the relevant real tests, inspect failures, fix them, and continue. A failed exact-head CI blocks task closure; fix it before advancing. Do not transfer PASS across SHAs.
- After every coherent batch and **before each response, pause, timeout, context limit or session end**, update the existing state file and matching registry row: current branch/PR/HEAD, files changed, commands and results, tested SHA/CI, current/next task and evidence-backed blocker. Mark NOT RUN/UNPUSHED honestly.
- Push checkpoints to the active PR branch, not `main` while the PR is open. Never claim Lovable sync, production access or browser E2E without direct evidence.
- Preserve Lovable's free points for actual live database/editor/browser integration and publication after source CI is ready.
