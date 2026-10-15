# Aghbari Commerce — Development Progress Ledger

Rule: tests and evidence apply only to the exact SHA recorded with them. The push and Lovable sync are separate acceptance events. The master spec, mandate, registry, project memory and resume prompt are now persisted on main.

| Item | Current status | Evidence | Next closure |
|---|---|---|---|
| CI at `f75dcb7fd3f4a598b2acf6db6d649e0f54c92fac` | PASS | [Run 38687301037](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687301037) unit/PostgreSQL/lint/build/5173 smoke all successful | The later `main` SHA has a separate CI run; do not transfer this PASS |
| CI at `05fcacbf4ddb6bfd025ab4b1fee7c144a44d4459` | PASS | [Run 38687685412](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687685412) including expanded route and PWA asset smoke checks | Check CI for the newest main SHA; proof is SHA-specific |
| Persistent project requirements | PARTIALLY closed by this batch | Complete owner-uploaded master spec already exists at `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md`; new durable mandate and resume files are being added | Keep updated after each implementation batch |
| Supabase production | BLOCKED EXTERNALLY | Current connector cannot access expected project ref `ffxxjaolfntzbapmfbuv` | Owner/admin access and explicit project identity required; never substitute another project |
| Tenant security | **PARTIAL — isolated PostgreSQL 17 and source CI PASS; production NOT PROVEN** | PR #26 merged as `fe22af0424947b56ae80e0679621cf0df333e284`; exact-head CI [38689077672](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689077672) and main CI [38689238295](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689238295) pass. Browser tenant constants replaced by authenticated `get_current_tenant_context()` plus restrictive RLS and cross-tenant negative checks. | Verify intended Supabase project/migration, authenticated browser E2E, price-tier privacy and anonymous storefront tenant routing; never infer production proof from isolated CI. |
| Customer/staff E2E and pricing privacy | PARTIAL | Isolated transaction, price authority, idempotency and denial checks are present in CI acceptance script | Test through authenticated browser and target DB; test all three tiers and data channels |
| Import / Onyx | PARTIAL | Unified CSV/XLSX engine, DQS, manifests/snapshots and read-only reconciliation exist | Validate resume/cancel/rollback/100k rows and exact Onyx workbook in a permitted test system |
| Invoice PDF / Onyx workbook | NOT PROVEN | Finance UI/RPC foundations exist; exported template acceptance is not attached | Generate actual PDF/XLSX and validate template column order from section 21 of canonical spec |
| AI gateway / queues / WhatsApp | PARTIAL or externally blocked | Deterministic assistant/schema and internal notifications exist; provider/worker proof incomplete | Secret-safe provider validation, quotas, privacy gate, fallback, deployed workers, official WhatsApp receipt |
| Public Lovable preview | PARTIAL / sync unproven | Home/login/admin/order page accessible; selected deep URLs/assets returned 404 from external fetch; editor returned 403 | Verify with runtime browser and Lovable project SHA; distinguish deployment state from extractor limitation |
| Production restore/performance | NOT PROVEN | No target-environment restore drill or P95/100k-row profile evidence | Run isolated/authorized tests and record method/results |

## Execution protocol
Read `PROJECT_MEMORY.md`, `ops/AGHBARI-SESSION-RESUME.md`, latest state and requirement registry first. Continue from the current GitHub `main` SHA. No broad repeated discovery, no placeholder success, no unverified production operation, no Lovable point spend before a tested push.


## 2026-10-15 — Approved-order XLSX export
- **PASS — source/code generation:** commit `6112b24c2807fbb013b9fcd2d38c889631286a7c`, [CI run 38688167670](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38688167670). Unit tests verify exact 27 section-21 headers, line mapping, leading-zero SKU strings, XLSX ZIP/OOXML package structures, customer header worksheet, and file-name sanitization. The same run passes isolated PostgreSQL acceptance, lint, build, route and PWA asset smoke.
- **PARTIAL:** file generation is real; actual opening in Excel/LibreOffice and import acceptance into the owner’s Onyx version are not tested. No central server-side export audit event exists yet. Unknown accounting values are blank, never synthesized.
- **UI safety:** the export button is disabled until the order is approved/confirmed and no quantity review is pending.
- **Release/sync:** external fetch still returns 404 for several published deep routes and the PWA manifest; Lovable editor fetch returns 403. Git push and green CI do not prove Lovable deployed this SHA.

