# Part III - functional coverage and UI audit

## Audit boundary

This document is the working inventory for the Part III UI/UX task. It is based on the current source tree rather than a new parallel data model.

- 706 source, database and test files were scanned.
- 160 App Router pages and 173 route presentation files (`page`, `layout`, `loading`, `error`) were found.
- 158 API route files, 104 Prisma models, 82 Prisma enums and 59 test files were found.
- The local development server was checked on 2026-08-09: `localhost:3000` and `127.0.0.1:3000` both returned HTTP 200.

## Security decisions

- Public content stays filtered by published and visibility state.
- Student pages use `requireRole(["student"])`; teacher pages use `requireRole(["teacher"])` or teacher permissions.
- CMS and `/api/admin/*` use the server-side platform-owner guard. Owner email remains environment-owned and never reaches client code.
- There is no `PARENT` role, parent-child relationship or consent model in the Prisma schema. A parent dashboard must **not** be fabricated or exposed until those data and privacy controls exist.
- Webhooks, reconciliation, analytics cleanup, email/push delivery and other operational APIs remain internal. A UI registry may describe them but must not turn them into public actions.

## Functional coverage matrix

| Function | Canonical code/data | Backend | UI / route | Role / security | Navigation decision | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Authentication and account recovery | `auth` services; `User`, `Session` | Ready | `/login`, `/register`, reset and verify routes | Guest; session and OAuth validation | Public header and auth flows | Ready; retain |
| Public home and discovery | `src/app/page.tsx`; published content services | Ready | `/` | Guest; published records only | Public header | Ready; refine through shared design system |
| Global search | `SearchService`, `/api/search`, analytics | Ready | `/search` and `GlobalSearch` | Public, student or teacher context | Header and workspace search | Ready; retain |
| CEFR curriculum A1-C2 | `LanguageLevel`, `CurriculumNode`, `CourseCurriculumLink` | Ready | `/levels/*`, `/courses/*` | Guest; published content only | Home, course and student navigation | Ready; retain strict level filtering |
| Public course catalogue and detail | `Course`, `CourseModule`, content services | Ready | `/courses`, `/courses/catalog/[slug]` | Guest; published and visible only | Header, levels, recommendations | Ready; refine |
| Trial learning | `Lesson`, `LessonBlock`, `Exercise`, access service | Ready | public preview/course routes | Guest only where preview access allows | Course page CTA | Ready; verify per course |
| Checkout, plans and access | `Product`, `ProductPrice`, `Order`, `Payment`, `Entitlement` | Ready; webhook-confirmed | pricing and legacy authenticated billing route | Authenticated; server entitlement checks | Existing sales flow; do not expose internal provider actions | Ready; workspace placement needs audit |
| Student course workspace | `StudentCourse`, `LessonProgress`, lesson access service | Ready | `/student/courses/*` | Student guard | Student sidebar and home CTA | Ready |
| Student vocabulary and review | `Word`, `UserWord`, training session models | Ready | `/student/vocabulary`, profile vocabulary routes | Student/user-scoped services | Student sidebar | Ready; needs shared component migration |
| Student mistakes and repetition | `UserMistake`, `ExerciseAttempt` | Ready | `/student/mistakes` | Student guard | Student sidebar | Ready |
| Student progress, motivation and rewards | `LearningActivity`, `UserDailyActivity`, wallet, streak, achievements | Ready | `/student/progress`, `/student/achievements` | Student guard | Student sidebar | Ready; only real metrics are shown |
| Student homework | `Assignment`, `AssignmentSubmission` | Ready | `/student/homework` | Student guard | Student sidebar | Ready |
| Notifications and support | notification and support services | Ready | `/student/notifications`, `/profile/support` | User-scoped services | Student sidebar/profile links | Ready; support link should remain role-safe |
| Teacher groups and invitations | `LearningGroup`, membership and invitation models | Ready | `/teacher/groups/*` | Teacher permission checks | Teacher sidebar | Ready |
| Teacher learners, assignments and reviews | teaching services, `AssignmentSubmission` | Ready | `/teacher/students`, `/teacher/assignments`, `/teacher/reviews` | Teacher permissions and group scoping | Teacher sidebar | Ready |
| Teacher analytics | group and assignment aggregates | Partial, real aggregates only | `/teacher/analytics` | Teacher guard | Teacher sidebar | Partial; no invented chart data |
| Parent workspace | No role or privacy relationship | Absent | No safe route | Not applicable | Keep internal / blocked | Blocked by missing backend |
| CMS curriculum and course lifecycle | CMS services, revisions, audit models | Ready | `/cms/levels`, curriculum and course routes | Platform owner only | CMS navigation | Ready |
| CMS lesson, exercise and media editing | lesson/exercise/media services and templates | Ready | `/cms/lessons`, `/cms/exercises`, `/cms/media` | Platform owner only | CMS navigation | Ready; progressively improve editor UI |
| CMS publishing, preview, import/export | CMS workflow and transfer services | Ready | CMS preview, revision and transfer routes | Platform owner only | CMS navigation | Ready |
| CMS marketing slots | `CmsContentSlot` | Ready for structured slots | `/cms/homepage`, `/cms/dashboards`, `/cms/legal`, `/cms/slots` | Platform owner only | CMS navigation | Partial; no arbitrary HTML |
| CMS audit and revisions | `ContentAuditLog`, `CmsContentVersion` | Ready | `/cms/audit`, `/cms/revisions` | Platform owner only | CMS navigation | Ready |
| CMS feature registry | Existing modules, routes and guards | Ready as static audited inventory | `/cms/platform-features` | Platform owner only | CMS navigation → Platform features | Ready; read-only, no internal actions exposed |
| Billing administration | product, plan, order, payment and refund models | Ready | legacy `/admin/billing/*` | Platform owner only | Legacy admin routes; do not duplicate business logic | Existing UI needs route/navigation audit |
| Support administration | support models and `/api/admin/support/*` | Ready | legacy admin support routes | Platform owner only | Legacy admin routes | Existing UI needs route/navigation audit |
| Analytics and Web Vitals | funnel and Web Vitals services | Ready | CMS/legacy admin analytics | Platform owner only | CMS search/audit currently links selectively | Existing UI needs route/navigation audit |
| Operational tasks and webhooks | Stripe/LiqPay webhooks, reconciliation, cleanup | Ready | API/CLI only | Server or platform owner | Keep internal | Intentionally internal |

