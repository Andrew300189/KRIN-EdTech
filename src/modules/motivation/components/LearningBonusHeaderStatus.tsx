"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/core/i18n/locale";
import { MOTIVATION_UPDATED_EVENT } from "../motivation-events";
import styles from "./LearningBonusHeaderStatus.module.css";

type Balance = { hintCredits: number; translationCredits: number };

const copy = {
  en: { hint: "Hint credits", translation: "Translation credits" },
  ru: { hint: "Бонусы подсказок", translation: "Бонусы перевода" },
  uk: { hint: "Бонуси підказок", translation: "Бонуси перекладу" },
} as const;

/**
 * Compact balances shown beside the daily chest. They intentionally use only
 * an icon and a number; the localized names stay available as tooltips and
 * screen-reader text.
 */
export function LearningBonusHeaderStatus() {
  const { locale } = useLocale();
  const text = copy[locale];
  const [balance, setBalance] = useState<Balance | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/rewards/learning-bonuses", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: Balance } | null;
      if (response.ok && payload?.data) setBalance(payload.data);
    } catch {
      // The header remains usable if rewards are briefly unavailable.
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(MOTIVATION_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(MOTIVATION_UPDATED_EVENT, refresh);
  }, [refresh]);

  if (!balance) return null;

  return (
    <div className={styles.status} aria-label={`${text.hint}: ${balance.hintCredits}. ${text.translation}: ${balance.translationCredits}.`}>
      <span className={`${styles.bonus} ${styles.hint}`} title={`${text.hint}: ${balance.hintCredits}`}>
        <span className={styles.icon} aria-hidden="true">✦</span>
        <strong>{balance.hintCredits}</strong>
        <span className={styles.srOnly}>{text.hint}</span>
      </span>
      <span className={`${styles.bonus} ${styles.translation}`} title={`${text.translation}: ${balance.translationCredits}`}>
        <span className={styles.icon} aria-hidden="true">✧</span>
        <strong>{balance.translationCredits}</strong>
        <span className={styles.srOnly}>{text.translation}</span>
      </span>
    </div>
  );
}
