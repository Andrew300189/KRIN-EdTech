"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { MOTIVATION_UPDATED_EVENT, notifyMotivationUpdated } from "../motivation-events";
import styles from "./DailyChestCard.module.css";

type ChestState = { available: boolean; nextAt: string | null };
type ChestReward = { opened: boolean; experience: number; coins: number; waterLily?: number; nextAt: string | null };

const copy = {
  en: { eyebrow: "Daily chest", title: "Your daily reward is waiting", ready: "Open chest", opening: "Opening…", wait: "Next chest", available: "500 XP · 3 Water Lilies" },
  ru: { eyebrow: "Ежедневный сундук", title: "Ежедневная награда ждёт вас", ready: "Открыть сундук", opening: "Открываем…", wait: "Следующий сундук", available: "500 XP · 3 кувшинки" },
  uk: { eyebrow: "Щоденна скриня", title: "Щоденна нагорода чекає на вас", ready: "Відкрити скриню", opening: "Відкриваємо…", wait: "Наступна скриня", available: "500 XP · 3 латаття" },
} as const;

function rewardText(reward: Pick<ChestReward, "experience" | "coins" | "waterLily">) {
  const parts = [];
  if (reward.experience) parts.push(`+${reward.experience} XP`);
  if (reward.coins) parts.push(`+${reward.coins} ◉`);
  if (reward.waterLily) parts.push(`+${reward.waterLily} 🪷`);
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

export function DailyChestCard() {
  const { locale } = useLocale();
  const text = copy[locale];
  const [state, setState] = useState<ChestState | null>(null);
  const [opening, setOpening] = useState(false);
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [clock, setClock] = useState(Date.now());

  const loadState = useCallback(async () => {
    try {
      const response = await fetch(chestEndpoint(), { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: ChestState } | null;
      if (response.ok && payload?.data) {
        setState(payload.data);
        if (payload.data.available) setReward(null);
      }
    } catch {
      // A temporary refresh failure never blocks an already rendered dashboard.
    }
  }, []);

  useEffect(() => {
    void loadState();
    window.addEventListener(MOTIVATION_UPDATED_EVENT, loadState);
    window.addEventListener("focus", loadState);
    return () => { window.removeEventListener(MOTIVATION_UPDATED_EVENT, loadState); window.removeEventListener("focus", loadState); };
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
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to open the Daily Chest.");
      setState({ available: false, nextAt: payload.data.nextAt });
      if (payload.data.opened) {
        setReward(payload.data);
        notifyMotivationUpdated();
        toast.success(rewardText(payload.data));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open the Daily Chest.");
    } finally {
      setOpening(false);
    }
  }

  const remaining = state?.nextAt ? timeRemaining(state.nextAt) : "";
  // `clock` rerenders the countdown without changing server-owned state.
  void clock;
  return <article className={`${styles.card} ${reward ? styles.opened : ""} ${state?.available && !opening && !reward ? styles.available : ""}`}>
    <div className={styles.sparkles} aria-hidden="true">✦ ✧</div>
    <p>{text.eyebrow}</p>
    <div className={styles.content}><span className={styles.chest} aria-hidden="true">🎁</span><div><h3>{reward ? rewardText(reward) : text.title}</h3><small>{state?.available ? text.available : `${text.wait}: ${remaining}`}</small></div></div>
    <button type="button" onClick={() => void openChest()} disabled={!state?.available || opening}>{opening ? text.opening : state?.available ? text.ready : text.wait}</button>
  </article>;
}
