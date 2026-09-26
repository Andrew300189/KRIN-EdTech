"use client";

/* eslint-disable @next/next/no-img-element -- Curated local flower thumbnails have fixed dimensions. */

import { useLocale } from "@/core/i18n/locale";
import type { MilestoneChestKind } from "../services/reward-economy.service";
import styles from "./OpenedMilestoneChests.module.css";

type OpenedChest = { kind: MilestoneChestKind; sourceId: string; experience: number; waterLilies: number; openedAt: string };

const photos: Record<MilestoneChestKind, string> = {
  FIRST_STEPS: "chamomile", LESSON_3: "clover", LESSON_7: "poppy", LESSON_9: "cornflower",
  EVERY_3_LESSONS: "forget-me-not", EVERY_7_LESSONS: "bellflower", EVERY_9_LESSONS: "siberian-iris",
  EVERY_12_LESSONS: "pink-lily", MODULE: "white-lily", COURSE: "ghost-orchid",
};

const copy = {
  en: { title: "Opened chests", empty: "Your opened chests will appear here.", module: "Module", course: "Course", first: "First steps", lessons: "First {count} lessons", every: "Every {count} lessons" },
  ru: { title: "Открытые сундуки", empty: "Открытые сундуки появятся здесь.", module: "Модуль", course: "Курс", first: "Первые шаги", lessons: "Первые {count} уроков", every: "Каждые {count} уроков" },
  uk: { title: "Відкриті скрині", empty: "Відкриті скрині з’являться тут.", module: "Модуль", course: "Курс", first: "Перші кроки", lessons: "Перші {count} уроків", every: "Кожні {count} уроків" },
} as const;

function titleFor(kind: MilestoneChestKind, locale: keyof typeof copy) {
  const text = copy[locale];
  if (kind === "MODULE") return text.module;
  if (kind === "COURSE") return text.course;
  if (kind === "FIRST_STEPS") return text.first;
  const count = Number(kind.match(/\d+/u)?.[0] ?? 0);
  return (kind.startsWith("EVERY_") ? text.every : text.lessons).replace("{count}", String(count));
}

export function OpenedMilestoneChests({ chests }: { chests: OpenedChest[] }) {
  const { locale } = useLocale();
  const language = locale in copy ? locale : "en";
  const text = copy[language];
  return <section className={styles.section} aria-labelledby="opened-chests-title">
    <h2 id="opened-chests-title">{text.title}</h2>
    {!chests.length ? <p>{text.empty}</p> : <div className={styles.grid}>{chests.map((chest) => <article className={styles.card} key={`${chest.kind}:${chest.sourceId}`}>
      <img src={`/flower-chests/${photos[chest.kind]}.webp`} alt="" />
      <div><h3>{titleFor(chest.kind, language)}</h3><p>+{chest.experience.toLocaleString(language)} XP{chest.waterLilies ? ` · +${chest.waterLilies} 🪷` : ""}</p><time dateTime={chest.openedAt}>{new Date(chest.openedAt).toLocaleDateString(language)}</time></div>
    </article>)}</div>}
  </section>;
}
