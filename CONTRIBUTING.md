# Contributing Guide

This repository is organized to support fast and safe maintenance.
Use this guide for any change (feature, fix, docs, refactor).

## Branch Strategy

- Base branch: `main`
- Branch naming:
  - `feat/<short-name>`
  - `fix/<short-name>`
  - `docs/<short-name>`
  - `chore/<short-name>`

## Commit Convention

Use short, scoped commits:

- `feat: add ...`
- `fix: correct ...`
- `docs: update ...`
- `chore: clean ...`
- `refactor: simplify ...`
- `test: add ...`

## Development Flow

1. Pull latest `main`
2. Create a branch
3. Make focused changes
4. Run checks locally:
   - `npm run lint`
   - `npm run test`
   - `npm run build`
5. Update documentation if behavior or structure changed
6. Open PR with a clear summary

## Pull Request Checklist

- [ ] Scope is small and focused
- [ ] No unrelated files changed
- [ ] Lint/build/tests pass locally
- [ ] Docs updated (if needed)
- [ ] Screenshots included for UI changes
- [ ] Risks and rollback notes included

## Documentation Rule

If you changed one of these areas, update docs in the same PR:

- Routing -> `docs/ROUTING.md`
- Architecture -> `docs/architecture/overview.md`
- Modules -> `docs/MODULES.md`
- API contract -> `docs/api/endpoints.md`
- Maintenance process -> `docs/maintenance/`

## Review Expectations

Prioritize in review:

1. Regression risk
2. Security concerns
3. Data/API contract compatibility
4. Test coverage gaps
5. Maintainability and readability
