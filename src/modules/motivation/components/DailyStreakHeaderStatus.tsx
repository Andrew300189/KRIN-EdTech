"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppModal } from "@/core/components/AppModal";
import { useLocale } from "@/core/i18n/locale";
import { MOTIVATION_UPDATED_EVENT, STREAK_RECOVERY_OPEN_EVENT, notifyMotivationUpdated } from "../motivation-events";
import { WATER_LILY_PRICE_COINS } from "../utils/shop-consumables";
import styles from "./DailyStreakHeaderStatus.module.css";

type Streak = { currentStreak: number; longestStreak: number; freezeCount: number; waterLilyCount?: number; recoverableStreak?: number };
type StreakRecovery = { available: boolean; streakLength: number; experienceCost: number; coinCostMinor: number; waterLilyCount: number; waterLilyReady: boolean; lostAt: string | null };
type Motivation = { streak?: Streak; streakRecovery?: StreakRecovery; wallet?: { balance: number; fractionalBalance: number }; level?: { level: number; lifetimeExperience: number; fractionalExperience?: number } };

const FREEZE_PRICE = 1;

const copy = {
  en: { title: "Daily streak", profileLevel: "Profile level", description: "Keep your learning rhythm going.", day: "days in a row", freezes: "Days off ready", waterLilies: "Water Lilies", purchase: "Buy a day off", buying: "Buying…", restore: "Restore lost streak", restoreShort: "Restore", restoring: "Restoring…", restoreFree: "Use Water Lily free", restoreCost: "{cost} XP", restored: "Your streak has been restored.", lost: "Your {count}-day streak ended. You can restore it here.", needLesson: "Finish a lesson with at least one correct first-try answer to use your Water Lily.", startLesson: "Continue learning", buyLily: "Buy Water Lily · {cost} KRIN Coin", buyingLily: "Buying Water Lily…", lilyBought: "Water Lily added. Finish a lesson to use it.", coinRestore: "{cost} KRIN Coin", noFunds: "Not enough XP or KRIN Coins. You can continue learning to earn XP.", shop: "Open reward shop", balance: "Balance", cost: "1 KRIN Coin", purchased: "Your day off is ready. It will protect one missed day.", insufficient: "You need 1 KRIN Coin to buy a day off.", unavailable: "Unable to buy a day off right now.", close: "Close streak details" },
  ru: { title: "Серия дней", profileLevel: "Уровень профиля", description: "Поддерживайте ритм обучения.", day: "дней подряд", freezes: "Дней отдыха готово", waterLilies: "Кувшинки", purchase: "Купить день отдыха", buying: "Покупаем…", restore: "Восстановить потерянную серию", restoreShort: "Вернуть", restoring: "Восстанавливаем…", restoreFree: "Бесплатно: использовать Кувшинку", restoreCost: "{cost} XP", restored: "Серия восстановлена.", lost: "Серия из {count} дней прервалась. Её можно восстановить здесь.", needLesson: "Чтобы использовать Кувшинку, завершите урок хотя бы с одним правильным ответом с первой попытки.", startLesson: "Продолжить обучение", buyLily: "Купить Кувшинку · {cost} KRIN Coin", buyingLily: "Покупаем Кувшинку…", lilyBought: "Кувшинка добавлена. Завершите урок, чтобы использовать её.", coinRestore: "{cost} KRIN Coin", noFunds: "Недостаточно XP и KRIN Coins. Продолжайте учиться, чтобы заработать XP.", shop: "Открыть магазин наград", balance: "Баланс", cost: "1 KRIN Coin", purchased: "День отдыха готов. Он защитит один пропущенный день.", insufficient: "Чтобы купить день отдыха, нужна 1 KRIN Coin.", unavailable: "Сейчас не удалось купить день отдыха.", close: "Закрыть сведения о серии" },
  uk: { title: "Серія днів", profileLevel: "Рівень профілю", description: "Підтримуйте ритм навчання.", day: "днів поспіль", freezes: "Днів відпочинку готово", waterLilies: "Латаття", purchase: "Купити день відпочинку", buying: "Купуємо…", restore: "Відновити втрачену серію", restoreShort: "Відновити", restoring: "Відновлюємо…", restoreFree: "Безкоштовно: використати Латаття", restoreCost: "{cost} XP", restored: "Серію відновлено.", lost: "Серія з {count} днів перервалася. Її можна відновити тут.", needLesson: "Щоб використати Латаття, завершіть урок хоча б з однією правильною відповіддю з першої спроби.", startLesson: "Продовжити навчання", buyLily: "Купити Латаття · {cost} KRIN Coin", buyingLily: "Купуємо Латаття…", lilyBought: "Латаття додано. Завершіть урок, щоб використати його.", coinRestore: "{cost} KRIN Coin", noFunds: "Недостатньо XP і KRIN Coins. Продовжуйте навчатися, щоб заробити XP.", shop: "Відкрити магазин нагород", balance: "Баланс", cost: "1 KRIN Coin", purchased: "День відпочинку готовий. Він захистить один пропущений день.", insufficient: "Щоб купити день відпочинку, потрібна 1 KRIN Coin.", unavailable: "Зараз не вдалося купити день відпочинку.", close: "Закрити відомості про серію" },
} as const;

