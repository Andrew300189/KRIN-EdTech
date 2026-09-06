"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import styles from "./LessonRewardWheel.module.css";

type WheelReward = { spun: boolean; alreadySpun: boolean; experience: number; coins: number; rewardId: string | null };

const copy = {
  en: { title: "Bonus wheel", ready: "Spin for a guaranteed reward", spin: "Spin the wheel", spinning: "Spinning…", done: "Reward collected", already: "This lesson reward was already collected.", error: "Unable to spin the reward wheel." },
  ru: { title: "Бонусное колесо", ready: "Крутите: приз гарантирован", spin: "Крутить колесо", spinning: "Крутим…", done: "Награда получена", already: "Награда за этот урок уже получена.", error: "Не удалось крутануть колесо." },
  uk: { title: "Бонусне колесо", ready: "Крутіть: приз гарантовано", spin: "Крутити колесо", spinning: "Крутимо…", done: "Нагороду отримано", already: "Нагороду за цей урок уже отримано.", error: "Не вдалося крутнути колесо." },
} as const;

function rewardText(reward: WheelReward) {
  const parts = [];
  if (reward.experience) parts.push(`+${reward.experience} XP`);
  if (reward.coins) parts.push(`+${reward.coins} ◉`);
  return parts.join(" · ") || "✦";
}

export function LessonRewardWheel({ lessonId }: { lessonId: string }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [spinning, setSpinning] = useState(false);
  const [turn, setTurn] = useState(0);
  const [reward, setReward] = useState<WheelReward | null>(null);

  async function spin() {
    if (spinning || reward) return;
    setSpinning(true);
    setTurn((current) => current + 1_800 + Math.floor(Math.random() * 360));
    try {
      const response = await fetch(`/api/learning/lessons/${encodeURIComponent(lessonId)}/wheel`, { method: "POST" });
      const payload = await response.json().catch(() => null) as { data?: WheelReward; error?: string } | null;
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? text.error);
      setReward(payload.data);
      if (payload.data.spun) {
        notifyMotivationUpdated();
        toast.success(rewardText(payload.data));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.error);
    } finally { setSpinning(false); }
  }

  return <section className={styles.card} aria-live="polite">
    <div className={styles.wheelWrap}><span className={styles.pointer} aria-hidden="true">▼</span><span className={styles.wheel} style={{ transform: `rotate(${turn}deg)` }} aria-hidden="true">✦</span></div>
    <div className={styles.copy}><p>{text.title}</p><strong>{reward?.spun ? rewardText(reward) : reward?.alreadySpun ? text.already : text.ready}</strong></div>
    <button type="button" onClick={() => void spin()} disabled={spinning || Boolean(reward)}>{spinning ? text.spinning : reward?.spun ? text.done : reward?.alreadySpun ? text.already : text.spin}</button>
  </section>;
}
