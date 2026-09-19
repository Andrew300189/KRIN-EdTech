"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import { MOTIVATION_UPDATED_EVENT } from "@/modules/motivation/motivation-events";
import styles from "./LeaderboardRiseNotifier.module.css";

type RankSnapshot = {
  rank: number | null;
  participantCount: number;
  positionsToTopThree: number | null;
};

type Rise = RankSnapshot & { previousRank: number; gained: number };

type Props = {
  /** Server-rendered rank prevents a false notification after dashboard hydration. */
  initialRank?: number | null;
};

const copy = {
  en: {
    titles: ["Keep it up!", "You are passing competitors!", "New breakthrough!"],
    rank: "Place", gained: "positions gained", topThree: "{count} places to the top 3", ahead: "You moved ahead in your league.", close: "Super!", dialog: "Leaderboard progress",
  },
  ru: {
    titles: ["Так держать!", "Ты обходишь соперников!", "Новый прорыв!"],
    rank: "Место", gained: "позиций вверх", topThree: "До топ-3: {count} мест", ahead: "Ты поднялся в рейтинге своей лиги.", close: "Супер!", dialog: "Рост в рейтинге",
  },
  uk: {
    titles: ["Так тримати!", "Ти обходиш суперників!", "Новий прорив!"],
    rank: "Місце", gained: "позицій угору", topThree: "До топ-3: {count} місць", ahead: "Ти піднявся в рейтингу своєї ліги.", close: "Чудово!", dialog: "Зростання в рейтингу",
  },
} as const;

function titleForGain(titles: readonly string[], gained: number) {
  if (gained >= 5) return titles[2];
  if (gained >= 2) return titles[1];
  return titles[0];
}

/**
 * Rank is never calculated in the browser. This watches only a server-confirmed
 * reward event, reads a private rank snapshot, then celebrates an upward move.
 */
export function LeaderboardRiseNotifier({ initialRank }: Props) {
  const { locale } = useLocale();
  const text = copy[locale] ?? copy.en;
  const baselineRef = useRef<number | null | undefined>(initialRank);
  const inFlightRef = useRef(false);
  const [rise, setRise] = useState<Rise | null>(null);

  const refreshRank = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const response = await fetch("/api/profile/motivation/leaderboard-position", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: RankSnapshot } | null;
      const snapshot = payload?.data;
      if (!response.ok || !snapshot || snapshot.rank === null) return;

      const previousRank = baselineRef.current;
      baselineRef.current = snapshot.rank;
      if (typeof previousRank !== "number" || snapshot.rank >= previousRank) return;
      setRise({ ...snapshot, previousRank, gained: previousRank - snapshot.rank });
    } catch {
      // A rank toast is supplementary feedback; learning must remain uninterrupted.
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Lesson pages do not receive a server-rendered rank. Establish a baseline
    // before the first awarded answer so the initial load cannot look like a rise.
    if (baselineRef.current === undefined) void refreshRank();
    const onReward = () => void refreshRank();
    window.addEventListener(MOTIVATION_UPDATED_EVENT, onReward);
    return () => window.removeEventListener(MOTIVATION_UPDATED_EVENT, onReward);
  }, [refreshRank]);

  return <AppModal
    open={Boolean(rise)}
    onOpenChange={(open) => { if (!open) setRise(null); }}
    title={rise ? titleForGain(text.titles, rise.gained) : undefined}
    description={rise ? text.ahead : undefined}
    size="small"
    bodyClassName={styles.body}
    closeLabel={text.close}
    ariaLabel={text.dialog}
  >
    {rise ? <section className={styles.card} aria-live="polite">
      <div className={styles.rankJump}>
        <div className={styles.rank}><span>{text.rank}</span><strong>#{rise.previousRank}</strong></div>
        <span className={styles.arrow} aria-hidden="true">↑</span>
        <div className={`${styles.rank} ${styles.newRank}`}><span>{text.rank}</span><strong>#{rise.rank}</strong></div>
      </div>
      <p className={styles.gained}>+{rise.gained} {text.gained}</p>
      {rise.positionsToTopThree && rise.positionsToTopThree > 0 ? <p className={styles.context}>{text.topThree.replace("{count}", String(rise.positionsToTopThree))}</p> : <p className={styles.context}>★ Top 3</p>}
      <button type="button" className={styles.confirm} onClick={() => setRise(null)}>{text.close}</button>
    </section> : null}
  </AppModal>;
}
