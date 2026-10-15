# Aghbari Commerce — Development Progress Ledger

Rule: tests and evidence apply only to the exact SHA recorded with them. The push and Lovable sync are separate acceptance events. The master spec, mandate, registry, project memory and resume prompt are now persisted on main.

| Item | Current status | Evidence | Next closure |
|---|---|---|---|
| CI at `f75dcb7fd3f4a598b2acf6db6d649e0f54c92fac` | PASS | [Run 38687301037](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687301037) unit/PostgreSQL/lint/build/5173 smoke all successful | The later `main` SHA has a separate CI run; do not transfer this PASS |
| CI at `05fcacbf4ddb6bfd025ab4b1fee7c144a44d4459` | PASS | [Run 38687685412](https://github.com/Aghbari-Technologies/aghbari-commerce-evolved/actions/runs/38687685412) including expanded route and PWA asset smoke checks | Check CI for the newest main SHA; proof is SHA-specific |
| Persistent project requirements | PARTIALLY closed by this batch | Complete owner-uploaded master spec already exists at `docs/canonical/AGHBARI-MASTER-PROJECT-SPECIFICATION.md`; new durable mandate and resume files are being added | Keep updated after each implementation batch |
| Supabase production | BLOCKED EXTERNALLY | Current connector cannot access expected project ref `ffxxjaolfntzbapmfbuv` | Owner/admin access and explicit project identity required; never substitute another project |
| Tenant security | NOT PROVEN in target | Fixed tenant/warehouse IDs remain in client API layer; isolated PostgreSQL tests are not target project proof | Server-derived scope plus negative cross-tenant tests |
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
