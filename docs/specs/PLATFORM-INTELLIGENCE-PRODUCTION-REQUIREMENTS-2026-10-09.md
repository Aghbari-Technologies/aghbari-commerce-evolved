# Aghbari Commerce — Platform Intelligence and Production Requirements
**Source:** The user-provided “مذكرة المتطلبات والمعمارية الفنية الشاملة لنظام إدارة الطلبات والمنصة الذكية (Production-Grade Edition v2.1)” and its additional order-review, pricing, and UI requirements.  
**Status date:** 2026-10-09  
**Implementation branch:** fix/commerce-completion-20261009  
**Rule:** additive implementation only. Preserve working storefront, administration, checkout, finance, quotes, reorders, barcode, assistant, offline catalogue/cart draft, and current route behavior. No rewrite or replacement without documented evidence.

This file records every source requirement area so implementation is reviewable. It is not proof that a requirement is finished. A feature is PROVEN only when its real code path, database behavior, authorization boundary, and tests pass. A table, placeholder, mock, static screen, passing build, or migration file alone does not constitute completion.

## Mandatory execution and evidence rules

- Inspect current architecture before modifying it; extend a valid existing engine rather than introducing a duplicate.
- Preserve existing working functions; modify conflicting behavior without deleting unrelated capabilities.
- Each requirement must have a real implementation in the required layers (database/backend/UI) and a working end-to-end path.
- Test affected integrations and regression behavior after each phase.
- Sensitive operations follow the project's canonical authorization/permission matrix.
- The final report labels items PROVEN, VERIFIED, PARTIAL, NOT PROVEN, or BLOCKED, with changed files and test evidence.
- Live database rollout remains blocked until the exact intended Supabase project is accessible and schema compatibility is verified. Never apply these migrations to another project.

## Phase 0 — Architecture audit and no-break baseline

**Existing surface inspected:** file-based TanStack routes; storefront/admin shell; OperationsCenter; CustomerWorkflows; CustomerOrders; Supabase schema/RLS and existing checkout/order-transition migrations; import_jobs/import_job_rows; outbox_events; pricing_rules; product_prices; audit_logs; notification/AI tables.

**Evidence and open risk:** the checked-in route tree previously omitted customer and admin routes. That defect has been corrected and route smoke tests added. The repository-configured Supabase project is not accessible through the current Supabase connection; the accessible project named “aghbari-commerce” has a different schema. No live SQL writes have been attempted.

## Phase 1 — Unified import engine, data quality, privacy, and resumability

### Required behavior
- Exactly one official Unified Import Engine for Excel/CSV/PDF and future supported tabular sources; no side path may bypass it.
- Pipeline: Upload/Event → Staging → Detection → Mapping → Validation → Normalization → Deduplication → Chunking → Merging → Snapshot → deterministic analytics → AI insights/rules.
- Raw Excel/CSV/PDF bytes are not permanently stored. Persist only hash and metadata, processing state, structured records, snapshots, and retention/purge audit metadata.
- Upload chunks are 2–5 MB; processing chunks are separately memory-bounded (default 500–2,000 rows); never parse and retain the entire 100,000-row dataset in RAM.
- DQS (0–100) evaluates completeness, validity, uniqueness, consistency, and temporal/reference integrity. 90–100 accept; 75–89 accept with warnings; 50–74 human review; below 50 reject.
- A PDF with no trustworthy table extraction must not be hallucinated. Return “Extraction Failed: Non-Tabular Format” and “Manual Mapping Required”.
- Defaults: file ≤100 MB, rows ≤100,000, columns ≤100, cell ≤4,000 chars, archive expansion ≤10x, bounded execution time and memory.
- Keep identifiers as strings, including leading zeroes. Canonical keys are item_code, customer_code, supplier_code, never internal database IDs.
- One central synonym dictionary. Profiles retain report/source/version, required/optional/ignored columns, synonyms, transformations, validations, matching key, merge/date policy and status. Published historical versions cannot be rewritten.
- SHA-256 duplicate key = organization + profile + file hash + period, with Ignore / Replace Version / Merge / Create New Version behavior.
- Resumable uploads use upload-session ID and individually verified chunks.
- Conflict policies include Auto Accept, Existing Wins, Incoming Wins, Manual Review, Reject Row. Missing data in delta imports must not delete/zero live records unless the profile explicitly says Full Dataset.
- Expiration is audited. Cryptographic erasure is only reported after the retained encryption key is actually destroyed; do not claim crypto-erasure for raw bytes that were never stored.

