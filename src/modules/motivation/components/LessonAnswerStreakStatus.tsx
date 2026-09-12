"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/core/i18n/locale";
import { MOTIVATION_UPDATED_EVENT } from "../motivation-events";
import styles from "./LessonAnswerStreakStatus.module.css";

type Balance = { hintCredits: number; translationCredits: number };

const copy = {
  en: { streak: "Correct answers in a row", hint: "Hint credits", translation: "Translation credits" },
  ru: { streak: "Правильных ответов подряд", hint: "Бонусы подсказок", translation: "Бонусы перевода" },
  uk: { streak: "Правильних відповідей поспіль", hint: "Бонуси підказок", translation: "Бонуси перекладу" },
} as const;

/**
 * A lesson-local streak and the two spendable learning bonuses. The streak is
 * intentionally supplied by the player: it reflects this visit's answer
 * sequence, while the bonus balances always come from the server.
 */
export function LessonAnswerStreakStatus({ correctAnswersInRow }: { correctAnswersInRow: number }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [balance, setBalance] = useState<Balance | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/rewards/learning-bonuses", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: Balance } | null;
      if (response.ok && payload?.data) setBalance(payload.data);
    } catch {
      // The lesson flow remains usable when the small status request fails.
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(MOTIVATION_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(MOTIVATION_UPDATED_EVENT, refresh);
  }, [refresh]);

  const hintCredits = balance?.hintCredits;
  const translationCredits = balance?.translationCredits;
  const summary = `${text.streak}: ${correctAnswersInRow}. ${text.hint}: ${hintCredits ?? "…"}. ${text.translation}: ${translationCredits ?? "…"}.`;

  return (
    <div className={styles.status} aria-label={summary}>
      <span className={styles.streak} title={`${text.streak}: ${correctAnswersInRow}`}>
        <span className={styles.streakIcon} aria-hidden="true">✓</span>
        <strong>×{correctAnswersInRow}</strong>
        <span className={styles.srOnly}>{text.streak}</span>
      </span>
      <span className={styles.separator} aria-hidden="true" />
      <span className={`${styles.bonus} ${styles.hint}`} title={`${text.hint}: ${hintCredits ?? "…"}`}>
        <span className={styles.icon} aria-hidden="true">✦</span>
        <strong>{hintCredits ?? "…"}</strong>
        <span className={styles.srOnly}>{text.hint}</span>
      </span>
      <span className={`${styles.bonus} ${styles.translation}`} title={`${text.translation}: ${translationCredits ?? "…"}`}>
        <span className={styles.icon} aria-hidden="true">✧</span>
        <strong>{translationCredits ?? "…"}</strong>
        <span className={styles.srOnly}>{text.translation}</span>
      </span>
    </div>
  );
}
