"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import styles from "./DailyStreakCard.module.css";

type Streak = {
  currentStreak: number;
  longestStreak: number;
  freezeCount: number;
};

type Props = {
  initialStreak: Streak;
  initialCoinBalance: number;
  price: number;
};

const copy = {
  en: {
    eyebrow: "Daily streak",
    day: "day",
    days: "days",
    today: "Finish today's learning goal to extend your streak.",
    protected: "freeze ready",
    noFreeze: "No freeze yet",
    buy: "Buy a day off",
    buying: "Buying…",
    cost: "{price} KRIN Coin",
    balance: "Balance: {balance}",
    longest: "Best: {count} days",
    bought: "Your Streak Freeze is ready. Your streak is protected for one missed day.",
    insufficient: "You need {price} KRIN Coin to buy a Streak Freeze.",
    error: "Unable to buy a Streak Freeze right now.",
  },
  uk: {
    eyebrow: "Серія днів",
    day: "день",
    days: "днів",
    today: "Виконайте сьогоднішню навчальну ціль, щоб продовжити серію.",
    protected: "заморозка готова",
    noFreeze: "заморозки ще немає",
    buy: "Купити день відпочинку",
    buying: "Купуємо…",
    cost: "{price} KRIN Coin",
    balance: "Баланс: {balance}",
    longest: "Рекорд: {count} днів",
    bought: "Заморозка серії готова. Вона захистить один пропущений день.",
    insufficient: "Потрібно {price} KRIN Coin, щоб купити заморозку серії.",
    error: "Зараз не вдалося купити заморозку серії.",
  },
  ru: {
    eyebrow: "Серия дней",
    day: "день",
    days: "дней",
    today: "Выполните сегодняшнюю учебную цель, чтобы продлить серию.",
    protected: "заморозка готова",
    noFreeze: "заморозки пока нет",
    buy: "Купить день отдыха",
    buying: "Покупаем…",
    cost: "{price} KRIN Coin",
    balance: "Баланс: {balance}",
    longest: "Рекорд: {count} дней",
    bought: "Заморозка серии готова. Она защитит один пропущенный день.",
    insufficient: "Чтобы купить заморозку серии, нужен {price} KRIN Coin.",
    error: "Сейчас не удалось купить заморозку серии.",
  },
} as const;

function replace(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function dayLabel(count: number, locale: keyof typeof copy) {
  if (locale === "ru") {
    const remainder = count % 100;
    if (remainder >= 11 && remainder <= 14) return "дней";
    if (count % 10 === 1) return "день";
    if (count % 10 >= 2 && count % 10 <= 4) return "дня";
    return "дней";
  }
  if (locale === "uk") {
    const remainder = count % 100;
    if (remainder >= 11 && remainder <= 14) return "днів";
    if (count % 10 === 1) return "день";
    if (count % 10 >= 2 && count % 10 <= 4) return "дні";
    return "днів";
  }
  return count === 1 ? "day" : "days";
}

/** A compact dashboard control for a daily learning streak and its protection. */
export function DailyStreakCard({ initialStreak, initialCoinBalance, price }: Props) {
  const { locale } = useLocale();
  const language = (locale in copy ? locale : "en") as keyof typeof copy;
  const text = copy[language];
  const [streak, setStreak] = useState(initialStreak);
  const [balance, setBalance] = useState(initialCoinBalance);
  const [pending, setPending] = useState(false);

  const canBuy = balance >= price && !pending;
  const dayWord = dayLabel(streak.currentStreak, language);

  async function buyFreeze() {
    if (pending) return;
    if (balance < price) {
      toast.error(replace(text.insufficient, { price }));
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/profile/motivation/streak-freeze", { method: "POST" });
      const payload = await response.json().catch(() => null) as {
        data?: { streak: Streak; wallet: { balance: number; fractionalBalance: number } };
        error?: string;
      } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error || text.error);
      setStreak(payload.data.streak);
      setBalance(payload.data.wallet.balance + payload.data.wallet.fractionalBalance / 100);
      notifyMotivationUpdated();
      toast.success(text.bought);
    } catch (error) {
      if (error instanceof Error && error.message === "Insufficient KRIN Coins") {
        toast.error(replace(text.insufficient, { price }));
      } else {
        toast.error(error instanceof Error ? error.message : text.error);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <article className={styles.card} aria-labelledby="daily-streak-title">
      <div className={styles.heading}>
        <span className={styles.flame} aria-hidden="true">🔥</span>
        <div>
          <p>{text.eyebrow}</p>
          <h3 id="daily-streak-title"><strong>{streak.currentStreak}</strong> {dayWord}</h3>
        </div>
        <span className={`${styles.freezeStatus} ${streak.freezeCount ? styles.freezeReady : ""}`}>{streak.freezeCount ? `❄ ${streak.freezeCount}` : "○"}</span>
      </div>
      <p className={styles.copy}>{text.today}</p>
      <div className={styles.meta}>
        <span>{streak.freezeCount ? `${streak.freezeCount} ${text.protected}` : text.noFreeze}</span>
        <span>{replace(text.longest, { count: streak.longestStreak })}</span>
      </div>
      <button type="button" className={styles.buyButton} onClick={() => void buyFreeze()} disabled={!canBuy}>
        <span>{pending ? text.buying : text.buy}</span>
        <small>{replace(text.cost, { price })}</small>
      </button>
      <p className={styles.balance}>{replace(text.balance, { balance: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(balance) })}</p>
    </article>
  );
}
