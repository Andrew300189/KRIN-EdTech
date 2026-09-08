"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import styles from "./LeaderboardHeaderStatus.module.css";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string | null;
  experienceMinor: number | null;
  coinsMinor: number | null;
  totalMinor: number | null;
  isCurrentUser: boolean;
  isProfileVisible: boolean;
};

type LeaderboardData = {
  entries: LeaderboardEntry[];
  current: LeaderboardEntry | null;
  participantCount: number;
};

export type LeaderboardHeaderSummary = {
  rank: number | null;
  participantCount: number;
};

const copy = {
  en: { title: "Leaderboard", place: "Your place", of: "of", all: "All learners", total: "XP equivalent", xp: "XP", coins: "coins", anonymous: "Private learner", privateStats: "Profile hidden by the learner", loading: "Loading learners…", empty: "No registered learners yet.", error: "Could not refresh the leaderboard.", refreshing: "Refreshing…", close: "Close leaderboard" },
  ru: { title: "Рейтинг", place: "Ваше место", of: "из", all: "Все ученики", total: "XP-эквивалент", xp: "XP", coins: "монет", anonymous: "Скрытый профиль", privateStats: "Профиль скрыт по выбору ученика", loading: "Загружаем учеников…", empty: "Пока нет зарегистрированных учеников.", error: "Не удалось обновить рейтинг.", refreshing: "Обновляем…", close: "Закрыть рейтинг" },
  uk: { title: "Рейтинг", place: "Ваше місце", of: "з", all: "Усі учні", total: "XP-еквівалент", xp: "XP", coins: "монет", anonymous: "Прихований профіль", privateStats: "Профіль прихований за вибором учня", loading: "Завантажуємо учнів…", empty: "Поки немає зареєстрованих учнів.", error: "Не вдалося оновити рейтинг.", refreshing: "Оновлюємо…", close: "Закрити рейтинг" },
} as const;

function placeClass(rank: number) {
  if (rank === 1) return styles.firstPlace;
  if (rank === 2) return styles.secondPlace;
  if (rank === 3) return styles.thirdPlace;
  return styles.otherPlace;
}

function displayMinor(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value / 100);
}

/** Small header entry point with the complete ranking available on demand. */
export function LeaderboardHeaderStatus({ summary }: { summary: LeaderboardHeaderSummary }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [open, setOpen] = useState(false);
  const [board, setBoard] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const text = copy[locale];
  const rank = board?.current?.rank ?? summary.rank ?? "—";
  const participantCount = board?.participantCount ?? summary.participantCount;

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/student/leaderboard", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: LeaderboardData } | null;
      if (!response.ok || !payload?.data) throw new Error("Unable to load leaderboard");
      setBoard(payload.data);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function openLeaderboard() {
    setOpen(true);
    if (!board && !isLoading) void loadLeaderboard();
  }

  function refreshLeaderboard() {
    void loadLeaderboard();
    startRefresh(() => router.refresh());
  }

  return <>
    <button type="button" className={styles.button} onClick={openLeaderboard} aria-haspopup="dialog" aria-label={`${text.title}: ${rank}`} title={text.title}>
      <span aria-hidden="true">🏆</span><span className={styles.top}>TOP</span><strong>{rank}</strong>
    </button>
    <AppModal open={open} onOpenChange={setOpen} title={text.title} size="large" tall closeLabel={text.close} bodyClassName={styles.modalBody}>
      <div className={styles.placeCard}>
        <span aria-hidden="true">🏆</span>
        <div><small>{text.place}</small><strong>{rank}</strong><span>{text.of} {participantCount}</span></div>
      </div>
      <div className={styles.boardHeading}>
        <strong>{text.all} <span>{participantCount}</span></strong>
        <button type="button" className={styles.refresh} disabled={isLoading || isRefreshing} onClick={refreshLeaderboard}>{isLoading || isRefreshing ? text.refreshing : "↻"}</button>
      </div>
      {isLoading ? <p className={styles.status}>{text.loading}</p> : null}
      {loadError ? <p className={`${styles.status} ${styles.error}`}>{text.error}</p> : null}
      {!isLoading && !loadError && board?.entries.length === 0 ? <p className={styles.status}>{text.empty}</p> : null}
      {!isLoading && board?.entries.length ? <ol className={styles.entries}>
        {board.entries.map((entry) => {
          const showStats = entry.experienceMinor !== null && entry.coinsMinor !== null && entry.totalMinor !== null;
          const displayName = entry.isCurrentUser ? (locale === "ru" ? "Вы" : locale === "uk" ? "Ви" : "You") : entry.displayName ?? text.anonymous;
          return <li key={entry.userId} className={entry.isCurrentUser ? styles.currentEntry : undefined}>
            <span className={`${styles.place} ${placeClass(entry.rank)}`}>{entry.rank}</span>
            <div className={styles.learner}>
              <strong>{displayName}</strong>
              <span>{showStats ? `${displayMinor(entry.experienceMinor!, locale)} ${text.xp} · ${displayMinor(entry.coinsMinor!, locale)} ${text.coins}` : text.privateStats}</span>
            </div>
            {showStats ? <span className={styles.score}>{displayMinor(entry.totalMinor!, locale)}<small>{text.total}</small></span> : null}
          </li>;
        })}
      </ol> : null}
    </AppModal>
  </>;
}
