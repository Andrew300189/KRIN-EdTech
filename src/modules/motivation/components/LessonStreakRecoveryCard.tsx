"use client";

import { useLocale } from "@/core/i18n/locale";
import styles from "./LessonStreakRecoveryCard.module.css";

const copy = {
  en: { title: "Answer streak paused", description: "This wrong answer is remembered. Restore the lesson streak or continue with a new run.", restore: "Restore streak", continue: "Continue new run" },
  ru: { title: "Серия ответов прервана", description: "Ошибка запомнена. Восстановите серию урока или продолжите новый отрезок.", restore: "Восстановить серию", continue: "Продолжить новую серию" },
  uk: { title: "Серію відповідей перервано", description: "Помилку запам’ятовано. Відновіть серію уроку або продовжте новий відрізок.", restore: "Відновити серію", continue: "Продовжити нову серію" },
} as const;

type Props = { brokenStreak: number; onRestore: () => void; onContinue: () => void };

/** A lesson-local recovery action. It never touches the daily streak or XP;
 * server-side answer rewards remain first-try validated. */
export function LessonStreakRecoveryCard({ brokenStreak, onRestore, onContinue }: Props) {
  const { locale } = useLocale();
  const text = copy[locale] ?? copy.en;
  if (brokenStreak < 1) return null;

  return <section className={styles.card} aria-live="polite" aria-label={text.title}>
    <div className={styles.copy}>
      <strong>{text.title} · {brokenStreak}</strong>
      <span>{text.description}</span>
    </div>
    <div className={styles.actions}>
      <button type="button" className={styles.primary} onClick={onRestore}>{text.restore}</button>
      <button type="button" className={styles.secondary} onClick={onContinue}>{text.continue}</button>
    </div>
  </section>;
}
