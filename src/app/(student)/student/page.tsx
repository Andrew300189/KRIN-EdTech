import Link from "next/link";
import { requireRole } from "@/core/server/role-guard";
import { prisma } from "@/core/server/prisma";
import { CmsManagedSlotBanner } from "@/modules/cms/components/CmsManagedSlotBanner";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";
import { learnerCourseContinueHref } from "@/modules/courses/utils/learner-course-path";
import { getPlacementDashboardResult } from "@/modules/courses/services/placement-test.service";
import { getMotivationOverview } from "@/modules/motivation/services/motivation.service";
import { FirstVisitQueryCleaner } from "./FirstVisitQueryCleaner";
import { PlacementResultSync } from "./PlacementResultSync";
import { PlacementRecommendationPanel } from "./PlacementRecommendationPanel";
import styles from "./StudentHome.module.css";

function courseHref(course: { slug: string; nextLesson: { slug: string } | null }) {
  return learnerCourseContinueHref(course);
}

export default async function StudentHomePage({
  searchParams,
}: {
  searchParams: Promise<{ firstVisit?: string; placement?: string }>;
}) {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;
  const query = await searchParams;
  const isFirstVisit = query.firstVisit === "1";
  // A recommendation is a post-test hand-off, not permanent dashboard
  // content. Existing test takers see their normal dashboard on later visits.
  const showPlacementRecommendation = query.placement === "complete";

  const [courses, assignmentCount, reviewCount, managedSlot, motivation, recentMistakes, placementResult] = await Promise.all([
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
    getPlacementDashboardResult(guard.user.id),
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
  return (
    <section className={styles.page}>
      <FirstVisitQueryCleaner active={isFirstVisit} />
      <PlacementResultSync />
      <header className={styles.hero}>
        <div>
          <h2>{isFirstVisit ? "Welcome" : "Welcome back"}, {name}</h2>
          <p>One focused lesson is enough for today. Your next step is ready below.</p>
        </div>
        <div className={styles.heroActions}>
          <Link href={next ? courseHref(next) : "/student/catalog"} className={styles.primaryAction}>{next ? "Continue learning" : "Choose a course"}</Link>
          <Link href="/profile/support" className={styles.secondaryAction}>Help</Link>
        </div>
      </header>

      {showPlacementRecommendation && placementResult ? <PlacementRecommendationPanel result={placementResult} /> : null}

      <CmsManagedSlotBanner slot={managedSlot} variant="compact" />

      <section className={styles.overviewGrid} aria-label="Learning overview">
        <article className={`${styles.statCard} ${styles.currentCourseCard}`}>
          <p>Current course</p>
          {next ? <Link href={`/student/courses/${next.slug}`} className={styles.courseTitle}>{next.title}</Link> : <h3>No course selected</h3>}
          <span className={styles.levelBadge}>{next?.level ?? "Choose a level when ready"}</span>
        </article>
        <article className={styles.statCard}><p>Overall progress</p><strong>{overallProgress}%</strong><span>{completedLessons} of {totalLessons} lessons</span></article>
        <article className={styles.statCard}><p>Today&apos;s pace</p><strong>{completedMinutes}/{dailyGoal} min</strong><span>{dailyProgress}% of your goal</span></article>
        <article className={`${styles.statCard} ${styles.coinCard}`}><p>KRIN Coins</p><strong>{(motivation.wallet.exchangeBalanceMinor / 100).toFixed(2)}</strong><span>Click XP above to exchange</span></article>
        <article className={styles.statCard}><p>Review queue</p><strong>{reviewCount}</strong><span>{reviewCount === 1 ? "word ready to review" : "words ready to review"}</span></article>
      </section>

      <section className={styles.dashboardGrid} aria-label="Your next learning step">
        <article className={`${styles.panel} ${styles.focusPanel}`}>
          <div className={styles.cardHeading}>
            <h3>{nextLessonLabel}</h3>
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
                <Link href={courseHref(next)} className={styles.primaryAction}>Start lesson</Link>
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
          <article className={`${styles.panel} ${styles.mistakesPanel}`}>
            <div className={styles.cardHeading}><h3>{recentMistakes.length ? "Review and improve" : "You are all caught up"}</h3><span className={styles.mistakeCount}>{recentMistakes.length}</span></div>
            {recentMistakes.length ? <ul className={styles.mistakeList}>{recentMistakes.map((mistake) => <li key={mistake.id}><strong>{mistake.lesson?.title ?? "Practice item"}</strong><span>{mistake.explanation ?? `Review after ${mistake.occurrenceCount} attempt${mistake.occurrenceCount === 1 ? "" : "s"}.`}</span></li>)}</ul> : <p className={styles.helperText}>New mistakes will appear here with their explanations.</p>}
            <Link href="/student/mistakes" className={styles.textLink}>Open mistakes</Link>
          </article>
        </div>
      </section>
    </section>
  );
}
