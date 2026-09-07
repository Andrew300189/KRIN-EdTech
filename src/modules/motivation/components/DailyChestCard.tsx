"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "../motivation-events";
import styles from "./DailyChestCard.module.css";

type ChestState = { available: boolean; nextAt: string | null };
type ChestReward = { opened: boolean; experience: number; coins: number; hintCredits: number; translationCredits: number; nextAt: string | null };

const copy = {
  en: { eyebrow: "Daily Mystery Box", title: "A surprise is waiting", ready: "Open free chest", opening: "Opening…", wait: "Next chest", available: "50–500 XP · bonus credits", hint: "+1 hint credit", translation: "+1 translation credit" },
  ru: { eyebrow: "Ежедневный сундук", title: "Вас ждёт сюрприз", ready: "Открыть бесплатно", opening: "Открываем…", wait: "Следующий сундук", available: "50–500 XP · бонусы", hint: "+1 бонус подсказки", translation: "+1 бонус перевода" },
  uk: { eyebrow: "Щоденна скриня", title: "На вас чекає сюрприз", ready: "Відкрити безкоштовно", opening: "Відкриваємо…", wait: "Наступна скриня", available: "50–500 XP · бонуси", hint: "+1 бонус підказки", translation: "+1 бонус перекладу" },
} as const;

function rewardText(reward: Pick<ChestReward, "experience" | "coins" | "hintCredits" | "translationCredits">, text: Pick<(typeof copy)[keyof typeof copy], "hint" | "translation">) {
  const parts = [];
  if (reward.experience) parts.push(`+${reward.experience} XP`);
  if (reward.coins) parts.push(`+${reward.coins} ◉`);
  if (reward.hintCredits) parts.push(text.hint);
  if (reward.translationCredits) parts.push(text.translation);
  return parts.join(" · ") || "✦";
}

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
  const [reward, setReward] = useState<ChestReward | null>(null);
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
      const payload = await response.json().catch(() => null) as { data?: ChestReward; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to open the Daily Chest.");
      setState({ available: false, nextAt: payload.data.nextAt });
      if (payload.data.opened) {
        setReward(payload.data);
        notifyMotivationUpdated();
        toast.success(rewardText(payload.data, text));
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
    <div className={styles.content}><span className={styles.chest} aria-hidden="true">🎁</span><div><h3>{reward ? rewardText(reward, text) : text.title}</h3><small>{state?.available ? text.available : `${text.wait}: ${remaining}`}</small></div></div>
    <button type="button" onClick={() => void openChest()} disabled={!state?.available || opening}>{opening ? text.opening : state?.available ? text.ready : text.wait}</button>
  </article>;
}
