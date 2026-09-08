"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/core/i18n/locale";
import { MOTIVATION_UPDATED_EVENT } from "../motivation-events";
import styles from "./DailyStreakHeaderStatus.module.css";

type MotivationPayload = { streak?: { currentStreak?: number } };

const copy = {
  en: "Daily streak",
  ru: "Серия дней",
  uk: "Серія днів",
} as const;

/** Compact, label-free daily-streak count placed before the lesson bonuses. */
export function DailyStreakHeaderStatus() {
  const { locale } = useLocale();
  const [days, setDays] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/motivation", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: MotivationPayload } | null;
      const currentStreak = payload?.data?.streak?.currentStreak;
      if (response.ok && typeof currentStreak === "number") setDays(currentStreak);
    } catch {
      // Learning and navigation remain available if the badge cannot refresh.
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(MOTIVATION_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(MOTIVATION_UPDATED_EVENT, refresh);
  }, [refresh]);

  if (days === null) return null;
  const label = `${copy[locale]}: ${days}`;

  return <span className={styles.status} title={label} aria-label={label}>
    <span className={styles.fire} aria-hidden="true">🔥</span>
    <strong>{days}</strong>
  </span>;
}
