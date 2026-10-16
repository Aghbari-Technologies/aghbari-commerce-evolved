# CURRENT EXECUTION POINTER — 2026-10-16

## Active workstream
- **Repository:** `Aghbari-Technologies/aghbari-commerce-evolved`
- **Active PR:** [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72) — OPEN
- **Work branch:** `fix/acceptance-hardening-cart-finance-20261015` → `main`
- **Rule:** continue on this exact work branch. Do not switch branches or push directly to `main` while PR #72 is open.

## Only next task
- **`next_task_id = AGH-OPS-DR-001` — OPEN / PARTIAL.**
- **Source/test commit `c241970e648f7292178e0a9a88bdf4938a69ef2f` — CI SUCCESS:** [Actions 38828317225](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38828317225): 21/21 test files, 248/248 tests; isolated PostgreSQL 17 migrations/workflows; lint; production build; production-preview routes/assets (4173); dev routes (5173). Import benchmark **PASS**: 100,000 business rows / 100,001 including header, synthetic streamed input 79,988,932 bytes (76.28 MiB), 1,120.90 ms, 68.06 MiB/s; 1,221 memory samples, sampled heap delta 15,624,934 bytes, sampled RSS delta 36,917,248 bytes. These are CI synthetic measurements, not production P95 or a true transient memory peak.
- **Implemented code:** `src/lib/unified-import.ts` caps CSV row arrays at 101 cells for bounded excess-column rejection and replaces oversized XLSX cell content with a 4,001-character rejection sentinel; `src/lib/unified-import.test.ts` exercises 50,000 delimiters, the actual ZIP/XLSX reader at 100/101 columns and 4,000/4,001 chars, and forged archive-expansion metadata.
- **Current workflow/DR checkpoint:** `9295db3512bc5de2408409a98beb2b314cbebd4b` adds an isolated PostgreSQL 17 custom-format logical backup/restore drill. Exact-head Actions [38828579321](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38828579321) is **IN_PROGRESS**; restore result must be read from that run. Do not record the restore drill as PASS before the step itself completes.
- **Next implementation step:** verify/fix the restore drill, then continue safe failover/recovery measurements only in isolated infrastructure. Actual 100 MiB end-to-end file processing, production performance, production restore and failover/DR remain unproven.
- Local Git checkout/npm test commands were **NOT RUN** in this runtime because GitHub hostname resolution failed; tests above are GitHub Actions evidence only.
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