### Implementation status
- **PARTIAL:** OperationsCenter already has CSV staging, row storage, import history, a synonym map, a provisional DQS display, manual-mapping fallback, and import-row chunk calls.
- **ADDED / CI VERIFICATION PENDING:** streaming SHA-256 and streaming CSV primitives; leading-zero preservation; explicit limit constants; deterministic five-component DQS accumulator and acceptance thresholds. These primitives must be connected to the visible ImportEngine and tested end-to-end.
- **ADDED / CI VERIFICATION PENDING:** versioned import profiles, central synonym records, upload-session/chunk metadata, server-side DQS/finalization, and isolated Onyx snapshot schema/RLS.
- **ADDED / CI VERIFICATION PENDING:** resume revalidates the exact file size and SHA-256, organization-bound session, profile ID/version, period, and chunk geometry against its existing session; it loads and validates the server's verified chunk manifest as a contiguous prefix and rejects gaps/misaligned offsets/bad hashes/session mismatches. Each job is bound to a fingerprint of its profile version, synonyms, transformations, validation rules, mapping, and merge policy. A resumed job with changed processing configuration or legacy checkpoints lacking this fingerprint is stopped rather than mixing inconsistent rows. Prior verified bytes are reparsed locally to reconstruct CSV quote/header/DQS state without re-uploading/re-writing their rows; each saved chunk digest is checked and persistence resumes at the first unverified chunk. The EOF final row is idempotently upserted to cover interruption after the final chunk checkpoint but before CSV finalization. Raw file bytes remain client-local; only hashes/metadata/structured rows are persisted.
- **ADDED / CI VERIFICATION PENDING:** the unified import engine now reads the first visible worksheet of standard XLSX ZIP workbooks, resolving the worksheet relationship, shared/inline strings, boolean/error cells, date-formatted serials, and simple numeric zero masks (preserving item codes such as `000125`). It enforces ZIP member/entry-count/expanded-byte limits, rejects malformed/unsafe paths and unsupported compression, and streams worksheet rows into the existing profile validation, DQS and database staging pipeline without retaining the entire parsed row set. Formula cells use their cached values; formulas are not recalculated. **STILL NOT PROVEN:** broad real-world XLSX compatibility/browser E2E; legacy binary XLS extraction; trustworthy tabular PDF extraction; browser E2E for pause/cancel/resume/duplicate choices; server-side worker; TTL cleanup worker; large-file memory/performance profile.

## Phase 2 — Operational source of truth, isolated Onyx mirror, inventory reconciliation

### Required behavior
- Live operational DB is the only source of truth for orders, products, prices, customers, purchasing and inventory.
- Operational events feed dashboards, executive analytics, forecasts, reports, alerts and assistant. Executive analytics must show: “تعتمد هذه الشاشة على البيانات المباشرة لحركة التطبيق (مبيعات، مشتريات، مخزون، حركات عملاء، أسعار).”
- Onyx Pro is an isolated analytical sandbox for imported files only. It never updates live commerce tables. After analysis, one vertically scrolling page contains KPIs, charts, deterministic metrics, predictions/recommendations and detailed tables.
- Inventory reconciliation compares imported Onyx stock with live balances, showing source/last-sync time, new/changed/matched/invalid counts, differences, errors and audit log. It is read-only until a separate authorized, reviewed operation commits an adjustment.
- Order idempotency records organization, key, request hash, operation type, response reference, timestamps and status; enforce a unique organization/key/operation constraint. Same-payload retry replays the prior result; changed payload under the same key is rejected. Orders are online only; offline order submission is not permitted.

### Implementation status
- **PARTIAL / PREVIOUSLY TESTED IN ISOLATED DB:** server-side price preview, request-bound idempotency, quantity breaks, credit checks, atomic stock reservation, status history and isolated PostgreSQL coverage.
- **ADDED / CI VERIFICATION PENDING:** immutable Onyx snapshots/rows and persisted reconciliation-run/items with a tenant-bound server RPC. The RPC compares only and does not write inventory.
- **NOT PROVEN:** all analytics use a common operational event pipeline; fully isolated Onyx analytics based only on immutable snapshots; automatic reconciliation; outbox recovery; live concurrency proof.

