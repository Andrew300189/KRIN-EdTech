import Link from "next/link";
import { requireRole } from "@/core/server/role-guard";
import { prisma } from "@/core/server/prisma";
import { CmsManagedSlotBanner } from "@/modules/cms/components/CmsManagedSlotBanner";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";
import { getMotivationOverview } from "@/modules/motivation/services/motivation.service";
import { FirstVisitQueryCleaner } from "./FirstVisitQueryCleaner";
import styles from "./StudentHome.module.css";

function courseHref(slug: string) {
  return `/student/courses/${slug}`;
}

function formatPlan(plan: string) {
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

function formatAccessDate(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(value);
}

export default async function StudentHomePage({
  searchParams,
}: {
  searchParams: Promise<{ firstVisit?: string }>;
}) {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;
  const isFirstVisit = (await searchParams).firstVisit === "1";

  const [courses, assignmentCount, reviewCount, managedSlot, motivation, recentMistakes] = await Promise.all([
    listLearnerCourses(guard.user.id),
    prisma.assignmentSubmission.count({ where: { studentId: guard.user.id, status: { in: ["NOT_STARTED", "IN_PROGRESS", "NEEDS_REVISION"] } } }),
    prisma.userWord.count({ where: { userId: guard.user.id, status: { in: ["LEARNING", "REVIEW"] } } }),
    getPublishedCmsContentSlot("student.welcome"),
    getMotivationOverview(guard.user.id),
    prisma.userMistake.findMany({
      where: { userId: guard.user.id, resolvedAt: null },
      orderBy: { lastOccurredAt: "desc" },
      take: 2,
      select: {
        id: true,
        occurrenceCount: true,
        explanation: true,
        lesson: { select: { title: true, slug: true, module: { select: { course: { select: { slug: true } } } } } },
      },
    }),
  ]);

  const next = courses.find((course) => course.nextLesson) ?? courses[0];
  const name = guard.user.firstName || guard.user.name?.split(" ")[0] || "Learner";
  const completedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const overallProgress = totalLessons
    ? Math.round(courses.reduce((sum, course) => sum + course.progress * course.totalLessons, 0) / totalLessons)
    : 0;
  const completedMinutes = Math.floor(motivation.daily.activeSeconds / 60);
  const dailyGoal = motivation.dailyGoalMinutes;
  const dailyProgress = Math.min(100, Math.round((completedMinutes / dailyGoal) * 100));
  const nextLessonLabel = next?.nextLesson?.title ?? "Choose a course to build your plan";
  const activePaidPlan = guard.user.subscriptionPlan !== "FREE" && !["NONE", "CANCELED", "EXPIRED"].includes(guard.user.subscriptionStatus);
  const billingDate = formatAccessDate(guard.user.subscriptionCurrentPeriodEnd);
  const billingLabel = activePaidPlan ? `${formatPlan(guard.user.subscriptionPlan)} access` : "Free plan";
  const billingDetail = activePaidPlan
    ? billingDate ? `Access available until ${billingDate}` : "Your access is active"
    : "Upgrade whenever you need more access";

  return (
    <section className={styles.page}>
      <FirstVisitQueryCleaner active={isFirstVisit} />
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Your learning space</p>
          <h2>{isFirstVisit ? "Welcome" : "Welcome back"}, {name}</h2>
          <p>One focused lesson is enough for today. Your next step is ready below.</p>
        </div>
        <div className={styles.heroActions}>
          <Link href={next ? courseHref(next.slug) : "/student/catalog"} className={styles.primaryAction}>{next ? "Continue learning" : "Choose a course"}</Link>
          <Link href="/profile/support" className={styles.secondaryAction}>Help</Link>
        </div>
      </header>

      <CmsManagedSlotBanner slot={managedSlot} variant="compact" />

      <section className={styles.overviewGrid} aria-label="Learning overview">
        <article className={styles.statCard}><p>Current course</p><h3>{next?.title ?? "No course selected"}</h3><span>{next?.level ?? "Choose a level when ready"}</span></article>
        <article className={styles.statCard}><p>Overall progress</p><strong>{overallProgress}%</strong><span>{completedLessons} of {totalLessons} lessons</span></article>
        <article className={styles.statCard}><p>Today&apos;s pace</p><strong>{completedMinutes}/{dailyGoal} min</strong><span>{dailyProgress}% of your goal</span></article>
        <article className={styles.statCard}><p>Review queue</p><strong>{reviewCount}</strong><span>{reviewCount === 1 ? "word ready to review" : "words ready to review"}</span></article>
      </section>

      <section className={styles.dashboardGrid} aria-label="Your next learning step">
        <article className={`${styles.panel} ${styles.focusPanel}`}>
          <div className={styles.cardHeading}>
            <div><p className={styles.eyebrow}>Up next</p><h3>{nextLessonLabel}</h3></div>
            {next ? <span className={styles.statusTag}>{next.progress}% complete</span> : null}
          </div>
          {next ? (
            <>
              <p className={styles.cardText}>Continue <strong>{next.title}</strong> at a pace that works for you.</p>
              <progress className={styles.nativeProgress} value={next.progress} max="100">{next.progress}%</progress>
              <div className={styles.focusFooter}>
                <div className={styles.quickLinks}>
                  <Link href="/student/vocabulary">{reviewCount ? `${reviewCount} words to review` : "Vocabulary review"}</Link>
                  <Link href="/student/homework">{assignmentCount ? `${assignmentCount} homework items` : "Homework"}</Link>
                  <Link href="/profile/settings/motivation">Study pace</Link>
                </div>
                <Link href={courseHref(next.slug)} className={styles.primaryAction}>Start lesson</Link>
              </div>
            </>
          ) : (
            <>
              <p className={styles.cardText}>Choose a published course to get a simple next-lesson plan. You can try a free lesson before paying.</p>
              <Link href="/student/catalog" className={`${styles.primaryAction} ${styles.inlineAction}`}>Browse courses</Link>
            </>
          )}
        </article>

        <div className={styles.sideStack}>
          <article className={styles.panel}>
            <div className={styles.cardHeading}><div><p className={styles.eyebrow}>Billing</p><h3>{billingLabel}</h3></div><span className={`${styles.billingStatus} ${activePaidPlan ? styles.billingStatusActive : ""}`}>{activePaidPlan ? "Active" : "Free"}</span></div>
            <p className={styles.helperText}>{billingDetail}</p>
            <Link href="/student/billing" className={styles.textLink}>Manage billing</Link>
          </article>

          <article className={`${styles.panel} ${styles.mistakesPanel}`}>
            <div className={styles.cardHeading}><div><p className={styles.eyebrow}>My mistakes</p><h3>{recentMistakes.length ? "Review and improve" : "You are all caught up"}</h3></div><span className={styles.mistakeCount}>{recentMistakes.length}</span></div>
            {recentMistakes.length ? <ul className={styles.mistakeList}>{recentMistakes.map((mistake) => <li key={mistake.id}><strong>{mistake.lesson?.title ?? "Practice item"}</strong><span>{mistake.explanation ?? `Review after ${mistake.occurrenceCount} attempt${mistake.occurrenceCount === 1 ? "" : "s"}.`}</span></li>)}</ul> : <p className={styles.helperText}>New mistakes will appear here with their explanations.</p>}
            <Link href="/student/mistakes" className={styles.textLink}>Open mistakes</Link>
          </article>
        </div>
      </section>
    </section>
  );
}
