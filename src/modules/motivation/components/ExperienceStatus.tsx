"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { MOTIVATION_UPDATED_EVENT, notifyMotivationUpdated } from "../motivation-events";
import { useLocale } from "@/core/i18n/locale";
import styles from "./ExperienceStatus.module.css";

type MotivationOverview = {
  level: { level: number; lifetimeExperience: number; fractionalExperience?: number };
  wallet: { balance: number; fractionalBalance?: number; xpCoinBalanceMinor?: number };
};

type ExchangeResult = {
  exchangedExperience?: number;
  xpCoinsAdded?: number;
  convertedXpCoins?: number;
  level?: MotivationOverview["level"];
  wallet: MotivationOverview["wallet"];
};

const copy = {
  en: { title: "XP exchange", available: "Available", xpToXpCoin: "XP → XP Coins", xpCoinToKrin: "XP Coins → KRIN Coins", rate: "1,000 XP = 1 XP Coin = 1 KRIN Coin", xpAmount: "XP to exchange", xpCoinAmount: "XP Coins to exchange", all: "All", receive: "You receive", exchange: "Exchange", exchanging: "Exchanging…", close: "Close", xpCoin: "XP Coins", krinCoin: "KRIN Coins", firstDone: "{xp} XP exchanged for {coins} XP Coins.", secondDone: "{coins} XP Coins exchanged for KRIN Coins.", error: "Unable to exchange right now." },
  uk: { title: "Обмін XP", available: "Доступно", xpToXpCoin: "XP → XP Coins", xpCoinToKrin: "XP Coins → KRIN Coins", rate: "1 000 XP = 1 XP Coin = 1 KRIN Coin", xpAmount: "XP для обміну", xpCoinAmount: "XP Coins для обміну", all: "Усі", receive: "Ви отримаєте", exchange: "Обміняти", exchanging: "Обмінюємо…", close: "Закрити", xpCoin: "XP Coins", krinCoin: "KRIN Coins", firstDone: "{xp} XP обміняно на {coins} XP Coins.", secondDone: "{coins} XP Coins обміняно на KRIN Coins.", error: "Не вдалося виконати обмін." },
  ru: { title: "Обмен XP", available: "Доступно", xpToXpCoin: "XP → XP Coins", xpCoinToKrin: "XP Coins → KRIN Coins", rate: "1 000 XP = 1 XP Coin = 1 KRIN Coin", xpAmount: "XP для обмена", xpCoinAmount: "XP Coins для обмена", all: "Все", receive: "Вы получите", exchange: "Обменять", exchanging: "Обмениваем…", close: "Закрыть", xpCoin: "XP Coins", krinCoin: "KRIN Coins", firstDone: "{xp} XP обменяно на {coins} XP Coins.", secondDone: "{coins} XP Coins обменяно на KRIN Coins.", error: "Не удалось выполнить обмен." },
} as const;

function regularCoinBalance(overview: MotivationOverview) {
  return overview.wallet.balance + (overview.wallet.fractionalBalance ?? 0) / 100;
}

function xpCoinBalance(overview: MotivationOverview) {
  return Math.max(0, overview.wallet.xpCoinBalanceMinor ?? 0) / 100;
}

function experienceLabel(level: MotivationOverview["level"]) {
  const hundredths = Math.max(0, Math.min(99, level.fractionalExperience ?? 0));
  return hundredths ? `${level.lifetimeExperience}.${String(hundredths).padStart(2, "0")}` : String(level.lifetimeExperience);
}

function wholeNumber(value: string) {
  const amount = Number(value.replace(/\D/g, ""));
  return Number.isSafeInteger(amount) ? amount : 0;
}

