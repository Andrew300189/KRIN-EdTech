# Area Ownership (Operational)

This file defines operational ownership to reduce support latency.

## Domains

- `Auth & Accounts`
  - Paths: `authentication/`, `src/modules/auth`, related routes in `src/app/(auth)`
- `Learning Experience`
  - Paths: `courses/`, `lessons/`, `src/modules/courses`, `src/modules/lessons`
- `AI Features`
  - Paths: `ai/`, `src/modules/ai`
- `Shared UI & UX`
  - Paths: `components/`, `layouts/`, `src/core/components`, `src/core/layouts`
- `Platform & Data`
  - Paths: `database/`, `src/core/services`, CI/workflows, config files

## Incident Routing Rule

1. Route issue to owning domain first.
2. If cross-domain, assign a primary owner and list secondary owners.
3. Primary owner is responsible for final validation and release note.

## Update Policy

When adding a new major module/folder:

- Add it to this ownership map.
- Add support contacts/team label in your internal tracker.
