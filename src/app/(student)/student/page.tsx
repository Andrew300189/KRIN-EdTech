import Link from "next/link";
import { requireRole } from "@/core/server/role-guard";
import { prisma } from "@/core/server/prisma";
import { CmsManagedSlotBanner } from "@/modules/cms/components/CmsManagedSlotBanner";
import { CmsStudentCourseRecommendations } from "@/modules/cms/components/CmsStudentCourseRecommendations";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";
import { getMotivationOverview } from "@/modules/motivation/services/motivation.service";
import styles from "./StudentHome.module.css";

function courseHref(slug: string) {
  return `/student/courses/${slug}`;
}

export default async function StudentHomePage() {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;

  const [courses, assignmentCount, reviewCount, managedSlot, motivation, recentMistakes] = await Promise.all([
    listLearnerCourses(guard.user.id),
    prisma.assignmentSubmission.count({ where: { studentId: guard.user.id, status: { in: ["NOT_STARTED", "IN_PROGRESS", "NEEDS_REVISION"] } } }),
    prisma.userWord.count({ where: { userId: guard.user.id, status: { in: ["LEARNING", "REVIEW"] } } }),
    getPublishedCmsContentSlot("student.welcome"),
    getMotivationOverview(guard.user.id),
    prisma.userMistake.findMany({
      where: { userId: guard.user.id, resolvedAt: null },
      orderBy: { lastOccurredAt: "desc" },
      take: 3,
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

  return (
    <section className={styles.page}>
      <CmsManagedSlotBanner slot={managedSlot} />

      <header className={styles.hero}>
        <p className={styles.eyebrow}>Your learning space</p>
        <h2>Welcome back, {name}</h2>
        <p>Take one clear next step. Your progress, study pace and review work stay in one place.</p>
        <div className={styles.heroActions}>
          <Link href={next ? courseHref(next.slug) : "/student/catalog"} className={styles.primaryAction}>
            {next ? "Continue learning" : "Choose a course"}
          </Link>
          <Link href="/profile/support" className={styles.secondaryAction}>Get support</Link>
        </div>
      </header>

      <section className={styles.overviewGrid} aria-label="Learning overview">
        <article className={styles.statCard}><p>Current course</p><h3>{next?.title ?? "No course selected"}</h3><span>{next?.level ?? "Start when you are ready"}</span></article>
        <article className={styles.statCard}><p>Next lesson</p><h3>{nextLessonLabel}</h3><span>{next?.nextLesson ? "Open your course when you are ready." : "A practical next step will appear here."}</span></article>
        <article className={styles.statCard}><p>Overall progress</p><strong>{overallProgress}%</strong><span>{completedLessons} of {totalLessons} lessons completed</span></article>
        <article className={styles.statCard}><p>Today&apos;s study time</p><strong>{completedMinutes}/{dailyGoal} min</strong><span>A missed day never removes what you have learned.</span></article>
      </section>

      <section className={styles.planGrid} aria-label="Your next learning step">
        <article className={styles.card}>
          <div className={styles.cardHeading}>
            <div><p className={styles.eyebrow}>Your plan</p><h3>{next?.title ?? "Build a learning plan"}</h3></div>
            {next ? <span className={styles.statusTag}>{next.progress}% complete</span> : null}
          </div>
          {next ? (
            <>
              <p className={styles.cardText}>Next: <strong>{nextLessonLabel}</strong></p>
              <p className={styles.helperText}>Recommended pace: one focused lesson at a time. Adjust your daily goal whenever it stops fitting your schedule.</p>
              <progress className={styles.nativeProgress} value={next.progress} max="100">{next.progress}%</progress>
              <div className={styles.cardActions}>
                <Link href={courseHref(next.slug)} className={styles.primaryAction}>Continue this course</Link>
                <Link href="/profile/settings/motivation" className={styles.secondaryAction}>Adjust study pace</Link>
              </div>
            </>
          ) : (
            <>
              <p className={styles.cardText}>Choose a published course to get a simple next-lesson plan here. You can try a free lesson before paying.</p>
              <Link href="/student/catalog" className={`${styles.primaryAction} ${styles.inlineAction}`}>Browse courses</Link>
            </>
          )}
        </article>

        <article className={styles.card}>
          <p className={styles.eyebrow}>Daily goal</p>
          <h3>A sustainable pace</h3>
          <p className={styles.cardText}>{guard.user.learningGoal ? `Goal: ${guard.user.learningGoal}.` : "Set a goal in your settings when you are ready."}</p>
          <div className={styles.progressTrack} aria-label={`${dailyProgress}% of today's study goal complete`}><div className={styles.progressFill} style={{ width: `${dailyProgress}%` }} /></div>
          <p className={styles.helperText}>{completedMinutes} of {dailyGoal} minutes completed today</p>
          <p className={styles.helperText}>Current streak: {motivation.streak.currentStreak} day{motivation.streak.currentStreak === 1 ? "" : "s"}. Streaks are a record, not a penalty.</p>
        </article>
      </section>

      <section className={styles.supportGrid} aria-label="Review and support">
        <article className={styles.card}><h3>Review next</h3><p className={styles.cardText}>{reviewCount ? `${reviewCount} word${reviewCount === 1 ? "" : "s"} are ready for spaced review.` : "No vocabulary review is due right now."}</p><Link href="/student/vocabulary" className={styles.textLink}>Open vocabulary review</Link></article>
        <article className={styles.card}><h3>Recent mistakes</h3>{recentMistakes.length ? <ul className={styles.mistakeList}>{recentMistakes.map((mistake) => <li key={mistake.id}><strong>{mistake.lesson?.title ?? "Practice item"}</strong><span>{mistake.explanation ?? `Review this item (${mistake.occurrenceCount} attempt${mistake.occurrenceCount === 1 ? "" : "s"}).`}</span></li>)}</ul> : <p className={styles.cardText}>No unresolved mistakes. Keep learning at a pace that works for you.</p>}<Link href="/student/mistakes" className={styles.textLink}>Review mistakes</Link></article>
        <article className={styles.card}><h3>Need help?</h3><p className={styles.cardText}>Ask for help with access, a lesson or payment without leaving your learning plan.</p><p className={styles.helperText}>{assignmentCount ? `${assignmentCount} assignment${assignmentCount === 1 ? "" : "s"} still need attention.` : "No homework is waiting."}</p><Link href="/profile/support" className={styles.textLink}>Contact support</Link></article>
      </section>

      <CmsStudentCourseRecommendations />
    </section>
  );
}
