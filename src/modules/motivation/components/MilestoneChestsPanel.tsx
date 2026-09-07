"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "../motivation-events";
import styles from "./MilestoneChestsPanel.module.css";

type ChestKind = "LESSON_3" | "EVERY_7_LESSONS" | "MODULE" | "COURSE";
type Chest = { kind: ChestKind; available: boolean; availableCount: number; nextSourceId: string | null; progress: number; target: number; claimed: boolean };
type State = { completedLessons: number; chests: Chest[] };
type Reward = { opened: boolean; alreadyOpened: boolean; experience: number; coins: number; hintCredits: number; translationCredits: number };

const copy = {
  en: {
    eyebrow: "Reward chests", title: "Your learning milestones", completed: "{count} lessons completed", open: "Open chest", opening: "Opening…", ready: "Ready to open", readyPlural: "{count} chests are ready", claimed: "Collected", lessonCount: "{progress}/{target} lessons", modules: "{count} modules completed", courses: "{count} courses completed", hint: "+1 hint credit", translation: "+1 translation credit",
    chests: {
      LESSON_3: { icon: "🌱", title: "First steps chest", detail: "Opens once after 3 completed lessons." },
      EVERY_7_LESSONS: { icon: "🟦", title: "Seven-lesson chest", detail: "A stronger reward for every 7 completed lessons." },
      MODULE: { icon: "🟨", title: "Module chest", detail: "Opens after every completed module." },
      COURSE: { icon: "💎", title: "Course chest", detail: "The biggest reward after a completed course." },
    },
  },
  ru: {
    eyebrow: "Сундуки наград", title: "Ваши учебные достижения", completed: "Пройдено уроков: {count}", open: "Открыть сундук", opening: "Открываем…", ready: "Можно открыть", readyPlural: "Сундуков готово: {count}", claimed: "Получено", lessonCount: "Уроков: {progress}/{target}", modules: "Пройдено модулей: {count}", courses: "Пройдено курсов: {count}", hint: "+1 бонус подсказки", translation: "+1 бонус перевода",
    chests: {
      LESSON_3: { icon: "🌱", title: "Сундук первых шагов", detail: "Открывается один раз после 3 пройденных уроков." },
      EVERY_7_LESSONS: { icon: "🟦", title: "Сундук за 7 уроков", detail: "Улучшенная награда за каждые 7 пройденных уроков." },
      MODULE: { icon: "🟨", title: "Сундук модуля", detail: "Открывается после каждого завершённого модуля." },
      COURSE: { icon: "💎", title: "Сундук курса", detail: "Самая большая награда за завершённый курс." },
    },
  },
  uk: {
    eyebrow: "Скрині нагород", title: "Ваші навчальні досягнення", completed: "Пройдено уроків: {count}", open: "Відкрити скриню", opening: "Відкриваємо…", ready: "Можна відкрити", readyPlural: "Скринь готово: {count}", claimed: "Отримано", lessonCount: "Уроків: {progress}/{target}", modules: "Пройдено модулів: {count}", courses: "Пройдено курсів: {count}", hint: "+1 бонус підказки", translation: "+1 бонус перекладу",
    chests: {
      LESSON_3: { icon: "🌱", title: "Скриня перших кроків", detail: "Відкривається один раз після 3 пройдених уроків." },
      EVERY_7_LESSONS: { icon: "🟦", title: "Скриня за 7 уроків", detail: "Покращена нагорода за кожні 7 пройдених уроків." },
      MODULE: { icon: "🟨", title: "Скриня модуля", detail: "Відкривається після кожного завершеного модуля." },
      COURSE: { icon: "💎", title: "Скриня курсу", detail: "Найбільша нагорода за завершений курс." },
    },
  },
} as const;

function interpolate(value: string, values: Record<string, string | number>) {
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function rewardText(reward: Reward, text: (typeof copy)[keyof typeof copy]) {
  const parts: string[] = [];
  if (reward.experience) parts.push(`+${reward.experience} XP`);
  if (reward.coins) parts.push(`+${reward.coins} ◉`);
  if (reward.hintCredits) parts.push(text.hint);
  if (reward.translationCredits) parts.push(text.translation);
  return parts.join(" · ") || "✦";
}

function progressText(chest: Chest, state: State, text: (typeof copy)[keyof typeof copy]) {
  if (chest.kind === "MODULE") return interpolate(text.modules, { count: chest.progress });
  if (chest.kind === "COURSE") return interpolate(text.courses, { count: chest.progress });
  return interpolate(text.lessonCount, { progress: Math.min(chest.progress, chest.target), target: chest.target });
}

export function MilestoneChestsPanel() {
  const { locale } = useLocale();
  const router = useRouter();
  const text = copy[locale];
  const [state, setState] = useState<State | null>(null);
  const [opening, setOpening] = useState<ChestKind | null>(null);

  const load = async () => {
    const response = await fetch("/api/profile/rewards/milestone-chests", { cache: "no-store" });
    const payload = await response.json().catch(() => null) as { data?: State } | null;
    if (response.ok && payload?.data) setState(payload.data);
  };

  useEffect(() => { void load().catch(() => undefined); }, []);

  async function open(chest: Chest) {
    if (!chest.nextSourceId || opening) return;
    setOpening(chest.kind);
    try {
      const response = await fetch("/api/profile/rewards/milestone-chests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: chest.kind, sourceId: chest.nextSourceId }),
      });
      const payload = await response.json().catch(() => null) as { data?: Reward; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "The chest is unavailable.");
      if (payload.data.opened) {
        toast.success(rewardText(payload.data, text));
        notifyMotivationUpdated();
      }
      await load();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The chest is unavailable.");
    } finally {
      setOpening(null);
    }
  }

  if (!state) return null;
  return <section className={styles.panel} aria-labelledby="milestone-chests-title">
    <header className={styles.heading}>
      <div><p>{text.eyebrow}</p><h2 id="milestone-chests-title">{text.title}</h2></div>
      <strong>{interpolate(text.completed, { count: state.completedLessons })}</strong>
    </header>
    <div className={styles.grid}>
      {state.chests.map((chest) => {
        const item = text.chests[chest.kind];
        const progress = chest.target ? Math.min(100, Math.round((chest.progress / chest.target) * 100)) : 0;
        const availableLabel = chest.availableCount > 1
          ? interpolate(text.readyPlural, { count: chest.availableCount })
          : text.ready;
        const status = chest.available ? availableLabel : chest.claimed ? text.claimed : progressText(chest, state, text);
        return <article key={chest.kind} className={`${styles.chest} ${styles[chest.kind]} ${chest.available ? styles.available : ""}`}>
          <span className={styles.icon} aria-hidden="true">{item.icon}</span>
          <div className={styles.copy}><h3>{item.title}</h3><p>{item.detail}</p></div>
          <div className={styles.status}><span>{status}</span><i><b style={{ width: `${progress}%` }} /></i></div>
          <button type="button" disabled={!chest.available || !chest.nextSourceId || Boolean(opening)} onClick={() => void open(chest)}>
            {opening === chest.kind ? text.opening : text.open}
          </button>
        </article>;
      })}
    </div>
  </section>;
}
