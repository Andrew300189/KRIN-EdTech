"use client";

import { useEffect, useRef, useState } from "react";
import { ExerciseBlock } from "./ExerciseBlock";
import type { LessonBlock, LessonExercise } from "../lesson-content";
import styles from "./SpacedReviewBlock.module.css";

type ReviewRun = {
  id: string;
  status: "ACTIVE" | "COMPLETED";
  completedAt: string | null;
  questions: LessonExercise[];
};

type Props = {
  lessonId: string;
  block: LessonBlock;
  previewMode?: boolean;
  playerStyle?: boolean;
  onReviewComplete: () => void;
};

/** The questions themselves are generated and authorised by the server. This
 * component only presents that persisted ten-question set one at a time. */
export function SpacedReviewBlock({ lessonId, block, previewMode = false, playerStyle = false, onReviewComplete }: Props) {
  const [run, setRun] = useState<ReviewRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const notifiedComplete = useRef(false);

  useEffect(() => {
    if (previewMode) return;
    let current = true;
    void fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/spaced-review`, { method: "POST" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { data?: ReviewRun; error?: string } | null;
        if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to prepare your review.");
        return payload.data;
      })
      .then((data) => { if (current) setRun(data); })
      .catch((reason) => { if (current) setError(reason instanceof Error ? reason.message : "Unable to prepare your review."); });
    return () => { current = false; };
  }, [lessonId, previewMode]);

  useEffect(() => {
    if (run?.status !== "COMPLETED" || notifiedComplete.current) return;
    notifiedComplete.current = true;
    onReviewComplete();
  }, [onReviewComplete, run?.status]);

  async function completeReview() {
    if (completing) return;
    setCompleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/spaced-review`, { method: "PUT" });
      const payload = await response.json().catch(() => null) as { data?: { completed?: boolean }; error?: string } | null;
      if (!response.ok || !payload?.data?.completed) throw new Error(payload?.error ?? "Finish all review questions before continuing.");
      setRun((current) => current ? { ...current, status: "COMPLETED", completedAt: new Date().toISOString() } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to complete the review.");
    } finally {
      setCompleting(false);
    }
  }

  const activeRun = run?.status === "ACTIVE" ? run : null;
  const reviewBlock: LessonBlock | null = activeRun ? { ...block, exercises: activeRun.questions } : null;

  return <section className={styles.root} aria-label="Spaced review">
    <header className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>Повторение по методике</p>
        <h2>Закрепим пройденное</h2>
        <p>10 новых случайных вопросов по уже изученным темам. Вопросы идут по одному, чтобы тренировать воспроизведение, а не узнавание ответа.</p>
      </div>
      <span className={styles.reward}>+1,5 HP за верный ответ</span>
    </header>
    {previewMode ? <p className={styles.preview}>В опубликованном уроке здесь появятся 10 личных вопросов для повторения из предыдущих тем.</p> : null}
    {!previewMode && !run && !error ? <p className={styles.loading}>Подбираем 10 новых вопросов для повторения…</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {run?.status === "COMPLETED" ? <p className={styles.complete} role="status">Повторение пройдено: все 10 ответов сохранены. Можно продолжать урок.</p> : null}
    {reviewBlock && activeRun ? <>
      <p className={styles.progress}>10 вопросов · случайная выборка · без повторения прежних формулировок</p>
      <div className={styles.questions}>
        <ExerciseBlock
          key={activeRun.id}
          block={reviewBlock}
          playerStyle={playerStyle}
          individualExerciseStep
          sequentialOnly
          onAttemptResolved={({ isFinalExercise }) => { if (isFinalExercise) void completeReview(); }}
          onAttemptDeferred={({ isFinalExercise }) => { if (isFinalExercise) void completeReview(); }}
        />
      </div>
    </> : null}
  </section>;
}
