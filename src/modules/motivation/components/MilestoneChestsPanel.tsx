"use client";

/* eslint-disable @next/next/no-img-element -- Small, optimized local flower photos already have fixed dimensions. */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "../motivation-events";
import styles from "./MilestoneChestsPanel.module.css";

type ChestKind = "FIRST_STEPS" | "LESSON_3" | "LESSON_7" | "LESSON_9" | "EVERY_3_LESSONS" | "EVERY_7_LESSONS" | "EVERY_9_LESSONS" | "EVERY_12_LESSONS" | "MODULE" | "COURSE";
type Chest = { kind: ChestKind; available: boolean; availableCount: number; nextSourceId: string | null; progress: number; target: number; claimed: boolean };
type State = { completedLessons: number; chests: Chest[] };
type Reward = { opened: boolean; alreadyOpened: boolean; experience: number; coins: number; waterLily?: number };

const chestPhotos: Record<ChestKind, string> = {
  FIRST_STEPS: "chamomile", LESSON_3: "clover", LESSON_7: "poppy", LESSON_9: "cornflower",
  EVERY_3_LESSONS: "forget-me-not", EVERY_7_LESSONS: "bellflower", EVERY_9_LESSONS: "siberian-iris",
  EVERY_12_LESSONS: "pink-lily", MODULE: "white-lily", COURSE: "ghost-orchid",
};

