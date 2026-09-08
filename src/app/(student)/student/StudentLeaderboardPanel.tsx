"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/core/i18n/locale";
import styles from "./StudentHome.module.css";

type Entry = {
  rank: number;
  userId: string;
  displayName: string;
  experienceMinor: number;
  coinsMinor: number;
  totalMinor: number;
  isCurrentUser: boolean;
};

type CurrentEntry = Entry;

type Props = {
  entries: Entry[];
  current: CurrentEntry | null;
  participantCount: number;
};

const copy = {
  en: {
    eyebrow: "Community ranking",
    title: "Top learners",
    formula: "1 KRIN Coin = 1,000 XP",
    you: "You",
    yourPlace: "Your place",
    among: "among {count} learners",
    empty: "The ranking will appear after the first rewards.",
    total: "XP equivalent",
    xp: "XP",
    coins: "coins",
    refresh: "Refresh ranking",
  },
  uk: {
    eyebrow: "Рейтинг спільноти",
    title: "Найкращі учні",
    formula: "1 KRIN Coin = 1 000 XP",
    you: "Ви",
    yourPlace: "Ваше місце",
    among: "серед {count} учнів",
    empty: "Рейтинг з’явиться після перших нагород.",
    total: "XP-еквівалент",
    xp: "XP",
    coins: "монет",
    refresh: "Оновити рейтинг",
  },
  ru: {
    eyebrow: "Рейтинг сообщества",
    title: "Лучшие ученики",
    formula: "1 KRIN Coin = 1 000 XP",
    you: "Вы",
    yourPlace: "Ваше место",
    among: "среди {count} учеников",
    empty: "Рейтинг появится после первых наград.",
    total: "XP-эквивалент",
    xp: "XP",
    coins: "монет",
    refresh: "Обновить рейтинг",
  },
} as const;

function displayMinor(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value / 100);
}

function placeClass(rank: number) {
  if (rank === 1) return styles.firstPlace;
  if (rank === 2) return styles.secondPlace;
  if (rank === 3) return styles.thirdPlace;
  return styles.otherPlace;
}

export function StudentLeaderboardPanel({ entries, current, participantCount }: Props) {
  const { locale } = useLocale();
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const text = copy[locale] ?? copy.en;
  const participantText = text.among.replace("{count}", String(participantCount));

  function refreshLeaderboard() {
    startRefresh(() => router.refresh());
  }

  return (
    <article className={`${styles.panel} ${styles.leaderboardPanel}`} aria-labelledby="student-leaderboard-title">
      <div className={styles.leaderboardHeading}>
        <div>
          <p className={styles.eyebrow}>{text.eyebrow}</p>
          <h3 id="student-leaderboard-title">{text.title}</h3>
          <span className={styles.leaderboardFormula}>{text.formula}</span>
        </div>
        <div className={styles.leaderboardTools}>
          <button
            type="button"
            className={`${styles.refreshLeaderboardButton} ${isRefreshing ? styles.refreshingLeaderboard : ""}`}
            onClick={refreshLeaderboard}
            disabled={isRefreshing}
            aria-label={text.refresh}
            title={text.refresh}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 11a8 8 0 0 0-14.8-4.2" />
              <path d="M5.2 3.5v4.7h4.7" />
              <path d="M4 13a8 8 0 0 0 14.8 4.2" />
              <path d="M18.8 20.5v-4.7h-4.7" />
            </svg>
          </button>
          {current ? <span className={styles.currentRankBadge}>{current.rank}</span> : null}
        </div>
      </div>

      {entries.length ? (
        <ol className={styles.leaderboardList}>
          {entries.map((entry) => (
            <li key={entry.userId} className={`${styles.leaderboardRow} ${entry.isCurrentUser ? styles.currentLeaderboardRow : ""}`}>
              <span className={`${styles.leaderboardPlace} ${placeClass(entry.rank)}`}>{entry.rank}</span>
              <div className={styles.leaderboardLearner}>
                <strong>{entry.isCurrentUser ? text.you : entry.displayName}</strong>
                <span>{`${displayMinor(entry.experienceMinor, locale)} ${text.xp} · ${displayMinor(entry.coinsMinor, locale)} ${text.coins}`}</span>
              </div>
              <span className={styles.leaderboardScore}>{displayMinor(entry.totalMinor, locale)}<small>{text.total}</small></span>
            </li>
          ))}
        </ol>
      ) : <p className={styles.helperText}>{text.empty}</p>}

      {current ? <p className={styles.ownRank}>{text.yourPlace}: <strong>{current.rank}</strong> · {participantText}<br />{displayMinor(current.experienceMinor, locale)} {text.xp} + {displayMinor(current.coinsMinor, locale)} {text.coins} = {displayMinor(current.totalMinor, locale)} {text.total}</p> : null}
    </article>
  );
}