function coinNumber(value: string) {
  const amount = Number(value.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

/** Shows three separate balances and the two-step, rank-safe exchange. */
export function ExperienceStatus({ className = "" }: { className?: string }) {
  const { locale } = useLocale();
  const text = copy[locale] ?? copy.en;
  const [overview, setOverview] = useState<MotivationOverview | null>(null);
  const [open, setOpen] = useState(false);
  const [xpAmount, setXpAmount] = useState("");
  const [xpCoinAmount, setXpCoinAmount] = useState("");
  const [submitting, setSubmitting] = useState<"XP_TO_XP_COIN" | "XP_COIN_TO_KRIN" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef<Record<string, string | null>>({ XP_TO_XP_COIN: null, XP_COIN_TO_KRIN: null });
  const popoverId = useId();

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/motivation", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: MotivationOverview } | null;
      if (response.ok && payload?.data) setOverview(payload.data);
    } catch {
      // Motivation data must never block the learning interface.
    }
  }, []);

  useEffect(() => {
    void load();
    window.addEventListener(MOTIVATION_UPDATED_EVENT, load);
    return () => window.removeEventListener(MOTIVATION_UPDATED_EVENT, load);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [open]);

  if (!overview) return null;
  const experience = overview.level.lifetimeExperience;
  const experienceText = experienceLabel(overview.level);
  const earnedXpCoins = xpCoinBalance(overview);
  const requestedXp = wholeNumber(xpAmount);
  const requestedXpCoins = coinNumber(xpCoinAmount);

  async function exchange(mode: "XP_TO_XP_COIN" | "XP_COIN_TO_KRIN", event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = mode === "XP_TO_XP_COIN" ? requestedXp : requestedXpCoins;
    const available = mode === "XP_TO_XP_COIN" ? experience : earnedXpCoins;
    const minimum = mode === "XP_TO_XP_COIN" ? 10 : 0.01;
    if (amount < minimum || amount > available) return;
    setSubmitting(mode);
    setMessage(null);
    const requestId = requestIdRef.current[mode] ?? crypto.randomUUID();
    requestIdRef.current[mode] = requestId;
    try {
      const response = await fetch("/api/profile/motivation/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "XP_TO_XP_COIN"
          ? { mode, experience: requestedXp, idempotencyKey: requestId }
          : { mode, xpCoins: requestedXpCoins, idempotencyKey: requestId }),
      });
      const payload = await response.json().catch(() => null) as { data?: ExchangeResult; error?: string } | null;
      if (!response.ok || !payload?.data) {
        requestIdRef.current[mode] = null;
        throw new Error(payload?.error || text.error);
      }
      requestIdRef.current[mode] = null;
      setOverview((current) => current ? { level: payload.data?.level ?? current.level, wallet: payload.data!.wallet } : current);
      if (mode === "XP_TO_XP_COIN") {
        setXpAmount("");
        setMessage(format(text.firstDone, { xp: payload.data.exchangedExperience ?? requestedXp, coins: (payload.data.xpCoinsAdded ?? 0).toFixed(2) }));
      } else {
        setXpCoinAmount("");
        setMessage(format(text.secondDone, { coins: (payload.data.convertedXpCoins ?? requestedXpCoins).toFixed(2) }));
      }
      notifyMotivationUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.error);
    } finally {
      setSubmitting(null);
    }
  }

  return <div ref={rootRef} className={`${styles.root} ${className}`}>
    <div className={styles.status}>
      <button type="button" className={styles.xpButton} aria-expanded={open} aria-controls={popoverId} onClick={() => { if (!open) setXpAmount((current) => current || String(experience)); setOpen(!open); setMessage(null); }} title={text.title}>
        <span>Lv. {overview.level.level}</span><strong>{experienceText} XP</strong>
      </button>
      <span className={styles.xpCoins} aria-label={`${earnedXpCoins.toFixed(2)} ${text.xpCoin}`}><span aria-hidden="true">✦</span> {earnedXpCoins.toFixed(2)}</span>
      <span className={styles.coins} aria-label={`${regularCoinBalance(overview).toFixed(2)} ${text.krinCoin}`}><span aria-hidden="true">◉</span> {regularCoinBalance(overview).toFixed(2)}</span>
    </div>
    {open ? <div id={popoverId} className={styles.popover} role="dialog" aria-label={text.title}>
      <div className={styles.popoverHeading}><div><strong>{text.title}</strong><span>{text.rate}</span></div><button type="button" onClick={() => setOpen(false)} aria-label={text.close}>×</button></div>
      <p className={styles.available}>{text.available}: <strong>{experienceText} XP · {earnedXpCoins.toFixed(2)} {text.xpCoin}</strong></p>
      <section className={styles.exchangeSection} aria-labelledby={`${popoverId}-xp-coins`}>
        <strong id={`${popoverId}-xp-coins`}>{text.xpToXpCoin}</strong>
        <form onSubmit={(event) => void exchange("XP_TO_XP_COIN", event)}>
          <label htmlFor={`${popoverId}-xp`}>{text.xpAmount}</label>
          <div className={styles.amountRow}><input id={`${popoverId}-xp`} type="text" inputMode="numeric" pattern="[0-9 ]*" value={xpAmount} onChange={(event) => { requestIdRef.current.XP_TO_XP_COIN = null; setXpAmount(event.target.value.replace(/\D/g, "")); }} placeholder="1000" autoFocus /><button type="button" onClick={() => { requestIdRef.current.XP_TO_XP_COIN = null; setXpAmount(String(experience)); }}>{text.all}</button></div>
          <div className={styles.preview}><span>{text.receive}</span><strong>{(Math.round((requestedXp / 1000) * 100) / 100).toFixed(2)} {text.xpCoin}</strong></div>
          <button className={styles.exchangeButton} type="submit" disabled={submitting !== null || requestedXp < 10 || requestedXp > experience}>{submitting === "XP_TO_XP_COIN" ? text.exchanging : text.exchange}</button>
        </form>
      </section>
      <section className={styles.exchangeSection} aria-labelledby={`${popoverId}-krin`}>
        <strong id={`${popoverId}-krin`}>{text.xpCoinToKrin}</strong>
        <form onSubmit={(event) => void exchange("XP_COIN_TO_KRIN", event)}>
          <label htmlFor={`${popoverId}-xp-coin`}>{text.xpCoinAmount}</label>
          <div className={styles.amountRow}><input id={`${popoverId}-xp-coin`} type="text" inputMode="decimal" value={xpCoinAmount} onChange={(event) => { requestIdRef.current.XP_COIN_TO_KRIN = null; setXpCoinAmount(event.target.value.replace(",", ".").replace(/[^\d.]/g, "")); }} placeholder="1.00" /><button type="button" onClick={() => { requestIdRef.current.XP_COIN_TO_KRIN = null; setXpCoinAmount(earnedXpCoins.toFixed(2)); }}>{text.all}</button></div>
          <div className={styles.preview}><span>{text.receive}</span><strong>{requestedXpCoins.toFixed(2)} {text.krinCoin}</strong></div>
          <button className={styles.exchangeButton} type="submit" disabled={submitting !== null || requestedXpCoins < 0.01 || requestedXpCoins > earnedXpCoins}>{submitting === "XP_COIN_TO_KRIN" ? text.exchanging : text.exchange}</button>
        </form>
      </section>
      {message ? <p className={styles.message} role="status">{message}</p> : null}
    </div> : null}
  </div>;
}
