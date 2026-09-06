"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "../motivation-events";
import styles from "./DailyChestCard.module.css";

type ChestState = { available: boolean; nextAt: string | null };

const copy = {
  en: { eyebrow: "Daily Mystery Box", title: "A surprise is waiting", ready: "Open free chest", opening: "Opening…", wait: "Next chest", reward: (xp: number) => `+${xp} XP added` },
  ru: { eyebrow: "Ежедневный сундук", title: "Вас ждёт сюрприз", ready: "Открыть бесплатно", opening: "Открываем…", wait: "Следующий сундук", reward: (xp: number) => `+${xp} XP начислено` },
  uk: { eyebrow: "Щоденна скриня", title: "На вас чекає сюрприз", ready: "Відкрити безкоштовно", opening: "Відкриваємо…", wait: "Наступна скриня", reward: (xp: number) => `+${xp} XP нараховано` },
} as const;

function timeRemaining(nextAt: string | null) {
  if (!nextAt) return "";
  const remaining = Math.max(0, new Date(nextAt).getTime() - Date.now());
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

export function DailyChestCard() {
  const { locale } = useLocale();
  const text = copy[locale];
  const [state, setState] = useState<ChestState | null>(null);
  const [opening, setOpening] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    void fetch("/api/profile/rewards/daily-chest", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json().catch(() => null) as { data?: ChestState } | null }))
      .then(({ response, payload }) => { if (response.ok && payload?.data) setState(payload.data); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!state?.nextAt || state.available) return;
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [state?.available, state?.nextAt]);

  async function openChest() {
    if (opening || !state?.available) return;
    setOpening(true);
    try {
      const response = await fetch("/api/profile/rewards/daily-chest", { method: "POST" });
      const payload = await response.json().catch(() => null) as { data?: { opened: boolean; experience: number; nextAt: string | null }; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to open the Daily Chest.");
      setState({ available: false, nextAt: payload.data.nextAt });
      if (payload.data.opened) {
        setReward(payload.data.experience);
        notifyMotivationUpdated();
        toast.success(text.reward(payload.data.experience));
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
  return <article className={`${styles.card} ${reward ? styles.opened : ""}`}>
    <div className={styles.sparkles} aria-hidden="true">✦ ✧</div>
    <p>{text.eyebrow}</p>
    <div className={styles.content}><span className={styles.chest} aria-hidden="true">🎁</span><div><h3>{reward ? text.reward(reward) : text.title}</h3><small>{state?.available ? "50–500 XP" : `${text.wait}: ${remaining}`}</small></div></div>
    <button type="button" onClick={() => void openChest()} disabled={!state?.available || opening}>{opening ? text.opening : state?.available ? text.ready : text.wait}</button>
  </article>;
}
