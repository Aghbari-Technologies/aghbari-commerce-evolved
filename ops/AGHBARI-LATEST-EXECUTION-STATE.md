# CURRENT EXECUTION POINTER — 2026-10-16

## Active workstream
- **Repository:** `Aghbari-Technologies/aghbari-commerce-evolved`
- **Active PR:** [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72) — OPEN
- **Work branch:** `fix/acceptance-hardening-cart-finance-20261015` → `main`
- **Rule:** continue on this exact work branch. Do not switch branches or push directly to `main` while PR #72 is open.

## Only next task
- **`next_task_id = AGH-OPS-DR-001` — OPEN / PARTIAL.**
- **Import boundary source/test verification:** commit [c241970e648f7292178e0a9a88bdf4938a69ef2f](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/commit/c241970e648f7292178e0a9a88bdf4938a69ef2f) passed exact-head Actions [38828317225](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38828317225): 21/21 test files, 248/248 tests; PostgreSQL 17 migration/workflow suite; lint; build; production-preview routes/assets (4173); dev routes (5173). Real CSV/XLSX reader tests cover 100/101 columns, 4,000/4,001-character cells, a 50,000-delimiter row, XLSX central-directory expansion claims, and bounded long-cell output.
- **Synthetic runtime/memory benchmark — PASS, exact SHA `c241970e...`:** 100,000 business rows / 100,001 including header, 79,988,932 input bytes (76.28 MiB), 1,120.90 ms, 68.06 MiB/s; 1,221 samples; sampled heap delta 15,624,934 bytes and sampled RSS delta 36,917,248 bytes. This is generated CI input and sampled memory, not production P95, a true transient peak, or a physical uploaded 100 MiB File.
- **Backup/restore drill — PASS, exact workflow SHA `9295db3512bc5de2408409a98beb2b314cbebd4b`:** Actions [38828579321](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38828579321) **SUCCESS**, 21/21 files and 248/248 tests; custom-format `pg_dump`/ `pg_restore` into a separate isolated PostgreSQL 17 database passed structural and row-content signature comparison. Evidence: schema signature `55:686:125:315:134`, data signature `c87b6f54a9587394cdaa41335b9b154c`. This is an isolated CI recovery drill, not production restoration/failover evidence.
- **Latest test extension at current branch HEAD `9098483463d0d19c72baa41c76ab693529e3fb95`:** `src/lib/unified-import.test.ts` now streams exactly 100 MiB through 4 MiB Blob slices into `hashFileSha256` and verifies total processed bytes; the XLSX cell regression feeds 54,000+ characters and asserts the parser returns only a 4,001-character invalid sentinel. Exact-head CI for this new test commit is pending/not yet returned by GitHub Actions.
- **Next implementation step:** verify the new exact-100-MiB test on its own SHA; then continue failover/recovery only where a genuine isolated environment permits. Production 100 MiB upload, production runtime performance, production restore, failover and DR remain unproven.
- Local checkout/npm test commands were **NOT RUN** because this runtime cannot resolve github.com for a checkout; all pass evidence cited above comes from exact-SHA GitHub Actions.
- Keep `AGH-SEC-BROWSER-E2E-001` as a separate external blocker; it does not block independent source work.

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