## 2026-10-15 — Server-derived tenant scope hardening

- **MERGED:** PR #26, https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/26
- Main merge SHA: `fe22af0424947b56ae80e0679621cf0df333e284`.
- Exact PR head tested: `c117b0eee5b19411c1fa3bf5162dbef1e939455f`; [CI 38689077672](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689077672) **PASS**. Main merge SHA [CI 38689238295](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689238295) **PASS**.
- Affected files: `src/lib/supabase.ts`, `src/lib/api.ts`, `src/components/CustomerWorkflows.tsx`, `src/components/AdminPages.tsx`, `supabase/migrations/20261015090000_server_derived_tenant_context.sql`, `scripts/test-database-migrations.mjs`.
- CI passed: unit tests; all migrations and cross-tenant workflows on isolated PostgreSQL 17; lint; production build; dev-server smoke on port 5173 covering client/admin routes and PWA files.
- The first PR run failed at build for unresolved `ORG_ID` imports in `CustomerWorkflows.tsx` and `AdminPages.tsx`. Both consumers now resolve the organization from the authenticated tenant-context RPC; subsequent exact-head and merged-main runs passed.
- **Not closed:** source migration has not been applied to production; configured Supabase ref `ffxxjaolfntzbapmfbuv` is inaccessible. Authenticated browser E2E, full price-tier privacy, and anonymous storefront/domain tenant routing remain open. Lovable sync remains unproven.

## 2026-10-15 — Permanent session-resume protocol

- **Persistent instruction entrypoints:** root `AGENTS.md` and `.github/copilot-instructions.md` are present on remote `main`; Copilot's repo-wide instruction file points to the shared canonical rules. Lovable's own auto-loading and actual sync remain unverified.
- **Protocol implementation SHA:** `90602f6deeba79a5d80efad38d83efec64be5173`; exact-head [GitHub Actions run 38692264543](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38692264543) **SUCCESS**: unit tests, isolated PostgreSQL 17 acceptance, lint, build and port 5173 smoke.
- **Resume checkpoint follow-up SHA:** `755b0ac12668403530f6180a76468b8182a32b10`; exact-head [run 38692476144](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38692476144) **SUCCESS**. The registry marks `AGH-OPS-RESUME-001` `DONE_VERIFIED` for repository persistence/CI only.
- Canonical state/resume/registry/mandate and memory are updated; the owner-supplied `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md` remains unchanged. No duplicate log was created and no Lovable points were used.
- Production Supabase project `ffxxjaolfntzbapmfbuv` remains an external access blocker. Keep production migration and real-browser proof open.
- **next_task_id:** `AGH-SEC-BROWSER-E2E-001`.
## 2026-10-15 — Free Lovable persistent-instruction fallback verified

- Lovable official docs explicitly state that root-level `AGENTS.md` is always read by its agent regardless of session length: https://docs.lovable.dev/features/knowledge. The existing root `AGENTS.md` therefore gives Aghbari a free, repository-backed persistent session-resume mechanism; this avoids spending Lovable points or browser wallet credits just to persist the rule.
- Latest remote baseline when this clarification was prepared: `8729fdd39158ab562d5833d4dbdcf76856d83d47`, exact-head CI [38692662830](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38692662830) **SUCCESS**. This CI result applies only to that baseline; verify the clarification commit's own run separately.
- **Not claimed:** direct Project settings → Knowledge edit, or confirmation that a subsequent SHA is active in the live Lovable editor. The metered browser run did not start because its wallet balance was insufficient. No Lovable points or browser wallet funds were spent in this fallback.
- `AGH-OPS-RESUME-001` remains `DONE_VERIFIED` for committed repository policy/CI; editor sync stays a separate evidence gate. `next_task_id = AGH-SEC-BROWSER-E2E-001`.
## 2026-10-15 — AGH-SEC-BROWSER-E2E-001 source-level subgate

