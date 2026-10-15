# Aghbari Commerce — Requirement Registry and Execution Rules

**Product:** متجر الأغبري | Aghbari Commerce  
**Repository:** `Aghbari-Technologies/aghbari-commerce-evolved`  
**Branch:** `main`  
**Remote source baseline verified before this protocol update:** `943c8cc0279318da751634101a6114c2d90566fc`; exact-head CI [38691930376](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38691930376) **SUCCESS**. This is baseline evidence only; inspect the new HEAD and its own CI after every push.  
**Canonical specification:** [AGHBARI-MASTER-PROJECT-SPECIFICATION.md](./AGHBARI-MASTER-PROJECT-SPECIFICATION.md)  
**Technical supplement:** [Platform Intelligence requirements](../specs/PLATFORM-INTELLIGENCE-PRODUCTION-REQUIREMENTS-2026-10-09.md)

This is an execution index, not proof that every feature is complete. A route, component, schema, migration, or isolated test is not production E2E proof.

## Status definitions
- **COMPLETE / PROVEN:** critical code path, backend contract, authorization boundary, failure handling and relevant tests pass for the same commit.
- **PARTIAL:** code exists but a required workflow/layer remains incomplete.
- **WEAK:** material UX, security, performance or reliability gap.
- **DISCONNECTED:** UI or backend exists but is not end-to-end connected.
- **MISSING — BACKEND EXISTS:** UI gap can use a verified safe API/database contract.
- **MISSING — NO VERIFIED CONTRACT:** don't simulate success; first review schema and security impact.
- **BLOCKED EXTERNALLY:** requires external access/configuration/credentials/platform ability.

## Gap register at baseline