## Phase 3 — Atomic orders, price security, customer experience, accounting grid

### Required behavior
- Order, invoice head/lines, price snapshot, invoice snapshot, and applicable state changes are one atomic database transaction.
- Never trust client-submitted prices, discounts or quantities; recalculate and revalidate server-side using authorized customer tier and quantity breaks.
- Each order line retains product ID, SKU, product/unit snapshots, requested and approved quantity, price/discount/tax snapshots and line totals.
- Product card full name appears under its image without clipping.
- Customer stepper updates to “تم استلام الطلب” as staff receive/review the order. Return-for-amendment shows a prominent warning. If staff adjusts products, quantities or prices, display bold text: “تنبيه: تم تعديل الأصناف/الكميات بحسب الكميات المتوفرة.” Hide it when no adjustment occurred.
- The original text included conditional totals (≤5 items hide total; >5 show total) and a stricter additional rule requiring all prices/totals hidden from customer order/invoice views at every stage, including pre-submit and My Orders. Apply the stricter privacy requirement consistently to order/invoice views while preserving catalog prices and authorized staff accounting views.
- Exported invoice shows customer number/name in header, avoids duplicating customer name on each line, and uses one document-wide statement.
- Admin accounting grid moves from approved quantity to the next row with Enter; block leaving while edited quantity is unapproved.
- Staff can set a special price for one order without changing company-wide price lists.
- Staff confirmation triggers a payment-request notice below the customer order/invoice; final conversion to sales invoice follows the approved backend transaction.

### Implementation status
- **PARTIAL / PREVIOUSLY TESTED IN ISOLATED DB:** transactional checkout, server price resolver, quantity breaks, idempotency, credit checks, stock reserve/release/consume, legal state transitions, invoice and payment RPCs.
- **ADDED (order-creation UI):** removed the base-price column from the customer quick-order matrix because it is an order-building surface; catalogue/product detail price display and the separately authorized account statement remain distinct surfaces.
- **ADDED (database column-privilege boundary):** customer `authenticated` sessions no longer have table-wide `SELECT` on `orders` or `order_items`; only non-financial columns are granted. Full staff order/line reads now use SECURITY DEFINER RPCs that verify the active staff identity and derive organization scope on the server. Acceptance tests assert customer direct selection of order totals/line prices and `SELECT *` fail, safe fields still read, and the staff RPC returns the correct values within the tenant.
- **ADDED (invoice/statement split):** revoke table-wide customer reads from `customer_invoices`, `customer_invoice_items`, and `customer_payments`; grant only non-financial invoice and line-description columns for the invoice UI. Authorized statement values now come from `get_customer_account_statement`, while staff finance receives tenant-bound financial data from `fetch_staff_finance_data`. Acceptance tests cover customer amount-denials and the allowed statement/staff RPC results.
- **NOT PROVEN UNTIL CI:** migrations and direct privilege denial must pass on the exact commit; production Supabase and authenticated browser E2E remain separate release gates.
- **ADDED / CI VERIFICATION PENDING:** requested/approved quantity and price-override metadata, adjustment notice/payment-request lifecycle fields.
- **ADDED / CI VERIFICATION PENDING:** the order-review editor now reports dirty/staged state to the admin shell immediately; sidebar links, quick-command navigation, storefront switching, sign-out and back controls refuse to leave; TanStack Router `useBlocker` also blocks route transitions and browser before-unload while review is unapproved, with a return-to-review dialog. This is code-level protection; authenticated browser/E2E proof remains open.
- **NOT PROVEN:** authenticated browser sweep over every customer order/invoice route and intercepted API response; full edit-and-approve recording; server-authorized price override and invoice snapshot consistency under production RLS; payment-request runtime behavior; server-generated PDF.

## Phase 4 — Outbox, background queues, cache and Arabic search

