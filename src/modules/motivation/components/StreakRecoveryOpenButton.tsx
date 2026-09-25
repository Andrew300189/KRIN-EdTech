"use client";

import { useLocale } from "@/core/i18n/locale";
import { STREAK_RECOVERY_OPEN_EVENT } from "@/modules/motivation/motivation-events";

const labels = {
  en: "↻ Restore streak",
  ru: "↻ Восстановить серию",
  uk: "↻ Відновити серію",
} as const;

export function StreakRecoveryOpenButton({ className }: { className?: string }) {
  const { locale } = useLocale();
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(STREAK_RECOVERY_OPEN_EVENT))}>
    {labels[locale]}
  </button>;
}
