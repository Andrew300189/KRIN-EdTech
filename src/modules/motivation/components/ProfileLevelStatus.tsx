"use client";

import { useLocale } from "@/core/i18n/locale";
import styles from "./ProfileLevelStatus.module.css";

const rankNames = {
  en: ["Newcomer", "Student", "Explorer", "Scholar", "Master"],
  uk: ["Новачок", "Учень", "Дослідник", "Знавець", "Майстер"],
  ru: ["Новичок", "Студент", "Исследователь", "Знаток", "Мастер"],
} as const;

function rankFor(level: number, locale: keyof typeof rankNames) {
  const safeLevel = Math.max(1, Math.trunc(level) || 1);
  const rankIndex = Math.min(rankNames[locale].length - 1, Math.floor((safeLevel - 1) / 5));
  return `${rankNames[locale][rankIndex]} ${((safeLevel - 1) % 5) + 1}`;
}

/** Visible, learner-only account status based on the server-owned XP level. */
export function ProfileLevelStatus({ level, experience }: { level: number; experience: number }) {
  const { locale } = useLocale();
  const language = (locale === "uk" || locale === "ru" ? locale : "en") as keyof typeof rankNames;
  const label = rankFor(level, language);
  const copy = language === "uk"
    ? { status: "Статус профілю", earned: "XP зароблено" }
    : language === "ru"
      ? { status: "Статус профиля", earned: "XP заработано" }
      : { status: "Profile status", earned: "XP earned" };
  return <div className={styles.status} aria-label={`${copy.status}: ${label}`}><span className={styles.level}>Lv. {level}</span><span><strong>{label}</strong><small>{new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(experience)} {copy.earned}</small></span></div>;
}
