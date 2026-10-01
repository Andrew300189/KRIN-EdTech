"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import { planWaterLilyRestore } from "@/modules/motivation/utils/shop-consumables";
import styles from "./LessonStreakRecoveryCard.module.css";
import pulseStyles from "./RecoveryActionPulse.module.css";

const copy = {
  en: { title: "Answer streak paused", description: "Restore the verified lesson streak with Water Lilies, or start a new run.", restore: "Restore streak", continue: "Continue new run", shop: "Get a Water Lily", available: "Available lilies", cost: "Will use", saveError: "Could not save your place. Please try again." },
  ru: { title: "Серия ответов прервана", description: "Восстановите подтверждённую серию урока кувшинками или начните новую.", restore: "Восстановить серию", continue: "Начать новую серию", shop: "Купить кувшинку", available: "Доступные кувшинки", cost: "Будет списано", saveError: "Не удалось сохранить место в уроке. Попробуйте ещё раз." },
  uk: { title: "Серію відповідей перервано", description: "Відновіть підтверджену серію уроку лататтям або почніть нову.", restore: "Відновити серію", continue: "Почати нову серію", shop: "Купити латаття", available: "Доступне латаття", cost: "Буде списано", saveError: "Не вдалося зберегти місце в уроці. Спробуйте ще раз." },
} as const;

type Lily = { id: string; capacity: number; quantity: number };
export type LessonStreakRecoveryResult = { current: number; recoverable: number; restored: boolean; exerciseId?: string; correctAnswer?: unknown; experience?: number; streakMilestone?: number | null };
type Props = { lessonId: string; brokenStreak: number; lilies: Lily[]; onResolved: (result: LessonStreakRecoveryResult) => void; onOpenShop?: () => Promise<boolean> };

/** The server validates and spends the lily before the visible streak moves. */
export function LessonStreakRecoveryCard({ lessonId, brokenStreak, lilies, onResolved, onOpenShop }: Props) {
  const { locale } = useLocale();
  const text = copy[locale] ?? copy.en;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (brokenStreak < 1) return null;
  const plan = planWaterLilyRestore(lilies, brokenStreak);

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

  async function openShop() {
    if (busy || !onOpenShop) return;
    setBusy(true);
    setError(null);
    try {
      if (!await onOpenShop()) setError(text.saveError);
    } catch {
      setError(text.saveError);
    } finally {
      setBusy(false);
    }
  }

  return <div className={styles.overlay}><section className={styles.card} role="dialog" aria-modal="true" aria-live="polite" aria-label={text.title}>
    <div className={styles.copy}>
      <strong>{text.title} · {brokenStreak}</strong>
      <span>{text.description}</span>
      {lilies.some((lily) => lily.quantity > 0) ? <span>{text.available}: {lilies.filter((lily) => lily.quantity > 0).map((lily) => `×${lily.capacity} (${lily.quantity})`).join(", ")}</span> : null}
      {plan ? <span className={styles.cost}>{text.cost}: {plan.lilies.map((lily) => `${lily.quantity} × ${lily.capacity}`).join(" + ")}</span> : null}
      {error ? <span role="alert">{error}</span> : null}
    </div>
    <div className={styles.actions}>
      {plan ? <button type="button" data-recovery-step="restore" className={`${styles.primary} ${!busy ? pulseStyles.pulse : ""}`} disabled={busy} onClick={() => void resolve("RESTORE")}>{text.restore}</button> : onOpenShop ? <button type="button" data-recovery-step="shop" className={`${styles.primary} ${!busy ? pulseStyles.pulse : ""}`} disabled={busy} onClick={() => void openShop()}>{text.shop}</button> : <Link className={`${styles.primary} ${pulseStyles.pulse}`} href="/student/shop">{text.shop}</Link>}
      <button type="button" className={styles.secondary} disabled={busy} onClick={() => void resolve("CONTINUE")}>{text.continue}</button>
    </div>
  </section></div>;
}
