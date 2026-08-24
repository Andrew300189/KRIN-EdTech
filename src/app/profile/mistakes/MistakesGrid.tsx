"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./Mistakes.module.css";

export type MistakeCardItem = {
  id: string;
  occurrenceCount: number;
  lastOccurredAt: string;
  question: string | null;
  lesson: {
    title: string;
    slug: string;
    course: { slug: string; title: string; levelCode: string };
  } | null;
  isRecentlyResolved?: boolean;
};

type MistakesGridProps = {
  mistakes: MistakeCardItem[];
  recentlyResolvedMistake?: MistakeCardItem | null;
  recentlyResolvedPosition?: number;
};

export function MistakesGrid({
  mistakes,
  recentlyResolvedMistake = null,
  recentlyResolvedPosition,
}: MistakesGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showResolvedCard, setShowResolvedCard] = useState(Boolean(recentlyResolvedMistake));
  const [showContinueReview, setShowContinueReview] = useState(false);
  const [startingReview, setStartingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!recentlyResolvedMistake) return;

    const hideTimer = window.setTimeout(() => setShowResolvedCard(false), 1_080);
    const offerTimer = window.setTimeout(() => {
      if (mistakes.length > 0 && recentlyResolvedMistake.lesson) setShowContinueReview(true);
    }, 1_180);
    const cleanUrlTimer = window.setTimeout(() => router.replace(pathname), 1_360);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(offerTimer);
      window.clearTimeout(cleanUrlTimer);
    };
  }, [mistakes.length, pathname, recentlyResolvedMistake, router]);

  async function startReview(body: { scope: "ALL" | "COURSE"; courseSlug?: string; startMistakeId?: string; afterLessonSlug?: string }) {
    setStartingReview(true);
    setReviewError(null);
    try {
      const response = await fetch("/api/profile/mistakes/review-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null) as { data?: { nextUrl?: string }; error?: string } | null;
      if (!response.ok || !payload?.data?.nextUrl) throw new Error(payload?.error ?? "Unable to start your review.");
      router.push(payload.data.nextUrl);
    } catch (error) {
      setStartingReview(false);
      setReviewError(error instanceof Error ? error.message : "Unable to start your review.");
    }
  }

  const visibleMistakes = useMemo(() => {
    if (!recentlyResolvedMistake || !showResolvedCard) {
      return mistakes;
    }

    // Keep the just-resolved card in its source slot while it disappears.
    // This prevents the grid from jumping to the top after a review.
    const insertionIndex = Math.min(
      Math.max(0, recentlyResolvedPosition ?? mistakes.length),
      mistakes.length,
    );
    const resolvedCard = { ...recentlyResolvedMistake, isRecentlyResolved: true };

    return [
      ...mistakes.slice(0, insertionIndex),
      resolvedCard,
      ...mistakes.slice(insertionIndex),
    ];
  }, [mistakes, recentlyResolvedMistake, recentlyResolvedPosition, showResolvedCard]);

  if (!visibleMistakes.length) return null;

  return (
    <>
      {recentlyResolvedMistake ? (
        <p className={styles.resolvedNotice} role="status" aria-live="polite">
          Mistake fixed. Your review list is updating.
        </p>
      ) : null}
      {mistakes.length > 0 ? <div className={styles.reviewActions}>
        <button type="button" className={styles.reviewAllButton} disabled={startingReview} onClick={() => void startReview({ scope: "ALL" })}>
          {startingReview ? "Preparing review…" : "Fix all mistakes"}
        </button>
        <p>We will work lesson by lesson and return to earlier mistakes only after the later ones are done.</p>
      </div> : null}
      <section className={styles.mistakeGrid} aria-label="Mistakes to review">
        {visibleMistakes.map((mistake) => {
          const lesson = mistake.lesson;
          return (
            <article
              key={mistake.id}
              className={`${styles.mistakeCard} ${mistake.isRecentlyResolved ? styles.mistakeCardResolved : ""}`}
            >
              <div className={styles.cardTop}>
                <span className={styles.reviewTag}>{mistake.isRecentlyResolved ? "Resolved" : "Review mistake"}</span>
                <span className={styles.occurrence}>{mistake.occurrenceCount} {mistake.occurrenceCount === 1 ? "attempt" : "attempts"}</span>
              </div>
              <h2>{mistake.question ?? "Lesson activity"}</h2>
              {lesson ? (
                <div className={styles.lessonMeta}>
                  <span className={styles.levelBadge}>{lesson.course.levelCode}</span>
                  <span className={styles.lessonName}>{lesson.course.title} · {lesson.title}</span>
                </div>
              ) : null}
              <footer className={styles.cardFooter}>
                <time dateTime={mistake.lastOccurredAt}>Last seen {new Date(mistake.lastOccurredAt).toLocaleDateString()}</time>
                {lesson && !mistake.isRecentlyResolved ? <button type="button" className={styles.openLesson} disabled={startingReview} onClick={() => void startReview({ scope: "COURSE", courseSlug: lesson.course.slug, startMistakeId: mistake.id })}>Fix this lesson <span aria-hidden="true">→</span></button> : null}
              </footer>
            </article>
          );
        })}
      </section>
      {showContinueReview && recentlyResolvedMistake?.lesson ? <section className={styles.reviewModal} role="dialog" aria-modal="true" aria-labelledby="continue-review-title">
        <p className={styles.reviewTag}>Mistake fixed</p>
        <h2 id="continue-review-title">Continue with the remaining mistakes?</h2>
        <p>Start with the closest lesson after “{recentlyResolvedMistake.lesson.title}” in {recentlyResolvedMistake.lesson.course.title}. If earlier mistakes remain afterwards, we will offer them next.</p>
        <div className={styles.reviewModalActions}>
          <button type="button" className={styles.dismissReview} onClick={() => setShowContinueReview(false)}>Not now</button>
          <button type="button" className={styles.reviewAllButton} disabled={startingReview} onClick={() => void startReview({ scope: "COURSE", courseSlug: recentlyResolvedMistake.lesson!.course.slug, afterLessonSlug: recentlyResolvedMistake.lesson!.slug })}>{startingReview ? "Preparing review…" : "Continue review"}</button>
        </div>
      </section> : null}
      {reviewError ? <p className={styles.reviewError} role="alert">{reviewError}</p> : null}
    </>
  );
}