## Identified integration gaps

1. The project has a legacy `/dashboard` shell as well as role-specific `/student` and `/teacher` workspaces. New work must extend the role-specific workspaces; it must not create a third dashboard system.
2. The role enum contains student and instructor/administrative roles but no parent. Parent pages are prohibited until a consent model is introduced.
3. Several mature CMS and legacy-admin features have APIs and pages but do not appear in the current compact CMS navigation. They should first be represented in an owner-only feature registry, then linked only after their UX and safety state is reviewed.
4. Several older internal pages use a partial utility-class styling layer. Migrate priority screens to tokens and scoped styles incrementally; do not perform a global rewrite that changes working behaviour.
5. No unsafe public exposure was found in this audit: items without appropriate data/role boundaries remain internal.

## Delivery rules for this Part III work

- A route is only considered surfaced when its target role can reach it through a labelled navigation path and receives loading, empty, error and success feedback where relevant.
- Existing server guards are the authority. UI visibility is supplemental, never authorization.
- New presentation must use semantic design tokens, keyboard-visible focus, reduced-motion support and mobile-safe layouts.
- A user-facing feature must use canonical database/service data. Mock charts, synthetic payment states and fake parent controls are out of scope.

## Verification baseline

Before this audit, the project passed TypeScript, lint, relevant public/role-guard Playwright scenarios and a production build. Future Part III changes will re-run the relevant checks and add focused coverage rather than disabling existing tests.

## Implemented Part III slice (2026-08-09)

- Added semantic colour, typography, spacing and state tokens while retaining the existing brand and its light default.
- Added a server-rendered skip target and keyboard-visible skip link. The former client-side DOM mutation was removed because it produced React hydration diagnostics.
- Added the owner-only, read-only **Platform features** registry at `/cms/platform-features`, including real/partial/internal/blocked status and route/test/security context.
- Reworked the CMS overview around live Prisma counts instead of fabricated revenue or activity charts.
- Surfaced canonical student Billing and Support routes under the student workspace. They reuse existing verified checkout/support services and preserve user-scoped ticket access.
- Repaired a collision where the legacy `/courses/:slug` rewrite captured `/courses/a1`–`/courses/c2`. Public CEFR routes now provide level → section → topic navigation from the existing typed curriculum catalogue.
- Added enum validation before public level/filter values reach Prisma. An invalid level is now a safe empty catalogue result, never a 500 or an all-level fallback.
- Added focused unit coverage for the platform registry and CEFR normalization, plus browser coverage for the public level → section → topic path and invalid level filtering.

### Visual route checks

- Home: 390 px and 1440 px — no horizontal overflow; one H1 and a keyboard-reachable skip link.
- A1 curriculum: 390 px, 768 px and 1440 px — 12 visible section cards, no horizontal overflow, direct cards reach exact A1 section and topic URLs.
- Public course detail: purchase page opens from a real catalogue course after the CEFR route fix.

### Design-system foundation update

- The default product theme is now a deliberate deep-navy dark theme controlled server-side with `data-theme="dark"`; it therefore does not flash between themes while React hydrates.
- `variables.css` supplies one semantic set of colour, typography, spacing, radius, elevation and state tokens. `data-theme="light"` remains a compatible light alternative using the same semantic names.
- The public header, home, catalogue and course-detail views now consume semantic tokens for surfaces, text, borders, status states, forms and purchase calls to action. This preserves contrast and prevents the principal discovery and purchase path from retaining light-only colour literals.
- Hover feedback on public cards and buttons is constrained to background, border and shadow. Cards no longer translate on hover; the existing global `prefers-reduced-motion` handling remains the single accessibility control for animation reduction.
