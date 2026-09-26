"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import styles from "./LessonStreakRecoveryCard.module.css";

const copy = {
  en: { title: "Answer streak paused", description: "Restore the verified lesson streak with a Water Lily, or start a new run.", restore: "Restore streak", continue: "Continue new run", shop: "Get a Water Lily", available: "Available lilies" },
  ru: { title: "Серия ответов прервана", description: "Восстановите подтверждённую серию урока кувшинкой или начните новую.", restore: "Восстановить серию", continue: "Начать новую серию", shop: "Купить кувшинку", available: "Доступные кувшинки" },
  uk: { title: "Серію відповідей перервано", description: "Відновіть підтверджену серію уроку лататтям або почніть нову.", restore: "Відновити серію", continue: "Почати нову серію", shop: "Купити латаття", available: "Доступне латаття" },
} as const;

type Lily = { id: string; capacity: number; quantity: number };
export type LessonStreakRecoveryResult = { current: number; recoverable: number; restored: boolean; exerciseId?: string; correctAnswer?: unknown; experience?: number; streakMilestone?: number | null };
type Props = { lessonId: string; brokenStreak: number; lilies: Lily[]; onResolved: (result: LessonStreakRecoveryResult) => void };

/** The server validates and spends the lily before the visible streak moves. */
export function LessonStreakRecoveryCard({ lessonId, brokenStreak, lilies, onResolved }: Props) {
  const { locale } = useLocale();
  const text = copy[locale] ?? copy.en;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (brokenStreak < 1) return null;
  const usable = lilies.filter((lily) => lily.quantity > 0 && lily.capacity >= brokenStreak);

  async function resolve(action: "RESTORE" | "CONTINUE") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/lessons/${lessonId}/answer-streak`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      const payload = await response.json().catch(() => null) as { data?: LessonStreakRecoveryResult; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to update the lesson streak.");
      onResolved(payload.data);
      if (payload.data.restored) notifyMotivationUpdated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the lesson streak.");
    } finally {
      setBusy(false);
    }
  }

  return <div className={styles.overlay}><section className={styles.card} role="dialog" aria-modal="true" aria-live="polite" aria-label={text.title}>
    <div className={styles.copy}>
      <strong>{text.title} · {brokenStreak}</strong>
      <span>{text.description}</span>
      {lilies.some((lily) => lily.quantity > 0) ? <span>{text.available}: {lilies.filter((lily) => lily.quantity > 0).map((lily) => `×${lily.capacity} (${lily.quantity})`).join(", ")}</span> : null}
      {error ? <span role="alert">{error}</span> : null}
    </div>
    <div className={styles.actions}>
      {usable.length ? <button type="button" className={styles.primary} disabled={busy} onClick={() => void resolve("RESTORE")}>{text.restore}</button> : <Link className={styles.secondary} href="/student/shop">{text.shop}</Link>}
      <button type="button" className={styles.secondary} disabled={busy} onClick={() => void resolve("CONTINUE")}>{text.continue}</button>
    </div>
  </section></div>;
}
