# Aghbari Commerce — Development Progress Ledger

**Baseline before execution:** `f385e3406d5b85b58c88d92d6db4e3029c002585` on `main`, 2026-10-15. Evidence belongs to the exact tested SHA only.

| Area | Baseline status | Evidence | Open closure |
|---|---|---|---|
| Unit tests | PASS | CI run 38681026977 unit step passed | Rerun on next exact SHA |
| Isolated DB acceptance | PASS | PostgreSQL 17 migration/workflow step passed | Rerun; not production DB proof |
| Lint/build/dev smoke | FAIL / SKIPPED | `prefer-const` at `previewAuthStorage.ts:38`; later steps skipped | Fix and rerun all gates |
| Atomic orders/idempotency | PARTIAL | Isolated transaction rollback, price authority, replay-key and state/stock tests | Authenticated browser E2E and production concurrency |
| Pricing | PARTIAL | Rule CRUD/approval and formula tests exist | Prove three tiers and data-channel privacy |
| Import engine | PARTIAL | CSV/XLSX primitives, DQS, chunk manifests and snapshots | Browser resume/cancel, rollback, compatibility, TTL and 100k-row profiling |
| Onyx | PARTIAL | Snapshots and comparison-only reconciliation | Shared reporting/source lineage and real workbook acceptance |
| Invoices/statements | PARTIAL | Pages and RPC foundations | Target DB flow, overpayment test, server PDF |
| AI platform | PARTIAL | Deterministic assistant and governance schema | Provider registry/Test Connection, budget, sanitizer, evidence-backed recommendations/fallback |
| Offline/PWA | PARTIAL | Cached catalog and local cart draft | Stale-data and reconnection tests; no offline order approval |
| Tenant isolation | NOT PROVEN in target | Isolated DB evidence; fixed tenant constants remain | Server-derived tenant and cross-tenant denial in target |
| Address book/company users | OPEN | Listed in roadmap | Implement after schema/RLS review |
| WhatsApp | BLOCKED EXTERNALLY if provider absent | In-app notifications exist | Official API/credentials/templates and external message IDs |
| Production/Lovable | NOT PROVEN | README says main is connected to Lovable | Verify exact deployed/preview SHA and runtime |

## Next acceptance gate
Exact-head CI must show unit tests, isolated PostgreSQL acceptance, lint, build, and port 5173 smoke all passing. Then verify target Supabase identity/schema and authenticated E2E. Production and Lovable release remain unproven until directly observed.
