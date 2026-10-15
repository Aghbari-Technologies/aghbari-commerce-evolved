# Live Supabase schema reconciliation checkpoint — 2026-10-15

## Verified target identity

- Supabase project: `aghbari-commerce`
- Project ref: `mrcyqezbhpncuvaehwgf`
- State observed: `ACTIVE_HEALTHY`
- PostgreSQL: 17.6.1
- Existing deployed Edge Functions: `outbox-worker` v1 and `customer-invitations` v3
- GitHub repository: `Aghbari-Technologies/aghbari-commerce-evolved`
- Main at inspection: `39d2dec8752e973e9661c5564d85309f6df6f73a`

The active Supabase project was positively identified by its name and existing Aghbari Commerce Edge Functions. The previous `supabase/config.toml` ref `ffxxjaolfntzbapmfbuv` was not present in the connected project's list, so the CLI target has been corrected to the active project.

## Production-vs-repository drift (read-only inspection)

- Live migration registry: 133 rows; latest recorded version `20260925040254` (`harden_client_ui_settings_admin_boundary`).
- The current repository contains 31 timestamped migrations starting at `20261006063522_d656e1d4-1ca3-4cd7-8542-504968bc356c.sql` and ending at `20261015190000_outbox_worker_lifecycle.sql`.
- Live-schema introspection confirms these objects are absent: `public.ai_usage_budgets`, `public.outbox_event_deliveries`, `public.claim_outbox_events(text,integer,integer,uuid)`, and `public.get_ai_gateway_budget()`.
- The first repository migration is a fresh-schema baseline using plain `CREATE TABLE` statements. It is **not** safe to replay unchanged over the already-populated live database because core tables already exist.
- The deployed `outbox-worker` v1 is a different integration contract: it sends claimed events to `OUTBOX_WEBHOOK_URL`, authenticates with `OUTBOX_WORKER_TOKEN`, and calls older RPC signatures. Do not replace it until the live-schema migration path and required webhook compatibility are explicitly reconciled.
- The new AI-gateway migration and the outbox-worker lifecycle migration passed the repository's isolated PostgreSQL 17 migration acceptance; that verifies the clean test schema only, not this live schema.

## Deployment gate — open, no live DDL applied by this checkpoint

1. Build a forward-only compatibility migration for the existing 133-migration database. Do not apply the fresh-schema baseline wholesale or mark missing migrations as applied without schema equivalence proof.
2. Run the compatibility migration and dependent new migrations against a database branch or restored staging clone with the current live schema, then inspect the migration list and security/performance advisors.
3. Preserve and test the existing outbox webhook contract, or deliberately migrate its caller and worker together.
4. Apply the reviewed compatibility migrations to `mrcyqezbhpncuvaehwgf`; only then deploy the new outbox worker and AI gateway.
5. Before AI Test Connection can pass, configure Edge Function secrets `AI_OPENAI_COMPATIBLE_API_KEY` and/or `AI_GEMINI_API_KEY`, plus the explicit per-1,000-token cost-rate variables shown in the Admin AI Center. No provider keys belong in database rows or browser fields.

## Proof classification

- Repository code + isolated PostgreSQL acceptance: **verified for the current PR head**.
- Live schema and deployed function inventory: **read-back verified**.
- Live compatibility migration: **not implemented/applied**.
- AI provider secret configuration, live provider test, and production user journey: **not verified**.
- Existing live schema was inspected read-only; no customer rows, secrets, or live schema were changed during this checkpoint.
