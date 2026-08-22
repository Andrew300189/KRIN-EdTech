"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ConfirmDialog } from "@/core/components/ConfirmDialog";
import type { LearnerCourseCard } from "@/modules/courses/services/learner-course.service";
import { learnerCourseContinueHref } from "@/modules/courses/utils/learner-course-path";
import { LessonXpBadge } from "@/modules/motivation/components/LessonXpBadge";
import styles from "./StudentCourses.module.css";

type StudentCoursesClientProps = {
  initialCourses: LearnerCourseCard[];
  initialError?: string;
};

const sourceLabels: Record<LearnerCourseCard["source"], string> = {
  SELF_ADDED: "Added to your library",
  GROUP_ASSIGNED: "Group assignment",
  TEACHER_ASSIGNED: "Assigned by your teacher",
  PURCHASED: "Purchased access",
  SUBSCRIPTION: "Included in your subscription",
  ENROLLED: "Enrolled",
  IN_PROGRESS: "Started course",
  TEACHER_CREATED: "Created by you",
};

function getProgressLabel(course: LearnerCourseCard) {
  if (course.totalLessons === 0) return "Course structure is being prepared";
  if (course.progress >= 100) return "Course completed";
  return `${course.completedLessons} of ${course.totalLessons} lessons complete`;
}

function getXpLabel(course: LearnerCourseCard) {
  if (course.lessonExperience <= 0) return "No XP reward is active for lessons right now.";
  const remaining = Math.max(0, course.totalLessons - course.completedLessons);
  if (remaining === 0 && course.totalLessons > 0) return "First-completion XP collected. Repeats do not award XP.";
  return `${remaining} new ${remaining === 1 ? "lesson" : "lessons"} available · +${course.lessonExperience} XP each on first completion`;
}

export function StudentCoursesClient({
  initialCourses,
  initialError = "",
}: StudentCoursesClientProps) {
  const [courses, setCourses] = useState(initialCourses);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [confirming, setConfirming] = useState<LearnerCourseCard | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/courses", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to load your courses.");
      setCourses(Array.isArray(payload?.data) ? payload.data : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  const summary = useMemo(() => ({
    active: courses.filter((course) => course.progress > 0 && course.progress < 100).length,
    completed: courses.filter((course) => course.totalLessons > 0 && course.progress >= 100).length,
  }), [courses]);

  const remove = async () => {
    if (!confirming || removing) return;

    setRemoving(true);
    setError("");
    try {
      const response = await fetch(`/api/student/courses/${confirming.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to remove course.");
      setCourses((items) => items.filter((course) => course.id !== confirming.id));
      setConfirming(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove course.");
    } finally {
      setRemoving(false);
    }
  };

  return <section className={styles.page} aria-busy={loading || undefined}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Learning library</p>
        <h2>My courses</h2>
        <p className={styles.headerText}>Continue a course, review your progress or add the next path to your plan.</p>
      </div>
      <Link href="/student/catalog" className={styles.primaryAction}>Browse catalog</Link>
    </header>

    <section className={styles.summaryGrid} aria-label="Course overview">
      <article className={styles.summaryCard}><p>In my library</p><strong>{courses.length}</strong><span>{courses.length === 1 ? "course" : "courses"}</span></article>
      <article className={styles.summaryCard}><p>In progress</p><strong>{summary.active}</strong><span>{summary.active === 1 ? "active course" : "active courses"}</span></article>
      <article className={styles.summaryCard}><p>Completed</p><strong>{summary.completed}</strong><span>{summary.completed === 1 ? "course finished" : "courses finished"}</span></article>
    </section>

    {error ? <section className={styles.errorState} role="alert"><div><strong>Courses could not be loaded</strong><p>{error}</p></div><button type="button" className={styles.retryButton} onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "Try again"}</button></section> : null}

    {courses.length === 0 ? (
      <section className={styles.emptyState}>
        <p className={styles.eyebrow}>Ready when you are</p>
        <h3>Your library is empty</h3>
        <p>Choose a course, try a free lesson and keep all of your learning in one place.</p>
        <div className={styles.emptyActions}>
          <Link href="/student/catalog" className={styles.primaryAction}>Open catalog</Link>
          <Link href="/student/search" className={styles.secondaryAction}>Find a course</Link>
        </div>
      </section>
    ) : (
      <section className={styles.courseGrid} aria-label="Your courses">
        {courses.map((course) => <article key={course.id} className={styles.courseCard}>
          <div className={styles.cardTop}>
            <div className={styles.tags}><span className={styles.levelTag}>{course.level}</span><span className={styles.categoryTag}>{course.category}</span></div>
            <span className={styles.sourceLabel}>{sourceLabels[course.source]}</span>
          </div>
          <h3>{course.title}</h3>
          <p className={styles.description}>{course.description}</p>
          <div className={styles.progressSection}>
            <div className={styles.progressHeading}><span>{getProgressLabel(course)}</span><strong>{course.progress}%</strong></div>
            <div className={styles.progressTrack} aria-label={`${course.progress}% complete`}><div className={styles.progressFill} style={{ width: `${course.progress}%` }} /></div>
            <p className={styles.nextLesson}>{course.nextLesson ? `Next: ${course.nextLesson.title}` : course.progress >= 100 ? "You have completed this course." : "Choose a lesson when you are ready."}</p>
            <div className={styles.xpReward}><LessonXpBadge experience={course.lessonExperience} correctAnswers={course.lessonAccuracy.correctAnswers} incorrectAnswers={course.lessonAccuracy.incorrectAnswers} progressPercent={course.progress} /><span>{getXpLabel(course)}</span></div>
          </div>
          <div className={styles.cardActions}>
            <Link href={learnerCourseContinueHref(course)} className={styles.primaryAction}>{course.progress ? "Continue" : "Start course"}</Link>
            {course.canRemove ? <button type="button" aria-label={`Remove ${course.title} from my courses`} onClick={() => setConfirming(course)} className={styles.removeButton}>Remove</button> : null}
          </div>
        </article>)}
      </section>
    )}

    <ConfirmDialog open={Boolean(confirming)} onOpenChange={(open) => { if (!open && !removing) setConfirming(null); }} title="Remove this course?" description="Your progress stays saved and you can add the course again later." confirmLabel="Remove course" onConfirm={() => void remove()} isProcessing={removing} tone="warning" />
  </section>;
}
