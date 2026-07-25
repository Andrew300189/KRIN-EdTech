# Support Playbook

Use this playbook to maintain the project without chaos.

## 1. Triage Incoming Issue

Classify first:

- `production bug`
- `ui regression`
- `api/data issue`
- `build/ci failure`
- `docs/process issue`

Then assign severity:

- `P0` - service unavailable/data loss/security
- `P1` - major feature broken
- `P2` - partial degradation
- `P3` - minor/cosmetic

## 2. Reproduce Fast

- Use exact branch/commit
- Capture route and role/user context
- Capture console/network logs
- Record expected vs actual behavior

## 3. Scope Change Safely

- Keep fix local to one domain area
- Avoid broad refactors during incident fixes
- Add/adjust tests when behavior changes

## 4. Validate Before Merge

Minimum local checks:

- `npm run lint`
- `npm run test`
- `npm run build`

For UI fixes:

- Verify desktop + mobile
- Verify auth and route guards where relevant

## 5. Document After Fix

Update docs when needed:

- Route changes -> `docs/ROUTING.md`
- API changes -> `docs/api/endpoints.md`
- Structural changes -> `docs/maintenance/PROJECT_MAP.md`

## 6. Release Notes Template

- Issue:
- Root cause:
- Fix:
- Risk:
- Rollback:
- Follow-up tasks:

## 7. Ownership Model (Suggested)

- Auth: `authentication/`, `src/modules/auth`
- Learning content: `courses/`, `lessons/`, `src/modules/courses`, `src/modules/lessons`
- AI features: `ai/`, `src/modules/ai`
- Platform/shared: `src/core/`, `components/`, `layouts/`
- Data/infra: `database/`, CI files