- Changed path: `src/test/public-catalog-privacy.test.ts` (new). Tests target the real data-access module `fetchProducts()` and assert anonymous least-privilege product/inventory column projections, resolved tenant/warehouse filters, fail-closed behavior on missing public scope, and staff query scoping.
- Baseline verified before implementation: `85dab55ec8e9ca903fe54b5f9845abe409037fad`; exact CI [38693335507](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38693335507) **SUCCESS**.
- First test SHA `e26e71e4ec05ef90e42da922bdf513cff43c22ed`; Actions [38693899113](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38693899113): `npm test` and `npm run test:db` **PASS**; Lint **FAIL** on one `prefer-const` issue in the new test; build and dev-server smoke were skipped. The follow-up uses `const` and is awaiting its own exact-SHA CI; source gate remains pending until that run passes.
- Honest boundary: these tests are query-contract unit tests, not real browser E2E; they do not certify production Supabase, authenticated browser sessions, or complete price-tier privacy over all transports. Production project ref `ffxxjaolfntzbapmfbuv` remains unverified/inaccessible. `next_task_id = AGH-SEC-BROWSER-E2E-001` remains OPEN.
## 2026-10-15 — Tenant-scope resolver coverage

- Confirmed follow-up SHA `127fb2b001c1ae4414cd8ee8baf9864cdd8fac12` exact-head [CI 38694129297](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38694129297) **SUCCESS** across unit tests, isolated PostgreSQL 17 migration/workflow tests, lint, build and port 5173 smoke. The prior `prefer-const` lint failure is resolved.
- New path: `src/test/tenant-scope.test.ts`. It exercises actual `src/lib/supabase.ts` tenant resolver behavior: authenticated mapping and request cache, missing session rejection, malformed scope rejection, RPC retry after failure, anonymous public binding and fail-closed error, signed-in scope selection, and cache invalidation on auth-state events.
- This batch is being pushed against the new `main` head; record it PASS only after CI on its exact SHA succeeds. These tests do not replace authenticated browser E2E or production Supabase evidence. `next_task_id = AGH-SEC-BROWSER-E2E-001` remains OPEN.
## 2026-10-15 — Tenant-scope resolver coverage verified

- Commit `fe4440cd8a34c61facc06425abce7916dbd52fb1`; exact-head CI [38694500854](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38694500854) **SUCCESS**. Unit tests (including `src/test/tenant-scope.test.ts`), isolated PostgreSQL 17 migration/workflow acceptance, lint, build, and port-5173 smoke passed.
- The new test file verifies the actual scope resolver's cache and mapping, no-session rejection, malformed scope rejection, retry behavior, anonymous public scope resolution/fail-closed behavior, signed-in scope selection, and auth-event invalidation. It does not substitute for browser E2E or production DB validation.
- **External blocker rechecked:** connected Supabase integration cannot access intended ref `ffxxjaolfntzbapmfbuv` (permission denied). It can read an ACTIVE_HEALTHY project named `aghbari-commerce`, ref `mrcyqezbhpncuvaehwgf`; its migration list contains 133 rows, newest `20260925040254`, while repository migrations are newer. Do not target that different ref based on name. No production changes made.
- `next_task_id = AGH-SEC-BROWSER-E2E-001` remains OPEN; `AGH-EXT-SUPABASE-001` remains blocked pending intended project identity/access.
## 2026-10-15 — Customer quote workflow auth/tenant component acceptance

- Verified exact-head CI on `fe4440cd8a34c61facc06425abce7916dbd52fb1` [run 38694500854](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38694500854) **SUCCESS** and docs/checkpoint SHA `d5b404235f0b97347b4140281dbb44850e05d341` [run 38694768595](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38694768595) **SUCCESS**.
- New test path: `src/test/customer-workflow-tenant.test.tsx`, covering unauthenticated access, signed-in customer tenant filtering and fail-closed scope errors. SHA `d02e3f5408e67729a619616fcb56c03bca702b17` failed two tests because the component was mounted without router context (95 passed); SHA `94f2d8a02628443522dfe7fcad1b398bdb62d5e0` mounted the real route tree but failed 3 tests because `@/lib/auth` mock omitted root `AuthProvider` (94 passed). Follow-up adds the pass-through wrapper used by existing project tests and awaits exact-SHA CI.
- This is jsdom component/route coverage, not live authenticated browser E2E or production Supabase proof. `next_task_id = AGH-SEC-BROWSER-E2E-001` stays OPEN.
## 2026-10-15 — Customer quote route acceptance verified

