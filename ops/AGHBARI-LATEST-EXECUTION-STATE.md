# CURRENT EXECUTION POINTER — 2026-10-16

## Active workstream
- **Repository:** `Aghbari-Technologies/aghbari-commerce-evolved`
- **Active PR:** [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72) — OPEN
- **Work branch:** `fix/acceptance-hardening-cart-finance-20261015` → `main`
- **Rule:** continue on this exact work branch. Do not switch branches or push directly to `main` while PR #72 is open.

## Only next task
- **`next_task_id = AGH-OPS-DR-001` — OPEN / PARTIAL.**
- **Completed source work:** PWA icon/manifest acceptance; 100,000-row CSV streaming boundary; 100 MiB file-size guard; 100-column and 4,000-character cell boundaries; XLSX archive-expansion budget and adversarial central-directory fixture.
- **Next implementation step:** add a repeatable CSV streaming performance probe that records elapsed time and sampled heap/RSS on the 100,000-row input without storing the full CSV; then continue safe backup/restore and recovery checks only where a non-production environment/provider access is available.
- Do not mark operational performance, production 100 MiB behavior, backup restore, or DR drill complete from unit tests alone. Do not repeat broad discovery or already-passing tests unless related code changes.
- Keep `AGH-SEC-BROWSER-E2E-001` as a separate external blocker; it does not prevent source work.

## Evidence checkpoint
- **Latest tested source SHA:** `bf55a465219462701461d0b77cffc09389fbcf6c`
- **Exact-SHA CI:** [38827741763](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38827741763) **SUCCESS** — 21/21 test files, 246/246 tests; isolated PostgreSQL 17 migration/workflow checks, lint, production build, production-preview smoke (4173), and dev-server smoke (5173).
- The preceding SHA `d1a149517e6aef7d573aa90df1401ad41e3c7851` failed one new ZIP-fixture test because the test environment lacks `Blob.arrayBuffer()`; commit `bf55a465...` switched that fixture to the same `FileReader` fallback used by the importer, and exact-head CI passed.
- The tested source changes include `src/lib/unified-import.ts`, `src/components/UnifiedImportEngine.tsx`, `src/lib/unified-import.test.ts`, and `src/test/commerce-utils.test.ts`. This is source/isolated-CI evidence, not a production database or authenticated browser proof.
- Latest PWA proof remains source commit `2ee243599c60054468f419c541f3d52ea7e2a111` + exact preview-gate commit `cdfed3adb21ee881f85117e6f2f163a4c7cf0de2`, both with passing exact-SHA CI.

## Known external blocker — not a reason to stop source work
- `AGH-SEC-BROWSER-E2E-001` remains externally blocked until authenticated Lovable/browser access is available.
- The intended production Supabase project ref `ffxxjaolfntzbapmfbuv` was previously permission-denied. Do not substitute `mrcyqezbhpncuvaehwgf` or apply production migrations without verified project identity and authorization.
- Lovable's live-editor sync and production publish are separate from Git push and CI; claim them only after direct readback evidence. Keep free Lovable points for necessary integration/publish work, not code discovery.

## Mandatory save before every run boundary
After each coherent batch and **before any response, pause, timeout/context limit, or session end**, update this file and the existing registry row. Record active branch/PR/HEAD, changed files, actual test commands/results, tested SHA and matching CI, next task ID, and evidence-backed blockers. Use `NOT RUN` for tests not executed and `UNPUSHED` for uncommitted/unpushed checkpoints. Continue on the next session from this cursor without asking the owner to repeat context.

## History location
Older implementation and test evidence belongs in `ops/AGHBARI-DEVELOPMENT-PROGRESS.md` and the existing requirement rows. This file is intentionally a **single live cursor**, not a second historical ledger.
