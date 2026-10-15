# Aghbari Commerce — Latest Execution State

- Repository: `Aghbari-Technologies/aghbari-commerce-evolved`
- Branch: `main`
- Baseline before this batch: `f385e3406d5b85b58c88d92d6db4e3029c002585`
- Canonical spec: `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md`
- Requirement registry: `docs/canonical/AGHBARI-REQUIREMENT-REGISTRY.md`
- Progress ledger: `ops/AGHBARI-DEVELOPMENT-PROGRESS.md`

## Baseline evidence
- CI run [38681026977](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38681026977): unit tests **PASS**; isolated PostgreSQL 17 acceptance **PASS**; ESLint **FAIL** at `src/integrations/supabase/previewAuthStorage.ts:38`; build and port 5173 smoke **SKIPPED**.
- The intended Supabase project ref `ffxxjaolfntzbapmfbuv` is not accessible through the current Supabase connector. No production migration is claimed.
- Tenant isolation is not production-certified; `src/lib/supabase.ts` still exports fixed organization/warehouse IDs.

## Changes in this batch
- Fix lint-blocking timeout declaration while retaining the two-second timeout.
- Make Operations Center refresh re-fetch its visible data without unmounting active imports.
- Present Onyx as integrated into Aghbari while keeping reconciliation read-only until a separately approved adjustment.
- Disable inert offer creation instead of implying a saved promotion.
- Derive database status from an actual category query instead of an unconditional success label.
- Store the exact user-supplied spec, gap registry, state and progress ledger.
- Remove local `.env` values from tracking; add `.env.example`.

## Open gates
Production migrations/RLS/session/tenant tests; dynamic tenant context; three-tier price privacy; customer/staff E2E; Onyx contract/workbook acceptance; invoice PDF; AI gateway/provider credentials; deployed workers; official WhatsApp provider; backup restore; measured P95; responsive RTL UAT.

Lovable synchronization remains unproven until project `851f6f5c-d23d-45a6-9568-1452d5cfdd73` is observed loading this exact resulting `main` SHA.
