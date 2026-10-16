# CURRENT EXECUTION POINTER — 2026-10-16

## Active workstream
- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`.
- Active PR: [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72), state **OPEN**, work branch `fix/acceptance-hardening-cart-finance-20261015` → `main`.
- Current head before this cursor checkpoint: `f71f3f70f0683685d7707b085e7ef63fa1ec89a5`. The source/workflow acceptance evidence below is pinned to exact tested SHA `f71f3f70f0683685d7707b085e7ef63fa1ec89a5`; this documentation update is not part of that tested SHA.

## Only next task
- `next_task_id = AGH-OPS-DR-001` — **PARTIAL**; continue safe isolated recovery proof only. Do not perform production restore, migration, failover, publish or merge.
- **Latest full CI acceptance:** source/workflow SHA `f71f3f70f0683685d7707b085e7ef63fa1ec89a5`, [GitHub Actions 38829458881](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38829458881) **SUCCESS**. 21/21 test files passed; isolated PostgreSQL 17 migration/workflow tests, import resource-bound tests, lint, production build, production-preview smoke on port 4173, dev-server smoke on port 5173, and the expanded logical backup/restore step passed.
- **Import bounds covered:** 1-byte–100 MiB file-size guard before hash/XLSX reading and UI acceptance; 100 vs. 101 columns; 4,000 vs. 4,001 character cells; bounded CSV overflow; XLSX expansion ratio 10× with 100 MiB absolute cap; forged ZIP central-directory expansion claim rejected.
- **Measured synthetic import probe:** source SHA `c241970e648f7292178e0a9a88bdf4938a69ef2f`, [Actions 38828317225](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38828317225) SUCCESS: 100,000 CSV data rows plus header, 79,988,932 bytes (76.28 MiB), 64 KiB windows, 1,120.90 ms, 68.06 MiB/s, 1,221 memory samples; sampled heap peak 16,458,470 bytes (+15,624,934), sampled RSS peak 61,493,248 bytes (+36,917,248). This is a single synthetic CI measurement, not a production P95, full transient-memory peak, or a real 100 MiB upload.
- **Expanded isolated PostgreSQL restore:** exact run 38829458881 on SHA `f71f3f70f0683685d7707b085e7ef63fa1ec89a5` restored a custom-format dump of the isolated PostgreSQL 17.11 acceptance database into a separate `template0` database. Schema signature `55:686:125:315:134`, data signature `a47559dc99750461471c836afb013074`, security-catalog signature `55:0:381670c7daf6005491e4eacaea85060a:138:2b10c21081df4cc507a082f05fb0d285:15:b4888d558f216efd71e03b3bcf8836ac:0:2:73a88abc2119bcd1c14c9a1f13471723`, and sequence-state signature `d41d8cd98f00b204e9800998ecf8427e` matched source and restored databases. The catalog signature includes per-table RLS enabled/forced flags, policy count/content, non-internal trigger count/definitions, public sequence count, and extension count/name/version/schema. 55 public tables had RLS enabled and 0 had FORCE RLS in this isolated fixture; this signature is evidence of equality, not a declaration that FORCE RLS is required or sufficient.
- **Recovery scope remains PARTIAL:** this drill verifies database-scoped schema/data/catalog recovery on disposable CI infrastructure only. It does not prove cluster-global roles/permissions restoration, production backups, failover, full DR, or a real production 100 MiB import.
- **Next implementation step:** add isolated recovery acceptance for cluster-global role/membership inventory where it can be tested safely without overwriting roles in the active service; otherwise record the explicit cluster-global gap and keep the database restore status partial. Do not touch production.
- **PWA boundary:** manifest and 192×192/512×512 PNG icons (512 maskable) and source preview passed exact-SHA CI [38825705008](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38825705008) and [38825885494](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38825885494). Published host still returned 404 for manifest/icons and finance deep routes; the connected Lovable account does not expose the intended Aghbari project, and no signed-in browser session is available. No publish was attempted.
- Intended production Supabase ref `ffxxjaolfntzbapmfbuv` remains permission-denied. Never substitute `mrcyqezbhpncuvaehwg`; no production DB writes were made.

## Evidence checkpoint
- Full source/workflow acceptance: `f71f3f70f0683685d7707b085e7ef63fa1ec89a5` / Actions 38829458881 **SUCCESS**.
- Import benchmark: `c241970e648f7292178e0a9a88bdf4938a69ef2f` / Actions 38828317225.
- Prior logical restore: `9295db3512bc5de2408409a98beb2b314cbebd4b` / Actions 38828579321 **SUCCESS**; the latest run extends it with RLS/policy/trigger/sequence/extension signatures.
- Exact-SHA CI evidence is not production/browser acceptance. Re-read remote HEAD on resume.

## Known external blocker — not a reason to stop source work
- `AGH-SEC-BROWSER-E2E-001` remains externally blocked until authenticated Lovable/browser access is available.
- The intended production Supabase project ref `ffxxjaolfntzbapmfbuv` was previously permission-denied. Do not substitute `mrcyqezbhpncuvaehwgf` or apply production migrations without verified project identity and authorization.
- Lovable's live-editor sync and production publish are separate from Git push and CI; claim them only after direct readback evidence. Keep free Lovable points for necessary integration/publish work, not code discovery.

## Mandatory save before every run boundary
After each coherent batch and **before any response, pause, timeout/context limit, or session end**, update this file and the existing registry row. Record active branch/PR/HEAD, changed files, actual test commands/results, tested SHA and matching CI, next task ID, and evidence-backed blockers. Use `NOT RUN` for tests not executed and `UNPUSHED` for uncommitted/unpushed checkpoints. Continue on the next session from this cursor without asking the owner to repeat context.

## History location
Older implementation and test evidence belongs in `ops/AGHBARI-DEVELOPMENT-PROGRESS.md` and the existing requirement rows. This file is intentionally a **single live cursor**, not a second historical ledger.
