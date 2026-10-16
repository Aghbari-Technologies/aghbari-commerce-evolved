# CURRENT EXECUTION POINTER — 2026-10-16

## LATEST EXECUTION POINTER — 2026-10-16 (storefront exit role split — default corrected)

- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`; PR #72 OPEN; branch `fix/acceptance-hardening-cart-finance-20261015` → `main`. Parent checkpoint: `1173e93544f1f10021575b69d3561d3005e72686`; no merge or direct main write.
- Correction: the first shared-exit implementation retained a default value for `onExitLabel`, which made the override test truthy even for guests. This batch removes that destructuring default. The actual decision is `onExitLabel` when explicitly supplied; otherwise staff gets `لوحة التحكم` and its callback, while guests/customers get `العودة إلى المتجر` and navigate to `/`. Checkout's explicit label still routes to `/cart`.
- Tests cover five guest/customer direct paths (`/catalog`, `/cart`, `/product/product-3`, `/wishlist`, `/compare`), a staff dashboard-preservation case, and both explicit checkout-to-cart cases. Mock auth type now includes `isStaff`.
- Changed files: `src/components/Storefront.tsx`, `src/test/storefront-discovery.test.tsx`, and the existing execution pointer, requirement registry, and screen/action coverage.
- Verification remains **NOT RUN / NOT PROVEN**: no local repo checkout is available. No exact-head Actions run has appeared for the prior source checkpoints; the current result must be checked after this checkpoint. Never transfer historical CI to this SHA. No Lovable sync/publish, authenticated live-browser E2E or production DB write was performed.
- Other open gaps: 109-path route matrix reconciliation and remaining PARTIAL screen/action contracts; checkout/order read-after-write and authenticated browser E2E; production invoice/statement/PWA route response readback; intended Supabase ref `ffxxjaolfntzbapmfbuv` authorization and migration/RLS proof (last permission-denied; never substitute `mrcyqezbhpncuvaehwgf`); exact Lovable project/synced/published SHA; missing server contracts for profile/company/approval/payment mutation and unconfigured AI/invitation/restore/Onyx/notification integrations.
- Resume cursor: `AGH-STOREFRONT-ROUTE-ACCEPTANCE-002`. Next: prove the latest SHA with CI when a triggering push/sync is available; fix any failure; continue source-feasible customer screen/action gaps without simulating unavailable integrations.

---
## LATEST EXECUTION POINTER — 2026-10-16 (checkout and order-history acceptance expanded)

- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`; PR #72 OPEN; active branch `fix/acceptance-hardening-cart-finance-20261015` → `main`. Parent HEAD before this state checkpoint: `805f28f685c391bebe8420a0110716a6eafd583d`. Source acceptance commits: `d06db0c0cb42598dc1323161e1e4a9874760d029`, `d5f47c0cc971d07253b2334ae75b247d4d1a6118`, `5fdf177b5d6486920ca6169d4a6b69dcd94dbdcc`, and `e583de2dd84b41563d12b87f630e4b7502f5350a`; requirement and coverage entries were refreshed on `aa0e46c47bb7b36ff2c789c9176b5fc314307716` and `805f28f685c391bebe8420a0110716a6eafd583d`.
- Implemented in source/tests: checkout submission errors use `role="alert"` and assertive live announcement; new checkout rejection test asserts no fake success, saved cart remains intact, and retry uses the same idempotency key; route-ID coverage includes cart, checkout, review, confirmation, orders index and order details; direct order-detail navigation without login must not issue database/RPC reads; authenticated order history is restricted to a safe summary field projection without monetary amounts.
- **Exact-head verification is NOT_PROVEN:** GitHub status and Actions queries for the latest source/coverage commit `805f28f685c391bebe8420a0110716a6eafd583d` returned no status checks and zero workflow runs. The historical PASS on `812ca4e816c2becbf061a1a9554a2adc83f35eee` does not certify newer code. No local repository checkout is available; local unit/lint/build/database/browser checks were not run. Re-check the exact resulting state-commit SHA too; do not declare PASS without an actual run.
- No production database migration/mutation, deployment, or Lovable publish was performed. Lovable synchronization, intended Supabase project `ffxxjaolfntzbapmfbuv`, and authenticated browser E2E remain open.
- Active cursor remains `AGH-STOREFRONT-ROUTE-ACCEPTANCE-002`. Next: establish an authorized CI run for the exact active branch HEAD and fix any test/build/lint/database failure it reports; then continue read-after-write, order state, and order-detail authorization acceptance. Route presence and test source alone are not completion evidence.

---

