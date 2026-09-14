"use client";

import Link from "next/link";
import { useState } from "react";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import type { StreakQuestBookSummary } from "@/modules/motivation/services/streak-quest-book.service";
import styles from "@/app/profile/achievements/Achievements.module.css";

type UnlockResponse = { data?: { book: StreakQuestBookSummary; alreadyUnlocked: boolean }; error?: string };

function statusCopy(status: string) {
  if (status === "LOCKED") return "Locked";
  if (status === "ACTIVE") return "In progress";
  return "Completed";
}

/** Repeatable vocabulary quests found in streak chests. Their progress is
 * derived from immutable review attempts on the server, never from this UI. */
export function StreakQuestBooksPanel({ initialBooks }: { initialBooks: StreakQuestBookSummary[] }) {
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
      <div><p className={styles.eyebrow}>Found in streak chests</p><h2 id="quest-books-title">Quest books</h2><p>Unlock a book with KRIN Coins, complete its word-training quest, and receive every listed reward.</p></div>
    </header>
    {error ? <p className={styles.bookError} role="alert">{error}</p> : null}
    <div className={styles.bookGrid}>
      {books.map((book) => {
        const percentage = Math.round((book.progress / Math.max(book.target, 1)) * 100);
        const isLocked = book.status === "LOCKED";
        const isActive = book.status === "ACTIVE";
        return <article key={book.id} className={`${styles.bookCard} ${isLocked ? styles.bookLocked : ""} ${book.status === "COMPLETED" ? styles.bookComplete : ""}`}>
          <div className={styles.bookTop}><span className={styles.bookIcon} aria-hidden="true">📖</span><span className={styles.bookStatus}>{statusCopy(book.status)}</span></div>
          <h3>Word explorer</h3>
          <p className={styles.bookDescription}>Answer {book.target} vocabulary tasks correctly.</p>
          <div className={styles.bookProgressHeader}><span>{isLocked ? "Unlock to begin" : `${book.progress} / ${book.target} correct`}</span><strong>{isLocked ? "—" : `${percentage}%`}</strong></div>
          <div className={styles.bookProgress} role="progressbar" aria-label="Word explorer progress" aria-valuemin={0} aria-valuemax={book.target} aria-valuenow={book.progress}><span style={{ width: `${isLocked ? 0 : percentage}%` }} /></div>
          <p className={styles.bookRewards}>Rewards: +{book.experienceReward} XP · +{book.coinReward} KRIN Coins · +{book.hintCredits} hint · +{book.translationCredits} translation</p>
          {isLocked ? <button type="button" className={styles.bookUnlockButton} disabled={unlockingId === book.id} onClick={() => void unlock(book)}>{unlockingId === book.id ? "Unlocking…" : `Unlock · ${book.unlockCost} KRIN Coins`}</button> : isActive ? <Link className={styles.bookTrainingLink} href="/profile/vocabulary/training">Open book & train words</Link> : <span className={styles.bookCompleted}>All rewards received</span>}
        </article>;
      })}
    </div>
  </section>;
}
