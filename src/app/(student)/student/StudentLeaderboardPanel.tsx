"use client";

import { useLocale } from "@/core/i18n/locale";
import styles from "./StudentHome.module.css";

type Entry = {
  rank: number;
  userId: string;
  displayName: string;
  isCurrentUser: boolean;
};

type CurrentEntry = Entry & {
  experienceMinor: number;
  coinsMinor: number;
  totalMinor: number;
};

type Props = {
  entries: Entry[];
  current: CurrentEntry | null;
  participantCount: number;
};

const copy = {
  en: {
    eyebrow: "Community ranking",
    title: "Top learners",
    formula: "XP + KRIN Coins",
    you: "You",
    yourPlace: "Your place",
    among: "among {count} learners",
    empty: "The ranking will appear after the first rewards.",
    total: "total",
    coins: "coins",
  },
  uk: {
    eyebrow: "Рейтинг спільноти",
    title: "Найкращі учні",
    formula: "XP + KRIN Coins",
    you: "Ви",
    yourPlace: "Ваше місце",
    among: "серед {count} учнів",
    empty: "Рейтинг з’явиться після перших нагород.",
    total: "разом",
    coins: "монет",
  },
  ru: {
    eyebrow: "Рейтинг сообщества",
    title: "Лучшие ученики",
    formula: "XP + KRIN Coins",
    you: "Вы",
    yourPlace: "Ваше место",
    among: "среди {count} учеников",
    empty: "Рейтинг появится после первых наград.",
    total: "всего",
    coins: "монет",
  },
} as const;

function displayMinor(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value / 100);
}

export function StudentLeaderboardPanel({ entries, current, participantCount }: Props) {
  const { locale } = useLocale();
  const text = copy[locale] ?? copy.en;
  const participantText = text.among.replace("{count}", String(participantCount));

  return (
    <article className={`${styles.panel} ${styles.leaderboardPanel}`} aria-labelledby="student-leaderboard-title">
      <div className={styles.leaderboardHeading}>
        <div>
          <p className={styles.eyebrow}>{text.eyebrow}</p>
          <h3 id="student-leaderboard-title">{text.title}</h3>
          <span className={styles.leaderboardFormula}>{text.formula}</span>
        </div>
        {current ? <span className={styles.currentRankBadge}>#{current.rank}</span> : null}
      </div>

      {entries.length ? (
        <ol className={styles.leaderboardList}>
          {entries.map((entry) => (
            <li key={entry.userId} className={`${styles.leaderboardRow} ${entry.isCurrentUser ? styles.currentLeaderboardRow : ""}`}>
              <span className={styles.leaderboardPlace}>#{entry.rank}</span>
              <div className={styles.leaderboardLearner}>
                <strong>{entry.isCurrentUser ? text.you : entry.displayName}</strong>
                <span>{entry.isCurrentUser && current ? `${displayMinor(current.experienceMinor, locale)} XP · ${displayMinor(current.coinsMinor, locale)} ${text.coins}` : text.formula}</span>
              </div>
              {entry.isCurrentUser && current ? <span className={styles.leaderboardScore}>{displayMinor(current.totalMinor, locale)}<small>{text.total}</small></span> : null}
            </li>
          ))}
        </ol>
      ) : <p className={styles.helperText}>{text.empty}</p>}

      {current ? <p className={styles.ownRank}>{text.yourPlace}: <strong>#{current.rank}</strong> · {participantText}<br />{displayMinor(current.experienceMinor, locale)} XP + {displayMinor(current.coinsMinor, locale)} {text.coins} = {displayMinor(current.totalMinor, locale)} {text.total}</p> : null}
    </article>
  );
}