| ID | Area | Status | Evidence and required closure |
|---|---|---|---|
| AGH-CI-001 | Build gate | **PASS ON CODE MERGE SHA; CHECK EVERY NEW HEAD** | Tenant-scope PR head `c117b0eee5b19411c1fa3bf5162dbef1e939455f` passed [run 38689077672](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689077672); merged `main` SHA `fe22af0424947b56ae80e0679621cf0df333e284` passed [run 38689238295](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689238295), including unit tests, isolated PostgreSQL 17 migration acceptance, lint, build and port 5173 route/PWA smoke. Evidence is SHA-specific; inspect CI after every later commit. |
| AGH-EXT-SUPABASE-001 | Production Supabase | **BLOCKED EXTERNALLY — RECHECKED 2026-10-15** | `get_project(ffxxjaolfntzbapmfbuv)` is permission-denied. The connected integration lists `aghbari-commerce` as a different ref `mrcyqezbhpncuvaehwgf` (ACTIVE_HEALTHY, 133 migrations, latest `20260925040254`, behind the repo's current migrations). Name similarity is not identity proof; do not mutate the accessible project as a substitute. No production migrations applied. |
| AGH-SEC-TENANT-001 | Tenant isolation | **PARTIAL — AUTHENTICATED SCOPE PROVEN IN ISOLATED CI; PRODUCTION AND ANON ROUTING NOT PROVEN** | PR #26 merged at `fe22af0424947b56ae80e0679621cf0df333e284`. `getCurrentTenantScope()` resolves from `get_current_tenant_context()`; restrictive RLS covers all `public` base tables with `organization_id` for authenticated sessions and key relation tables; CI tests foreign-organization staff SELECT/INSERT denial on isolated PostgreSQL 17. [PR-head CI](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689077672) and [main CI](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689238295) pass. **Required closure:** Correct production Supabase access and authorized migration; authenticated customer/staff browser E2E; review public-read policies/domain-to-tenant selection and verify three-tier privacy. Never call tenant isolation production-certified yet. |
| AGH-ORDERS-001 | Orders / checkout | **PARTIAL / isolated DB tested** | Atomic staff-order creation, server pricing, idempotency and state/stock rules have isolated PostgreSQL evidence; target DB and authenticated browser E2E are unproven. |
| AGH-PRICE-PRIVACY-001 | Three pricing tiers | **PARTIAL — direct table/raw RPC and offline cache leaks covered in isolated CI; full-channel proof OPEN** | Direct customer table SELECT and raw `customer_product_unit_price(...)` / `preview_order_pricing(jsonb)` calls are denied in PostgreSQL 17 CI; `20261015120000_customer_tier_price_read_boundary.sql` exact CI [38696292337](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38696292337) and raw RPC tests [38697134660](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38697134660) **SUCCESS**. `OfflineWorkspacePage` now sanitizes legacy cache reads and fresh sync writes using `sanitizePublicCatalogCache()`; exact SHA `fc7e44c9fc55b191ea4b9aad5ca9b5063ca51be1`, CI [38698194334](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38698194334) **SUCCESS**. Live authenticated browser and remaining full API/RPC/cache/export review stay open. |
| AGH-CUSTOMER-360-001 | Customer 360 / addresses / contacts / company users | **PARTIAL — invitation/linkage and capability-scoped company access verified in exact-SHA CI; live browser/production proof OPEN** | The /addresses and /company/contacts surfaces use owner-scoped server RPCs/RLS. Checkout freezes a safe destination snapshot and transactional OrderCreated outbox record. PR #33 added hash-only one-time 7-day company invitations, email-verified acceptance, explicit customer membership links, buyer/finance/viewer capabilities, revoke/audit paths, and /company/members + /company/accept-invitation. Exact PR SHA ecf6412a93d8350eb40de97b995e43f1e84b309e CI [38708641537](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38708641537) **SUCCESS**; merged main SHA 68365d5dd87e9f00eff6bd68c6ad7d517e9cb567 push CI [38708849372](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38708849372) **SUCCESS** for unit, isolated PostgreSQL 17, lint, build and port-5173 smoke. Do not close the umbrella requirement until authenticated browser E2E and intended production Supabase migration are proven; expected ref ffxxjaolfntzbapmfbuv remains inaccessible, and another project/ref must not be substituted. |
| AGH-FINANCE-DOCS-001 | Invoices / statements | **PARTIAL** | Pages and RPC foundations exist; production flow, overpayment browser test and server-generated PDF remain open. |
| AGH-DATA-IMPORT-001 | Excel / CSV import | **PARTIAL** | CSV/XLSX streaming, DQS, hashing and resumable manifests exist; browser interruption E2E, rollback, TTL cleanup and large-file profiling are unproven. XLS binary and reliable PDF extraction are unsupported; manual mapping must be explicit. |
| AGH-ONYX-INTEGRATION-001 | Onyx Pro | **PARTIAL** | Snapshots and comparison-only reconciliation exist; shared reporting must retain source lineage and avoid duplicate balances. No actual Onyx API contract is confirmed. |
| AGH-ONYX-XLSX-001 | Onyx Excel export | **PARTIAL / CODE-VERIFIED** | `src/lib/onyx-export.ts` now creates a real XLSX with a first detail sheet containing the exact 27 headers from section 21, a separate order/customer header sheet, inline-string SKU fields (leading zeroes preserved), and blanks for unmapped data. Unit tests and full CI pass on code SHA `6112b24c2807fbb013b9fcd2d38c889631286a7c` ([run 38688167670](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38688167670)). **NOT PROVEN:** import acceptance on the owner's actual Onyx version and central audit logging for exports. |
| AGH-ASYNC-OUTBOX-001 | Outbox / workers | **PARTIAL** | Schema/isolated acceptance exist; deployed workers, crash/replay recovery and consumer idempotency drills remain unproven. |
| AGH-AI-GATEWAY-001 | AI gateway / forecasting | **PARTIAL / no provider proven** | Deterministic assistant and governance schema exist; provider routing, safe Test Connection, budgets, sanitization, action cards and model-backed forecasts remain unproven. |
| AGH-WHATSAPP-001 | WhatsApp | **PARTIAL / external dependency** | Internal notifications exist. No official provider/credentials confirmed; never claim Sent without provider message ID/status. |
| AGH-OFFLINE-PWA-001 | Offline/PWA | **PARTIAL** | Local catalog and cart draft exist; online server validation remains required before order creation. Conflict-safe mutation queue is unproven. |
| AGH-OPS-DR-001 | Monitoring / DR / performance | **NOT PROVEN** | No production P95, 100k-row memory profile, backup restore, failover or DR drill evidence. |
| AGH-OPS-RESUME-001 | Persistent session-resume protocol | **DONE_VERIFIED** | The existing protocol entry points `AGENTS.md` and `.github/copilot-instructions.md` are committed on `main`; canonical memory, resume, state, registry and mandate were updated in implementation SHA `90602f6deeba79a5d80efad38d83efec64be5173`, whose exact-SHA Actions run [38692264543](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38692264543) completed SUCCESS (unit, isolated PostgreSQL 17 acceptance, lint, build, port 5173 smoke). This proves repository persistence and exact-SHA CI. Lovable's official docs confirm root `AGENTS.md` is always read (free persistent-instruction path: https://docs.lovable.dev/features/knowledge); sync of a particular new SHA into the live editor and direct editing of the Project Knowledge field remain unverified. Production Supabase access remains separately blocked. `next_task_id` is maintained only in the latest execution-state file; no parallel ledger was created. |

## Mandatory invariants
1. Product identity is **متجر الأغبري | Aghbari Commerce** only.
2. Preserve working code/history; no rewrite or destructive cleanup without evidence.
3. Live store orders/products/prices/inventory remain operational truth. Integrate Onyx records by external ID, source, sync time, profile version, hash and match state; never silently double-count or automatically adjust live stock.
4. Organization, user, role and price tier are server-derived; client values are not authoritative.
5. Order, lines, price snapshots and idempotency must be atomic and validated server-side.
6. Financial math is deterministic; AI explains measured facts. Insufficient history means no forecast.
7. Use real loading/error/empty/retry/unauthorized/offline states; no decorative success buttons.
8. Do not claim CI, DB, E2E, Lovable sync, WhatsApp send or AI readiness without exact evidence.

## Permanent resume cursor and stable task IDs

**Current cursor values are maintained here and mirrored in the latest execution-state file; do not create another task/progress ledger.**

- `blocked_task_id = AGH-EXT-SUPABASE-001` — last-known external blocker: the intended production Supabase project `ffxxjaolfntzbapmfbuv` was inaccessible through the connected integration. Verify access again before concluding it remains blocked; never substitute another project or apply a migration without verified identity/authorization.
- The high-level gap register IDs above are permanent. New acceptance gates use an `AGH-<AREA>-<PURPOSE>-<NNN>` identifier and reference their parent row; never renumber an existing ID.
- A requirement is `DONE_VERIFIED` only when the implementation path, access boundary, allowed and denied behavior, failure handling, and required tests pass on the recorded SHA. Reopen only for a newer relevant SHA/change, regression/security finding, changed dependency/input, or invalidated evidence.
- Each execution batch records: task ID; status; exact tested SHA; changed paths; executed commands/tests and their actual outcomes; resulting commit/remote SHA; exact-SHA CI URL/result; next task ID; external blocker plus evidence. Do not inherit PASS from a parent SHA.

## Next execution order
1. Check latest exact-head CI and keep unit → isolated PostgreSQL acceptance → lint → build → expanded route/PWA smoke green.
2. Resolve intended Supabase access; verify migrations before any live writes.
3. The fixed client tenant assumptions and authenticated cross-tenant RLS gap are addressed in source/isolated CI. Next, verify intended Supabase access and migration plan, then run authorized production-schema review and authenticated browser E2E. Treat anonymous catalog/domain-to-tenant isolation as open until the public storefront has a verified tenant-resolution contract.
4. Prove three-tier privacy and full checkout E2E.
5. Run an owner-authorized import-acceptance test for the XLSX workbook against the actual Onyx version, add a server-backed export audit event, and complete invoice PDF.
6. Complete company onboarding/addresses/users, inventory movements and fine-grained permissions.
7. Build AI gateway and queue workers only against verified contracts, with budgets/privacy gates/rule fallback.
8. Record responsive RTL browser UAT and exact-SHA evidence.

Protocol: `INSPECT → CLASSIFY GAPS → IMPLEMENT → CONNECT → TEST → FIX → VERIFY → COMMIT → PUSH MAIN → SYNC LOVABLE`. A Git push alone is not proof of Lovable sync.


## XLSX export evidence (2026-10-15)
- The source now has a browser-triggered XLSX download from approved order details. The first worksheet uses the fixed 27-column section-21 order; a second worksheet stores order number/ID/status/customer code/name/export time. Missing warehouse, batch, expiry, discounts, reservations, cost-center/project/activity and physical-dimension fields are left blank when unavailable.
- Export button is only enabled for confirmed/processing/shipped/delivered orders with no pending quantity review. This prevents exporting an unapproved order as a finalized accounting document.
- Code SHA `6112b24c2807fbb013b9fcd2d38c889631286a7c`, CI [38688167670](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38688167670): **PASS** for unit tests, isolated PostgreSQL acceptance, lint, build, route/PWA smoke. This proves workbook generation structure and order mapping tests, not Excel application parsing or actual Onyx import acceptance.
- Export audit event and target-system compatibility test remain open; the UI reports that limitation explicitly.

## Tenant-scope implementation evidence — 2026-10-15

- **Source merge:** PR #26 merged into `main` as `fe22af0424947b56ae80e0679621cf0df333e284`.
- **Exact tested source:** `c117b0eee5b19411c1fa3bf5162dbef1e939455f`; CI [38689077672](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689077672) **PASS**. Main merge SHA CI [38689238295](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689238295) **PASS**.
- **Changed files:** `src/lib/supabase.ts`, `src/lib/api.ts`, `src/components/CustomerWorkflows.tsx`, `src/components/AdminPages.tsx`, `supabase/migrations/20261015090000_server_derived_tenant_context.sql`, `scripts/test-database-migrations.mjs`.
- **Implementation:** removes fixed browser `ORG_ID`/`WAREHOUSE_ID`/`ADMIN_PROFILE_ID` exports; reads profile, organization and default active warehouse from the authenticated session via server RPC; adds restrictive tenant policies for authenticated role on organization-owned tables plus relation-based policies; tests that foreign-organization staff reads and inserts are denied.
- **Commands/gates that passed:** `npm test`; `npm run test:db` (all migrations + workflows on isolated PostgreSQL 17); `npm run lint -- --rule=prettier/prettier:off`; `npm run build`; `npm run dev -- --host 127.0.0.1 --port 5173` with route/PWA probes.
- **Limit:** no production migration was applied. Expected Supabase ref `ffxxjaolfntzbapmfbuv` remains inaccessible through the current connection. These CI results are not authenticated browser E2E proof and do not resolve anonymous/public storefront tenant routing or all three-tier privacy channels.
