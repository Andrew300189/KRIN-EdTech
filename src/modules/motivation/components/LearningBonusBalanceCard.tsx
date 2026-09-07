"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/core/i18n/locale";
import { MOTIVATION_UPDATED_EVENT } from "@/modules/motivation/motivation-events";
import styles from "./LearningBonusBalanceCard.module.css";

type Balance = { hintCredits: number; translationCredits: number };

const copy = {
  en: { eyebrow: "Learning bonuses", hint: "Hint credits", translation: "Translation credits", helper: "Used before XP" },
  ru: { eyebrow: "Бонусы для уроков", hint: "Бонусы подсказок", translation: "Бонусы перевода", helper: "Тратятся раньше XP" },
  uk: { eyebrow: "Бонуси для уроків", hint: "Бонуси підказок", translation: "Бонуси перекладу", helper: "Витрачаються раніше XP" },
} as const;

export function LearningBonusBalanceCard({ initialBalance }: { initialBalance: Balance }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [balance, setBalance] = useState(initialBalance);

  useEffect(() => {
    async function refresh() {
      const response = await fetch("/api/profile/rewards/learning-bonuses", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: Balance } | null;
      if (response.ok && payload?.data) setBalance(payload.data);
    }
    const update = () => { void refresh(); };
    window.addEventListener(MOTIVATION_UPDATED_EVENT, update);
    return () => window.removeEventListener(MOTIVATION_UPDATED_EVENT, update);
  }, []);

  return (
    <article className={styles.card} aria-label={text.eyebrow}>
      <p>{text.eyebrow}</p>
      <div className={styles.bonuses}>
        <div className={`${styles.bonus} ${styles.hint}`}>
          <span aria-hidden="true">✦</span>
          <div><strong>{balance.hintCredits}</strong><small>{text.hint}</small></div>
        </div>
        <div className={`${styles.bonus} ${styles.translation}`}>
          <span aria-hidden="true">✧</span>
          <div><strong>{balance.translationCredits}</strong><small>{text.translation}</small></div>
        </div>
      </div>
      <small className={styles.helper}>{text.helper}</small>
    </article>
  );
}
