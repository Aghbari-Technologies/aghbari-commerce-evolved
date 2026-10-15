# Aghbari Commerce — Latest Execution State

- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`
- Branch: `main`
- Main SHA before this documentation-pointer update: `971a49d75b546ccba0a05d8829c8d9c38cae085a`
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
2. `src/lib/supabase.ts` still exports fixed organization/warehouse IDs. Production tenant isolation is not certified until the scope is server-derived and cross-tenant denial is proven.
3. Authenticated customer/staff browser E2E, three-tier price privacy over API/RPC/cache/export, production migrations, server-generated invoice PDF and Onyx workbook compatibility are not proven.
4. AI provider registry/secret-backed test connection/budgeting/privacy sanitization, deployed workers and official WhatsApp delivery remain partial or externally blocked.
5. Public preview loads home/login/admin/order pages but external extraction returned 404 for several deep route/PWA URLs; reproduce in an authenticated real browser. Lovable editor returned 403 through external inspection. Exact sync is not proven.
6. Production restore drill, measured P95/large import profile and responsive RTL UAT remain open.

## Safe next step
Read `PROJECT_MEMORY.md` and `ops/AGHBARI-SESSION-RESUME.md`; then verify live `main` HEAD and latest CI once, and continue from the first open security/release gate in the requirement registry. No broad rediscovery, no fake success, no production mutation without verified access.
