# CURRENT EXECUTION POINTER — 2026-10-16

## Active workstream
- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`; PR [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72) OPEN; branch `fix/acceptance-hardening-cart-finance-20261015` → `main`.
- Verified base HEAD before this batch: `6ca3826ba5d6e3c469c5721a28e045d480eb53d9`.
- Verified base CI: SUCCESS on exact SHA `6ca3826ba5d6e3c469c5721a28e045d480eb53d9` — [Actions 38830342032](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38830342032). The new ZIP-header hardening candidate must pass its own exact-SHA CI; no proof transfers from this base.
- Last previously verified baseline: exact source/workflow SHA `f71f3f70f0683685d7707b085e7ef63fa1ec89a5`, Actions [38829458881](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38829458881) PASS, including 21 test files, isolated PostgreSQL migration/workflow checks, RLS/policy/trigger/sequence/extension signatures, lint, production build, preview smoke 4173 and dev-server smoke 5173. Subsequent test-fixture and globals/ACL changes are evaluated only by current candidate CI above.

## Only next task
- `next_task_id = AGH-OPS-DR-001` — PARTIAL; continue isolated recovery acceptance only. No production restore, failover, migration, publish or merge.
- Import resource protections: 1 byte–100 MiB pre-read file-size guard; 100/101 column boundary; 4,000/4,001 cell boundary; bounded CSV row overflow; XLSX archive expansion capped at 10×/100 MiB; hostile ZIP metadata rejected before retaining oversized members.
- Synthetic importer performance evidence (separate SHA): `c241970e648f7292178e0a9a88bdf4938a69ef2f`, Actions [38828317225](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38828317225): 100,000 data rows + header, 76.28 MiB, 1,120.90 ms, 68.06 MiB/s, sampled heap/RSS deltas +15,624,934 / +36,917,248 bytes over 1,221 samples. This is a synthetic single-run sample, not real 100 MiB upload, production P95 or peak memory.
- Current candidate implementation status: Database restore + security catalog comparison passed.
- Base CI inspected: exact SHA `6ca3826ba5d6e3c469c5721a28e045d480eb53d9`, Actions `38830342032`, conclusion SUCCESS. New source batch: compare each XLSX local-header name and flags against the central-directory record; add a regression for a workbook entry redirected to a decoy member. Candidate SHA/CI: PENDING until this commit is created and its own Actions run completes.
- Even when cluster/database signatures pass, **AGH-OPS-DR-001 remains PARTIAL**: CI restore is isolated; no production backup/restore or failover proof.
- PWA manifest/icons/preview evidence remains [38825705008](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38825705008) and [38825885494](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38825885494). Public manifest/icons and finance deep routes returned 404 in read-only checks. Connected Lovable has no matching Aghbari project and no signed-in browser context; no publish attempted. Intended Supabase ref `ffxxjaolfntzbapmfbuv` remains permission-denied; never substitute another project.

## Evidence checkpoint
- Last verified pre-patch HEAD: `6ca3826ba5d6e3c469c5721a28e045d480eb53d9`; Actions `38830342032` SUCCESS. Candidate `4554980c6ffbf4c3a8ca49d8f5d166cdce7e0645` failed the regression fixture (Actions `38832046485`); fixture reader corrected for the test runtime, with new exact-SHA CI pending.
- Previously verified importer profile SHA: `c241970e648f7292178e0a9a88bdf4938a69ef2f` / Actions 38828317225.
- Previously verified PWA source preview: `2ee243599c60054468f419c541f3d52ea7e2a111` / Actions 38825705008 and `cdfed3adb21ee881f85117e6f2f163a4c7cf0de2` / Actions 38825885494.
- Recheck exact HEAD every resume. Isolated CI, live browser acceptance, and production database proof remain separate claims.


## AGH-OPS-DR-001 source batch checkpoint
- Active branch/PR: `fix/acceptance-hardening-cart-finance-20261015` / PR #72; base HEAD `6ca3826ba5d6e3c469c5721a28e045d480eb53d9`.
- Files in the source batch: `src/lib/unified-import.ts`, `src/lib/unified-import.test.ts`, this state file, and the matching registry row.
- Existing boundary tests cover positive file sizes through 100 MiB, 100/101 columns, 4,000/4,001-character cells, declared archive expansion, and aggregate expansion budgets. Added a regression for a central-directory record redirected to a different local ZIP member; production parser now checks local flags and decoded local path before consuming member bytes.
- Local test command: `npx vitest run src/lib/unified-import.test.ts` — NOT RUN locally. An attempted shallow clone failed because this runtime cannot resolve `github.com`; no local test PASS is claimed. Exact-SHA GitHub Actions is the execution gate; the rerun is pending for the fixture fix.
- No deployment, production restore, failover, PR merge, or Lovable publishing was attempted.
- Local network limitation evidenced by `git clone --depth 1 --single-branch --branch fix/acceptance-hardening-cart-finance-20261015 https://github.com/Aghbari-Technologies/aghbari-commerce-evolved.git /tmp/aghbari-commerce-evolved` failing with `Could not resolve host: github.com`; use GitHub Actions/connector evidence, not local-test claims.

## Known external blocker — not a reason to stop source work
- `AGH-SEC-BROWSER-E2E-001` remains externally blocked until authenticated Lovable/browser access is available.
- The intended production Supabase project ref `ffxxjaolfntzbapmfbuv` was previously permission-denied. Do not substitute `mrcyqezbhpncuvaehwgf` or apply production migrations without verified project identity and authorization.
- Lovable's live-editor sync and production publish are separate from Git push and CI; claim them only after direct readback evidence. Keep free Lovable points for necessary integration/publish work, not code discovery.

## Mandatory save before every run boundary
After each coherent batch and **before any response, pause, timeout/context limit, or session end**, update this file and the existing registry row. Record active branch/PR/HEAD, changed files, actual test commands/results, tested SHA and matching CI, next task ID, and evidence-backed blockers. Use `NOT RUN` for tests not executed and `UNPUSHED` for uncommitted/unpushed checkpoints. Continue on the next session from this cursor without asking the owner to repeat context.

## History location
Older implementation and test evidence belongs in `ops/AGHBARI-DEVELOPMENT-PROGRESS.md` and the existing requirement rows. This file is intentionally a **single live cursor**, not a second historical ledger.
