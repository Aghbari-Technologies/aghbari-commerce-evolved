# Aghbari Commerce — completion roadmap

Current implementation branch: `fix/commerce-completion-20261009`  
Pull request: https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/1  
Status: implementation and CI checks are in the draft PR; not merged to `main`. Database migrations have not been applied.

## Implemented in the draft PR

- [x] Customer invoice list/detail with print-to-PDF through the browser.
- [x] Customer statement totals derived from stored invoices and payments; void invoices are excluded.
- [x] Server-side invoice creation on staff order confirmation, with invoice lines and payment-status recalculation.
- [x] Customer RFQ submission, staff quote pricing, customer quote review/accept/reject, and expiry checks.
- [x] Saved reorder templates and safe restoration of selected product quantities into the shopping cart.
- [x] Barcode lookup by typed code or camera where the browser supports `BarcodeDetector`.
- [x] Arabic data-backed commerce assistant for order status, catalogue lookup, invoice summary, and offline guidance. It does not invent database values and does not call an external LLM.
- [x] Limited offline catalogue caching, persisted cart drafts, PWA manifest/service worker, and an explicit warning that current stock/prices must be revalidated online.
- [x] Direct customer paths for the added workspaces and direct `/admin/*` paths for admin sections.
- [x] Finance/quote RPC hardening, tenant-scoped RLS policies for new tables, and safe first-signup role assignment.
- [x] Checkout RPC now includes server-side customer-tier pricing, a persistent idempotency key bound to the exact request payload, explicit cash-on-delivery/credit terms, tenant-safe product validation, and credit checks.
- [x] Checkout displays the server-calculated price preview by account tier and quantity before enabling order submission; order creation rechecks prices on the server.
- [x] Database schema now permits multiple minimum-quantity price breaks per product tier.
- [x] Order confirmation now requires an approved customer, locks/reserves sufficient stock atomically, tracks stock movements, and consumes/releases reservations on delivery/cancellation.
- [x] Order status transitions are constrained to legal next steps and status history is recorded by the database trigger in the same transaction.
- [x] CI workflow runs tests, correctness lint (excluding the repository-wide Prettier formatting rule), and production build.

## Still open — do not mark complete until verified

- [ ] Apply migrations `20261009010000`, `20261009020000`, `20261009030000`, `20261009040000`, `20261009050000`, and `20261009060000` to the exact Supabase project configured by this repository's `.env`. The current Supabase connection does not include that project, so no database writes or live SQL validation have been attempted.
- [ ] Run authenticated browser end-to-end checks for customer and staff flows against that exact database, including invoice issue, statement totals, payment overpayment rejection, RFQ/quote expiry, reorder restore, camera fallback, and offline recovery.
- [ ] Execute database-level tests on the target Supabase project for duplicate checkout replay, tier break pricing, cross-tenant product rejection, credit-limit rejection, concurrent stock reservation, legal state transitions, invoice creation, cancellation-release, and delivery stock consumption. The migration code is committed to the draft PR but is not runtime-proven.
- [ ] Customer address book and company-user management.
- [ ] Matrix order entry and command palette.
- [ ] Apply and verify active contract, `pricing_rules`, and promotion semantics at checkout. Current guaranteed pricing behavior covers per-tier `product_prices` rows and their quantity minimums; the legacy seeded rule/promotion records are not yet safely interpreted as a complete stacking/priority policy.
- [ ] Native/server-generated PDF documents (current invoice/statement output uses the browser print dialog).
- [ ] Model-backed Lovable AI integration and generated business insights. The current assistant is deliberately deterministic and database-backed.
- [ ] Full offline field-sales queue and conflict-safe synchronization after reconnect. Current support is cached catalogue + cart draft only; it does not place orders offline.
- [ ] Merge the PR to `main` only after the matching database migrations can be applied and database/browser checks pass. Until then, the existing Lovable project remains on `main`; these branch changes are not yet visible in the normal Lovable preview or live URL.

## Evidence rules

- Passing tests/build on the PR proves compilation and the listed unit/routing checks only. It does not prove database migrations, RLS behavior, browser flows, payment processing, or production deployment.
- No migration was applied and no production deployment was performed as part of this branch work.
