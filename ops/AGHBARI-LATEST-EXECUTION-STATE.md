# CURRENT EXECUTION POINTER — 2026-10-16

## Active workstream
- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`; PR [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72) OPEN; branch `fix/acceptance-hardening-cart-finance-20261015` → `main`.
- Completed latest tested source SHA `96b064c9a772f2267e73e2ad41c0381593be4e05`, Actions [38834690553](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38834690553) SUCCESS. XLSX export-to-production-reader round-trip regression passes on this exact SHA; current branch HEAD was verified at this SHA before this checkpoint.
- Latest source CI: exact SHA `96b064c9a772f2267e73e2ad41c0381593be4e05`, Actions [38834690553](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38834690553) SUCCESS: 21/21 unit-test files, 250/250 tests, PostgreSQL 17 migrations/workflows, logical backup/restore, lint/build, preview smoke 4173 and dev smoke 5173. Import streaming benchmark skipped because this was only an XLSX test/docs change.
- Last previously verified baseline: exact source/workflow SHA `f71f3f70f0683685d7707b085e7ef63fa1ec89a5`, Actions [38829458881](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38829458881) PASS, including 21 test files, isolated PostgreSQL migration/workflow checks, RLS/policy/trigger/sequence/extension signatures, lint, production build, preview smoke 4173 and dev-server smoke 5173. Subsequent test-fixture and globals/ACL changes are evaluated only by current candidate CI above.

## Only next task
- `next_task_id = AGH-ONYX-INTEGRATION-001` — inspect only existing Onyx contracts, adapters, and import/export call sites. Do not invent API contracts or credentials; if no vendor contract exists, mark integration blocked and continue to `AGH-ONYX-XLSX-001`. `AGH-SEC-BROWSER-E2E-001` remains blocked pending authorized intended Lovable project/session and published SHA.
- Completed source acceptance for `AGH-OPS-DR-001`: exact candidate SHA `3420307d1d54a46a4f2f48a8bfc68a5b50ba494b`, Actions [38832196621](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38832196621) **SUCCESS**. Unit tests 21/21 files and 249/249 tests; import streaming benchmark PASS; isolated PostgreSQL 17 migration/workflow suite PASS; backup/restore signatures PASS; lint, build, preview smoke 4173 and dev smoke 5173 PASS.
- XLSX ZIP regression now checks local member filename + general-purpose flags against central-directory metadata and rejects central-directory redirection to another member. Test helper has FileReader fallback for the CI test Blob.
- Benchmark on this exact SHA: 100,000 business rows + header, 76.28 MiB, 1,121.14 ms, 68.04 MiB/s, sampled heap delta +15,511,608 bytes / RSS delta +36,642,816 bytes over 1,221 samples. Synthetic single-run sample only; not production P95/peak.
- `AGH-OPS-DR-001` remains **PARTIAL** because production backup/restore, production failover, and live runtime proof are not available; do not close the umbrella requirement. Lovable/browser/prod access remains a separate gate.

## Evidence checkpoint
- Last tested source SHA `96b064c9a772f2267e73e2ad41c0381593be4e05` / Actions `38834690553` SUCCESS. This metadata checkpoint is based on the latest XLSX round-trip candidate and does not transfer proof to later source SHA.
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


## AGH-PRICE-PRIVACY-001 source acceptance checkpoint
- Active branch/PR: `fix/acceptance-hardening-cart-finance-20261015` / PR #72. Source acceptance revalidated by full exact-SHA CI `064f3e4d7e84e53c2b1a4aaf88553f709637bb37`, Actions [38832735509](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38832735509) SUCCESS; this commit is a docs checkpoint at parent `095b9490f203c0acca378ff6be45caa5e436bce5` and does not inherit exact-SHA test status.
- Focused review: `supabase/migrations/20261015260000_customer_cart_order_money_visibility.sql`, `20261015210000_product_price_column_boundary.sql`, `20261015180000_storefront_customer_tier_prices.sql`, `20261015220000_accountant_storefront_price_tier_boundary.sql`, `src/lib/customer-money-policy.ts`, its tests, and corresponding PostgreSQL assertions.
- Proven behavior: cart/order money display is opt-in per surface and defaults hidden; only admin/manager can change policy; checkout uses the server-side tier+quantity resolver; order financials are scoped to the active customer's own tenant/order and return NULL amounts when hidden; raw product/tier finance columns are not granted directly to anon/customer roles; accountant is excluded from the operational base-price branch. Unit and isolated PostgreSQL tests are included in exact SHA `064f3e4d...` CI.
- No additional source leak or policy bypass was established by this focused review; no speculative source change made. Requirement remains PARTIAL until authenticated browser testing and intended-production behavior are proven, including separate invoice-amount policy.
- Local commands for this task: NOT RUN locally (no checkout; GitHub hostname resolution blocked). Next: `AGH-CUSTOMER-360-001`.


## AGH-CUSTOMER-360-001 source/test hardening batch
- Active branch/PR: `fix/acceptance-hardening-cart-finance-20261015` / PR #72; parent source/doc SHA `b5bd4233078fe481d54afe3003fe604f652067cb`. No branch switch or main update.
- Changed paths: `scripts/test-database-migrations.mjs`, this state file, and `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`.
- Added focused isolated-PostgreSQL assertions for capability alignment: invited buyer can create an address/contact under the invited company; finance member cannot mutate either surface despite read-only contact capability; after revocation the former buyer cannot read the member-created address/contact. Existing assertions continue to validate tenant scoping, order creation, one-time invitation acceptance, and revocation.
- Test execution: `node scripts/test-database-migrations.mjs` NOT RUN locally because the container has no repo checkout and `git clone` failed with `Could not resolve host: github.com`. Exact-SHA Actions [38833494937](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38833494937) on `c0365bafe6f8cf98692f2fbde44c8494b3b618a9` **SUCCESS**. Unit tests 21/21 files, 249/249 tests; isolated PostgreSQL 17 migration/workflow suite, logical backup/restore, lint, build, preview 4173 and dev smoke 5173 all passed.
- `AGH-CUSTOMER-360-001` source/test acceptance is PASS for code SHA `c0365bafe6f8cf98692f2fbde44c8494b3b618a9`; remaining browser/prod proof is externally gated. Next source task is `AGH-FINANCE-DOCS-001`.


## AGH-FINANCE-DOCS-001 source fix batch
- Active branch/PR: `fix/acceptance-hardening-cart-finance-20261015` / PR #72. Parent SHA `ddf6939adf9c3a91bd501ad107cff0982a4f1bde`; no branch switch or main update.
- Changed paths: `supabase/migrations/20261015250000_customer_statement_full_ledger_summary.sql`, `scripts/test-database-migrations.mjs`, this state file and the requirement registry. First candidate `0fccfa2ee1d5d0bed4015f237afcf8e6ff09b8f8`, Actions [38833767047](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38833767047), **FAILED** in DB test harness: `financeAuthUserId` was used before its later declaration (JavaScript temporal-dead-zone). Unit tests were green; migration test stopped before evaluating this new member assertion. The finance-success regression is now moved after fixture declaration and invitation acceptance.
- Root defect: the full-ledger summary migration replaced the membership-aware `get_customer_account_statement()` from `20261015160000_customer_company_memberships.sql` and reverted scope to `customers.profile_id = current_profile_id()`, dropping `current_customer_can('statement.read')`. This broke statement access for invited finance members even though the capability matrix grants it, and did not consistently deny a buyer by explicit capability.
- Fix: resolve `current_customer_id()` + `current_organization_id()`, require active profile/org context and `current_customer_can('statement.read')`, verify the customer/organization pair before running the complete-ledger aggregates. Preserve all existing summary counts, per-currency amounts, bounded detail arrays and payment sums.
- Regression coverage: buyer member is explicitly denied statement access; finance member gets the linked company statement and full-ledger totals for an existing invoice. Local `node scripts/test-database-migrations.mjs` NOT RUN (no local checkout; GitHub DNS blocked). New exact-SHA CI is PENDING for this candidate.
- Next: run exact-SHA CI, repair failures before advancing cursor. Intended-production migration/readback and authenticated published PDF/browser evidence remain external gates.


## AGH-FINANCE-DOCS-001 acceptance checkpoint
- Source fix PASS on exact SHA `3b26bd09ebfce6245f7f2f5f7d6521faaf4e7795`, Actions [38834000106](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38834000106) SUCCESS. Unit tests: 21/21 files, 249/249 tests. PostgreSQL 17 migration/workflow suite passed, including finance-member statement access and buyer-member denial. Logical backup/restore, lint, build, preview smoke 4173 and dev smoke 5173 also passed.
- The first candidate `0fccfa2ee1d5d0bed4015f237afcf8e6ff09b8f8` failed only in JS test-fixture ordering because `financeAuthUserId` was referenced before its declaration. The assertion was moved after finance invitation acceptance and rerun successfully.
- Next source task: `AGH-ONYX-INTEGRATION-001`. Published browser routes remain blocked pending access to the intended project and authorized signed-in browser; do not spend Lovable credits on exploratory messages.


## AGH-ONYX-INTEGRATION-001 source review checkpoint
- Active branch/PR: `fix/acceptance-hardening-cart-finance-20261015` / PR #72. Last tested source SHA `3b26bd09ebfce6245f7f2f5f7d6521faaf4e7795`, Actions [38834000106](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38834000106) SUCCESS. Current pre-checkpoint HEAD `e6b2642db386a5b4ac241f7f7e5b66ed54e649ea`; this checkpoint is documentation-only.
- Inspected `ops/AGHBARI-LIVE-SCHEMA-RECONCILIATION-20261015.md`, `src/lib/onyx-export.ts`, `src/test/onyx-export.test.ts`, `src/components/UnifiedImportEngine.tsx`, `supabase/migrations/20261009090000_onyx_deterministic_analytics.sql`, `20261015170000_onyx_order_export_audit.sql`, and `20261015235900_onyx_null_unknown_metric_semantics.sql`.
- Source evidence: current flow is imported snapshots + deterministic PostgreSQL analytics + comparison-only reconciliation + client-built 27-column XLSX export/audit. Export audit explicitly records `compatibility_verified=false` and `download_completion_verified=false`. No verified external Onyx endpoint/credential adapter or target-version import contract was found in repository references.
- Live reconciliation checkpoint says intended Supabase ref `ffxxjaolfntzbapmfbuv` is absent from the connected project list; similarly named `mrcyqezbhpncuvaehwgf` has materially different schema. Do not redirect migrations/functions or invent API/field contracts. No source change is justified without the vendor contract and intended target access.
- Task disposition: PARTIAL / BLOCKED EXTERNALLY. Continue to `AGH-ONYX-XLSX-001` for source-testable package hardening; production/browser acceptance remains a separate gate.


## AGH-ONYX-XLSX-001 source-test batch
- Active branch/PR: `fix/acceptance-hardening-cart-finance-20261015` / PR #72; parent `bdd80d2c5ad7802e8a2218cf11afc6041853e243`.
- Last full exact-SHA CI: `3b26bd09ebfce6245f7f2f5f7d6521faaf4e7795`, Actions [38834000106](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38834000106) SUCCESS. This new test SHA must pass its own CI.
- Existing `src/test/onyx-export.test.ts` checked 27 columns and package-token presence, but did not prove the generated workbook was readable by the production XLSX parser. Added a round-trip regression using `parseXlsxFirstWorksheet`; it verifies worksheet name, row count, exact headers, leading-zero item codes, approved quantity/price and order number.
- Local `npx vitest run src/test/onyx-export.test.ts` NOT RUN because this runtime has no checkout and GitHub DNS resolution is blocked. Exact-SHA CI is pending. This proves internal parser interoperability only, not compatibility with the owner's Onyx version or browser-download completion.
- Keep `AGH-ONYX-XLSX-001` active until exact-SHA CI passes or failures are corrected.

## AGH-ONYX-XLSX-001 regression correction
- First round-trip candidate `fd4bf79ae76ecd004a1a0c0748d3b9788455e32f`, Actions [38834535619](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38834535619), FAILED one unit assertion: production XLSX parser returned 23 cells for the detail row because trailing blank cells are omitted in sparse OOXML. The package's header still defines 27 columns and the row's final non-empty order number is at index 22; no exporter corruption was proven.
- Corrected the round-trip test to pad sparse cells to the declared 27-column header and assert all meaningful indices + the four trailing blanks. This verifies interoperability without requiring the generic import parser to materialize absent blank cells. New exact-SHA CI is pending.
- Source task remains `AGH-ONYX-XLSX-001`; external Onyx import acceptance and browser download completion remain unproven.

## AGH-ONYX-XLSX-001 acceptance checkpoint
- Source test commit: `96b064c9a772f2267e73e2ad41c0381593be4e05`, exact GitHub Actions [38834690553](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38834690553) SUCCESS.
- CI proves 21/21 test files and 250/250 tests. PostgreSQL 17 migrations/workflows, logical backup/restore drill, lint, build, preview smoke 4173 and dev smoke 5173 passed. Import streaming benchmark correctly skipped because this commit changed no import-processing file.
- Round-trip builds the 27-column XLSX and reads it through production `parseXlsxFirstWorksheet`, validating sheet, row count, exact header, sparse detail normalization, SKU `000125`, quantity `3`, price `12.5`, order number `ORD-000125`, and four trailing blanks.
- The initial candidate `fd4bf79ae76ecd004a1a0c0748d3b9788455e32f` failed only because its test assumed trailing blank cells were serialized explicitly. Normalizing sparse OOXML rows resolved it. No exporter code change required. Actual browser download and compatibility with target Onyx version remain unproven.
- Next source task: `AGH-ASYNC-OUTBOX-001`.
