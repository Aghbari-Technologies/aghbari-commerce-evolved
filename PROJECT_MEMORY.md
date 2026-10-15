# PROJECT MEMORY — متجر الأغبري | Aghbari Commerce

**Canonical repository:** https://github.com/Aghbari-Technologies/aghbari-commerce-evolved  
**Canonical branch:** `main`  
**Lovable editor listed in README:** https://lovable.dev/projects/851f6f5c-d23d-45a6-9568-1452d5cfdd73  
**Public preview:** https://aghbari-commerce-evolved.lovable.app  
**Canonical product name:** متجر الأغبري | Aghbari Commerce

## Read these first at the start of every session
1. `ops/AGHBARI-SESSION-RESUME.md` — copy-ready recovery/startup prompt and resume procedure.
2. `ops/AGHBARI-LATEST-EXECUTION-STATE.md` — last known operational state, SHA, evidence and blockers.
3. `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md` — the single gap register / execution index.
4. `docs/canonical/AGHBARI-EXECUTION-MANDATE.md` — enduring implementation and cost-control rules.
5. `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md` — complete user-supplied engineering spec (authoritative source).

Do not reread the repository broadly when these records answer the question. Inspect only the paths and evidence necessary for the next open acceptance gate; update these records in the same commit as materially related implementation.

## Product identity and architecture
- Only use **متجر الأغبري | Aghbari Commerce** as product identity. Never use العامري / Alamri / Amiri / بوابة العامري as the product name.
- This repository is a Vite + React + TypeScript + Supabase application with migrations and TanStack Router.
- Preserve working code/history and extend the current product. No rewrite from scratch, broad cleanup, or duplicate engine.
- Onyx Pro must be part of the single Aghbari product/data/reporting experience; preserve external source lineage and avoid double-counting accounting balances. Until a real API/file contract is verified, do not claim a live connection.
- Default UI Arabic RTL; English-ready, responsive desktop/tablet/mobile, accessible states.
- Server/database are authoritative for tenant, role, customer pricing tier, amounts, stock, credit and order approval.
- No simulated business success. Untested or unconfigured functions must show explicit honest states.

## Durable execution protocol
`INSPECT → CLASSIFY GAPS → IMPLEMENT → CONNECT → TEST → FIX → VERIFY → COMMIT → PUSH MAIN → SYNC LOVABLE`.

Use one requirement registry only. Classify items as COMPLETE/PROVEN, PARTIAL, WEAK, DISCONNECTED, MISSING—BACKEND EXISTS, MISSING—NO VERIFIED CONTRACT, or BLOCKED EXTERNALLY. A component, route, schema, local test, or push alone is not production completion evidence.

## Lovable budget
The owner specified a hard budget of five Lovable points. Do not spend points on repository discovery or code generation. Finish and test source changes first, push main, then use a point only for a concrete blocker that cannot be resolved from Git/source. A Git push is not synchronization proof. Never invent sync status.

## Safety and change rules
- Never place real secrets in the repo; use environment/secrets settings. `.env` is ignored and `.env.example` has blank values.
- Never apply production migrations until Supabase project identity, authorization and schema are directly verified.
- Do not transfer CI evidence from one SHA to another.
- Preserve Onyx snapshot lineage and keep stock reconciliation read-only unless a separate approved transaction exists.
- Orders must be atomic, server-priced, idempotent and server-validated.
- Deterministic SQL/domain calculations only; AI may explain measured metrics. Do not invent forecasts when history is insufficient.
- For WhatsApp, AI providers, backups/restore, and production APIs, distinguish implemented code from a configured, directly tested integration.
- Do not store sensitive user data such as passwords, tokens, production secrets, service-role keys, or personal identifiers in this memory.

## State pointers
- Latest exact SHA and active CI: `ops/AGHBARI-LATEST-EXECUTION-STATE.md`.
- Requirement classification: `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`.
- Progress history/evidence: `ops/AGHBARI-DEVELOPMENT-PROGRESS.md`.
- Full user master specification: `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md`.
- Continuation prompt: `ops/AGHBARI-SESSION-RESUME.md`.

## Latest source checkpoint — 2026-10-15

- PR #26 (server-derived tenant context and restrictive RLS) merged to `main`; merge SHA before this memory/ledger update: `fe22af0424947b56ae80e0679621cf0df333e284`.
- Exact PR head `c117b0eee5b19411c1fa3bf5162dbef1e939455f` passed [CI 38689077672](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689077672). Main merge SHA passed [CI 38689238295](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689238295). These runs include unit tests, isolated PostgreSQL 17 applying all migrations and cross-tenant denial tests, lint, build and port 5173 route/PWA smoke.
- Changed files: `src/lib/supabase.ts`, `src/lib/api.ts`, `src/components/CustomerWorkflows.tsx`, `src/components/AdminPages.tsx`, `supabase/migrations/20261015090000_server_derived_tenant_context.sql`, `scripts/test-database-migrations.mjs`.
- Status remains **PARTIAL, not production-certified**. Client constants were removed; authenticated scope is server-derived and restrictive RLS is covered by isolated CI. No live migration was applied because intended Supabase project `ffxxjaolfntzbapmfbuv` is inaccessible. Authenticated browser E2E, public/anonymous tenant routing, and all price-tier privacy channels remain open.
- Lovable editor access/sync is unverified; no Lovable points were spent. Never infer sync/deploy from Git push or CI alone.
