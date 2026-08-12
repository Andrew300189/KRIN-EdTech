# Global Search Technical Specification Report

Date: 2026-08-01
Scope: Unified global search across public, student, and teacher workspaces.

## 1. Architecture and audit

Status: done

- Full audit completed before implementation.
- One shared backend search service used for all contexts.
- One shared reusable UI search component used in multiple layouts/pages.

Key files:

- src/modules/search/services/search.service.ts
- src/app/api/search/route.ts
- src/modules/search/components/GlobalSearch.tsx

## 2. Access control and visibility constraints

Status: done

- Context resolution guards PUBLIC/STUDENT/TEACHER based on role.
- Public search returns only published entities.
- Student search returns own private entities only.
- Teacher search returns linked groups/students/assignments only.
- Help articles use locale fallback: requested locale + en.

Key files:

- src/modules/search/services/search.service.ts
- tests/integration/search-visibility.test.ts

## 3. UX requirements

Status: done

- Shared search input on homepage and workspaces.
- Min query length, debounce, cancellation, stale response protection.
- Grouped dropdown results and full results pages.
- Keyboard support including Ctrl/Cmd+K for workspace contexts.

Key files:

- src/app/page.tsx
- src/modules/search/components/GlobalSearch.tsx
- src/modules/search/components/SearchResultsPage.tsx

## 4. Search pages, filters, sorting, pagination

Status: done

- Full pages:
  - /search
  - /student/search
  - /teacher/search
- Query filters (types, level, category), sort options, cursor pagination.

Key files:

- src/app/search/page.tsx
- src/app/(student)/student/search/page.tsx
- src/app/(teacher)/teacher/search/page.tsx
- src/modules/search/components/SearchFilters.tsx

## 5. Performance and indexing

Status: done

- Added global search indexes and optional pg_trgm acceleration.

Key files:

- database/prisma/migrations/20260801120000_add_global_search_indexes/migration.sql

## 6. Security and rate limiting

Status: done

- Request rate limiting on search and click endpoints.
- Server-side normalization/validation for query/filter params.
- Privacy-safe hashing for IP and query metrics.

Key files:

- src/app/api/search/route.ts
- src/app/api/search/click/route.ts
- src/modules/search/services/search-analytics.service.ts

## 7. Analytics, history, click tracking

Status: done

- Search query and click persistence added.
- User search history API and page added.
- Admin search analytics API and dashboard block added.
- Query text exposure in top queries protected by low-frequency hiding.

Key files:

- database/prisma/migrations/20260801183000_add_search_history_metrics/migration.sql
- src/app/api/profile/search/history/route.ts
- src/app/profile/search-history/page.tsx
- src/app/api/admin/analytics/search/route.ts
- src/app/(admin)/admin/analytics/page.tsx

## 8. Testing

Status: done (with environment-based skips where expected)

- Unit tests added/updated for search API, click API, context logic, grouping, ranking, normalization.
- DB-backed integration suite for role/publication/locale visibility rules.
- E2E search flows for public/student/teacher added and stabilized.

Key files:

- tests/unit/search-api.test.ts
- tests/unit/search-click-api.test.ts
- tests/unit/search-service-context.test.ts
- tests/unit/search-grouping.test.ts
- tests/unit/search-rank.test.ts
- tests/unit/search-normalize.test.ts
- tests/integration/search-visibility.test.ts
- tests/e2e/search-public.spec.ts
- tests/e2e/search-student.spec.ts
- tests/e2e/search-teacher.spec.ts

## 9. Verification snapshot

- Type-check: pass
- Unit tests: pass
- Integration (DB): pass when RUN_DB_INTEGRATION_TESTS=1
- E2E: pass/skip by environment variables as expected
- Build: pass
- Lint: no errors, 2 pre-existing warnings outside search scope

## 10. Operational notes

- Apply migrations before relying on persistent search history/metrics in all environments.
- The analytics service includes a safe fallback for environments where search analytics tables are not yet present.

Required commands:

- npm run db:migrate:deploy
- RUN_DB_INTEGRATION_TESTS=1 npm run test -- tests/integration/search-visibility.test.ts
- npm run test:e2e
- npm run search:analytics:cleanup:dry
- npm run search:analytics:cleanup

## 11. Optional enhancements status

- CSV export for admin search analytics: done.
- Retention policy job for search history data lifecycle: done.
- Trend charts for daily search CTR/no-result rate: done.

Key files:

- src/app/api/admin/analytics/search/export/route.ts
- src/app/api/admin/analytics/search/cleanup/route.ts
- src/modules/search/components/AdminSearchAnalyticsTools.tsx
- src/app/(admin)/admin/analytics/page.tsx
- database/scripts/cleanup-search-analytics.cjs
