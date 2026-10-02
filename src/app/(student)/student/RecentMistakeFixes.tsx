"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/core/i18n/locale";
import styles from "./StudentHome.module.css";

export type RecentMistake = {
  id: string;
  occurrenceCount: number;
  explanation: string | null;
  lesson: { title: string; courseSlug: string } | null;
};

export function RecentMistakeFixes({ mistakes }: { mistakes: RecentMistake[] }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fallback = locale === "uk" ? "Виправити помилку не вдалося." : locale === "ru" ? "Не удалось открыть исправление." : "Could not open this correction.";

  async function fix(mistake: RecentMistake) {
    if (!mistake.lesson || loadingId) return;
    setLoadingId(mistake.id);
    setError(null);
    try {
      const response = await fetch("/api/profile/mistakes/review-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "COURSE", courseSlug: mistake.lesson.courseSlug, startMistakeId: mistake.id }),
      });
      const payload = await response.json().catch(() => null) as { data?: { nextUrl?: string }; error?: string } | null;
      if (!response.ok || !payload?.data?.nextUrl) throw new Error(payload?.error ?? fallback);
      router.push(payload.data.nextUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallback);
      setLoadingId(null);
    }
  }

  return <>
    <ul className={styles.mistakeList}>{mistakes.map((mistake) => <li key={mistake.id}>
      <span className={styles.mistakeCopy}><strong>{mistake.lesson?.title ?? (locale === "uk" ? "Помилка" : locale === "ru" ? "Ошибка" : "Mistake")}</strong><small>{mistake.explanation ?? (locale === "uk" ? `Спроб: ${mistake.occurrenceCount}` : locale === "ru" ? `Попыток: ${mistake.occurrenceCount}` : `${mistake.occurrenceCount} attempts`)}</small></span>
      {mistake.lesson ? <button type="button" className={styles.fixButton} aria-label={`Fix: ${mistake.lesson.title}`} disabled={Boolean(loadingId)} onClick={() => void fix(mistake)}>{loadingId === mistake.id ? "…" : "Fix"}</button> : null}
    </li>)}</ul>
    {error ? <p className={styles.mistakeError} role="alert">{error}</p> : null}
  </>;
}
