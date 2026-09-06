import Link from "next/link";
import { requireRole } from "@/core/server/role-guard";
import { prisma } from "@/core/server/prisma";
import { CmsManagedSlotBanner } from "@/modules/cms/components/CmsManagedSlotBanner";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { getInterruptedLesson, listLearnerCourses } from "@/modules/courses/services/learner-course.service";
import { learnerCourseContinueHref } from "@/modules/courses/utils/learner-course-path";
import { getPlacementDashboardResult } from "@/modules/courses/services/placement-test.service";
import { getDashboardLeaderboard, getMotivationOverview } from "@/modules/motivation/services/motivation.service";
import { LocalizedText } from "@/core/i18n/LocalizedText";
import { FirstVisitQueryCleaner } from "./FirstVisitQueryCleaner";
import { PlacementResultSync } from "./PlacementResultSync";
import { PlacementRecommendationPanel } from "./PlacementRecommendationPanel";
import { StudentLeaderboardPanel } from "./StudentLeaderboardPanel";
import { DailyStreakCard } from "@/modules/motivation/components/DailyStreakCard";
import { STREAK_FREEZE_PRICE_COINS } from "@/modules/motivation/services/motivation.service";
import { getWeeklyLeague } from "@/modules/motivation/services/weekly-league.service";
import { WeeklyLeaguePanel } from "./WeeklyLeaguePanel";
import { ProfileLevelStatus } from "@/modules/motivation/components/ProfileLevelStatus";
import { DailyChestCard } from "@/modules/motivation/components/DailyChestCard";
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

  const [courses, assignmentCount, reviewCount, managedSlot, motivation, recentMistakes, placementResult, leaderboard, weeklyLeague, interruptedLesson] = await Promise.all([
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
    getDashboardLeaderboard(guard.user.id),
    getWeeklyLeague(guard.user.id),
    getInterruptedLesson(guard.user.id),
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
  const nextLessonLabel = next?.nextLesson?.title;
  return (
    <section className={styles.page}>
      <FirstVisitQueryCleaner active={isFirstVisit} />
      <PlacementResultSync />
      <header className={styles.hero}>
        <div>
          <h2><LocalizedText id={isFirstVisit ? "student.home.welcome" : "student.home.welcomeBack"} fallback={`${isFirstVisit ? "Welcome" : "Welcome back"}, {name}`} values={{ name }} /></h2>
          <p><LocalizedText id="student.home.hero" fallback="One focused lesson is enough for today. Your next step is ready below." /></p>
          <ProfileLevelStatus level={motivation.level.level} experience={motivation.level.lifetimeExperience + (motivation.level.fractionalExperience ?? 0) / 100} />
        </div>
        <div className={styles.heroActions}>
          <Link href={next ? courseHref(next) : "/student/catalog"} className={styles.primaryAction}><LocalizedText id={next ? "student.home.continue" : "student.home.chooseCourse"} fallback={next ? "Continue learning" : "Choose a course"} /></Link>
          <Link href="/profile/support" className={styles.secondaryAction}><LocalizedText id="student.home.help" fallback="Help" /></Link>
        </div>
      </header>

      {interruptedLesson ? <section className={styles.resumeBanner} aria-labelledby="resume-lesson-heading">
        <span className={styles.resumeIcon} aria-hidden="true">↗</span>
        <div className={styles.resumeCopy}>
          <p><LocalizedText id="student.resume.eyebrow" fallback="Continue where you paused" /></p>
          <h3 id="resume-lesson-heading"><LocalizedText id="student.resume.title" fallback="Your lesson is {progress}% complete" values={{ progress: interruptedLesson.completionPercent }} /></h3>
          <span><LocalizedText id="student.resume.copy" fallback="Finish “{lesson}” now and close this learning step." values={{ lesson: interruptedLesson.lessonTitle }} /></span>
        </div>
        <div className={styles.resumeProgress} aria-label={`${interruptedLesson.completionPercent}% complete`}><strong>{interruptedLesson.completionPercent}%</strong><span><i style={{ width: `${interruptedLesson.completionPercent}%` }} /></span></div>
        <Link href={`/courses/${encodeURIComponent(interruptedLesson.courseSlug)}/lessons/${encodeURIComponent(interruptedLesson.lessonSlug)}`} className={styles.resumeAction}><LocalizedText id="student.resume.action" fallback="Finish now" /></Link>
      </section> : null}

      {showPlacementRecommendation && placementResult ? <PlacementRecommendationPanel result={placementResult} /> : null}

      <CmsManagedSlotBanner slot={managedSlot} variant="compact" />

      <section className={styles.overviewGrid}>
        <article className={`${styles.statCard} ${styles.currentCourseCard}`}>
          <p><LocalizedText id="student.home.currentCourse" fallback="Current course" /></p>
          {next ? <Link href={`/student/courses/${next.slug}`} className={styles.courseTitle}>{next.title}</Link> : <h3><LocalizedText id="student.home.noCourse" fallback="No course selected" /></h3>}
          <span className={styles.levelBadge}>{next?.level ?? <LocalizedText id="student.home.chooseLevel" fallback="Choose a level when ready" />}</span>
        </article>
        <article className={styles.statCard}><p><LocalizedText id="student.home.overallProgress" fallback="Overall progress" /></p><strong>{overallProgress}%</strong><span><LocalizedText id="student.home.lessonsOf" fallback={`${completedLessons} of ${totalLessons} lessons`} values={{ completed: completedLessons, total: totalLessons }} /></span></article>
        <article className={styles.statCard}><p><LocalizedText id="student.home.todayPace" fallback="Today's pace" /></p><strong><LocalizedText id="student.home.minutes" fallback={`${completedMinutes}/${dailyGoal} min`} values={{ completed: completedMinutes, goal: dailyGoal }} /></strong><span><LocalizedText id="student.home.goalProgress" fallback={`${dailyProgress}% of your goal`} values={{ progress: dailyProgress }} /></span></article>
        <article className={`${styles.statCard} ${styles.coinCard}`}><p>KRIN Coins</p><strong>{(motivation.wallet.balance + motivation.wallet.fractionalBalance / 100).toFixed(2)}</strong><span><LocalizedText id="student.home.coinsHint" fallback="Click XP above to exchange" /></span></article>
        <DailyStreakCard initialStreak={motivation.streak} initialCoinBalance={motivation.wallet.balance + motivation.wallet.fractionalBalance / 100} price={STREAK_FREEZE_PRICE_COINS} />
        <DailyChestCard />
      </section>

      <section className={styles.dashboardGrid}>
        <article className={`${styles.panel} ${styles.focusPanel}`}>
          <div className={styles.cardHeading}>
            <h3>{nextLessonLabel ?? <LocalizedText id="student.home.planPrompt" fallback="Choose a course to build your plan" />}</h3>
            {next ? <span className={styles.statusTag}><LocalizedText id="student.home.complete" fallback={`${next.progress}% complete`} values={{ progress: next.progress }} /></span> : null}
          </div>
          {next ? (
            <>
              <p className={styles.cardText}><LocalizedText id="student.home.continueCourse" fallback={`Continue ${next.title} at a pace that works for you.`} values={{ title: next.title }} /></p>
              <progress className={styles.nativeProgress} value={next.progress} max="100">{next.progress}%</progress>
              <div className={styles.focusFooter}>
                <div className={styles.quickLinks}>
                  <Link href="/student/vocabulary"><LocalizedText id={reviewCount ? "student.home.wordsToReview" : "student.home.vocabularyReview"} fallback={reviewCount ? `${reviewCount} words to review` : "Vocabulary review"} values={{ count: reviewCount }} /></Link>
                  <Link href="/student/homework"><LocalizedText id={assignmentCount ? "student.home.homeworkItems" : "student.home.homework"} fallback={assignmentCount ? `${assignmentCount} homework items` : "Homework"} values={{ count: assignmentCount }} /></Link>
                  <Link href="/profile/settings/motivation"><LocalizedText id="student.home.studyPace" fallback="Study pace" /></Link>
                </div>
                <Link href={courseHref(next)} className={styles.primaryAction}><LocalizedText id="student.home.startLesson" fallback="Start lesson" /></Link>
              </div>
            </>
          ) : (
            <>
              <p className={styles.cardText}><LocalizedText id="student.home.noCourseCopy" fallback="Choose a published course to get a simple next-lesson plan. You can try a free lesson before paying." /></p>
              <Link href="/student/catalog" className={`${styles.primaryAction} ${styles.inlineAction}`}><LocalizedText id="student.home.browseCourses" fallback="Browse courses" /></Link>
            </>
          )}
        </article>

        <div className={styles.sideStack}>
          <WeeklyLeaguePanel league={weeklyLeague} />
          <StudentLeaderboardPanel {...leaderboard} />
          <article className={`${styles.panel} ${styles.mistakesPanel}`}>
            <div className={styles.cardHeading}><h3><LocalizedText id={recentMistakes.length ? "student.home.reviewImprove" : "student.home.allCaughtUp"} fallback={recentMistakes.length ? "Review and improve" : "You are all caught up"} /></h3><span className={styles.mistakeCount}>{recentMistakes.length}</span></div>
            {recentMistakes.length ? <ul className={styles.mistakeList}>{recentMistakes.map((mistake) => <li key={mistake.id}><strong>{mistake.lesson?.title ?? <LocalizedText id="student.home.practiceItem" fallback="Practice item" />}</strong><span>{mistake.explanation ?? <LocalizedText id="student.home.reviewAfterAttempts" fallback={`Review after ${mistake.occurrenceCount} attempts.`} values={{ count: mistake.occurrenceCount }} />}</span></li>)}</ul> : <p className={styles.helperText}><LocalizedText id="student.home.mistakesEmpty" fallback="New mistakes will appear here with their explanations." /></p>}
            <Link href="/student/mistakes" className={styles.textLink}><LocalizedText id="student.home.openMistakes" fallback="Open mistakes" /></Link>
          </article>
        </div>
      </section>
    </section>
  );
}
