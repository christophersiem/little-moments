# Documentation Governance

This file defines what each doc is for and which file is source of truth.

## Source of Truth Map

### Product and UX
- `docs/product.md`
  - Purpose: high-level product scope and current MVP capabilities.
  - Update when: product scope or core value proposition changes.

- `docs/ui-flows.md`
  - Purpose: screen-to-screen user flow overview.
  - Update when: route flow, state transitions, or key interaction order changes.

- `docs/design-system.md`
  - Purpose: UI principles and reusable interaction rules.
  - Update when: design tokens, component rules, or accessibility baselines change.

### Engineering Contracts
- `docs/api.md`
  - Purpose: backend HTTP contract used by frontend/integrations.
  - Update when: endpoint shape, params, auth requirements, or response contracts change.

- `docs/data-model.md`
  - Purpose: readable schema summary.
  - Update when: DB tables/columns/indexes/relationships materially change.
  - Note: SQL files remain canonical.

- `docs/sql/*.sql`
  - Purpose: canonical schema/RLS/RPC migration and setup steps.
  - Update when: any database, policy, or RPC behavior changes.
  - Priority: if SQL and markdown disagree, SQL is authoritative.

- `docs/tech.md`
  - Purpose: runtime architecture, data flow, and environment configuration.
  - Update when: auth/data path, external integrations, or env vars change.

### Behavior Specs
- `docs/specs/*.md`
  - Purpose: behavior contracts for implemented flows (as-built specs).
  - Update when: flow behavior changes (record/save, family roles, detail actions, etc.).
  - Rule: keep specs focused and testable (goal, flow, rules, acceptance criteria).

## Operational Docs Rules
- Keep docs concise and implementation-facing.
- Prefer updating existing file over creating duplicates.
- If a doc is obsolete:
  - either update it in-place
  - or mark it clearly as "Historical Snapshot".

## PR Checklist (Docs)
- Did API change? Update `docs/api.md`.
- Did schema/RLS/RPC change? Update `docs/sql/*` and `docs/data-model.md`.
- Did flow/UI behavior change? Update `docs/ui-flows.md` and affected `docs/specs/*`.
- Did architecture/env/config change? Update `docs/tech.md`.

## Ownership
- Any contributor changing behavior is responsible for doc alignment in the same PR.
