# Neon + Vercel serverless architecture

This project keeps Prisma because it is already the source of truth for the
application schema and migrations. Replacing it with another ORM would not
reduce the number of database queries by itself, but would risk existing
authentication, lesson and payment flows.

## 1. Configure the two database URLs

In Neon, open **Connect** for the production branch and copy both PostgreSQL
connection strings. In Vercel Project Settings → Environment Variables, add
these values for **Production** and **Preview**:

| Variable | Purpose | Required host |
| --- | --- | --- |
| `DATABASE_URL` | all Next.js runtime reads and writes | pooled endpoint: host contains `-pooler` |
| `DIRECT_DATABASE_URL` | Prisma migrations during build | matching direct endpoint: host does not contain `-pooler` |
| `DATABASE_URL_UNPOOLED` | optional explicit migration URL; takes precedence over `DIRECT_DATABASE_URL` | direct endpoint |

Do not expose either URL through `NEXT_PUBLIC_*`. The code in
`src/core/server/prisma.ts` additionally converts an accidentally pasted
direct Neon `DATABASE_URL` to its `-pooler` variant at runtime. This is a
safety net, not a replacement for setting the two variables correctly.

The deployment script already chooses
`DATABASE_URL_UNPOOLED → DIRECT_DATABASE_URL → DATABASE_URL` for migration
work. That keeps Prisma migration locks off the transaction pooler when a
direct URL is present.

## 2. Cached public curriculum

`src/core/server/public-content-cache.ts` stores public CMS data in the Next
Data Cache for one hour under the `public-content` tag. It covers the homepage
course blocks, course catalogue and its count, categories, levels, curriculum
pages, course/module details and lesson structure. Cache entries are keyed by
their function parameters, so a Ukrainian lesson and its Russian counterpart
are distinct entries.

After every successful CMS content transaction,
`content-workflow.service.ts` calls `revalidateTag("public-content", "max")`.
Visitors receive the previous valid response while one request refreshes the
cache; this avoids a thundering herd of Neon queries after publishing. The
cache has a one-hour upper bound if content was changed outside CMS.

Never cache user-specific paths this way: session, permissions, payments,
lesson progress, attempts, XP and dashboard identity remain direct,
authorised reads. The 100-question placement-test bank already lives in the
client bundle, so showing its questions creates no Neon read.

## 3. Cold start / Scale to Zero

Leave Neon Scale to Zero enabled initially. A permanent warm-up prevents the
database from sleeping and therefore deliberately spends Compute Units. The
application has a protected `GET /api/internal/neon-warmup` endpoint, but it
is disabled unless `NEON_WARMUP_ENABLED=true` and a request supplies
`Authorization: Bearer <CRON_SECRET>`.

Do **not** schedule it every 30 minutes on Vercel Hobby. Hobby Cron supports
only daily schedules; adding a more frequent schedule would fail deployment.
For the expected 10,000 MAU, measure real first-request latency and Neon CU
usage first. A short authenticated loading state is usually cheaper than
keeping the database active all day.

If the project moves to a plan that allows frequent Cron and measured UX
requires it, set a strong `CRON_SECRET`, enable the endpoint, and add this to
`vercel.json` only for the selected working hours:

```json
{
  "crons": [
    { "path": "/api/internal/neon-warmup", "schedule": "*/30 7-20 * * 1-5" }
  ]
}
```

That is an intentional cost/latency trade-off, not a default optimisation.

## 4. Fast, safe progress writes

Each submitted answer remains one short, server-owned transaction because the
learner needs immediate feedback, idempotency and correct XP accounting. The
transaction creates the immutable `ExerciseAttempt`, updates the related
mistake record, then applies an O(1) delta to `LessonProgress`. It no longer
loads every earlier attempt in the lesson on every answer.

Two composite indexes are deployed:

```sql
ExerciseAttempt(userId, exerciseId, solutionOpened)
ExerciseAttempt(userId, lessonId, createdAt)
```

They support the remaining targeted solution lookup for an exercise and the
canonical lesson-result rebuild at the existing 30-second/end-of-lesson checkpoint.
Do not batch raw answers in the browser: it delays feedback, loses answers on
tab close and makes XP/idempotency harder to secure. The current browser
checkpoint batching is the safe place to reduce non-essential progress writes.

## 5. Operational checklist

1. Set `DATABASE_URL` to the pooled Neon URL and `DIRECT_DATABASE_URL` to the
   direct URL in Vercel for Production and Preview.
2. Keep `NEON_WARMUP_ENABLED=false` on Hobby.
3. Deploy. The existing build step applies the new indexes before the app
   starts.
4. Watch Neon's compute/connection graphs and Vercel function duration for a
   week before changing the one-hour cache TTL or enabling warm-ups.
5. When adding a new public CMS reader, wrap it in `cachePublicContent` and
   preserve the `public-content` tag. When adding a write path outside the CMS
   workflow, call `invalidatePublicContentCache()` only after its transaction
   commits.
