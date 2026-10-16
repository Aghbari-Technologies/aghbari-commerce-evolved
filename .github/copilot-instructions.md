# Aghbari Commerce — repository-wide Copilot instructions

Root `AGENTS.md` is the governing execution policy. Lovable's official documentation says the root-level `AGENTS.md` is automatically read by its agent; keep it concise and authoritative.

## Active execution cursor

- Preserve active PR #72 on `fix/acceptance-hardening-cart-finance-20261015`. Do not switch branches or push directly to `main` while this PR is open.
- Use only the first/current pointer in `ops/AGHBARI-LATEST-EXECUTION-STATE.md`; disregard old task IDs in historical sections. Current task: `AGH-OPS-DR-001` — test the 100 MB file-size, 100-column, 4,000-character cell and XLSX archive-expansion boundaries; repair proven gaps.
- At startup, verify the active PR/head and its exact-SHA CI once. If a local checkout is available, run `git fetch origin` and check branch/status/HEAD; otherwise, do not claim local Git commands ran.
- Read only the active task's registry row, relevant source and acceptance clauses. Do not reread all canonical documents, perform broad rediscovery, recreate plans, or ask the owner to resend saved context.
- Implement and test one coherent batch immediately; fix failures and continue to the next open task.
- After every coherent batch and **before every run/session ends, context limit or pause**, update the existing state file and matching registry row with actual branch/PR/HEAD, changed paths, real test commands/results, tested SHA/CI, next task and evidenced blocker. Mark unrun tests and unpushed changes honestly.
- Commit/push to the active PR branch, not `main`, until that PR is deliberately integrated. Never fake PASS, production access, or Lovable sync.
- Finish code and automated tests in Git first. Spend Lovable free points only on a concrete live editor/database/browser integration or synchronization/publishing task that source access cannot complete.