## LATEST EXECUTION POINTER — 2026-10-16 (checkout failure/retry acceptance)

- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`; PR #72 OPEN; active branch `fix/acceptance-hardening-cart-finance-20261015` → `main`. Source acceptance commit `d06db0c0cb42598dc1323161e1e4a9874760d029`; follow-up test commits `d5f47c0cc971d07253b2334ae75b247d4d1a6118` and `5fdf177b5d6486920ca6169d4a6b69dcd94dbdcc`. Coverage/requirement records were then updated on `2d77f5c1c84e02379dd35fcfd5ae5e4259b1250f` and `04935345deae12aeb2e073d9693fc9522665e42c`; this state-pointer write is the next documentation-only checkpoint.
- Implemented: checkout RPC errors now render as `role="alert"` with assertive live announcement; added a regression for rejected submit → visible error/no success/cart preserved → retry using the same idempotency key; route registration assertions now cover `/cart`, `/checkout`, `/checkout/review`, `/checkout/confirm`, `/orders`, and `/orders/:id`. The order-index assertion uses generated route ID `/orders/`; the test clears both local and session storage between cases.
- **Verification is NOT_PROVEN:** exact-head status and Actions queries for `d06db0c0cb42598dc1323161e1e4a9874760d029` and `04935345deae12aeb2e073d9693fc9522665e42c` returned no statuses and zero workflow runs. Historical successful CI on `812ca4e816c2becbf061a1a9554a2adc83f35eee` does not certify the newer code. No local checkout is available here, so local `npm test`, lint, build, PostgreSQL and browser checks were not run. Do not mark tests PASS until an Actions run exists for the exact current branch HEAD.
- No production database migration/mutation, deployment, or Lovable publish was performed. Lovable synchronization, intended Supabase project `ffxxjaolfntzbapmfbuv`, and authenticated browser E2E remain external open gates.
- Active cursor remains `AGH-STOREFRONT-ROUTE-ACCEPTANCE-002`. Next: establish exact-head CI on the branch, repair any failures, then add source-backed order-list/detail authorization and read-after-write acceptance. Do not confuse route registration or test source presence with end-to-end completion.

---

## LATEST EXECUTION POINTER — 2026-10-16 (storefront routes and saved-list privacy verified)

- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`; PR #72 OPEN; branch `fix/acceptance-hardening-cart-finance-20261015` → `main`. Parent HEAD before this docs update: `812ca4e816c2becbf061a1a9554a2adc83f35eee`.
- Completed cursor: `AGH-STOREFRONT-DISCOVERY-PRIVACY-001`.
- Exact-head source CI [38854760631](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38854760631) on `812ca4e816c2becbf061a1a9554a2adc83f35eee` PASS: build, official generated route tree, unit tests, PostgreSQL 17 migrations/workflows, isolated logical backup/restore, lint, preview smoke 4173 and dev smoke 5173.
- Verified work includes: 22 direct admin route modules with route-ID assertions; official TanStack tree sync; server-ranked `/popular`; database-backed/admin-editable `/featured`; `/product/:id` detail and unknown-ID tests; `/wishlist` and `/compare` profile/origin-scoped storage with a two-profile isolation regression.
- Source-inventory convention remains 77/109; route presence does not mean every business action or live integration is complete. Some administration functions remain explicitly `BLOCKED / NOT CONFIGURED` when verified backend contracts do not exist.
- External gates remain unproven: sync/publish to Lovable, target Supabase project `ffxxjaolfntzbapmfbuv`, and authenticated live-browser E2E. No production migration, mutation, deployment or Lovable publish was performed. Legacy v1 saved lists are not imported automatically into profile-scoped v2 keys, to avoid cross-profile disclosure.
- Next cursor: `AGH-STOREFRONT-ROUTE-ACCEPTANCE-002` — continue source-backed customer journey testing around cart/checkout/order history and explicit authorization/error states; preserve server-authoritative prices, atomic order creation, and tenant isolation. Do not simulate success when backend contracts are absent.
- This documentation-only commit needs its own exact-head CI before its HEAD can be marked PASS.

---

## LATEST EXECUTION POINTER — 2026-10-16 (official route-tree sync)

- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`; PR #72 OPEN; branch `fix/acceptance-hardening-cart-finance-20261015` → `main`. Parent HEAD before this sync commit: `3b748d041cf47def279b033850e87e39fd397168`.
- Added the remaining 22 admin screen modules and exact-route-ID assertions in the preceding source commit `3b748d041cf47def279b033850e87e39fd397168`.
- Exact-head CI run [38852692602](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38852692602) on that preceding SHA: dependency/lockfile verification PASS; **build PASS**; route-tree drift guard FAIL because the generated output was not yet committed; unit tests, migration/restore, lint and smoke tests were skipped by the guard failure. Do not treat this as a full CI pass.
- Updated `src/routeTree.gen.ts` using the exact file diff emitted by the official TanStack build generator in that run. Blob prefix is expected to match generated index `241f0f8`; the next exact-head run must prove the drift guard.
- Updated screen-action matrix and requirement registry to record the source-backed screens and explicit unavailable contracts. No production database writes, deployment, or Lovable publishing.
- Next task: `AGH-ADMIN-ROUTE-ACCEPTANCE-001` — verify the generated-tree guard and run unit tests, PostgreSQL 17 migrations/workflows, lint, build, and both smoke checks on the synchronized current head. Fix any source failure before advancing.
- Local commands remain NOT RUN because there is no local checkout. Live authenticated browser, intended Supabase, and Lovable publish gates remain separately blocked.

---


## LATEST EXECUTION POINTER — 2026-10-16 (administration route slice)

- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`; PR [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72) remains OPEN; target branch: `fix/acceptance-hardening-cart-finance-20261015` → `main`.
- Parent HEAD verified immediately before the source write: `23040bcdd461ef915aab490c282e92c5aafa79bf`. No new branch and no main-branch writes.
- Source scope: add 22 route modules for remaining administration destinations; reuse existing tenant-aware screen components and explicitly disclose unavailable backend contracts; add exact route-ID regression cases and update the screen-action matrix/requirement registry.
- Changed screen behavior: `src/components/AdminOperationalScreens.tsx` identifies the unsupported AI-settings contract explicitly. No production Supabase write or Lovable publish occurred.
- Verification: official TanStack generation and exact-head CI are pending. Do not claim build, lint, tests, route registration, or deployed behavior PASS until the new SHA has current-head Actions evidence. Local commands are not run because this context has no local checkout.
- Next task (single cursor): `AGH-ADMIN-ROUTE-TREE-SYNC-001` — commit official generated `src/routeTree.gen.ts`, verify every route ID and run exact-head CI; fix failures before advancing.
- Lovable/Supabase/authenticated-browser acceptance remains a separate existing gate; this batch does not change production or assert those gates passed.

---


