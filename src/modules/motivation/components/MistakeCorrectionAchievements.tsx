"use client";

/* eslint-disable @next/next/no-img-element -- The local bud is an app-owned generated asset. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "../motivation-events";
import styles from "./MistakeCorrectionAchievements.module.css";

type Milestone = { target: number; ready: boolean; claimed: boolean; experience: number };
type State = { corrected: number; milestones: Milestone[] };

const copy = {
  en: { title: "Correction achievements", count: "{count} mistakes corrected", target: "Correct {count} mistakes", claim: "Collect reward", collected: "Collected", album: "Flower album", reward: "+{xp} XP · Water Lily · mystery flower" },
  ru: { title: "Достижения за исправления", count: "Исправлено ошибок: {count}", target: "Исправить {count} ошибок", claim: "Забрать награду", collected: "Получено", album: "Альбом цветов", reward: "+{xp} XP · кувшинка · цветок" },
  uk: { title: "Досягнення за виправлення", count: "Виправлено помилок: {count}", target: "Виправити {count} помилок", claim: "Забрати нагороду", collected: "Отримано", album: "Альбом квітів", reward: "+{xp} XP · латаття · квітка" },
} as const;

export function MistakeCorrectionAchievements() {
  const { locale } = useLocale();
  const text = copy[locale] ?? copy.en;
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const response = await fetch("/api/profile/rewards/mistake-achievements", { cache: "no-store" });
    const payload = await response.json().catch(() => null) as { data?: State } | null;
    if (response.ok && payload?.data) setState(payload.data);
  }
  useEffect(() => { void load().catch(() => undefined); }, []);

  async function claim(target: number) {
    if (busy !== null) return;
    setBusy(target);
    try {
      const response = await fetch("/api/profile/rewards/mistake-achievements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target }) });
      const payload = await response.json().catch(() => null) as { data?: { awarded: boolean; experience: number }; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Reward unavailable.");
      if (payload.data.awarded) { toast.success(`+${payload.data.experience} XP · 🪷`); notifyMotivationUpdated(); }
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Reward unavailable."); }
    finally { setBusy(null); }
  }

  if (!state) return null;
  const upcoming = state.milestones.filter((milestone) => !milestone.claimed).slice(0, 4);
  const claimed = state.milestones.filter((milestone) => milestone.claimed).length;
  return <section className={styles.section} aria-labelledby="mistake-achievements-title">
    <div className={styles.heading}><div><h2 id="mistake-achievements-title">{text.title}</h2><p>{text.count.replace("{count}", String(state.corrected))}</p></div><Link href="/student/flowers">{text.album} →</Link></div>
    <div className={styles.grid}>{upcoming.map((milestone) => <article key={milestone.target} className={`${styles.card} ${milestone.ready ? styles.ready : ""}`}>
      <img src="/flower-chests/mystery-bud.png" alt="" />
      <div><h3>{text.target.replace("{count}", String(milestone.target))}</h3><p>{text.reward.replace("{xp}", String(milestone.experience))}</p>
        <progress max={milestone.target} value={Math.min(state.corrected, milestone.target)} aria-label={`${state.corrected} / ${milestone.target}`} /></div>
      <button type="button" disabled={!milestone.ready || busy !== null} onClick={() => void claim(milestone.target)}>{busy === milestone.target ? "…" : text.claim}</button>
    </article>)}</div>
    {claimed ? <small>{text.collected}: {claimed}</small> : null}
  </section>;
}
