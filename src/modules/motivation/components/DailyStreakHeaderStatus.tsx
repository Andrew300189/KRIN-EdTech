"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import { MOTIVATION_UPDATED_EVENT, notifyMotivationUpdated } from "../motivation-events";
import styles from "./DailyStreakHeaderStatus.module.css";

type Streak = { currentStreak: number; longestStreak: number; freezeCount: number; waterLilyCount?: number; recoverableStreak?: number };
type StreakRecovery = { available: boolean; streakLength: number; experienceCost: number; coinCostMinor: number; waterLilyCount: number };
type Motivation = { streak?: Streak; streakRecovery?: StreakRecovery; wallet?: { balance: number; fractionalBalance: number }; level?: { level: number; lifetimeExperience: number; fractionalExperience?: number } };

const FREEZE_PRICE = 1;

const copy = {
  en: { title: "Daily streak", profileLevel: "Profile level", description: "Keep your learning rhythm going.", day: "days in a row", freezes: "Days off ready", waterLilies: "Water Lilies", purchase: "Buy a day off", buying: "Buying…", restore: "Restore burned streak", restoring: "Restoring…", restoreFree: "Free with Water Lily", restoreCost: "{cost} XP", restored: "Your streak has been restored.", balance: "Balance", cost: "1 KRIN Coin", purchased: "Your day off is ready. It will protect one missed day.", insufficient: "You need 1 KRIN Coin to buy a day off.", unavailable: "Unable to buy a day off right now.", close: "Close streak details" },
  ru: { title: "Серия дней", profileLevel: "Уровень профиля", description: "Поддерживайте ритм обучения.", day: "дней подряд", freezes: "Дней отдыха готово", waterLilies: "Кувшинки", purchase: "Купить день отдыха", buying: "Покупаем…", restore: "Восстановить сгоревшую серию", restoring: "Восстанавливаем…", restoreFree: "Бесплатно за Кувшинку", restoreCost: "{cost} XP", restored: "Серия восстановлена.", balance: "Баланс", cost: "1 KRIN Coin", purchased: "День отдыха готов. Он защитит один пропущенный день.", insufficient: "Чтобы купить день отдыха, нужна 1 KRIN Coin.", unavailable: "Сейчас не удалось купить день отдыха.", close: "Закрыть сведения о серии" },
  uk: { title: "Серія днів", profileLevel: "Рівень профілю", description: "Підтримуйте ритм навчання.", day: "днів поспіль", freezes: "Днів відпочинку готово", waterLilies: "Латаття", purchase: "Купити день відпочинку", buying: "Купуємо…", restore: "Відновити згорілу серію", restoring: "Відновлюємо…", restoreFree: "Безкоштовно за Латаття", restoreCost: "{cost} XP", restored: "Серію відновлено.", balance: "Баланс", cost: "1 KRIN Coin", purchased: "День відпочинку готовий. Він захистить один пропущений день.", insufficient: "Щоб купити день відпочинку, потрібна 1 KRIN Coin.", unavailable: "Зараз не вдалося купити день відпочинку.", close: "Закрити відомості про серію" },
} as const;

/** Compact streak badge; clicking it opens the only place to buy a day-off freeze. */
export function DailyStreakHeaderStatus() {
  const { locale } = useLocale();
  const text = copy[locale];
  const [motivation, setMotivation] = useState<Motivation | null>(null);
  const [open, setOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/motivation", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: Motivation } | null;
      if (response.ok && payload?.data?.streak) setMotivation(payload.data);
    } catch {
      // Learning and navigation remain available if the badge cannot refresh.
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(MOTIVATION_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(MOTIVATION_UPDATED_EVENT, refresh);
  }, [refresh]);

  const streak = motivation?.streak;
  if (!streak) return null;
  const level = motivation.level;
  const balance = (motivation?.wallet?.balance ?? 0) + (motivation?.wallet?.fractionalBalance ?? 0) / 100;
  const recovery = motivation?.streakRecovery;
  const label = `${text.title}: ${streak.currentStreak}`;

  async function buyDayOff() {
    if (buying) return;
    if (balance < FREEZE_PRICE) {
      toast.error(text.insufficient);
      return;
    }
    setBuying(true);
    try {
      const response = await fetch("/api/profile/motivation/streak-freeze", { method: "POST" });
      const payload = await response.json().catch(() => null) as { data?: { streak: Streak; wallet: { balance: number; fractionalBalance: number } }; error?: string } | null;
      const purchase = payload?.data;
      if (!response.ok || !purchase) throw new Error(payload?.error ?? text.unavailable);
      setMotivation((current) => current ? { ...current, streak: purchase.streak, wallet: purchase.wallet } : current);
      notifyMotivationUpdated();
      toast.success(text.purchased);
    } catch (error) {
      toast.error(error instanceof Error && error.message === "Insufficient KRIN Coins" ? text.insufficient : error instanceof Error ? error.message : text.unavailable);
    } finally {
      setBuying(false);
    }
  }

  async function restoreBurnedStreak() {
    if (!recovery?.available || restoring) return;
    setRestoring(true);
    try {
      const response = await fetch("/api/profile/motivation/streak-restore", { method: "POST" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? text.unavailable);
      await refresh();
      notifyMotivationUpdated();
      toast.success(text.restored);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.unavailable);
    } finally {
      setRestoring(false);
    }
  }

  return <>
    {level ? <span className={styles.levelBadge} title={`${text.profileLevel}: ${level.level}`} aria-label={`${text.profileLevel}: ${level.level}`}>
      <span>Lv.</span><strong>{level.level}</strong>
    </span> : null}
    <button type="button" className={styles.status} title={label} aria-label={label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span className={styles.fire} aria-hidden="true">🔥</span>
      <strong>{streak.currentStreak}</strong>
    </button>
    <AppModal open={open} onOpenChange={setOpen} title={text.title} description={text.description} size="small" closeLabel={text.close} bodyClassName={styles.modalBody}>
      <div className={styles.modalStreak}>
        <span aria-hidden="true">🔥</span>
        <strong>{streak.currentStreak}</strong>
        <span>{text.day}</span>
      </div>
      <div className={styles.modalMeta}>
        <span>❄ {streak.freezeCount} · {text.freezes}</span>
        <span>🪷 {recovery?.waterLilyCount ?? streak.waterLilyCount ?? 0} · {text.waterLilies}</span>
        <span>{text.balance}: {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(balance)}</span>
      </div>
      {recovery?.available ? <button type="button" className={styles.restoreButton} disabled={restoring} onClick={() => void restoreBurnedStreak()}>
        <span>{restoring ? text.restoring : text.restore}</span>
        <small>{recovery.waterLilyCount > 0 ? text.restoreFree : text.restoreCost.replace("{cost}", String(recovery.experienceCost))}</small>
      </button> : null}
      <button type="button" className={styles.purchaseButton} disabled={buying || balance < FREEZE_PRICE} onClick={() => void buyDayOff()}>
        <span>{buying ? text.buying : text.purchase}</span>
        <small>{text.cost}</small>
      </button>
    </AppModal>
  </>;
}
