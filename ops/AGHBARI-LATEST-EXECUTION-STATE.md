# Latest live checkpoint before this protocol update — 2026-10-15

- **Remote `main` HEAD:** `943c8cc0279318da751634101a6114c2d90566fc` (commit dated 2026-10-15T06:21:28Z): https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/commit/943c8cc0279318da751634101a6114c2d90566fc.
- **Exact-SHA CI:** [run 38691930376](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38691930376) completed **SUCCESS** for exactly `943c8cc0279318da751634101a6114c2d90566fc`. This baseline PASS does not apply to any later commit.
- **Ref safety:** GitHub reports `main` is not branch-protected. Use a non-forced expected-SHA lease for any remote ref update; abort and re-inspect if the expected SHA no longer matches.
- **Local checkout limitation:** no checkout is mounted in this execution host. The remote branch/commit/Actions were checked through GitHub API. Local `git fetch origin`, `git status --short --branch`, current local branch, and local `HEAD` have **not** been run here; working-tree state is **UNKNOWN**.
- **Permanent instruction anchors verified present:** root `AGENTS.md` and `.github/copilot-instructions.md`. The Copilot entry-point file is committed on `main`; actual loading of instructions by Lovable/other hosts and sync to the editor are not proven by repository text or push.
- **Protocol batch scope:** maintain and tighten existing canonical resume controls only; no new parallel registry/progress file, no broad source discovery, no Lovable point spent. Relevant files: `PROJECT_MEMORY.md`, `ops/AGHBARI-SESSION-RESUME.md`, this file, `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`, `docs/canonical/AGHBARI-EXECUTION-MANDATE.md`. The full master specification is deliberately untouched.
- **`next_task_id = AGH-SEC-BROWSER-E2E-001` — OPEN.** Continue with source-runnable authenticated customer/staff browser acceptance and tenant/pricing privacy checks using non-production fixtures.
- **`blocked_task_id = AGH-EXT-SUPABASE-001` — last recorded external blocker.** Intended project ref is `ffxxjaolfntzbapmfbuv`; verify current authorized access before production use. Do not apply migrations to another project.
- After this protocol batch is committed, independently read the new remote `main` SHA and its own Actions result before treating the batch as verified. Do not inherit the baseline SHA's CI result.

---
# Aghbari Commerce — Latest Execution State

## Active resume checkpoint — 2026-10-15

- **Remote branch:** `main`; the source baseline checked immediately before this protocol-only batch was `8324f22419a967fc86f20dddc3b8650a6fd89390` ([commit](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/commit/8324f22419a967fc86f20dddc3b8650a6fd89390)). Its commit date was 2026-10-15 06:10:49 UTC.
- **Exact-SHA CI:** [run 38690894558](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38690894558) for that exact SHA completed **SUCCESS**; workflow job `test-and-build` concluded success. This evidence applies to `8324f224...` only, not to any later documentation commit.
- **Persisted protocol commit verified:** `e34dfebc44a7ec72dfed5bc3475e82aa4898a651` passed [CI run 38691694726](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38691694726) **SUCCESS**. A follow-up documentation correction normalizes the tenant-isolation registry row; verify the exact resulting HEAD/CI and never inherit this PASS.
- **Source evidence in that baseline:** public storefront reads resolve scope from server-side publication configuration; isolated PostgreSQL migration tests assert tenant-scoped anonymous product/inventory visibility and deny direct reads of purchase cost, customer price tiers, reserved inventory fields, and private admin settings. Public catalog cache sanitization was added. This does not prove production Supabase or authenticated browser E2E.
- **Repository/session instruction entry points:** root `AGENTS.md`; GitHub Copilot repository instructions `.github/copilot-instructions.md`; canonical references below. GitHub documents repository-wide Copilot instructions under that exact path. Whether Lovable automatically loads these files remains **UNVERIFIED** and must be confirmed in that host rather than assumed.
- **`blocked_task_id = AGH-EXT-SUPABASE-001`:** last-known external blocker is access to the intended project `ffxxjaolfntzbapmfbuv`. This batch did not access or mutate any production Supabase project; re-verify the same intended project before declaring the blocker current or trying a migration.
- **`next_task_id = AGH-SEC-BROWSER-E2E-001` — OPEN:** implement/execute authenticated customer/staff browser acceptance and extend existing route/DB evidence to cover actual app flows, tenant boundaries, and privacy of tiered prices across API/RPC/cache/export. Include anonymous storefront checks. Use non-production fixtures; do not apply migrations to production. If the intended Supabase remains inaccessible, keep that blocker explicit and progress the source-runnable test coverage.
- **Local Git note for this execution environment:** no repository checkout was mounted; the shell clone attempt failed because it could not resolve `github.com`. Therefore no local `git status`/local `git fetch origin` result is claimed. Remote branch/commit/Actions were checked through the GitHub integration. The next agent with a checkout must run commands in `AGENTS.md`; working-tree cleanliness is **UNKNOWN**, not inferred clean.
- **Exact-SHA rule:** after this documentation commit is pushed, fetch the resulting remote `main` and its own Actions run. Never transfer the parent SHA's PASS to the new documentation SHA. The next session must read live HEAD first; the SHA above is a baseline, not an assumed future HEAD.

- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`
- Branch: `main`
- Main SHA before this documentation-pointer update: `fe22af0424947b56ae80e0679621cf0df333e284`
- Full owner-supplied spec: `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md`
- Enduring mandate: `docs/canonical/AGHBARI-EXECUTION-MANDATE.md`
- Single requirement registry: `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`
- Session recovery/startup prompt: `ops/AGHBARI-SESSION-RESUME.md`
- Root project memory: `PROJECT_MEMORY.md`

## CI evidence
- [Run 38687301037](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687301037), SHA `f75dcb7fd3f4a598b2acf6db6d649e0f54c92fac`: **PASS**, including unit, isolated PostgreSQL 17 acceptance, lint, build and port 5173 smoke.
- [Run 38687685412](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687685412), SHA `05fcacbf4ddb6bfd025ab4b1fee7c144a44d4459`: **PASS**, including expanded route and PWA asset smoke tests.
- [Run 38687897943](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687897943), SHA `971a49d75b546ccba0a05d8829c8d9c38cae085a`: **IN PROGRESS at last observation**. Confirm latest `main` and CI after the current documentation commit; do not transfer prior PASS status to a new SHA.

## Changes already pushed
- Fixed preview-auth timeout lint blocker and preserved the two-second timeout semantics.
- Operations Center refresh re-fetches active data rather than displaying an unsupported success toast.
- Onyx workspace wording matches the integrated Aghbari product direction; reconciliation stays read-only pending an approved adjustment contract.
- Offer creation is explicitly disabled until an actual create operation exists.
- Data-center connectivity status reflects an actual category query instead of a hard-coded success label.
- Root `.env` removed from the current tree and `.env.example` added with empty values.
- The full uploaded master specification, requirement registry, execution mandate, project memory, session resume prompt, state and progress ledger are persisted on main.

## Remaining blockers / high-priority gaps
1. Supabase project `ffxxjaolfntzbapmfbuv` is not accessible via the currently connected Supabase integration. Do not apply migrations to a different project.
2. Fixed browser organization/warehouse constants have been removed from the scoped API and customer/admin consumers. A server-derived tenant-context RPC and restrictive policies for authenticated users are merged and pass isolated PostgreSQL CI. Production isolation remains **unproven** until the correct Supabase project is accessible, its migration is authorized/applied, authenticated browser E2E passes, and anonymous storefront tenant routing is verified.
3. Authenticated customer/staff browser E2E, three-tier price privacy over API/RPC/cache/export, production migrations, server-generated invoice PDF and Onyx workbook compatibility are not proven.
4. AI provider registry/secret-backed test connection/budgeting/privacy sanitization, deployed workers and official WhatsApp delivery remain partial or externally blocked.
5. Public preview loads home/login/admin/order pages but external extraction returned 404 for several deep route/PWA URLs; reproduce in an authenticated real browser. Lovable editor returned 403 through external inspection. Exact sync is not proven.
6. Production restore drill, measured P95/large import profile and responsive RTL UAT remain open.

## Safe next step
Read `PROJECT_MEMORY.md` and `ops/AGHBARI-SESSION-RESUME.md`; then verify live `main` HEAD and latest CI once, and continue from the first open security/release gate in the requirement registry. No broad rediscovery, no fake success, no production mutation without verified access.


## XLSX export implementation — tested code SHA `6112b24c2807fbb013b9fcd2d38c889631286a7c`
- Added `src/lib/onyx-export.ts`: a dependency-free OOXML/ZIP workbook generator, exact 27-column item sheet using the uploaded section-21 headers, plus separate order/customer metadata sheet. Unavailable mapping values are deliberately blank, and SKU/customer code cells are inline strings so leading zeroes survive.
- Added an order-detail download action in `src/components/AdminPages.tsx`. It is enabled only for confirmed/processing/shipped/delivered orders with no pending review. UI explicitly says actual Onyx-version acceptance and centralized export auditing are not proven.
- Added `src/test/onyx-export.test.ts` for exact columns, row mapping, leading-zero identifiers, ZIP/OOXML structure and filename handling.
- Exact-head CI run [38688167670](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38688167670) completed **SUCCESS**: unit tests, isolated PostgreSQL migration/workflow acceptance, ESLint, build, and expanded customer/admin/PWA smoke tests.
- Important limit: no XLSX viewer or actual Onyx sandbox was accessible; this is a code-verified workbook draft, not a certified Onyx import template. Central audit logging for exports is still open.
- Release blockers unchanged: intended Supabase ref `ffxxjaolfntzbapmfbuv` unavailable through current connection; public Lovable preview still returns 404 for several deep routes and `/manifest.webmanifest`; Lovable editor probe is 403 and exact deployed SHA remains unproven.

## 2026-10-15 — Server-derived tenant scope and restrictive RLS

- **PR #26 merged to main:** https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/pull/26
- Merge SHA: `fe22af0424947b56ae80e0679621cf0df333e284`.
- Tested PR head: `c117b0eee5b19411c1fa3bf5162dbef1e939455f`; exact-head CI [run 38689077672](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689077672) = **PASS**.
- Merge commit CI [run 38689238295](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38689238295) on exact SHA `fe22af0424947b56ae80e0679621cf0df333e284` = **PASS**.
- Files: `src/lib/supabase.ts`, `src/lib/api.ts`, `src/components/CustomerWorkflows.tsx`, `src/components/AdminPages.tsx`, `supabase/migrations/20261015090000_server_derived_tenant_context.sql`, `scripts/test-database-migrations.mjs`.
- CI gates actually passed: `npm test`; `npm run test:db` against isolated PostgreSQL 17 applying all migrations; `npm run lint -- --rule=prettier/prettier:off`; `npm run build`; dev-server smoke on port 5173 including customer/admin routes and PWA assets.
- New isolated DB checks verify `get_current_tenant_context()` resolves the authenticated profile/organization, foreign-organization products/customers are not visible to staff, and a foreign-organization product insert is denied by restrictive RLS. An earlier exact-head build failed because two components still imported `ORG_ID`; those consumers were corrected and the subsequent exact-head and main CI runs passed.
- **Scope of proof:** these results prove the migration and denial cases in CI’s isolated PostgreSQL 17 environment. No migration was applied to production. The expected Supabase ref `ffxxjaolfntzbapmfbuv` remains inaccessible in the current integration; authenticated real-browser E2E, comprehensive price-tier channel privacy, and public/anonymous storefront tenant routing are not certified.
- Lovable sync remains unverified; do not spend Lovable points or assert deployment based solely on a Git merge/green CI.
