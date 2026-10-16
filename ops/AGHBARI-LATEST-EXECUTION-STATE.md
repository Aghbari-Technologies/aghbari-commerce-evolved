# CURRENT EXECUTION POINTER — 2026-10-16

## Active workstream
- **Repository:** `Aghbari-Technologies/aghbari-commerce-evolved`
- **Active PR:** [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72) — OPEN
- **Work branch:** `fix/acceptance-hardening-cart-finance-20261015` → `main`
- **Rule:** continue on this exact work branch. Do not switch branches or push directly to `main` while PR #72 is open.

## Only next task
- **`next_task_id = AGH-OPS-DR-001` — OPEN.**
- **Do next:** add/run focused regression tests for the existing 100 MB file-size limit, 100-column limit, 4,000-character cell limit, and XLSX archive-expansion guard. Fix defects proven by these tests. Then continue repeatable runtime/memory measurement and safe backup/restore drills where the environment permits.
- **Do not:** restart broad discovery, reread the entire specification, create another plan, or stop after an audit/report. An external browser/database blocker does not block independent source code work.
- **Read only:** this pointer, the `AGH-OPS-DR-001` row in `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`, and the exact source/spec clauses needed for this task.

## Evidence checkpoint
- **Latest tested source SHA:** `ec9ae3b91215b3f8bc4ffe53b9296a676dbb2f44`
- **Exact-SHA CI:** [38826652666](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38826652666) **SUCCESS** — 21/21 test files, 240/240 tests, isolated PostgreSQL 17 migration/workflow checks, lint, production build, production-preview smoke (4173), and dev-server smoke (5173).
- This proof applies only to `ec9ae3b...`. Documentation-only execution-rule updates were committed after it; they are **not represented by that CI result**. No code tests were run during the current documentation-only correction. Verify the live branch HEAD and CI once at resume, then begin the next task without rerunning already-proven tests unless the relevant source/input changed.
- **Current documentation-control checkpoint before this state refresh:** `106d13e87939da480c38e116e01d76946648581e`; this state refresh itself will create a newer commit. Verify the live remote HEAD on the next run instead of assuming either SHA is still HEAD.

## Known external blocker — not a reason to stop source work
- `AGH-SEC-BROWSER-E2E-001` remains externally blocked until authenticated Lovable/browser access is available.
- The intended production Supabase project ref `ffxxjaolfntzbapmfbuv` was previously permission-denied. Do not substitute `mrcyqezbhpncuvaehwgf` or apply production migrations without verified project identity and authorization.
- Lovable's live-editor sync and production publish are separate from Git push and CI; claim them only after direct readback evidence. Keep free Lovable points for necessary integration/publish work, not code discovery.

## Mandatory save before every run boundary
After each coherent batch and **before any response, pause, timeout/context limit, or session end**, update this file and the existing registry row. Record active branch/PR/HEAD, changed files, actual test commands/results, tested SHA and matching CI, next task ID, and evidence-backed blockers. Use `NOT RUN` for tests not executed and `UNPUSHED` for uncommitted/unpushed checkpoints. Continue on the next session from this cursor without asking the owner to repeat context.

## History location
Older implementation and test evidence belongs in `ops/AGHBARI-DEVELOPMENT-PROGRESS.md` and the existing requirement rows. This file is intentionally a **single live cursor**, not a second historical ledger.