## Active workstream
- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`
- Active PR: [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72) — OPEN
- Work branch: `fix/acceptance-hardening-cart-finance-20261015` → `main`
- Preserve this branch while the PR is open. Do not push directly to `main`.

## CURRENT PARALLEL WORK CHECKPOINT — customer route expansion (2026-10-16)
- **Current verified PR HEAD before this state-file update:** f79f5af154d0567b2892ffebb8f9775989264f58; PR #72 remains OPEN on fix/acceptance-hardening-cart-finance-20261015. Do not create another branch and do not merge.
- Source batch: commit a95c134639d9f3db4b0224ccb3e5cd3fde025d7b adds optional initialQuery support in the existing Storefront; direct route files src/routes/search.tsx, catalog.tsx, products.tsx, pricing.tsx, company.tsx, financial-documents.tsx, payments.tsx and receivables.tsx; regression test src/test/screen-route-coverage.test.tsx; updated docs/canonical/AGHBARI-SCREEN-ACTION-COVERAGE.md and docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md.
- Coverage matrix now lists **41/109 (37.6%) direct source routes**. This is route-source coverage only. /payments and /receivables reuse the verified statement workspace; they do not claim payment posting or a specialized aging module. /pricing shows current account-authorized storefront pricing and is not the staff tariff editor. /company remains read-only until an approved mutation contract exists. These routes remain PARTIAL pending behavior and acceptance proof.
- **Exact-head verification:** the newest customer batch plus route-tree sync passed exact-head GitHub Actions run [38849443632](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38849443632) on SHA f79f5af154d0567b2892ffebb8f9775989264f58: build PASS; official TanStack route-tree drift check PASS; unit tests PASS; isolated PostgreSQL migrations/core workflows PASS; logical backup/restore PASS; lint PASS; production-preview smoke 4173 PASS; dev smoke 5173 PASS. Exact unit-test count not independently extracted in this checkpoint. Local commands remain NOT RUN because no local checkout. This is source/CI proof only, not live Lovable publish, production Supabase or authenticated-browser proof.
- **Generated route tree:** synced src/routeTree.gen.ts from the official TanStack generator diff emitted by CI run 38849293551; follow-up exact-head CI run 38849443632 verified committed generated-tree equality. The route /company is represented by the non-nesting file src/routes/company_.tsx so that existing /company/details, /company/users, /company/contacts and invitation routes remain siblings rather than being swallowed by a parent without Outlet. Never hand-edit generated output; repeat the build/generator check after further route changes.
- **Lovable sync:** no direct Lovable project/editor/publish access is confirmed in this context, and no sync/publish is claimed. An official Lovable connection has been surfaced for user authorization; continue source work in this PR while access remains external. Do not promise a sub-hour sync without a verified project connection and published-SHA readback.
- Next executable steps: continue remaining catalogue routes using real category/promotion/product evidence; do not invent popularity/featured/collection semantics without a verified data contract. Implement remaining admin/source-feasible routes and action contracts. Keep live Lovable/Supabase/browser gates distinct.

## Exact-SHA evidence and latest-head discipline
- **Latest known source CI success (historical, not current-head proof):** `8764ba6f3ff24a148f89641d6ebd6ab30202d04b`, [Actions 38837050093](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38837050093) **SUCCESS**: 21/21 test files, 252/252 tests, isolated PostgreSQL 17 migration/workflow acceptance, logical backup/restore, lint, build, production preview smoke 4173 and dev smoke 5173. This exact SHA validates its own changes only; it does not prove live browser, intended-production database, Lovable sync or deployment.
- Previous accepted source checkpoint: `c7902dec892ea50da72b6c241a3c5386bd76a806`, exact-head [Actions 38844964777](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38844964777) **SUCCESS**: 25/25 test files, 278/278 tests, PostgreSQL 17 migration/workflow suite, logical backup/restore, lint/build, production preview 4173 and dev smoke 5173. The route slice also verifies `/store`, `/statements` title `كشوف الحساب`, and `/company/users` on both applicable route checks.
- No local checkout is mounted in this execution context; no local `git fetch/status/HEAD` command was run. GitHub remote refs/files/Actions are the evidence source.

## Only task cursor
- **`next_task_id = AGH-PRODUCT-SCREEN-COVERAGE-001` — active product-completion work.** The full product specification sections 1–22 are binding. Completion of invoice privacy source checks does not demonstrate completion of all storefront/admin sections, screens, routes, controls, and user workflows. Do not treat the external browser gate as the only remaining task.
- **Current PR HEAD before this checkpoint metadata write:** `5464f587465047915aebd96e2e888ae823377bfa`, PR #72 OPEN on `fix/acceptance-hardening-cart-finance-20261015`. The remote workflow lookup returned no run for the new head; current-head CI is **NOT AVAILABLE / NOT PROVEN**. Earlier exact-head PASS links below remain historical and do not transfer.
- **Coverage deliverable:** `docs/canonical/AGHBARI-SCREEN-ACTION-COVERAGE.md` maps 64 customer + 45 admin = 109 required routes. Checkout step routes remain implemented with fail-closed confirmation. This batch added `src/routes/templates.tsx`, reusing the existing `ReorderWorkspacePage` for saved purchase templates, and added `/templates` + `/addresses` route-match assertions in `src/test/app-routing.test.tsx`. Coverage matrix records 33/109 exact route modules; the addresses route already existed and is not counted as a new route.
- **Required product slices:** customer storefront/search/catalog/product/collections; cart/checkout/reorder/templates; account/company/addresses/contacts/users; pricing/invoices/statements/payments/receivables; admin dashboard/orders/customers/invitations/devices; products/categories/units/brands/prices/pricing rules/inventory/warehouses/stock movements; import profiles/upload/mapping/preview/data quality/deduplication/approval/job logs/rollback/export; Onyx import/reconciliation/XLSX with explicit unverified integration status where vendor access is missing; AI dashboard/reports/alerts/tasks/assistant/governance/insights/prompts/models/providers/settings/usage/audit; executive reports/recommendations; notifications/integration hub; role/permission/session/device/audit/error/health/queue screens; branding/appearance/currency/invoice/order/stock/integration settings; PWA/offline/performance; backup/restore/release/operations.
- **Every screen has a behavior contract:** real data, not mock/placeholder content; every visible button/control performs its named action; forms validate; writes have success/failure feedback and read-after-write; lists provide applicable search/filter/sort/pagination; destructive actions confirm; role/capability is enforced server-side and by RLS; screen states cover loading, empty, error, retry, forbidden and offline wherever applicable. No blank-route, decorative button, fake success or unconnected form counts as completion.
- **External gate remains distinct and OPEN:** `AGH-SEC-BROWSER-E2E-001` and `AGH-EXT-SUPABASE-001` stay blocked until correct authorized access, actual signed-in browser, and published SHA readback exist. Existing failures remain evidence-backed; do not repeat the same access attempts and never substitute `mrcyqezbhpncuvaehwgf` for `ffxxjaolfntzbapmfbuv`. These blockers do not excuse unimplemented code, route, screen, validation, tests or source-feasible flows.
- **Current batch (checkout route contracts):** adds `src/routes/checkout_.review.tsx` and `src/routes/checkout_.confirm.tsx`; the review path reuses the existing `Storefront` checkout state machine, and confirmed orders navigate to `/checkout/confirm?orderId=<server order UUID>` only after server order creation and successful local cart clear. Direct/invalid confirmation URLs show a non-success state and link to `/orders`/`/cart`; a valid UUID renders the existing RLS-governed `OrderInvoice`. Adds component regression tests, route tests, and HTTP/title smoke checks for production 4173 and dev 5173. Exact-head CI is pending.
- Keep the active branch and PR. Do not merge/push to `main`; do not create a replacement branch. Do not claim full product completion until the coverage matrix has no unexplained missing/disconnected paths and required tests/evidence exist.

## 2026-10-16 — product screen coverage batch checkpoint
- Active task remains `AGH-PRODUCT-SCREEN-COVERAGE-001`; active PR #72 / branch `fix/acceptance-hardening-cart-finance-20261015`; no local checkout is mounted, so local test/lint/build commands were not run.
- Source changes pushed through GitHub contents API: `src/routes/templates.tsx` (new route backed by the existing saved reorder-template workflow); `src/test/app-routing.test.tsx` (route-match assertions for `/templates` and `/addresses`); `docs/canonical/AGHBARI-SCREEN-ACTION-COVERAGE.md` (template route status and corrected 33/109 exact route count); `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md` (active task checkpoint).
- Latest known pre-state-update commit: `5464f587465047915aebd96e2e888ae823377bfa`. Exact-head CI lookup returned no workflow run; current tests/build/route smoke = **NOT RUN / NOT PROVEN**, not PASS. Earlier CI on `c7902dec892ea50da72b6c241a3c5386bd76a806` does not transfer.
- Next executable action: continue the customer account route slice from verified existing auth/profile contracts, then update route tests and this pointer. Do not create placeholder onboarding success or claim template write/read-after-write coverage beyond the existing component's tested contract.

## Mandatory end-of-run checkpoint
After every coherent batch and **before every response, pause, timeout, context limit or session end**, update this file and the matching row in `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`. Record actual branch/PR/HEAD; changed paths; commands and test results; exact tested SHA and exact CI link/status; current/next task ID; and each evidenced blocker. Mark `NOT RUN` and `UNPUSHED` honestly. If current-head CI fails, keep the failed task open and fix the cause before advancing. A fresh session must begin from this pointer without asking the owner to repeat context.


## AGH-SEC-BROWSER-E2E-001 — external-gate evidence (2026-10-16; remains OPEN)
- Work target remains PR [#72](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/72), branch `fix/acceptance-hardening-cart-finance-20261015` → `main`. Remote PR HEAD observed before this documentation checkpoint: `37f8941a1c34d8fed8835bd394fb6d479ad06190`; parent tree: `b52b2d52103e6a7259426f52570b9ad4244f03d1`.
- Exact-head CI for `37f8941a1c34d8fed8835bd394fb6d479ad06190`: [Actions run 38837454663](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38837454663) **SUCCESS**. Run log directly reports Vitest **21/21 files, 252/252 tests**; isolated PostgreSQL 17 migration/workflow and logical backup/restore assertions passed; lint/build and the preview/dev smoke steps report successful completion. The same log contains repeated missing-runtime warnings for `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; therefore this is source/isolated-test evidence only, not proof of connection to the intended live backend or deployed browser behavior.
- **Lovable — BLOCKED EXTERNALLY:** a direct read of expected project ID `851f6f5c-d23d-45a6-9568-1452d5cfdd73` returned `404 project_not_found`. Searching projects for `Aghbari Commerce` in both currently visible Lovable workspaces returned zero results. No editor/source SHA, published URL/deployment SHA, or publishing action was available from those reads. Do not publish or target a similarly named project.
- **Intended Supabase — BLOCKED EXTERNALLY:** one direct read of project ref `ffxxjaolfntzbapmfbuv` returned `MCP error -32600: You do not have permission to perform this action`. No production query, SQL write, migration, or alternate-project substitution was performed. Required unblock: grant/refresh authorized read access to this exact ref, then confirm project identity and migration lineage before any production mutation.
- **Authenticated browser — BLOCKED EXTERNALLY / NOT RUN:** the browser-profile listing returned two profiles with empty `signed_in_sites` arrays. No authenticated session was available, so the customer/staff/admin acceptance journeys were not run and no live deployment SHA was read back. Required unblock: authorize/sign in a browser profile to the confirmed intended deployment; never request or store passwords in chat.
- Per-case result at this checkpoint: (1) customer invoice/cart/order amounts hidden in UI + network/RPC: **NOT RUN**; (2) staff denied policy change through UI/direct RPC/database: **NOT RUN**; (3) authorized admin policy change constrained to its organization, with repeat UI/network/PDF checks: **NOT RUN**; (4) production cross-tenant read/write denial: **NOT RUN**; (5) published invoice/statement/PDF/PWA route and asset checks: **NOT RUN in this checkpoint**. The registry preserves an earlier read-only public check reporting Arabic content on `/` and `/login`, with `/manifest.webmanifest`, `/aghbari-192.png`, `/aghbari-512.png`, `/invoices`, and `/statement` returning `page_not_found`/404; this is historical evidence, not a fresh retest here.
- No source change or production mutation was justified or made. Keep `AGH-SEC-BROWSER-E2E-001` active and all external gates open until direct live evidence exists. Next action is to unblock the exact Lovable project, authenticated browser session, and authorized intended Supabase ref; do not repeat identical access attempts.

