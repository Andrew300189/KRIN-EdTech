"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { MOTIVATION_UPDATED_EVENT, notifyMotivationUpdated } from "../motivation-events";
import { useLocale } from "@/core/i18n/locale";
import styles from "./ExperienceStatus.module.css";

type MotivationOverview = {
  level: { level: number; lifetimeExperience: number; fractionalExperience?: number };
  wallet: { balance: number; fractionalBalance?: number };
};

type ExchangeResult = {
  exchangedExperience?: number;
  krinCoinsAdded?: number;
  level?: MotivationOverview["level"];
  wallet: MotivationOverview["wallet"];
};

const copy = {
  en: { title: "XP exchange", available: "Available", xpToKrin: "XP → KRIN Coins", rate: "1,000 XP = 1 KRIN Coin · rank XP stays unchanged", xpAmount: "XP to exchange", all: "All", receive: "You receive", exchange: "Exchange", exchanging: "Exchanging…", close: "Close", krinCoin: "KRIN Coins", done: "{xp} XP exchanged for {coins} KRIN Coins.", error: "Unable to exchange right now." },
  uk: { title: "Обмін XP", available: "Доступно", xpToKrin: "XP → KRIN Coins", rate: "1 000 XP = 1 KRIN Coin · XP рейтингу не змінюється", xpAmount: "XP для обміну", all: "Усі", receive: "Ви отримаєте", exchange: "Обміняти", exchanging: "Обмінюємо…", close: "Закрити", krinCoin: "KRIN Coins", done: "{xp} XP обміняно на {coins} KRIN Coins.", error: "Не вдалося виконати обмін." },
  ru: { title: "Обмен XP", available: "Доступно", xpToKrin: "XP → KRIN Coins", rate: "1 000 XP = 1 KRIN Coin · XP рейтинга не меняется", xpAmount: "XP для обмена", all: "Все", receive: "Вы получите", exchange: "Обменять", exchanging: "Обмениваем…", close: "Закрыть", krinCoin: "KRIN Coins", done: "{xp} XP обменяно на {coins} KRIN Coins.", error: "Не удалось выполнить обмен." },
} as const;

function regularCoinBalance(overview: MotivationOverview) {
  return overview.wallet.balance + (overview.wallet.fractionalBalance ?? 0) / 100;
}

function experienceLabel(level: MotivationOverview["level"]) {
  const hundredths = Math.max(0, Math.min(99, level.fractionalExperience ?? 0));
  return hundredths ? `${level.lifetimeExperience}.${String(hundredths).padStart(2, "0")}` : String(level.lifetimeExperience);
}

function wholeNumber(value: string) {
  const amount = Number(value.replace(/\D/g, ""));
  return Number.isSafeInteger(amount) ? amount : 0;
}

function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

/** Shows spendable XP and KRIN Coins with a direct, rank-safe exchange. */
export function ExperienceStatus({ className = "" }: { className?: string }) {
  const { locale } = useLocale();
  const text = copy[locale] ?? copy.en;
  const [overview, setOverview] = useState<MotivationOverview | null>(null);
  const [open, setOpen] = useState(false);
  const [xpAmount, setXpAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef<string | null>(null);
  const overviewRequestVersionRef = useRef(0);
  const popoverId = useId();

  const load = useCallback(async () => {
    const requestVersion = ++overviewRequestVersionRef.current;
    try {
      const response = await fetch("/api/profile/motivation", { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: MotivationOverview } | null;
      // If a chest/reward event started a newer reload, an older response can
      // describe the balance from before the immutable reward was credited.
      // Never let that stale response overwrite the latest server balance.
      if (response.ok && payload?.data && requestVersion === overviewRequestVersionRef.current) setOverview(payload.data);
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
  const requestedXp = wholeNumber(xpAmount);

  async function exchange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestedXp < 10 || requestedXp > experience) return;
    setSubmitting(true);
    setMessage(null);
    const requestId = requestIdRef.current ?? crypto.randomUUID();
    requestIdRef.current = requestId;
    try {
      const response = await fetch("/api/profile/motivation/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "XP_TO_KRIN", experience: requestedXp, idempotencyKey: requestId }),
      });
      const payload = await response.json().catch(() => null) as { data?: ExchangeResult; error?: string } | null;
      if (!response.ok || !payload?.data) {
        requestIdRef.current = null;
        throw new Error(payload?.error || text.error);
      }
      requestIdRef.current = null;
      setOverview((current) => current ? { level: payload.data?.level ?? current.level, wallet: payload.data!.wallet } : current);
      setXpAmount("");
      setMessage(format(text.done, { xp: payload.data.exchangedExperience ?? requestedXp, coins: (payload.data.krinCoinsAdded ?? 0).toFixed(2) }));
      notifyMotivationUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.error);
    } finally {
      setSubmitting(false);
    }
  }

  return <div ref={rootRef} className={`${styles.root} ${className}`}>
    <div className={styles.status}>
      <button type="button" className={styles.xpButton} aria-expanded={open} aria-controls={popoverId} onClick={() => { if (!open) setXpAmount((current) => current || String(experience)); setOpen(!open); setMessage(null); }} title={text.title} aria-label={`${experienceText} XP, ${text.title}`}>
        <span>Lv. {overview.level.level}</span><strong><span aria-hidden="true">{experienceText}</span><span className={styles.xpUnit}>{experienceText} XP</span></strong>
      </button>
      <span className={styles.coins} aria-label={`${regularCoinBalance(overview).toFixed(2)} ${text.krinCoin}`}><span className={styles.coinStack} aria-hidden="true"><i /><i /><i /></span>{regularCoinBalance(overview).toFixed(2)}</span>
    </div>
    {open ? <div id={popoverId} className={styles.popover} role="dialog" aria-label={text.title}>
      <div className={styles.popoverHeading}><div><strong>{text.title}</strong><span>{text.rate}</span></div><button type="button" onClick={() => setOpen(false)} aria-label={text.close}>×</button></div>
      <p className={styles.available}>{text.available}: <strong>{experienceText} XP</strong></p>
      <section className={styles.exchangeSection} aria-labelledby={`${popoverId}-krin`}>
        <strong id={`${popoverId}-krin`}>{text.xpToKrin}</strong>
        <form onSubmit={(event) => void exchange(event)}>
          <label htmlFor={`${popoverId}-xp`}>{text.xpAmount}</label>
          <div className={styles.amountRow}><input id={`${popoverId}-xp`} type="text" inputMode="numeric" pattern="[0-9 ]*" value={xpAmount} onChange={(event) => { requestIdRef.current = null; setXpAmount(event.target.value.replace(/\D/g, "")); }} placeholder="1000" autoFocus /><button type="button" onClick={() => { requestIdRef.current = null; setXpAmount(String(experience)); }}>{text.all}</button></div>
          <div className={styles.preview}><span>{text.receive}</span><strong>{(Math.round((requestedXp / 1000) * 100) / 100).toFixed(2)} {text.krinCoin}</strong></div>
          <button className={styles.exchangeButton} type="submit" disabled={submitting || requestedXp < 10 || requestedXp > experience}>{submitting ? text.exchanging : text.exchange}</button>
        </form>
      </section>
      {message ? <p className={styles.message} role="status">{message}</p> : null}
    </div> : null}
  </div>;
}
