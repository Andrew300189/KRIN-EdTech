"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import type { StreakQuestBookSummary } from "@/modules/motivation/services/streak-quest-book.service";
import styles from "@/app/profile/achievements/Achievements.module.css";

type UnlockResponse = { data?: { book: StreakQuestBookSummary; alreadyUnlocked: boolean }; error?: string };

const copy = {
  en: { title: "Quests", eyebrow: "Found in streak chests", intro: "Unlock a book with KRIN Coins, complete its word-training quest, and collect the rewards.", locked: "Locked", active: "In progress", completed: "Completed", explorer: "Word explorer", task: (count: number) => `Answer ${count} vocabulary tasks correctly.`, unlockFirst: "Unlock to begin", correct: "correct", rewards: "Rewards", unlock: "Unlock", unlocking: "Unlocking…", train: "Open book & train words", received: "All rewards received" },
  ru: { title: "Квесты", eyebrow: "Из сундуков за серию", intro: "Откройте книгу за KRIN Coins, выполните словарный квест и получите награды.", locked: "Закрыт", active: "В процессе", completed: "Завершён", explorer: "Исследователь слов", task: (count: number) => `Правильно выполните ${count} словарных заданий.`, unlockFirst: "Откройте для начала", correct: "верно", rewards: "Награды", unlock: "Открыть", unlocking: "Открываем…", train: "Открыть книгу и тренироваться", received: "Все награды получены" },
  uk: { title: "Квести", eyebrow: "Із скринь за серію", intro: "Відкрийте книгу за KRIN Coins, виконайте словниковий квест та отримайте нагороди.", locked: "Закрито", active: "У процесі", completed: "Завершено", explorer: "Дослідник слів", task: (count: number) => `Правильно виконайте ${count} словникових завдань.`, unlockFirst: "Відкрийте для початку", correct: "правильно", rewards: "Нагороди", unlock: "Відкрити", unlocking: "Відкриваємо…", train: "Відкрити книгу й тренуватися", received: "Усі нагороди отримано" },
} as const;

/** Repeatable vocabulary quests found in streak chests. Their progress is
 * derived from immutable review attempts on the server, never from this UI. */
export function StreakQuestBooksPanel({ initialBooks }: { initialBooks: StreakQuestBookSummary[] }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [books, setBooks] = useState(initialBooks);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function unlock(book: StreakQuestBookSummary) {
    if (unlockingId) return;
    setUnlockingId(book.id);
    setError(null);
    try {
      const response = await fetch(`/api/profile/quest-books/${book.id}/unlock`, { method: "POST" });
      const payload = await response.json().catch(() => null) as UnlockResponse | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Unable to unlock this book.");
      setBooks((current) => current.map((item) => item.id === book.id ? payload.data!.book : item));
      notifyMotivationUpdated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to unlock this book.");
    } finally {
      setUnlockingId(null);
    }
  }

  if (!books.length) return null;
  return <section id="quest-books" className={styles.bookShelf} aria-labelledby="quest-books-title">
    <header className={styles.bookShelfHeader}>
      <div><p className={styles.eyebrow}>{text.eyebrow}</p><h2 id="quest-books-title">{text.title}</h2><p>{text.intro}</p></div>
    </header>
    {error ? <p className={styles.bookError} role="alert">{error}</p> : null}
    <div className={styles.bookGrid}>
      {books.map((book) => {
        const percentage = Math.round((book.progress / Math.max(book.target, 1)) * 100);
        const isLocked = book.status === "LOCKED";
        const isActive = book.status === "ACTIVE";
        return <article key={book.id} className={`${styles.bookCard} ${isLocked ? styles.bookLocked : ""} ${book.status === "COMPLETED" ? styles.bookComplete : ""}`}>
          <div className={styles.bookTop}><span className={styles.bookIcon} aria-hidden="true">📖</span><span className={styles.bookStatus}>×{book.level} · {isLocked ? text.locked : isActive ? text.active : text.completed}</span></div>
          <h3>{text.explorer} · ×{book.level}</h3>
          <p className={styles.bookDescription}>{text.task(book.target)}</p>
          <div className={styles.bookProgressHeader}><span>{isLocked ? text.unlockFirst : `${book.progress} / ${book.target} ${text.correct}`}</span><strong>{isLocked ? "—" : `${percentage}%`}</strong></div>
          <div className={styles.bookProgress} role="progressbar" aria-label="Word explorer progress" aria-valuemin={0} aria-valuemax={book.target} aria-valuenow={book.progress}><span style={{ width: `${isLocked ? 0 : percentage}%` }} /></div>
          <p className={styles.bookRewards}>{text.rewards}: +{book.experienceReward} XP · +{book.coinReward} KRIN Coins</p>
          {isLocked ? <button type="button" className={styles.bookUnlockButton} disabled={unlockingId === book.id} onClick={() => void unlock(book)}>{unlockingId === book.id ? text.unlocking : `${text.unlock} · ${book.unlockCost} KRIN Coins`}</button> : isActive ? <Link className={styles.bookTrainingLink} href="/profile/vocabulary/training">{text.train}</Link> : <span className={styles.bookCompleted}>{text.received}</span>}
        </article>;
      })}
    </div>
  </section>;
}
