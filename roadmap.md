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
- [x] Finance/quote RPC hardening, tenant-scoped RLS policies for the new tables, and prevention of first-signup automatic administrator assignment.
- [x] CI workflow runs tests, correctness lint (excluding the repository-wide Prettier formatting rule), and production build.

## Still open — do not mark complete until verified

- [ ] Apply migrations `20261009010000`, `20261009020000`, and `20261009030000` to the Supabase project configured by this repository's `.env`. The connected Supabase tool currently denies access to that project, so no database writes have been attempted.
- [ ] Run authenticated browser end-to-end checks for customer and staff flows against that exact database, including invoice issue, statement totals, payment overpayment rejection, RFQ/quote expiry, reorder restore, camera fallback, and offline recovery.
- [ ] Harden the pre-existing checkout RPC for authoritative tier pricing, credit-limit policy, inventory reservation/oversell prevention, and request idempotency. The legacy `place_order` implementation still prices from `base_price`; the roadmap's previous claim that all contract/credit checks were complete was premature.
- [ ] Customer address book and company-user management.
- [ ] Matrix order entry and command palette.
- [ ] Native/server-generated PDF documents (current invoice/statement output uses the browser print dialog).
- [ ] Model-backed Lovable AI integration and generated business insights. The current assistant is deliberately deterministic and database-backed.
- [ ] Full offline field-sales queue and conflict-safe synchronization after reconnect. Current support is cached catalogue + cart draft only; it does not place orders offline.
- [ ] Merge the PR to `main` only after migrations can be applied safely and the required database/browser checks pass. Verify the Lovable sync and deployed URL after merge.

## Evidence rules

- Passing tests/build on the PR proves compilation and the listed unit/routing checks only. It does not prove database migrations, RLS behavior, browser flows, payment processing, or production deployment.
- No migration was applied and no production deployment was performed as part of this branch work.
