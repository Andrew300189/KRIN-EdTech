# Product UI, search and catalogue audit — 2026-08-09

## Scope

This audit precedes the three requested delivery tracks:

1. physical UI/UX coverage for existing platform functionality;
2. learner, teacher, parent and CMS scenarios;
3. restored global search, a product catalogue, standalone tests and professional English directions.

The goal is to extend the canonical product data and role guards already in the application. No parallel course, purchase, entitlement or CMS data store is introduced.

## Verified platform inventory

- **Runtime:** Next.js 16.2.11, React 19.2.8, TypeScript 5.2, Prisma 5, next-auth 4.24.0 and Stripe 22.4.0.
- **Application surface:** 158 App Router pages, including 35 CMS pages, 44 dashboard/role-workspace pages and seven public course routes.
- **Primary modules:** courses, cms, lessons, quizzes, payments, search, navigation, analytics, onboarding, profile, teaching, support, notifications, vocabulary, grammar, pronunciation, reading, listening, writing, achievements and motivation.
- **Tests already present:** auth/role guards, course catalogue, CMS course/curriculum/exercise workflows, commerce, search unit/integration tests, and public/student/teacher/admin-search Playwright suites.

## Canonical data that must be reused

| Concern | Existing canonical model / service | Decision |
| --- | --- | --- |
| CEFR levels | `LanguageLevel` | Reuse. `code` is unique and the six standard levels are already managed in CMS. |
| Curriculum tree | `CurriculumNode` + `CourseCurriculumLink` | Reuse for section → topic → subtopic and multi-placement. Do not reintroduce per-level topic arrays as a second source of truth. |
| Courses and learning flow | `Course` → `CourseModule` → `Lesson` → `LessonBlock` → `Exercise` | Reuse. It already includes lifecycle status, access mode, price metadata, visibility flags, author/audit references and free-lesson count. |
| Purchases and access | `Product`, `ProductPrice`, `Order`, `CoursePurchase`, `Entitlement` | Reuse. Access is granted from confirmed server payment processing; never from a client success URL. |
| Exercise authoring | CMS engine registry, `Exercise`, `CmsExerciseTemplate` | Reuse. The registry already maps variants to universal engines instead of separate implementations. |
| Search | `SearchService`, `/api/search`, analytics services and query/index tests | Reuse and extend; do not create a browser-only catalogue search. |
| CMS access | owner guard, CMS layouts and protected admin APIs | Preserve. New CMS tools must use the same server-side owner guard. |

## Existing capabilities suitable for direct reuse

- Published/draft/scheduled/archived lifecycle controls, revisions, audit logs, preview routes, duplication/import-export and content validation in CMS.
- Course type classification: `STANDARD`, `INTENSIVE`, `EXAM_PREP`, `PROFESSIONAL`, `SPECIALIZATION`, `SKILL`.
- Course visibility controls for catalogue, search, home, recommendations, level blocks, academy and student dashboard.
- Public course pages, verified payment workflow, free lesson access and learner progress.
- Global search with debounce, keyboard navigation, result grouping, analytics and server-side visibility rules.
- Public header with an accessible mobile dialog, focus return and reduced-motion global rules.

## Gaps and root causes found

| Area | Evidence | Required work |
| --- | --- | --- |
| Shared UI | Public pages have CSS modules, while many dashboard/CMS/search components use Tailwind-like class names without a complete Tailwind utility layer. | Establish a component-level CSS foundation and migrate priority surfaces progressively. Do not make a blind global style rewrite. |
| Home search | The public header has a GET search form, but the rich `GlobalSearch` is absent from the home experience. | Restore the rich, accessible home search using the existing service and move it to scoped styles. |
| Search presentation | `GlobalSearch` and result components are functionally complete but depend on unavailable utility styling. | Keep the query/analytics/keyboard logic and replace only presentation classes with CSS modules. |
| Product catalogue | Courses can be classified as `EXAM_PREP` or `PROFESSIONAL`, but there is no dedicated, understandable public discovery entry point for either collection. | Build filtered catalogue routes against the existing `Course` model and add CMS-safe editorial controls where necessary. |
| Standalone tests | The system has placement-test events and lesson type `TEST`, but no first-class public test catalogue experience. | Model a standalone test as a published `EXAM_PREP` course with a `TEST` lesson flow unless audit reveals a truly independent assessment requirement. This preserves payments, access and progress. |
| CMS navigation | Core course/exercise/curriculum tools exist. `navigation` and `translations` correctly present guarded empty states rather than unsafe fake CRUD. | Add only controls backed by validated canonical data; protected system routes must remain code-owned. |
| Parent workspace | No verified parent role/model or privacy-consent relationship is present in the schema inventory. | Do not expose a fabricated parent dashboard. Define the consent/data model before implementing it. |

## Delivery order

1. **Track I — UI foundation and visible existing functionality:** component inventory, tokens, accessible public/dashboards/CMS presentation, empty/error/loading conventions.
2. **Track II — role and learning scenarios:** learner/teacher workflows, onboarding, progress and CMS editing surfaces backed by existing data. Parent features remain explicitly blocked until a consent model exists.
3. **Track III — discovery and products:** rich home/header/mobile search, result filters, product catalogue, professional English directions and purchasable standalone test journeys built on canonical course/commerce records.
4. **Quality gate after each slice:** TypeScript, lint, unit/integration tests, relevant Playwright scenarios and production build.

## Data safety and compatibility

- No existing rows need deletion for this work.
- `Course` already accommodates professional and exam-prep content. New migrations are only justified if a standalone test cannot be represented as a course without weakening access, progress or reporting.
- New UI must use published status and existing visibility flags; drafts, archived records and hidden content must never leak through search or catalogue filters.
- Legal/contact/organisation claims remain CMS-published only. No organisation, testimonial, author or payment claim is invented in fallback UI.

## First implementation slice

The first code slice restores the rich global search in the public home and header/mobile flow using the existing `/api/search` contract, keyboard behavior and analytics. It will add scoped styling rather than reactivate unavailable global utility classes. This is the safest high-value starting point for Track III and establishes the UI migration pattern for the other screens.

## Implemented slices and verification

- Replaced public home and header search presentation with an accessible `GlobalSearch` implementation that retains the existing server query, result visibility and analytics contracts. It supports keyboard navigation, Escape, screen-reader labels, query cancellation and a tablet/mobile dialog.
- Added dedicated public catalogues for `PROFESSIONAL` and `EXAM_PREP` course types. They query the canonical published-course service and intentionally do not fall back to unrelated courses when a collection is empty.
- Added discoverability links for these collections, corrected the WebSite search target and added the catalogue pages to `robots.ts` and `sitemap.ts`.
- Migrated the shared student/teacher workspace frame, CMS navigation, CMS breadcrumbs and CMS page shell to scoped CSS. The mobile workspace drawer locks background scrolling, restores focus on close and closes with Escape. Role guards, authentication, data loading and CMS owner checks were not changed.
- Updated the student and teacher home presentation while preserving their existing server data, CMS slots, learning progress and destination routes.

Latest validation after these slices:

- `npm.cmd run type-check` passed.
- `npm.cmd run lint` passed.
- Relevant Playwright scenarios passed: public professional/exam collections and anonymous role-guard direct-open/refresh. Authenticated role scenarios are skipped by the existing test guard when fixture credentials are unavailable.
- `npm.cmd run build` passed. The pre-existing Turbopack whole-project tracing warning from `next.config.ts`/generated Prisma remains and does not fail the build.
