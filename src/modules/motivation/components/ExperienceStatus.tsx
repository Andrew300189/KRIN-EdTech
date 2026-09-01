"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { MOTIVATION_UPDATED_EVENT, notifyMotivationUpdated } from "../motivation-events";
import styles from "./ExperienceStatus.module.css";

type MotivationOverview = {
  level: { level: number; lifetimeExperience: number };
  wallet: { exchangeBalanceMinor: number };
};

function coinBalance(overview: MotivationOverview) {
  return overview.wallet.exchangeBalanceMinor / 100;
}

export function ExperienceStatus({ className = "" }: { className?: string }) {
  const [overview, setOverview] = useState<MotivationOverview | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
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
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  if (!overview) return null;
  const experience = overview.level.lifetimeExperience;
  const requested = Math.max(0, Math.trunc(Number(amount) || 0));
  const previewCoins = Math.round((requested / 1_000) * 100) / 100;

  async function exchange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requested < 10 || requested > experience) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile/motivation/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experience: requested }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Unable to exchange XP.");
      setAmount("");
      setMessage(`${requested} XP exchanged for ${previewCoins.toFixed(2)} KRIN Coins.`);
      await load();
      notifyMotivationUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to exchange XP.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div ref={rootRef} className={`${styles.root} ${className}`}>
    <div className={styles.status}>
      <button type="button" className={styles.xpButton} aria-expanded={open} aria-controls={popoverId} onClick={() => { setOpen((value) => !value); setMessage(null); }} title="Exchange XP for KRIN Coins">
        <span>Lv. {overview.level.level}</span><strong>{experience} XP</strong>
      </button>
      <span className={styles.coins} aria-label={`${coinBalance(overview).toFixed(2)} KRIN Coins`}><span aria-hidden="true">◉</span> {coinBalance(overview).toFixed(2)}</span>
    </div>
    {open ? <div id={popoverId} className={styles.popover} role="dialog" aria-label="Exchange XP for KRIN Coins">
      <div className={styles.popoverHeading}><div><strong>Exchange XP</strong><span>1,000 XP = 1 KRIN Coin</span></div><button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
      <p className={styles.available}>Available: <strong>{experience} XP</strong></p>
      <form onSubmit={(event) => void exchange(event)}>
        <label htmlFor={`${popoverId}-amount`}>XP to exchange</label>
        <div className={styles.amountRow}><input id={`${popoverId}-amount`} type="number" min="10" max={experience} step="1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="1000" autoFocus /><button type="button" onClick={() => setAmount(String(experience))}>All</button></div>
        <div className={styles.preview}><span>You receive</span><strong>{previewCoins.toFixed(2)} KRIN Coins</strong></div>
        <button className={styles.exchangeButton} type="submit" disabled={submitting || requested < 10 || requested > experience}>{submitting ? "Exchanging…" : "Exchange"}</button>
      </form>
      {message ? <p className={styles.message} role="status">{message}</p> : null}
    </div> : null}
  </div>;
}
