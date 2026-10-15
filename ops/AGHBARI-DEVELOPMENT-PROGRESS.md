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
