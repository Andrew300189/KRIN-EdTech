"use client";

import { useEffect, useRef, useState } from "react";
import { ExerciseBlock } from "./ExerciseBlock";
import type { LessonBlock, LessonExercise } from "../lesson-content";
import styles from "./SpacedReviewBlock.module.css";
import { translateVerbToBeJsonToUkrainian } from "@/modules/courses/localization/verb-to-be-ukrainian";

type ReviewRun = {
  id: string;
  status: "ACTIVE" | "COMPLETED";
  completedAt: string | null;
  questions: LessonExercise[];
};

type Props = {
  lessonId: string;
  block: LessonBlock;
  contentLocale?: "ru" | "uk";
  previewMode?: boolean;
  playerStyle?: boolean;
  onCorrectAnswer?: (difficulty?: number) => void;
  onStreakChestAvailable?: (milestone: number) => void;
  onReviewComplete: () => void;
};

const reviewCopy = {
  ru: {
    unavailable: "Не удалось подготовить повторение.", incomplete: "Ответьте на все вопросы повторения, прежде чем продолжить.", eyebrow: "Повторение по методике", title: "Закрепим пройденное", description: "10 новых случайных вопросов по уже изученным темам. Вопросы идут по одному, чтобы тренировать воспроизведение, а не узнавание ответа.", reward: "+1,5 XP за верный ответ", preview: "В опубликованном уроке здесь появятся 10 личных вопросов для повторения из предыдущих тем.", loading: "Подбираем 10 новых вопросов для повторения…", complete: "Повторение пройдено: все 10 ответов сохранены. Можно продолжать урок.", progress: "10 вопросов · случайная выборка · без повторения прежних формулировок",
  },
  uk: {
    unavailable: "Не вдалося підготувати повторення.", incomplete: "Дайте відповіді на всі запитання повторення, перш ніж продовжити.", eyebrow: "Повторення за методикою", title: "Закріпімо вивчене", description: "10 нових випадкових запитань за вже вивченими темами. Вони йдуть по одному, щоб тренувати пригадування, а не впізнавання відповіді.", reward: "+1,5 XP за правильну відповідь", preview: "В опублікованому уроці тут з’являться 10 особистих запитань для повторення з попередніх тем.", loading: "Добираємо 10 нових запитань для повторення…", complete: "Повторення завершено: усі 10 відповідей збережено. Можна продовжувати урок.", progress: "10 запитань · випадкова добірка · без повторення попередніх формулювань",
  },
} as const;

/** The questions themselves are generated and authorised by the server. This
 * component only presents that persisted ten-question set one at a time. */
export function SpacedReviewBlock({ lessonId, block, contentLocale, previewMode = false, playerStyle = false, onCorrectAnswer, onStreakChestAvailable, onReviewComplete }: Props) {
  const [run, setRun] = useState<ReviewRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const notifiedComplete = useRef(false);
  const copy = reviewCopy[contentLocale === "uk" ? "uk" : "ru"];

  useEffect(() => {
    if (previewMode) return;
    let current = true;
    void fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/spaced-review`, { method: "POST" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { data?: ReviewRun; error?: string } | null;
        if (!response.ok || !payload?.data) throw new Error(contentLocale === "uk" ? copy.unavailable : (payload?.error ?? copy.unavailable));
        return payload.data;
      })
      .then((data) => { if (current) setRun(data); })
      .catch((reason) => { if (current) setError(reason instanceof Error ? reason.message : copy.unavailable); });
    return () => { current = false; };
  }, [contentLocale, copy.unavailable, lessonId, previewMode]);

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
      if (!response.ok || !payload?.data?.completed) throw new Error(contentLocale === "uk" ? copy.incomplete : (payload?.error ?? copy.incomplete));
      setRun((current) => current ? { ...current, status: "COMPLETED", completedAt: new Date().toISOString() } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.unavailable);
    } finally {
      setCompleting(false);
    }
  }

  const activeRun = run?.status === "ACTIVE" ? run : null;
  const reviewBlock: LessonBlock | null = activeRun ? {
    ...block,
    exercises: contentLocale === "uk" ? activeRun.questions.map((question) => translateVerbToBeJsonToUkrainian(question)) : activeRun.questions,
  } : null;

  return <section className={styles.root} aria-label="Spaced review">
    <header className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>
      <span className={styles.reward}>{copy.reward}</span>
    </header>
    {previewMode ? <p className={styles.preview}>{copy.preview}</p> : null}
    {!previewMode && !run && !error ? <p className={styles.loading}>{copy.loading}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {run?.status === "COMPLETED" ? <p className={styles.complete} role="status">{copy.complete}</p> : null}
    {reviewBlock && activeRun ? <>
      <p className={styles.progress}>{copy.progress}</p>
      <div className={styles.questions}>
        <ExerciseBlock
          key={activeRun.id}
          block={reviewBlock}
          contentLocale={contentLocale}
          playerStyle={playerStyle}
          individualExerciseStep
          sequentialOnly
          onAttemptResolved={({ isCorrect, difficulty, isFinalExercise, streakMilestone }) => {
            if (isCorrect) onCorrectAnswer?.(difficulty);
            if (streakMilestone) onStreakChestAvailable?.(streakMilestone);
            if (isFinalExercise) void completeReview();
          }}
          onAttemptDeferred={({ isFinalExercise }) => { if (isFinalExercise) void completeReview(); }}
        />
      </div>
    </> : null}
  </section>;
}