### Required behavior
- Write business state and outbox event in one transaction. At-least-once delivery plus unique event IDs/idempotent consumers provides effectively-once effects.
- Restart recovery detects stuck outbox events and re-delivers without duplicating business effects.
- Separate Import, Analytics, Forecast, AI, Export/Notification and Reconciliation queues. Each job has memory/read-batch/time limits; exceed budget → graceful termination and dead-letter queue.
- Arabic normalization, exact SKU, prefix and fuzzy search; API P95 target <150ms and versioned normalization/re-indexing.
- Cache uses SingleFlight/request coalescing, TTL jitter, negative caching, and tenant/entity/version/snapshot-aware keys. WebSocket loss falls back to targeted polling without missed records.

### Implementation status
- **EXISTING / PARTIAL:** outbox_events and idempotency structures already existed.
- **ADDED / CI VERIFICATION PENDING:** outbox lock/retry/dead-letter metadata, queue/job/attempt tables, SKIP LOCKED worker claims, Arabic normalization function and SKU/barcode/name indexes.
- **ADDED (frontend search path + shared utility + unit tests):** storefront catalog and customer quote/reorder searches share Arabic normalization (harakat/tatweel removal; common alef/hamza and alif-maqsura folding), normalized substrings/prefixes, bounded one-edit fuzzy matching on names, and exact/prefix-only SKU/barcode matching. Tests cover Arabic variants, prefix/fuzzy names, and protection against fuzzy SKU matches. **NOT PROVEN:** measured P95 <150ms, large-catalog profiling, server-side query indexes/re-index orchestration, or full cross-screen browser E2E.
- **NOT PROVEN:** deployed workers, recovery drill, DLQ retry, replay/crash consumer idempotency, cache protections, WebSocket-to-polling correctness, measured P95.

## Phase 5 — AI governance, deterministic analytics, action cards, usage ledger

### Required behavior
- Monetary, inventory, debt-age, margin and KPI arithmetic is deterministic SQL/code. LLMs explain computed numbers and trends but never invent/calculate facts.
- Rule Engine creates explicit triggers (e.g. stock below threshold); AI may explain and suggest action.
- Before LLM: untrusted-content extraction → sanitization → injection detection → structured extraction → deterministic context → LLM payload.
- Sensitive data routes only to local/private models; nonsensitive aggregates to controlled server sandbox; anonymous public information only to external services with explicit approval.
- Action card contains action buttons, Why, source metrics, calculation, snapshot ID, confidence and expected impact. Insufficient history returns “Forecast Unavailable: Insufficient Historical Data”.
- Ledger records request/model/input/output tokens/cost/duration/time. Daily/monthly/per-request quotas enforced; 100% budget denies LLM and uses rules fallback.

### Implementation status
- **PARTIAL:** deterministic Arabic assistant queries stored orders, invoices and catalog; no external LLM and no invented values. Customer assistant order-status queries now omit monetary fields, and invoice help retrieves only invoice identifiers/status/dates; account balances stay on the separate account-statement surface. A regression test protects these response summaries from leaking extra monetary properties. **Still NOT PROVEN:** runtime authorization/RLS, prompt-injection defenses, model routing, quota enforcement, and any model-backed forecasts or action execution.
- **ADDED / CI VERIFICATION PENDING:** usage ledger/budget and recommendation-card schema.
- **NOT PROVEN:** sanitizer and prompt-injection suite, model routing/privacy enforcement, quota enforcement in real gateway, actions, forecasts or model-backed insights. This work configures no AI service key.

## Phase 6 — Security, sessions, pricing integrity and privacy

### Required behavior
- Password uniqueness and one-active-session controls as requested in the source.
- Apply strongest screen-capture protection supported by platform (Android FLAG_SECURE; iOS capture notifications/isCaptured); state browser limitations instead of claiming full prevention.
- Tenant context derived from authenticated server session. Never trust frontend-supplied organization_id for privileged mutation.
- Secure RLS on exposed tables; UPDATE policies use USING and WITH CHECK; privileged functions use minimal grants and pinned search_path; views must not bypass RLS.
- Price/order/finance mutations are server-authoritative, atomic and audited.

### Implementation status
- **EXISTING / PARTIAL:** tenant-aware policies for new commerce tables, constrained SECURITY DEFINER functions, checkout/stock integrity.
- **ADDED / CI VERIFICATION PENDING:** tenant policies for import/outbox/pricing and tenant-owned platform schemas.
- **BLOCKED / REVIEW REQUIRED:** global password-reuse detection must not use plaintext storage or an unsafe deterministic verifier. A safe approach requires a trusted secret-backed server mechanism and privacy/security review. Single-session revocation must be verified against Supabase's actual session lifecycle.
- **PLATFORM LIMITATION:** standard browser code cannot guarantee Android FLAG_SECURE or prevent iOS screenshots; native-wrapper support is required.