## Prior exact-SHA checkpoint — superseded by current pointer
- Branch/PR remained `fix/acceptance-hardening-cart-finance-20261015` / PR #72 → `main`. Prior documentation HEAD `5040d08e2fa3271f753ccf43c83cb15d5a93cc0c` passed exact CI [38838964429](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38838964429): 21/21 test files, isolated PostgreSQL 17 migration/workflow, logical backup/restore, lint/build and preview/dev smoke steps. Current remote HEAD before this checkpoint write: `6950d1e39ceb59f8d0d7723d85e579154fd1a48b`; exact-head run [38839968012](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38839968012) was **IN PROGRESS** at last direct readback. CI logs show missing Supabase runtime environment variables, so these are not production/runtime acceptance results.
- No application source changed in this batch. `AGH-SEC-BROWSER-E2E-001` remains externally blocked: Lovable project ID `851f6f5c-d23d-45a6-9568-1452d5cfdd73` returned `404 project_not_found`; intended Supabase project `ffxxjaolfntzbapmfbuv` returned permission denied; both browser profiles reported no signed-in sites. Do not retry these identical access calls. Customer/staff/admin finance privacy E2E, live tenant isolation, published PDF/routes, and PWA checks remain `NOT RUN`.
- Current next task remains `AGH-SEC-BROWSER-E2E-001`, with the existing unblocking conditions stated above. This documentation-only checkpoint still requires its own exact-head CI.
## History
Detailed prior implementation evidence is kept below as **historical batch records only**. The task IDs in those sections are not current pointers and must never override the section above.

