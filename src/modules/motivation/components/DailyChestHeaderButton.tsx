"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { MOTIVATION_UPDATED_EVENT, notifyMotivationUpdated } from "../motivation-events";
import styles from "./DailyChestHeaderButton.module.css";

type ChestState = { available: boolean; nextAt: string | null };
type ChestReward = { opened: boolean; experience: number; coins: number; hintCredits: number; translationCredits: number; nextAt: string | null };

const copy = {
  en: { ready: "Open daily chest", opening: "Opening daily chest", next: "Next daily chest", hint: "hint credit", translation: "translation credit" },
  ru: { ready: "Открыть ежедневный сундук", opening: "Открываем ежедневный сундук", next: "Следующий ежедневный сундук", hint: "бонус подсказки", translation: "бонус перевода" },
  uk: { ready: "Відкрити щоденну скриню", opening: "Відкриваємо щоденну скриню", next: "Наступна щоденна скриня", hint: "бонус підказки", translation: "бонус перекладу" },
} as const;

function rewardText(reward: Pick<ChestReward, "experience" | "coins" | "hintCredits" | "translationCredits">, text: Pick<(typeof copy)[keyof typeof copy], "hint" | "translation">) {
  const parts: string[] = [];
  if (reward.experience) parts.push(`+${reward.experience} XP`);
  if (reward.coins) parts.push(`+${reward.coins} ◉`);
  if (reward.hintCredits) parts.push(`+${reward.hintCredits} ${text.hint}`);
  if (reward.translationCredits) parts.push(`+${reward.translationCredits} ${text.translation}`);
  return parts.join(" · ") || "✦";
}

function timeRemaining(nextAt: string | null) {
  if (!nextAt) return "";
  const remaining = Math.max(0, new Date(nextAt).getTime() - Date.now());
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

function chestEndpoint() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `/api/profile/rewards/daily-chest?timeZone=${encodeURIComponent(timeZone)}`;
}

/** A compact daily-chest shortcut placed beside the learner avatar. */
export function DailyChestHeaderButton() {
  const { locale } = useLocale();
  const text = copy[locale];
  const [state, setState] = useState<ChestState | null>(null);
  const [opening, setOpening] = useState(false);
  const [clock, setClock] = useState(Date.now());

  const loadState = useCallback(async () => {
    try {
      const response = await fetch(chestEndpoint(), { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: ChestState } | null;
      if (response.ok && payload?.data) setState(payload.data);
    } catch {
      // The normal profile and avatar controls remain usable when the reward
      // endpoint is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    void loadState();
    window.addEventListener(MOTIVATION_UPDATED_EVENT, loadState);
    return () => window.removeEventListener(MOTIVATION_UPDATED_EVENT, loadState);
  }, [loadState]);

  useEffect(() => {
    if (!state?.nextAt || state.available) return;
    const untilReset = Math.max(0, new Date(state.nextAt).getTime() - Date.now() + 100);
    const resetTimer = window.setTimeout(() => { setClock(Date.now()); void loadState(); }, Math.min(untilReset, 2_147_483_647));
    const countdownTimer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => { window.clearTimeout(resetTimer); window.clearInterval(countdownTimer); };
  }, [loadState, state?.available, state?.nextAt]);

  async function openChest() {
    if (opening || !state?.available) return;
    setOpening(true);
    try {
      const response = await fetch(chestEndpoint(), { method: "POST" });
      const payload = await response.json().catch(() => null) as { data?: ChestReward; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? text.ready);
      setState({ available: false, nextAt: payload.data.nextAt });
      if (payload.data.opened) {
        toast.success(rewardText(payload.data, text));
        notifyMotivationUpdated();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.ready);
    } finally {
      setOpening(false);
    }
  }

  // Do not reserve header space for signed-out visitors or while the account
  // check is still in flight.
  if (!state) return null;
  const label = state.available ? text.ready : `${text.next}: ${timeRemaining(state.nextAt)}`;
  void clock;

  return <button
    type="button"
    className={`${styles.button} ${state.available ? styles.available : ""} ${opening ? styles.opening : ""}`}
    onClick={() => void openChest()}
    disabled={!state.available || opening}
    aria-label={opening ? text.opening : label}
    title={label}
  >
    <span className={styles.gift} aria-hidden="true">🎁</span>
    <span className={styles.srOnly}>{label}</span>
    {state.available ? <span className={styles.readyDot} aria-hidden="true" /> : null}
  </button>;
}
