import type { CSSProperties } from "react";
import styles from "./LessonXpBadge.module.css";

type LessonXpBadgeProps = {
  experience: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  /** Keeps the remaining, not-yet-completed part of a lesson/course neutral. */
  progressPercent?: number;
  className?: string;
};

/**
 * A compact lesson-reward marker. Its ring shows the learner's latest result
 * for the lesson, while the displayed XP stays a first-completion reward.
 */
export function LessonXpBadge({
  experience,
  correctAnswers = 0,
  incorrectAnswers = 0,
  progressPercent,
  className = "",
}: LessonXpBadgeProps) {
  const attempted = Math.max(0, correctAnswers + incorrectAnswers);
  const filledPercent = attempted ? Math.max(0, Math.min(100, progressPercent ?? 100)) : 0;
  const correctPercent = attempted ? Math.round((correctAnswers / attempted) * filledPercent) : 0;
  const ring = attempted === 0
    ? "#dbeafe"
    : correctPercent === 100
      ? "#34d399"
      : `conic-gradient(#34d399 0 ${correctPercent}%, #fb7185 ${correctPercent}% ${filledPercent}%, #dbeafe ${filledPercent}% 100%)`;
  const summary = attempted
    ? `${correctAnswers} correct and ${incorrectAnswers} incorrect in the latest attempts`
    : "No exercise result yet";

  return (
    <span
      className={`${styles.badge} ${className}`}
      style={{ "--lesson-xp-ring": ring } as CSSProperties}
      aria-label={`${experience} XP for the lesson. ${summary}. XP is awarded only for the first completion.`}
      title={`${experience} XP for first completion. ${summary}.`}
    >
      <span className={styles.value}>+{experience}</span>
      <span className={styles.unit}>XP</span>
    </span>
  );
}
