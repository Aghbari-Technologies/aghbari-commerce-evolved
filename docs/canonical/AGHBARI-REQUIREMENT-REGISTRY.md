# Aghbari Commerce — Requirement Registry and Execution Rules

**Product:** متجر الأغبري | Aghbari Commerce  
**Repository:** `Aghbari-Technologies/aghbari-commerce-evolved`  
**Branch:** `main`  
**Last reviewed main before this documentation pointer update:** `971a49d75b546ccba0a05d8829c8d9c38cae085a`  
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

| Area | Status | Evidence and required closure |
|---|---|---|
| Build gate | **FIXED ON VERIFIED SHA; NEWEST CI MUST BE CHECKED** | The lint fix passed unit, isolated PostgreSQL, lint, build and port 5173 smoke on [SHA f75dcb7, run 38687301037](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687301037). Expanded route/PWA smoke passed on [SHA 05fcacb, run 38687685412](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687685412). Run [38687897943](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687897943) for docs SHA `971a49d` was in progress at last observation; always inspect the latest run for the live `main` SHA. |
| Production Supabase | **BLOCKED EXTERNALLY** | Repo references project `ffxxjaolfntzbapmfbuv`; connected Supabase account cannot access it. Never apply migrations to another project. |
| Tenant isolation | **NOT PROVEN / HIGH PRIORITY** | `src/lib/supabase.ts` exports fixed `ORG_ID` / `WAREHOUSE_ID`; replace with authenticated server-derived scope and prove cross-tenant denial. |
| Orders / checkout | **PARTIAL / isolated DB tested** | Atomic staff-order creation, server pricing, idempotency and state/stock rules have isolated PostgreSQL evidence; target DB and authenticated browser E2E are unproven. |
| Three pricing tiers | **PARTIAL / SECURITY CRITICAL** | Verify distinct tier outputs and deny alternate-tier values at DB/API/RPC/cache/export; tier must be derived server-side. |
| Addresses / company users | **OPEN** | Customer address book and company-member administration remain open roadmap items. |
| Invoices / statements | **PARTIAL** | Pages and RPC foundations exist; production flow, overpayment browser test and server-generated PDF remain open. |
| Excel / CSV import | **PARTIAL** | CSV/XLSX streaming, DQS, hashing and resumable manifests exist; browser interruption E2E, rollback, TTL cleanup and large-file profiling are unproven. XLS binary and reliable PDF extraction are unsupported; manual mapping must be explicit. |
| Onyx Pro | **PARTIAL** | Snapshots and comparison-only reconciliation exist; shared reporting must retain source lineage and avoid duplicate balances. No actual Onyx API contract is confirmed. |
| Onyx Excel export | **PARTIAL / CODE-VERIFIED** | `src/lib/onyx-export.ts` now creates a real XLSX with a first detail sheet containing the exact 27 headers from section 21, a separate order/customer header sheet, inline-string SKU fields (leading zeroes preserved), and blanks for unmapped data. Unit tests and full CI pass on code SHA `6112b24c2807fbb013b9fcd2d38c889631286a7c` ([run 38688167670](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38688167670)). **NOT PROVEN:** import acceptance on the owner's actual Onyx version and central audit logging for exports. |
| Outbox / workers | **PARTIAL** | Schema/isolated acceptance exist; deployed workers, crash/replay recovery and consumer idempotency drills remain unproven. |
| AI gateway / forecasting | **PARTIAL / no provider proven** | Deterministic assistant and governance schema exist; provider routing, safe Test Connection, budgets, sanitization, action cards and model-backed forecasts remain unproven. |
| WhatsApp | **PARTIAL / external dependency** | Internal notifications exist. No official provider/credentials confirmed; never claim Sent without provider message ID/status. |
| Offline/PWA | **PARTIAL** | Local catalog and cart draft exist; online server validation remains required before order creation. Conflict-safe mutation queue is unproven. |
| Monitoring / DR / performance | **NOT PROVEN** | No production P95, 100k-row memory profile, backup restore, failover or DR drill evidence. |
| Persistent memory | **PERSISTED / MAINTAINED** | `PROJECT_MEMORY.md`, this registry, `docs/canonical/AGHBARI-EXECUTION-MANDATE.md`, `ops/AGHBARI-SESSION-RESUME.md`, latest state and progress ledger are committed on main. |

## Mandatory invariants
1. Product identity is **متجر الأغبري | Aghbari Commerce** only.
2. Preserve working code/history; no rewrite or destructive cleanup without evidence.
3. Live store orders/products/prices/inventory remain operational truth. Integrate Onyx records by external ID, source, sync time, profile version, hash and match state; never silently double-count or automatically adjust live stock.
4. Organization, user, role and price tier are server-derived; client values are not authoritative.
5. Order, lines, price snapshots and idempotency must be atomic and validated server-side.
6. Financial math is deterministic; AI explains measured facts. Insufficient history means no forecast.
7. Use real loading/error/empty/retry/unauthorized/offline states; no decorative success buttons.
8. Do not claim CI, DB, E2E, Lovable sync, WhatsApp send or AI readiness without exact evidence.

## Next execution order
1. Check latest exact-head CI and keep unit → isolated PostgreSQL acceptance → lint → build → expanded route/PWA smoke green.
2. Resolve intended Supabase access; verify migrations before any live writes.
3. Replace fixed tenant assumptions with a server-derived contract and add cross-tenant negative tests.
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
