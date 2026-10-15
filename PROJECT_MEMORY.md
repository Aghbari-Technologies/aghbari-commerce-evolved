# PROJECT MEMORY — متجر الأغبري | Aghbari Commerce

**Canonical repository:** https://github.com/Aghbari-Technologies/aghbari-commerce-evolved  
**Canonical branch:** `main`  
**Lovable editor listed in README:** https://lovable.dev/projects/851f6f5c-d23d-45a6-9568-1452d5cfdd73  
**Public preview:** https://aghbari-commerce-evolved.lovable.app  
**Canonical product name:** متجر الأغبري | Aghbari Commerce

## Read these first at the start of every session

1. `AGENTS.md` — permanent shared agent rules. GitHub Copilot also has the repository-wide entry point `.github/copilot-instructions.md`.
2. `PROJECT_MEMORY.md` — concise product and architecture decisions.
3. `ops/AGHBARI-SESSION-RESUME.md` — short resume procedure; do not require the owner to copy it when the repository is already available.
4. `ops/AGHBARI-LATEST-EXECUTION-STATE.md` — current verified checkpoint and `next_task_id`.
5. `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md` — the only requirement/gap ledger and stable IDs.
6. `docs/canonical/AGHBARI-EXECUTION-MANDATE.md` — enduring execution/cost/safety rules.
7. `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md` — authoritative product acceptance criteria; consult only the portion required for the active task.

## Mandatory session-resume contract

Run `git fetch origin`, inspect `git status --short --branch`, current branch, local `HEAD`, `origin/main`, latest commit, and GitHub Actions for that exact SHA once at session start. Match live remote state to the saved checkpoint, then execute `next_task_id`; do not repeat broad discovery or ask the owner to resend information already stored. Keep `DONE_VERIFIED` closed unless its exact-SHA proof is invalidated by a changed SHA/dependency/input, regression, security finding, or failed relevant test.

After each coherent batch, update the existing state, registry, and resume records with stable task ID, changed paths, real test commands/results, exact tested SHA, next task, and evidence-backed blocker. Commit and push safely to `main`, then independently verify the resulting remote SHA and its own CI. A prior SHA's PASS never transfers to a newer SHA. Lovable synchronization, Supabase production access, Onyx acceptance, AI-provider readiness and WhatsApp delivery each require separate direct evidence.

The repository contains the shared `AGENTS.md` policy and the GitHub Copilot auto-instruction file. This does not prove that Lovable or another host automatically loaded the policy. Check host-specific settings/session evidence before making that claim. The dynamic cursor belongs in the latest execution-state file, not in this memory text, so it is maintained in one place.

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

## Historical source checkpoint — 2026-10-15 (the live cursor is in ops/AGHBARI-LATEST-EXECUTION-STATE.md)

- PR #26 (server-derived tenant context and restrictive RLS) merged to `main`; merge SHA before this memory/ledger update: `fe22af0424947b56ae80e0679621cf0df333e284`.
- Exact PR head `c117b0eee5b19411c1fa3bf5162dbef1e939455f` passed [CI 38689077672](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689077672). Main merge SHA passed [CI 38689238295](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689238295). These runs include unit tests, isolated PostgreSQL 17 applying all migrations and cross-tenant denial tests, lint, build and port 5173 route/PWA smoke.
- Changed files: `src/lib/supabase.ts`, `src/lib/api.ts`, `src/components/CustomerWorkflows.tsx`, `src/components/AdminPages.tsx`, `supabase/migrations/20261015090000_server_derived_tenant_context.sql`, `scripts/test-database-migrations.mjs`.
- Status remains **PARTIAL, not production-certified**. Client constants were removed; authenticated scope is server-derived and restrictive RLS is covered by isolated CI. No live migration was applied because intended Supabase project `ffxxjaolfntzbapmfbuv` is inaccessible. Authenticated browser E2E, public/anonymous tenant routing, and all price-tier privacy channels remain open.
- Lovable editor access/sync is unverified; no Lovable points were spent. Never infer sync/deploy from Git push or CI alone.
