"use client";

import { useLocale } from "@/core/i18n/locale";
import type { WeeklyLeague } from "@/modules/motivation/services/weekly-league.service";
import styles from "./WeeklyLeaguePanel.module.css";

const copy = {
  en: { eyebrow: "Weekly league", title: "{tier} League", group: "Group {group} · up to 30 learners", xp: "XP this week", promotion: "Top 3 — promotion zone", podium: "Top 3 — Diamond podium", risk: "Bottom 3 — stay active to hold your league", safe: "Keep learning to reach the top 3", you: "You" },
  uk: { eyebrow: "Щотижнева ліга", title: "{tier} ліга", group: "Група {group} · до 30 учнів", xp: "XP цього тижня", promotion: "Топ-3 — зона підвищення", podium: "Топ-3 — подіум Діамантової ліги", risk: "Нижня трійка — займайтесь, щоб втримати лігу", safe: "Продовжуйте навчатися, щоб увійти в топ-3", you: "Ви" },
  ru: { eyebrow: "Недельная лига", title: "{tier} лига", group: "Группа {group} · до 30 учеников", xp: "XP за неделю", promotion: "Топ-3 — зона повышения", podium: "Топ-3 — пьедестал Алмазной лиги", risk: "Нижняя тройка — занимайтесь, чтобы удержать лигу", safe: "Продолжайте учиться, чтобы войти в топ-3", you: "Вы" },
} as const;

const tierLabel = {
  en: { BRONZE: "Bronze", SILVER: "Silver", DIAMOND: "Diamond" },
  uk: { BRONZE: "Бронзова", SILVER: "Срібна", DIAMOND: "Діамантова" },
  ru: { BRONZE: "Бронзовая", SILVER: "Серебряная", DIAMOND: "Алмазная" },
} as const;

function fill(value: string, entries: Record<string, string | number>) {
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(entries[key] ?? ""));
}

function medal(rank: number) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank; }

export function WeeklyLeaguePanel({ league }: { league: WeeklyLeague }) {
  const { locale } = useLocale();
  const language = (locale === "uk" || locale === "ru" ? locale : "en") as keyof typeof copy;
  const text = copy[language];
  const message = league.movement === "PROMOTION" ? text.promotion : league.movement === "PODIUM" ? text.podium : league.movement === "RISK" ? text.risk : text.safe;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return <article className={`${styles.card} ${styles[league.tier.toLowerCase()]}`} aria-labelledby="weekly-league-title">
    <header><div><p>{text.eyebrow}</p><h3 id="weekly-league-title">{fill(text.title, { tier: tierLabel[language][league.tier] })}</h3><span>{fill(text.group, { group: league.groupNumber })}</span></div><strong>{league.tier === "DIAMOND" ? "◆" : league.tier === "SILVER" ? "●" : "◆"}</strong></header>
    <p className={`${styles.status} ${styles[league.movement.toLowerCase()]}`}>{message}</p>
    <ol className={styles.members}>
      {league.members.map((member, index) => <li key={member.userId} className={member.isCurrentUser ? styles.current : ""}><span>{medal(index + 1)}</span><strong>{member.isCurrentUser ? text.you : member.displayName}</strong><small>{number.format(member.weeklyExperienceMinor / 100)} {text.xp}</small></li>)}
    </ol>
  </article>;
}