## Phase 7 — Performance, resource limits and disaster recovery

- Interactive API target P95 <300ms; import preview target <2 seconds.
- Heavy tasks run asynchronously with per-job timeout/memory budgets, non-blocking progress, percentage, current stage, processed/remaining, throughput, ETA, Cancel, Pause and Retry Failed Chunks.
- Test backup restoration, worker restart, stuck jobs and outbox replay.
- **NOT PROVEN:** measured production P95, 100k-row preview latency, memory profile, backup restore, active failover or disaster-recovery drill.

## Phase 8 — Acceptance matrix and end-to-end regression

Required field scenarios:
- **REQ-IMP-001:** Import 1,000 SKUs including 000125; prove it persists as a string and re-import does not duplicate; provide DB and manifest evidence.
- **REQ-SEC-PASS-001:** Reject prohibited password reuse with the required Arabic message using an approved safe server design, without plaintext storage.
- **REQ-ORD-SYNC-001:** Staff edits approved quantities with Enter navigation; customer stepper updates and adjustment warning appears; provide browser recording/event evidence.
- **REQ-AI-001:** Malicious prompt injection in import document/product name is sanitized; retain sanitizer and payload audit evidence.
- **REQ-SEC-001:** Tenant A cannot read/change tenant B data by sending another organization_id; expected authorization rejection with RLS/security-event evidence.

Definition of Done:
1. Reversible, backward-compatible migrations.
2. Real backend logic connected to APIs/engines.
3. Interactive frontend connected end-to-end.
4. Runtime validation and regression/acceptance tests pass.
5. Final item-by-item evidence report; never claim completion from schema/UI/stubs alone.

## Additional order-review and pricing requirements

- If staff changes quantity without clicking “اعتماد الكمية”, block leaving current section/tab and show an approval notice.
- After staff confirms an order, request payment from customer and display the notice under the customer invoice/order. Final sales-invoice conversion follows backend approval transaction.
- Replace strong yellow quantity-active color with calm light blue/mint/neutral gray; distinguish active, changed, approved and default states.
- Hide prices/totals from customer order/invoice views at all stages (pre-submit, pending, approved, confirmed and My Orders); preserve catalog prices and staff accounting.
- Four calculation modes apply to wholesale and retail (or selected tier): percentage on base; margin percentage of selling price; fixed price; add/subtract amount. Priority/scope/tier must be explicit and audited.
- Removing/deactivating the last applicable rule resets derived wholesale and retail columns to base_price.
- **EXISTING ENGINE + NEW ADMIN UI / CI VERIFICATION PENDING:** the administration now supports create, activate/deactivate, and delete actions for pricing rules, including scope (all/product/category), tier target, four calculation methods, base source, quantity threshold, price bounds, priority and effective period. Database triggers refresh derived wholesale/retail columns and the new audit trigger records rule mutations. The change adds isolated database acceptance tests for each formula, wholesale-only targeting and resetting both derived columns to `base_price` after deleting the final applicable rule. Editing existing unlocked rules is now supported in place with input validation, immutable configuration and version increment. Rules flagged for approval remain read-only in this UI so the edit action cannot bypass approval governance. A governed approval action and customer-tier price preview remain open. Explicit legacy quantity-tier prices remain supported to avoid silently breaking previous checkout contracts.
- **NOT PROVEN UNTIL CI PASSES:** isolated acceptance tests for the new rule CRUD/audit migration and tier-price reset. **STILL OPEN:** edit existing rule in place, authenticated approval workflow, customer-tier price preview integration, and live-production pricing regression proof.

## Change log