const copy = {
  en: {
    eyebrow: "Upcoming rewards", title: "Chests to unlock", completed: "{count} lessons completed", open: "Open chest", opening: "Opening…", ready: "Ready to open", readyPlural: "{count} chests are ready", claimed: "Collected", lessonCount: "{progress}/{target} lessons", modules: "{count} modules completed", courses: "{count} courses completed", hint: "+1 hint credit", translation: "+1 translation credit", achievements: "Opened chests",
    chests: {
      FIRST_STEPS: { icon: "🌱", title: "First steps", detail: "First lesson · 300 XP · 1 Water Lily" },
      LESSON_3: { icon: "🌼", title: "First 3 lessons", detail: "500 XP · 2 Water Lilies" },
      LESSON_7: { icon: "🌺", title: "First 7 lessons", detail: "1,500 XP · 5 Water Lilies" },
      LESSON_9: { icon: "🌸", title: "First 9 lessons", detail: "2,000 XP · 7 Water Lilies" },
      EVERY_3_LESSONS: { icon: "🌼", title: "Every 3 lessons", detail: "500 XP · 2 Water Lilies" },
      EVERY_7_LESSONS: { icon: "🌺", title: "Every 7 lessons", detail: "1,500 XP · 5 Water Lilies" },
      EVERY_9_LESSONS: { icon: "🌸", title: "Every 9 lessons", detail: "2,000 XP · 7 Water Lilies" },
      EVERY_12_LESSONS: { icon: "🪷", title: "Every 12 lessons", detail: "3,000 XP · 12 Water Lilies" },
      MODULE: { icon: "🪻", title: "Module chest", detail: "3,000 XP · 12 Water Lilies" },
      COURSE: { icon: "💐", title: "Course chest", detail: "3,000 XP · 12 Water Lilies" },
    },
  },
  ru: {
    eyebrow: "Следующие награды", title: "Сундуки впереди", completed: "Пройдено уроков: {count}", open: "Открыть сундук", opening: "Открываем…", ready: "Можно открыть", readyPlural: "Сундуков готово: {count}", claimed: "Получено", lessonCount: "Уроков: {progress}/{target}", modules: "Пройдено модулей: {count}", courses: "Пройдено курсов: {count}", hint: "+1 бонус подсказки", translation: "+1 бонус перевода", achievements: "Открытые сундуки",
    chests: {
      FIRST_STEPS: { icon: "🌱", title: "Первые шаги", detail: "Первый урок · 300 XP · 1 кувшинка" },
      LESSON_3: { icon: "🌼", title: "Первые 3 урока", detail: "500 XP · 2 кувшинки" },
      LESSON_7: { icon: "🌺", title: "Первые 7 уроков", detail: "1 500 XP · 5 кувшинок" },
      LESSON_9: { icon: "🌸", title: "Первые 9 уроков", detail: "2 000 XP · 7 кувшинок" },
      EVERY_3_LESSONS: { icon: "🌼", title: "Каждые 3 урока", detail: "500 XP · 2 кувшинки" },
      EVERY_7_LESSONS: { icon: "🌺", title: "Каждые 7 уроков", detail: "1 500 XP · 5 кувшинок" },
      EVERY_9_LESSONS: { icon: "🌸", title: "Каждые 9 уроков", detail: "2 000 XP · 7 кувшинок" },
      EVERY_12_LESSONS: { icon: "🪷", title: "Каждые 12 уроков", detail: "3 000 XP · 12 кувшинок" },
      MODULE: { icon: "🪻", title: "Сундук модуля", detail: "3 000 XP · 12 кувшинок" },
      COURSE: { icon: "💐", title: "Сундук курса", detail: "3 000 XP · 12 кувшинок" },
    },
  },
  uk: {
    eyebrow: "Наступні нагороди", title: "Скрині попереду", completed: "Пройдено уроків: {count}", open: "Відкрити скриню", opening: "Відкриваємо…", ready: "Можна відкрити", readyPlural: "Скринь готово: {count}", claimed: "Отримано", lessonCount: "Уроків: {progress}/{target}", modules: "Пройдено модулів: {count}", courses: "Пройдено курсів: {count}", hint: "+1 бонус підказки", translation: "+1 бонус перекладу", achievements: "Відкриті скрині",
    chests: {
      FIRST_STEPS: { icon: "🌱", title: "Перші кроки", detail: "Перший урок · 300 XP · 1 латаття" },
      LESSON_3: { icon: "🌼", title: "Перші 3 уроки", detail: "500 XP · 2 латаття" },
      LESSON_7: { icon: "🌺", title: "Перші 7 уроків", detail: "1 500 XP · 5 латать" },
      LESSON_9: { icon: "🌸", title: "Перші 9 уроків", detail: "2 000 XP · 7 латать" },
      EVERY_3_LESSONS: { icon: "🌼", title: "Кожні 3 уроки", detail: "500 XP · 2 латаття" },
      EVERY_7_LESSONS: { icon: "🌺", title: "Кожні 7 уроків", detail: "1 500 XP · 5 латать" },
      EVERY_9_LESSONS: { icon: "🌸", title: "Кожні 9 уроків", detail: "2 000 XP · 7 латать" },
      EVERY_12_LESSONS: { icon: "🪷", title: "Кожні 12 уроків", detail: "3 000 XP · 12 латать" },
      MODULE: { icon: "🪻", title: "Скриня модуля", detail: "3 000 XP · 12 латать" },
      COURSE: { icon: "💐", title: "Скриня курсу", detail: "3 000 XP · 12 латать" },
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
  if (reward.waterLily) parts.push(`+${reward.waterLily} 🪷`);
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
      <div className={styles.headingActions}><strong>{interpolate(text.completed, { count: state.completedLessons })}</strong></div>
    </header>
    <div className={styles.grid}>
      {state.chests.filter((chest) => !chest.claimed).map((chest) => {
        const item = text.chests[chest.kind];
        const progress = chest.target ? Math.min(100, Math.round((chest.progress / chest.target) * 100)) : 0;
        const availableLabel = chest.availableCount > 1
          ? interpolate(text.readyPlural, { count: chest.availableCount })
          : text.ready;
        const status = chest.available ? availableLabel : chest.claimed ? text.claimed : progressText(chest, state, text);
        return <article key={chest.kind} className={`${styles.chest} ${styles[chest.kind]} ${chest.available ? styles.available : ""}`}>
          <span className={styles.icon} aria-hidden="true"><img src={`/flower-chests/${chestPhotos[chest.kind]}.webp`} alt="" /></span>
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
