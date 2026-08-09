# Operations Journal

## 2026-08-01 - Search analytics retention and admin e2e operations

- Added scheduled workflow: `.github/workflows/search-analytics-ops.yml`
- Added weekly cleanup automation (Monday 04:00 UTC)
- Added admin e2e automation for `tests/e2e/search-admin-analytics.spec.ts`
- Required secrets documented in `docs/maintenance/SUPPORT_PLAYBOOK.md`

Local execution notes:

- `npm run search:analytics:cleanup:dry`: success
- Result snapshot: retentionDays=180, deletedHistoryRows=0, deletedMetricRows=0
- Local admin e2e full run: blocked (missing `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` in current environment)

Follow-up:

- Populate repository secrets and run `Search Analytics Ops` via `workflow_dispatch`
- Record first successful workflow run URL below

Current blocker details:

- `gh secret list` returned no secrets in the repository
- `gh workflow run "Search Analytics Ops"` failed because workflow is not yet available on remote (needs push to `main` first)

Execution checklist after push:

- `gh secret set PROD_DATABASE_URL --body "<production database url>"`
- `gh secret set E2E_ADMIN_EMAIL --body "<admin email>"`
- `gh secret set E2E_ADMIN_PASSWORD --body "<admin password>"`
- `gh workflow run search-analytics-ops.yml`
- `gh run list --workflow search-analytics-ops.yml -L 1`
- `gh run view <run-id> --log`
- `npm run test:e2e:admin-search-analytics`

First successful scheduled/manual run URL:

- pending
