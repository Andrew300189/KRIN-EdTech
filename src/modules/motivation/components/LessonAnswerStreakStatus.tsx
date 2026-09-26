import { useLocale } from "@/core/i18n/locale";
import styles from "./LessonAnswerStreakStatus.module.css";

const copy = {
  en: "Correct answers in a row",
  ru: "Правильных ответов подряд",
  uk: "Правильних відповідей поспіль",
} as const;

export function LessonAnswerStreakStatus({ correctAnswersInRow, frozen = false, thawing = false, waterLilies = [] }: { correctAnswersInRow: number; frozen?: boolean; thawing?: boolean; waterLilies?: Array<{ capacity: number; quantity: number }> }) {
  const { locale } = useLocale();
  const text = copy[locale] ?? copy.en;

  return (
    <div className={styles.status} aria-label={`${text}: ${correctAnswersInRow}`}>
      <span className={`${styles.streak} ${frozen ? styles.frozen : ""} ${thawing ? styles.thawing : ""}`} title={`${text}: ${correctAnswersInRow}`}>
        <svg className={styles.streakIcon} viewBox="0 0 24 24" aria-hidden="true"><path d="M13.7 2.8c.4 3.1-.7 4.7-2.2 6.1-.8.8-1.3 1.6-1.3 2.8 0 1.1.8 2.1 2 2.1 1.7 0 2.7-1.5 2.6-3.2 2.1 1.6 3.2 3.7 3.2 6.1 0 4.1-3.1 6.6-7.1 6.6-4.4 0-7.2-2.9-7.2-6.7 0-2.7 1.3-5 3.8-7.2-.1 2.1.8 3.3 2 3.9-.1-2.8 1-5.3 4.2-7.8Z" /></svg>
        <strong>{correctAnswersInRow}</strong>
        {frozen ? <span className={styles.ice} aria-label="Saved streak">❄</span> : null}
        {thawing ? <span className={styles.shards} aria-hidden="true">❄</span> : null}
      </span>
      {waterLilies.some((lily) => lily.quantity > 0) ? <span className={styles.lilies} role="list" aria-label="Water Lily levels">{waterLilies.filter((lily) => lily.quantity > 0).map((lily) => <span key={lily.capacity} role="listitem" title={`${lily.capacity} answers · ${lily.quantity} available`}>🪷{lily.capacity} ×{lily.quantity}</span>)}</span> : null}
    </div>
  );
}