---

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


## AGH-ASYNC-OUTBOX-001 focused source acceptance checkpoint
- Active branch/PR: `fix/acceptance-hardening-cart-finance-20261015` / PR #72; exact complete CI baseline includes SHA `96b064c9a772f2267e73e2ad41c0381593be4e05`, Actions [38834690553](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38834690553) SUCCESS: 21/21 files, 250/250 tests, PostgreSQL 17, backup/restore, lint/build and route smokes 4173/5173.
- Focused source reviewed: `supabase/functions/outbox-worker/index.ts`, `logic.ts`, `src/test/outbox-worker-logic.test.ts`, `supabase/migrations/20261015190000_outbox_worker_lifecycle.sql`, `20261016130000_outbox_credential_match_boundaries.sql`, and outbox SQL assertions in `scripts/test-database-migrations.mjs`.
- Coverage already proves bounded 4096-byte request reading, strict UTF-8 and declared/actual content-length limits, batch bounds and unique UUID claims, worker-secret authentication, lease-based crash recovery, attempt cap/dead lettering, per-consumer delivery idempotency, retries with backoff, unknown RPC status never treated as success, durable database-side credential/PII redaction, and sanitized failure-path handling. No additional source defect was established in those paths; no speculative change was made.
- Task disposition: source logic **ACCEPTED** on current exact full CI baseline; registry remains PARTIAL because the intended Supabase project is inaccessible and deployed crash/replay/provider delivery cannot be tested here. Next source task is `AGH-AI-GATEWAY-001`.
- Concrete AI gateway issue queued from source review: `supabase/functions/ai-gateway/index.ts` buffers `await request.text()` before checking `raw.length > 4096`, so a large authenticated request may be fully buffered before rejection. Replace with shared bounded byte reader and add a focused wiring regression.


