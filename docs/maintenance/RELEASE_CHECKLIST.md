# Release Checklist

Use this checklist before deploying from `main`.

## Pre-Release

- [ ] PR approved
- [ ] CI green (`lint`, `test`, `build`)
- [ ] No high-severity open bugs
- [ ] Database migration impact reviewed
- [ ] Environment variables verified

## Functional Smoke

- [ ] Home page loads
- [ ] Auth flow opens/works (login/register UI)
- [ ] Core routes open without errors
- [ ] API health endpoint responds
- [ ] Critical module flows validated

## Quality Gates

- [ ] No TypeScript errors
- [ ] No console runtime errors on key pages
- [ ] Responsive sanity check (mobile/tablet/desktop)
- [ ] Accessibility quick pass (focus order, modal close)

## Deployment

- [ ] Tag release version
- [ ] Deploy with release notes
- [ ] Confirm production health checks
- [ ] Monitor logs/errors for first 30 minutes

## Search Analytics Retention

- [ ] Dry-run retention cleanup executed (`npm run search:analytics:cleanup:dry`)
- [ ] Cleanup output reviewed (threshold date, affected rows)
- [ ] Production retention cleanup scheduled at least weekly (`npm run search:analytics:cleanup`)
- [ ] Last successful cleanup timestamp logged in release notes or ops journal

## Rollback Readiness

- [ ] Previous stable version identified
- [ ] Rollback command/process documented
- [ ] Data migration rollback strategy confirmed
