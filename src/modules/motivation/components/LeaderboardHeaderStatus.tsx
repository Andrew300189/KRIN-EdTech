"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import styles from "./LeaderboardHeaderStatus.module.css";

export type LeaderboardHeaderSummary = {
  rank: number | null;
  participantCount: number;
  league: {
    tier: "BRONZE" | "SILVER" | "DIAMOND";
    groupNumber: number;
    groupRank: number;
    groupSize: number;
    movement: "PROMOTION" | "SAFE" | "RISK" | "PODIUM";
  };
};

const copy = {
  en: { title: "Leaderboard", place: "Your place", of: "of", league: "Weekly league", leagueName: "League", group: "Group", refresh: "Refresh leaderboard", refreshing: "Refreshing…", close: "Close leaderboard", movement: { PROMOTION: "Top 3 — promotion zone", SAFE: "Keep learning to reach the top 3", RISK: "Bottom 3 — stay active to hold your league", PODIUM: "Top 3 — Diamond podium" }, tiers: { BRONZE: "Bronze", SILVER: "Silver", DIAMOND: "Diamond" } },
  ru: { title: "Рейтинг", place: "Ваше место", of: "из", league: "Недельная лига", leagueName: "лига", group: "Группа", refresh: "Обновить рейтинг", refreshing: "Обновляем…", close: "Закрыть рейтинг", movement: { PROMOTION: "Топ-3 — зона повышения", SAFE: "Продолжайте учиться, чтобы войти в топ-3", RISK: "Нижняя тройка — занимайтесь, чтобы удержать лигу", PODIUM: "Топ-3 — пьедестал Алмазной лиги" }, tiers: { BRONZE: "Бронзовая", SILVER: "Серебряная", DIAMOND: "Алмазная" } },
  uk: { title: "Рейтинг", place: "Ваше місце", of: "з", league: "Щотижнева ліга", leagueName: "ліга", group: "Група", refresh: "Оновити рейтинг", refreshing: "Оновлюємо…", close: "Закрити рейтинг", movement: { PROMOTION: "Топ-3 — зона підвищення", SAFE: "Продовжуйте навчатися, щоб увійти в топ-3", RISK: "Нижня трійка — займайтесь, щоб втримати лігу", PODIUM: "Топ-3 — подіум Діамантової ліги" }, tiers: { BRONZE: "Бронзова", SILVER: "Срібна", DIAMOND: "Діамантова" } },
} as const;

/** Small, explicit leaderboard entry point for the student workspace header. */
export function LeaderboardHeaderStatus({ summary }: { summary: LeaderboardHeaderSummary }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [open, setOpen] = useState(false);
  const text = copy[locale];
  const rank = summary.rank ?? "—";
  const leagueName = `${text.tiers[summary.league.tier]} ${text.leagueName}`;

  return <>
    <button type="button" className={styles.button} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`${text.title}: #${rank}`} title={text.title}>
      <span aria-hidden="true">🏆</span><span className={styles.top}>TOP</span><strong>#{rank}</strong>
    </button>
    <AppModal open={open} onOpenChange={setOpen} title={text.title} size="small" closeLabel={text.close} bodyClassName={styles.modalBody}>
      <div className={styles.placeCard}>
        <span aria-hidden="true">🏆</span>
        <div><small>{text.place}</small><strong>#{rank}</strong><span>{text.of} {summary.participantCount}</span></div>
      </div>
      <div className={`${styles.leagueCard} ${styles[summary.league.tier.toLowerCase()]}`}>
        <span className={styles.tierIcon} aria-hidden="true">{summary.league.tier === "SILVER" ? "●" : "◆"}</span>
        <div><small>{text.league}</small><strong>{leagueName}</strong><span>{text.group} {summary.league.groupNumber} · #{summary.league.groupRank} {text.of} {summary.league.groupSize}</span></div>
      </div>
      <p className={styles.movement}>{text.movement[summary.league.movement]}</p>
      <button type="button" className={styles.refresh} disabled={isRefreshing} onClick={() => startRefresh(() => router.refresh())}>{isRefreshing ? text.refreshing : text.refresh}</button>
    </AppModal>
  </>;
}