## AGH-AI-GATEWAY-001 bounded request batch
- Active branch/PR: `fix/acceptance-hardening-cart-finance-20261015` / PR #72; parent `a6957fd7778b24deb324885c5fc0c46111d2708b`. Last integrated CI `96b064c9a772f2267e73e2ad41c0381593be4e05`, Actions [38834690553](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38834690553) SUCCESS; this batch needs its own exact-SHA CI.
- Concrete defect: `supabase/functions/ai-gateway/index.ts` used `await request.text()` and only then checked `raw.length > 4096`. That buffers the entire untrusted body and measures UTF-16 string code units rather than wire bytes; a request with multibyte Arabic can exceed 4096 bytes while appearing shorter by character count.
- Fix: created `supabase/functions/_shared/bounded-request.ts` with the existing actual-byte bounded stream reader; outbox worker re-exports the same helper to preserve its test/API import and runtime use. AI gateway now checks the actual request bytes before JSON parsing and returns 413 for excess payload, 400 for invalid UTF-8/read failures. Empty chunks are ignored to avoid unbounded chunk-list growth.
- Tests added in `src/test/ai-gateway-logic.test.ts`: an Arabic payload whose JS string length is below 4096 while UTF-8 bytes exceed it must be rejected, and a handler-wiring test asserts the Edge route uses the bounded helper rather than `request.text()`. Local test command `npx vitest run src/test/ai-gateway-logic.test.ts src/test/outbox-worker-logic.test.ts` NOT RUN locally (no checkout and GitHub DNS unavailable). Exact-SHA CI pending.
- Source task stays active until full exact-SHA CI succeeds or failures are repaired. Provider keys/live calls remain external proof; no secrets or project-target changes were made.


## AGH-AI-GATEWAY-001 test harness correction
- First candidate `2ef8aa181bd787cb829e3158e569acdf5ce848a3`, Actions [38835193715](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38835193715), FAILED in `src/test/ai-gateway-logic.test.ts`: the UTF-8 byte-limit test passed, but handler-wiring test called `readFile(new URL(..., import.meta.url))` in Vitest, where `import.meta.url` is not a `file:` URL (`ERR_INVALID_URL_SCHEME`). Unit suite: 20/21 files passed, 251/252 tests passed. The fixture now reads the repository-relative source path; production source was not implicated in this failure.
- New exact-SHA rerun pending; task remains `AGH-AI-GATEWAY-001`. Do not advance until full CI completes.

## 2026-10-16 — customer account/company slice checkpoint (parent SHA 9826d0a3cc8b2264b59207dc0fad0cd25593d469)
- Active cursor remains `AGH-PRODUCT-SCREEN-COVERAGE-001`; PR #72 remains open on `fix/acceptance-hardening-cart-finance-20261015`.
- Added `src/components/CustomerAccount.tsx` and route files `profile.tsx`, `company.details.tsx`, `account.pending.tsx`, `onboarding.profile.tsx`, `onboarding.company.tsx`.
- Expanded `src/test/app-routing.test.tsx` and added `src/test/customer-account.test.tsx` for profile identity/logout success and failure, company RPC-backed data/retry, and non-inferred approval state.
- Updated the screen/action matrix and requirement registry. Company/profile editing and account approval-state data remain explicitly unavailable because a verified server mutation/read contract is not present in the current client contract.
- `.github/workflows/commerce-checks.yml` now emits the post-build TanStack-generated route tree as temporary diagnostic evidence; use that output to synchronize `src/routeTree.gen.ts` from the official Vite plugin result, then remove the diagnostic step and keep a drift guard if supported.
- **Verification:** local commands not run (no local checkout). Exact-head CI for the slice is **PENDING**. Route tree must not be called source-synchronized until generated output from the new route files is committed.
- Next action: read the generated tree from the latest workflow run, commit generated route-tree output, add route-tree drift protection, then continue remaining account and admin paths.


## 2026-10-16 — route-tree synchronization and account-test repair
- Parent HEAD: `5bb354a113f5450251965f9e728c1c110e877efb`; PR #72 remained OPEN on `fix/acceptance-hardening-cart-finance-20261015`.
- Exact parent workflow [38847419772](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38847419772) **FAILED** during unit tests: 26 files / 290 tests passed and 1 file / 4 tests failed. All four new account-screen failures shared the same fixture error: `mocks.signOut` was undefined; corrected references are `mocks.auth.signOut`.
- The same CI build ran the official TanStack Vite generator. Its captured `src/routeTree.gen.ts` contains **56 route imports**, including addresses, templates, checkout review/confirm, company details/users/contacts/members, profile, approval status and onboarding paths. The generated output is committed in this follow-up, and the temporary log-dump step is replaced with a route-tree drift check.
- Added direct route-ID assertions for customer account/company paths, checkout review/confirmation, addresses and purchase templates; existing component-level tests assert logout success/failure, RPC-backed company read/retry, and non-inferred approval state.
- New repair SHA / exact-head CI: pending at checkpoint creation; no local checkout means local commands were not run. Continue from the latest PR head and repair any remaining exact-head CI failure before broadening route coverage.