/** Compact streak badge; clicking it opens the only place to buy a day-off freeze. */
export function DailyStreakHeaderStatus() {
  const { locale } = useLocale();
  const text = copy[locale];
  const [motivation, setMotivation] = useState<Motivation | null>(null);
  const [open, setOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [buyingLily, setBuyingLily] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/motivation", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: Motivation } | null;
      if (response.ok && payload?.data?.streak) {
        setMotivation(payload.data);
        const recovery = payload.data.streakRecovery;
        if (recovery?.available && recovery.lostAt) {
          const key = `krin-streak-recovery-shown:${recovery.lostAt}`;
          try {
            if (!window.sessionStorage.getItem(key)) {
              window.sessionStorage.setItem(key, "1");
              setOpen(true);
            }
          } catch { setOpen(true); }
        }
      }
    } catch {
      // Learning and navigation remain available if the badge cannot refresh.
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener(MOTIVATION_UPDATED_EVENT, refresh);
    const openRecovery = () => setOpen(true);
    const refreshOnFocus = () => void refresh();
    const refreshOnVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener(STREAK_RECOVERY_OPEN_EVENT, openRecovery);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => {
      window.removeEventListener(MOTIVATION_UPDATED_EVENT, refresh);
      window.removeEventListener(STREAK_RECOVERY_OPEN_EVENT, openRecovery);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [refresh]);

  const streak = motivation?.streak;
  if (!streak) return null;
  const level = motivation.level;
  const balance = (motivation?.wallet?.balance ?? 0) + (motivation?.wallet?.fractionalBalance ?? 0) / 100;
  const recovery = motivation?.streakRecovery;
  const label = recovery?.available ? `${text.restore}: ${recovery.streakLength}` : `${text.title}: ${streak.currentStreak}`;
  const canPay = Boolean(recovery && ((level?.lifetimeExperience ?? 0) >= recovery.experienceCost || balance * 100 >= recovery.coinCostMinor));

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
    if (!recovery?.available || restoring || (recovery.waterLilyCount > 0 && !recovery.waterLilyReady)) return;
    setRestoring(true);
    try {
      const response = await fetch("/api/profile/motivation/streak-restore", { method: "POST" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? text.unavailable);
      await refresh();
      notifyMotivationUpdated();
      toast.success(text.restored);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.unavailable);
    } finally {
      setRestoring(false);
    }
  }

  async function buyWaterLily() {
    if (buyingLily || balance < WATER_LILY_PRICE_COINS) return;
    setBuyingLily(true);
    try {
      const response = await fetch("/api/profile/shop/purchase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: "water-lily", purchaseId: crypto.randomUUID() }) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? text.unavailable);
      await refresh();
      notifyMotivationUpdated();
      toast.success(text.lilyBought);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.unavailable);
    } finally { setBuyingLily(false); }
  }

  return <>
    {level ? <span className={styles.levelBadge} title={`${text.profileLevel}: ${level.level}`} aria-label={`${text.profileLevel}: ${level.level}`}>
      <span>Lv.</span><strong>{level.level}</strong>
    </span> : null}
    <button type="button" className={`${styles.status} ${recovery?.available ? styles.statusNeedsRecovery : ""}`} title={label} aria-label={label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <span className={styles.fire} aria-hidden="true">🔥</span>
      <strong>{recovery?.available ? text.restoreShort : streak.currentStreak}</strong>
    </button>
    <AppModal open={open} onOpenChange={setOpen} title={recovery?.available ? text.restore : text.title} description={recovery?.available ? text.lost.replace("{count}", String(recovery.streakLength)) : text.description} size="small" closeLabel={text.close} bodyClassName={styles.modalBody}>
      <div className={styles.modalStreak}>
        <span aria-hidden="true">🔥</span>
        <strong>{recovery?.available ? recovery.streakLength : streak.currentStreak}</strong>
        <span>{text.day}</span>
      </div>
      <div className={styles.modalMeta}>
        <span>❄ {streak.freezeCount} · {text.freezes}</span>
        <span>🪷 {recovery?.waterLilyCount ?? streak.waterLilyCount ?? 0} · {text.waterLilies}</span>
        <span>{text.balance}: {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(balance)}</span>
      </div>
      {recovery?.available ? <section className={styles.recoveryChoices}>
        {recovery.waterLilyCount > 0 && !recovery.waterLilyReady ? <p className={styles.recoveryNote}>{text.needLesson} <Link href="/student/courses" onClick={() => setOpen(false)}>{text.startLesson}</Link></p> : null}
        {!recovery.waterLilyCount && !canPay ? <p className={styles.recoveryNote}>{text.noFunds}</p> : null}
        <button type="button" className={styles.restoreButton} disabled={restoring || (recovery.waterLilyCount > 0 ? !recovery.waterLilyReady : !canPay)} onClick={() => void restoreBurnedStreak()}>
          <span>{restoring ? text.restoring : text.restore}</span>
          <small>{recovery.waterLilyCount > 0 ? text.restoreFree : (level?.lifetimeExperience ?? 0) >= recovery.experienceCost ? text.restoreCost.replace("{cost}", String(recovery.experienceCost)) : text.coinRestore.replace("{cost}", (recovery.coinCostMinor / 100).toFixed(2))}</small>
        </button>
        {recovery.waterLilyCount === 0 ? <button type="button" className={styles.lilyButton} disabled={buyingLily || balance < WATER_LILY_PRICE_COINS} onClick={() => void buyWaterLily()}>{buyingLily ? text.buyingLily : text.buyLily.replace("{cost}", WATER_LILY_PRICE_COINS.toFixed(2))}</button> : null}
        <Link className={styles.shopLink} href="/student/shop" onClick={() => setOpen(false)}>{text.shop}</Link>
      </section> : null}
      <button type="button" className={styles.purchaseButton} disabled={buying || balance < FREEZE_PRICE} onClick={() => void buyDayOff()}>
        <span>{buying ? text.buying : text.purchase}</span>
        <small>{text.cost}</small>
      </button>
    </AppModal>
  </>;
}
