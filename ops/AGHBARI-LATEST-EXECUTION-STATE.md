# CURRENT EXECUTION POINTER — 2026-10-16

## Active workstream
- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`; PR [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72) OPEN; branch `fix/acceptance-hardening-cart-finance-20261015` → `main`.
- Completed tenant-scope source SHA `064f3e4d7e84e53c2b1a4aaf88553f709637bb37`, Actions [38832735509](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38832735509) SUCCESS; current HEAD was verified at this SHA before this documentation checkpoint. Evidence remains exact-SHA only.
- Latest source CI: exact SHA `064f3e4d7e84e53c2b1a4aaf88553f709637bb37`, Actions [38832735509](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38832735509) SUCCESS. Tenant guard migration and SQL regression passed on that exact SHA.
- Last previously verified baseline: exact source/workflow SHA `f71f3f70f0683685d7707b085e7ef63fa1ec89a5`, Actions [38829458881](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38829458881) PASS, including 21 test files, isolated PostgreSQL migration/workflow checks, RLS/policy/trigger/sequence/extension signatures, lint, production build, preview smoke 4173 and dev-server smoke 5173. Subsequent test-fixture and globals/ACL changes are evaluated only by current candidate CI above.

## Only next task
- `next_task_id = AGH-PRICE-PRIVACY-001` — source privacy controls and exact-SHA CI already exist; use the registry's evidence and only make a code change if a concrete untested leak or policy bypass is proven. Live browser/production gates remain separate.
- Completed source acceptance for `AGH-OPS-DR-001`: exact candidate SHA `3420307d1d54a46a4f2f48a8bfc68a5b50ba494b`, Actions [38832196621](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38832196621) **SUCCESS**. Unit tests 21/21 files and 249/249 tests; import streaming benchmark PASS; isolated PostgreSQL 17 migration/workflow suite PASS; backup/restore signatures PASS; lint, build, preview smoke 4173 and dev smoke 5173 PASS.
- XLSX ZIP regression now checks local member filename + general-purpose flags against central-directory metadata and rejects central-directory redirection to another member. Test helper has FileReader fallback for the CI test Blob.
- Benchmark on this exact SHA: 100,000 business rows + header, 76.28 MiB, 1,121.14 ms, 68.04 MiB/s, sampled heap delta +15,511,608 bytes / RSS delta +36,642,816 bytes over 1,221 samples. Synthetic single-run sample only; not production P95/peak.
- `AGH-OPS-DR-001` remains **PARTIAL** because production backup/restore, production failover, and live runtime proof are not available; do not close the umbrella requirement. Lovable/browser/prod access remains a separate gate.

## Evidence checkpoint
- Last tested source SHA `064f3e4d7e84e53c2b1a4aaf88553f709637bb37` / Actions `38832735509` SUCCESS. Next commit is a documentation checkpoint; no test evidence transfers to later code SHA.
- Previously verified importer profile SHA: `c241970e648f7292178e0a9a88bdf4938a69ef2f` / Actions 38828317225.
- Previously verified PWA source preview: `2ee243599c60054468f419c541f3d52ea7e2a111` / Actions 38825705008 and `cdfed3adb21ee881f85117e6f2f163a4c7cf0de2` / Actions 38825885494.
- Recheck exact HEAD every resume. Isolated CI, live browser acceptance, and production database proof remain separate claims.


## AGH-OPS-DR-001 source batch checkpoint
- Active branch/PR: `fix/acceptance-hardening-cart-finance-20261015` / PR #72; base HEAD `6ca3826ba5d6e3c469c5721a28e045d480eb53d9`.
- Files in the source batch: `src/lib/unified-import.ts`, `src/lib/unified-import.test.ts`, this state file, and the matching registry row.
- Existing boundary tests cover positive file sizes through 100 MiB, 100/101 columns, 4,000/4,001-character cells, declared archive expansion, and aggregate expansion budgets. Added a regression for a central-directory record redirected to a different local ZIP member; production parser now checks local flags and decoded local path before consuming member bytes.
- Local test command: `npx vitest run src/lib/unified-import.test.ts` — NOT RUN locally; no local checkout because shallow clone failed with `Could not resolve host: github.com`. Exact-SHA GitHub Actions 38832196621 on candidate `3420307d1d54a46a4f2f48a8bfc68a5b50ba494b` SUCCESS (21/21 files, 249/249 tests and all listed build/DB/runtime smoke gates).
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


## AGH-SEC-TENANT-001 source batch checkpoint
- Active branch/PR: `fix/acceptance-hardening-cart-finance-20261015` / PR #72. Batch parent: `a95e0d40d47590bb18e07a4c057c44900928b07e`; no branch switch or main update.
- Changed paths: `supabase/migrations/20261016140000_public_storefront_warehouse_scope_guard.sql`, `scripts/test-database-migrations.mjs`, this state file and `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`.
- Defect: the public warehouse getter and `get_public_storefront_context()` could return a configured warehouse ID without confirming its `organization_id` matched the published organization. Public inventory RLS uses the warehouse getter, so malformed configuration could mis-scope anonymous stock reads.
- Fix: a BEFORE INSERT/UPDATE trigger rejects cross-organization warehouse bindings; both public resolvers now return a warehouse only when it belongs to the configured organization and is active. The SQL regression tests reject the bad write and simulates legacy corruption in isolated CI to require a NULL warehouse and zero anonymous inventory rows.
- Local commands `node scripts/test-database-migrations.mjs` and `npx vitest run src/test/tenant-scope.test.ts`: NOT RUN locally because this runtime cannot resolve GitHub and has no checkout. Exact-SHA CI `38832735509` passed all migration/security assertions and 21 test files / 249 tests.
- Next task: `AGH-ORDERS-001`. Inspect order creation, server pricing, idempotency replay, state transitions and stock safeguards only for evidence-backed gaps. Do not claim production tenant isolation until intended production project access and authenticated browser E2E are available.


## AGH-ORDERS-001 source acceptance checkpoint
- Active workstream: PR #72, branch `fix/acceptance-hardening-cart-finance-20261015`; source-tested code SHA `064f3e4d7e84e53c2b1a4aaf88553f709637bb37`, Actions [38832735509](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38832735509) SUCCESS. Documentation-only branch HEAD before this checkpoint: `3ae048b80f5dd742a159308ca13575525630a1e5`; current docs checkpoint will get a new SHA and must not inherit code CI as an exact-SHA claim.
- Focused source reviewed: `supabase/migrations/20261009150000_atomic_staff_order_creation.sql`, `supabase/migrations/20261009040000_checkout_integrity.sql`, `supabase/migrations/20261009050000_order_transition_integrity.sql`, `supabase/migrations/20261015140000_checkout_delivery_address_snapshot.sql`, `src/lib/api.ts`, and order assertions in `scripts/test-database-migrations.mjs`.
- Code outcomes proven by exact-SHA CI: atomic staff/customer order commands, server-authoritative price calculation, normalized idempotency + conflicting-payload rejection, direct financial write denial, rollback of all writes after invalid later line, tenant scoping, frozen delivery-address snapshot and address-aware retries, single transactional `OrderCreated` outbox event, credit checks, inventory reservation/settlement/release and legal status transitions.
- Defect decision: no additional source defect was established by the focused review, so no speculative order code was changed. Existing umbrella remains **PARTIAL** because authenticated customer/staff browser E2E and intended-production database validation remain unproven.
- Local commands `node scripts/test-database-migrations.mjs` and `npx vitest run`: NOT RUN locally (this runtime has no checkout and GitHub DNS resolution fails). Evidence is exact-source GitHub Actions only, not local execution.
- Next task: `AGH-PRICE-PRIVACY-001`; reuse registry evidence and do not re-run passed broad tests unless a relevant code change or concrete defect requires it.