- 2026-10-09: source-derived phase and acceptance map recorded. This is a control document, not a completion assertion.
- 2026-10-09: additive platform migration adds import/profile metadata, server-side quality scoring and snapshot creation, isolated Onyx rows, comparison-only reconciliation, queue/AI-governance schemas, tenant policies, and pricing/order-review foundations. Live rollout is blocked pending exact project identity.
- 2026-10-09: incremental SHA-256, streaming CSV parsing, limits, leading-zero-safe normalization, DQS accumulator and acceptance-threshold helpers added. CI/runtime must be checked against the exact final commit.
- 2026-10-09: customer assistant privacy hardening avoids fetching order/invoice monetary columns in the customer assistant paths; targeted regression coverage added. Build and unit CI proof pending for this patch; authenticated browser/runtime proof remains separate.

- 2026-10-09: follow-up pricing administration adds tenant-scoped rule creation/status/deletion, form validation, visible legacy-scope warnings, audit logging, and database acceptance scenarios for all four formulas, retail/wholesale targeting, and base-price reset. Production database changes remain blocked pending confirmation of the exact Supabase project.

- 2026-10-09: order review navigation guard added across internal admin routes, quick navigation, storefront links, sign-out, browser route changes and before-unload; live browser/E2E proof remains a separate gate.

- 2026-10-09: resumable CSV processing now validates the tenant-bound server manifest as a contiguous verified prefix, checks chunk digests during replay, suppresses writes/registration for verified chunks, safely persists rows at the first unverified checkpoint, and covers the EOF-row recovery edge case. Exact-head CI and authenticated browser proof remain required.

- 2026-10-09: resumable import jobs now persist a processing-configuration fingerprint and refuse partial continuation if profile/synonyms/transformations/validation/mapping/merge policy changed. Legacy partial sessions without a fingerprint are fail-closed and require a new version rather than mixing rows.

- 2026-10-09: import resume additionally verifies the session's persisted organization/profile/version/period identity against the active job and rejects cross-profile or cross-period continuation.

- 2026-10-09: import configuration fingerprints use recursively key-sorted JSON and deterministic lexical synonym ordering; unit tests cover equivalent objects with different key insertion order and distinct transformation rules.

- 2026-10-09: pricing cards now open the shared create/edit form for existing unlocked, supported, non-approval-governed rules. The update API reuses the same validation/database field mapping as creation, checks organization ownership and manual lock/approval flags, increments rule version, and relies on the existing pricing recalculation and audit triggers. CI verification pending on this feature branch.

- 2026-10-09: XLSX first-visible-sheet parsing connected to the official Unified Import Engine; acceptance fixture covers shared strings, inline text, Arabic sheet names, and zero-masked numeric SKU preservation. XLS/PDF continue to use explicit manual-mapping fallback until trustworthy parsers are available.

- 2026-10-09: added a shared Arabic catalog search matcher to storefront, customer quote and reorder screens, with bounded fuzzy name matching and strict exact/prefix identifier matching; dedicated regression tests added. Runtime/browser and performance targets remain separate proof gates.

- 2026-10-09: removed base-price display from the customer quick-order matrix to align the order-building screen with customer order-price privacy; catalogue/product detail pricing remains a separate intentional catalog surface. Full browser and API-response privacy acceptance is still required.

- 2026-10-09: hardened order financial-column privacy at PostgreSQL grants (not just UI field selection); moved staff full-row reads onto tenant-bound RPCs and added database-acceptance assertions for denied customer price access and authorized staff access.

- 2026-10-09: moved account-statement and staff-finance reads to explicitly authorized RPCs, while removing customer table-wide SELECT privileges from invoice/payment tables and granting only safe invoice metadata/line-description columns. Direct price/total/payment amount access is covered by isolated PostgreSQL acceptance tests.
- **ADDED (statement identity isolation):** the customer account-statement RPC now rejects inactive profiles by validating the authenticated user/profile binding server-side. Isolated PostgreSQL tests prove a second customer in the same organization cannot read the first customer's invoice/payment statement and inactive profiles cannot invoke the statement RPC.

- 2026-10-09: added a tenant-derived `create_staff_order` RPC that creates the order header and all lines in one transaction, recalculates prices from the shared server resolver, ignores client-supplied item descriptors/prices, and binds retries to a normalized idempotency payload. Authenticated direct INSERT/UPDATE/DELETE on `orders` and `order_items` is restricted; guarded status-only updates remain available. New isolated PostgreSQL acceptance cases cover forged price/name/SKU values, idempotent replay, changed-payload rejection, and direct-write denial. **CI pending on the feature PR; production Supabase/runtime remains a separate release gate.**
