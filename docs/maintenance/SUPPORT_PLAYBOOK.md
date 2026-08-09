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

## 8. Search Analytics Operations

Weekly retention policy:

- Workflow: `.github/workflows/search-analytics-ops.yml`
- Schedule: every Monday at 04:00 UTC
- Dry-run command: `npm run search:analytics:cleanup:dry`
- Cleanup command: `npm run search:analytics:cleanup`

Required repository secrets:

- `PROD_DATABASE_URL`: production database URL for retention cleanup
- `E2E_ADMIN_EMAIL`: admin account for search analytics e2e
- `E2E_ADMIN_PASSWORD`: admin password for search analytics e2e

Verification routine:

- Confirm workflow run status is `success`
- Save dry-run output summary (threshold and affected rows)
- Save cleanup output summary (deleted rows)
- Attach the run URL to release notes or ops journal

Bootstrap commands (repository admin):

- `gh secret set PROD_DATABASE_URL --body "<production database url>"`
- `gh secret set E2E_ADMIN_EMAIL --body "<admin email>"`
- `gh secret set E2E_ADMIN_PASSWORD --body "<admin password>"`
- `gh workflow run search-analytics-ops.yml`
- `gh run list --workflow search-analytics-ops.yml -L 1`
- `gh run view <run-id> --log`

Important:

- The workflow appears in GitHub Actions only after `.github/workflows/search-analytics-ops.yml` is pushed to `main`.
