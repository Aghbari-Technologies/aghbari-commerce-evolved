# CURRENT EXECUTION POINTER — 2026-10-16

## Active workstream
- **Repository:** `Aghbari-Technologies/aghbari-commerce-evolved`
- **Active PR:** [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72) — OPEN
- **Work branch:** `fix/acceptance-hardening-cart-finance-20261015` → `main`
- **Rule:** continue on this exact work branch. Do not switch branches or push directly to `main` while PR #72 is open.

## Only next task
- **next_task_id = AGH-OPS-DR-001 — OPEN / PARTIAL.**
- **Previously passing import source/test:** commit [c241970e648f7292178e0a9a88bdf4938a69ef2f](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/commit/c241970e648f7292178e0a9a88bdf4938a69ef2f), Actions [38828317225](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38828317225) SUCCESS: 21/21 test files, 248/248 tests; PostgreSQL 17 workflow checks; lint/build; preview smoke 4173 and dev smoke 5173. CSV/XLSX tests cover 100/101 columns, 4,000/4,001 characters, a 50,000-delimiter row, forged ZIP expansion metadata, and bounded invalid output for long cells.
- **Synthetic performance — PASS:** 100,000 CSV business rows (100,001 with header), 79,988,932 input bytes / 76.28 MiB, 1,120.90 ms, 68.06 MiB/s; 1,221 memory samples, sampled heap delta 15,624,934 B and sampled RSS delta 36,917,248 B. Generated CI input and sampled memory only; not production P95 or true transient peak.
- **Isolated backup/restore — PASS:** commit [9295db3512bc5de2408409a98beb2b314cbebd4b](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/commit/9295db3512bc5de2408409a98beb2b314cbebd4b), Actions [38828579321](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38828579321) SUCCESS. Custom pg_dump + pg_restore into separate PostgreSQL 17 database passed schema and row-content signature comparisons (55:686:125:315:134; c87b6f54a9587394cdaa41335b9b154c). Does not prove production restoration or failover.
- **Proven regression and correction:** test commit [9098483463d0d19c72baa41c76ab693529e3fb95](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/commit/9098483463d0d19c72baa41c76ab693529e3fb95), Actions [38828801486](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38828801486) FAILED: 247 passed / 1 failed because hashFileSha256 called Blob.arrayBuffer() directly, unavailable in this test Blob implementation. Current source [b4ed241b08f977d63bab65464b579a25b3714eb6](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/commit/b4ed241b08f977d63bab65464b579a25b3714eb6) routes hash chunks through shared readBlobArrayBuffer (Blob.arrayBuffer and FileReader fallback).
- **Current exact-head CI:** b4ed241b is PENDING; new tests stream exactly 100 MiB in 4 MiB slices through hashFileSha256 and verify all bytes were processed; XLSX test feeds a 54,000-character cell and asserts the output is capped to a 4,001-character rejection sentinel. Do not report PASS before CI.
- **Next:** verify/fix this exact-head CI, then continue failover/recovery only where a real isolated environment permits. Production upload, production-scale performance, production restore, failover and DR remain unproven.
- Local checkout/npm tests remain NOT RUN because this runtime cannot resolve github.com for checkout; all PASS evidence above is from exact-SHA GitHub Actions.
- Keep AGH-SEC-BROWSER-E2E-001 as a separate external blocker; it does not block independent source work.

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