## 2026-10-16 — administration operational routes batch (pre-generator checkpoint)
- Parent source SHA: `d6bf05ffb649b04540ef846a83c225f4e1ef5e80`; same open PR #72 and branch `fix/acceptance-hardening-cart-finance-20261015`.
- Components now support deep-link initial tabs for import engine/history, Onyx, stock reconciliation, and AI alerts/tasks.
- Added 14 exact route modules for the operational/admin paths listed in the coverage matrix and route-ID tests in `src/test/app-routing.test.tsx`.
- `src/routeTree.gen.ts` is deliberately waiting for the official output from this batch's Vite/TanStack build; the workflow temporarily emits that generator output so the resulting source file can be committed exactly and the drift guard restored.
- Exact-head CI for this batch pending. No local commands were run in this GitHub-only session.


## 2026-10-16 — route-tree synchronized after administration batch
- Exact parent: `79292f0c9e26758aa1065705993163bcb4a7c2a0`; PR #72 remained OPEN on `fix/acceptance-hardening-cart-finance-20261015`.
- Successful parent CI [38848240501](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38848240501) produced the official Vite/TanStack route tree with **70 imports**; build succeeded, 27 test files / 333 tests passed, and the isolated PostgreSQL/core-workflow suite, backup/restore, lint and preview/dev smoke steps concluded SUCCESS.
- The exact generator output is being committed to `src/routeTree.gen.ts`. The temporary route dump is removed and `git diff --exit-code -- src/routeTree.gen.ts` is restored as the build drift guard.
- Exact-head CI for this synchronized commit remains pending; do not reuse parent CI as proof for the new SHA.
- Next slice after exact-head CI: customer catalog/search/category paths and explicit blocked status pages only where no verified server contract exists.


## 2026-10-16 — route-tree capture + discovery/account/help checkpoint
- Exact parent SHA: 69ab0d71b85df51db800dfa9a8819c427e1bbeb8; PR #72 remains open on fix/acceptance-hardening-cart-finance-20261015.
- Added CustomerDiscoveryPages.tsx and route modules for catalog discovery/category/search deep links; CustomerAccountSettingsPages.tsx and account/notification routes; CustomerHelpPages.tsx and help routes; direct-route assertions in src/test/screen-route-coverage.test.tsx.
- Official generator output captured from build of exact parent Actions [38850270064](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38850270064), route imports = 101. The drift-guard step then failed because the generated source had not yet been committed, so unit tests and later stages were skipped. Do not treat that run as passing tests.
- This commit synchronizes src/routeTree.gen.ts with the official generated output, removes the temporary dump step, and restores git diff --exit-code -- src/routeTree.gen.ts. Exact-head rerun is required.
- Current route-module inventory at parent: 101 files under src/routes including root/endpoint modules; this is not a count of complete business screens.
- Next: repair exact-head CI route acceptance, then add template detail/create/edit/update/delete routes backed by a tenant-bound RPC and ownership tests.


## 2026-10-16 — template routes official generation checkpoint
- Active PR #72 / branch fix/acceptance-hardening-cart-finance-20261015; parent source SHA 68885a7cdcd432a8c1123eba42835f383b9faa2a; new route tree captured from CI build of ae465c44a5d810b598fb7eba85a80d15b7edae0a. Generator emitted 105 route imports including the 4 new template/detail/reorder route modules.
- Source commit 3aad34546ead53d6c22efec4ab8e2ff27a6d60b5 added update_reorder_template SQL and the client service; its CI failed three focused input tests because the fixture UUID had invalid version group 0000. Commit 68885a7cdcd432a8c1123eba42835f383b9faa2a fixes the fixture to a valid version-4 UUID.
- The build/route-capture run for ae465c44a5d810b598fb7eba85a80d15b7edae0a succeeded through build and official route generation but was expected to fail the old-tree diff guard; unit tests were skipped in that capture run. This checkpoint commits the official generated output and restores the route-tree diff guard.
- Next task: exact-head CI and migration tests. Repair any new failures before broadening operational route scope.