- **SHA:** `6a4b68acc8a9295f508d4301cce754cf826e7f3d`; exact-head [GitHub Actions run 38695532757](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38695532757) **SUCCESS** across unit tests, isolated PostgreSQL 17 acceptance, lint, build and port-5173 dev-server smoke.
- `src/test/customer-workflow-tenant.test.tsx` passes with the real `/quotes` route tree, `RouterProvider`, memory history, and a pass-through mock for the root `AuthProvider`. Proves login gate/no catalog reads for unauthenticated state, server-scoped catalog reads for an authenticated customer, and no DB reads when tenant scope resolution fails. Two earlier test-harness iterations failed and were fixed; this latest exact SHA is the verified one.
- Evidence scope remains mocked jsdom route/component testing, not live authenticated browser E2E or production DB proof. `next_task_id = AGH-SEC-BROWSER-E2E-001` remains OPEN; production Supabase `ffxxjaolfntzbapmfbuv` remains externally inaccessible through the connected integration.
## 2026-10-15 — Authenticated tier-price non-enumeration check

- Added a CI assertion in `scripts/test-database-migrations.mjs` under authenticated customer identity: direct `SELECT tier,price FROM public.product_prices WHERE product_id=...` must be privilege-denied or return no visible tier rows; returning any tier rows fails the acceptance test. Existing cart validation already asserts customer cart responses omit unit prices and totals.
- Exact-SHA CI for the new assertion is pending. If it fails, inspect active `product_prices` grants/RLS and fix with a new migration + regression test; do not conceal the failed result. `AGH-PRICE-PRIVACY-001` remains PARTIAL and `AGH-SEC-BROWSER-E2E-001` OPEN.
## 2026-10-15 — Authenticated tier-price disclosure found; additive fix pending

- CI [38695976338](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38695976338) on SHA `700fef00cd26bc022b2f8837236530195951db19` failed isolated PostgreSQL acceptance because an authenticated customer could directly read tier rows from `public.product_prices`.
- Root cause located in the public-storefront boundary: direct SELECT was revoked from `PUBLIC, anon` but not `authenticated`. Row-level organization scope is not sufficient to keep tier prices staff/private.
- Added new migration `supabase/migrations/20261015120000_customer_tier_price_read_boundary.sql`: revoke direct SELECT from `PUBLIC, anon, authenticated`, and abort migration if table-level or column-level `SELECT` is still effective for `authenticated`. The existing `scripts/test-database-migrations.mjs` assertion is retained as regression coverage.
- Fix commit and exact-SHA CI are pending; no production database mutation. Keep `AGH-PRICE-PRIVACY-001` PARTIAL and `next_task_id = AGH-SEC-BROWSER-E2E-001` OPEN until the new run passes.
## 2026-10-15 — Direct customer tier-table disclosure fixed in CI

- Root cause confirmed by failing isolated Postgres test: `product_prices` SELECT was revoked from `PUBLIC, anon` but not `authenticated`, leaving direct row enumeration possible despite organization-scoped RLS.
- New migration `supabase/migrations/20261015120000_customer_tier_price_read_boundary.sql` revokes direct SELECT from all client roles and validates no table-level or column-level SELECT remains for `authenticated`; `scripts/test-database-migrations.mjs` checks direct customer reads return no price rows or are denied.
- Exact fix SHA `8f1a7ec7b6f85a280da66e183bfd130996902edb`; Actions [run 38696292337](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38696292337) **SUCCESS** for unit tests, isolated PostgreSQL 17 migration/workflow acceptance, lint, build and port-5173 smoke.
- Scope: no production database mutation. This closes the direct-table read flaw in CI and keeps the price-tier item PARTIAL pending all-channel and authenticated real-browser evidence. `next_task_id = AGH-SEC-BROWSER-E2E-001` remains OPEN.
