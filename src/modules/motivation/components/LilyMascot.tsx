"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale } from "@/core/i18n/locale";
import { notifyMotivationUpdated } from "@/modules/motivation/motivation-events";
import type { LilyFactContext } from "@/modules/motivation/services/lily-facts.service";
import styles from "./LilyMascot.module.css";

type Fact = {
  id: string;
  text: string;
  fullText?: string;
  category: "PHILOLOGY" | "LANGUAGES" | "LITERATURE";
  characterEmotion: "JOYFUL" | "THOUGHTFUL" | "SURPRISED";
};

type Props = {
  context: Exclude<LilyFactContext, "CLICK">;
  placement?: "fixed" | "inline";
  className?: string;
  /** Useful for the brief saving state before route navigation. */
  active?: boolean;
};

const copy = {
  en: { name: "KRIN EdTech", label: "Show a language fact", close: "Close fact", more: "Read more", less: "Show less", categories: { PHILOLOGY: "Philology", LANGUAGES: "Languages", LITERATURE: "Literature" } },
  ru: { name: "KRIN EdTech", label: "Показать факт о языке", close: "Закрыть факт", more: "Подробнее", less: "Свернуть", categories: { PHILOLOGY: "Филология", LANGUAGES: "Языки", LITERATURE: "Литература" } },
  uk: { name: "KRIN EdTech", label: "Показати факт про мови", close: "Закрити факт", more: "Докладніше", less: "Згорнути", categories: { PHILOLOGY: "Філологія", LANGUAGES: "Мови", LITERATURE: "Література" } },
} as const;

/**
 * A calm, persistent guide. Every fresh mount and every intentional click
 * receives a different recently-unseen card from the server catalogue.
 */
export function LilyMascot({ context, placement = "fixed", className = "", active = true }: Props) {
  const { locale } = useLocale();
  const text = copy[locale] ?? copy.en;
  const [fact, setFact] = useState<Fact | null>(null);
  const [open, setOpen] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const loadedContextRef = useRef<string | null>(null);
  const requestInFlightRef = useRef(false);

  const requestFact = useCallback(async (requestedContext: LilyFactContext) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    try {
      const response = await fetch(`/api/profile/lily/fact?context=${requestedContext}`, { cache: "no-store", method: requestedContext === "CLICK" ? "POST" : "GET" });
      const payload = await response.json().catch(() => null) as { data?: { fact?: Fact | null; earnedXp?: number }; error?: string } | null;
      if (!response.ok) return;
      if (payload?.data?.fact) {
        setFact(payload.data.fact);
        setExpanded(false);
        setEarnedXp(payload.data.earnedXp ?? 0);
        setOpen(true);
        if (payload.data.earnedXp) notifyMotivationUpdated();
      }
    } catch {
      // The mascot is decorative; it must never block learning or navigation.
    } finally {
      requestInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active || loadedContextRef.current === context) return;
    loadedContextRef.current = context;
    void requestFact(context);
  }, [active, context, requestFact]);

  if (!active && placement === "inline") return null;
  return <aside className={`${styles.root} ${placement === "fixed" ? styles.fixed : styles.inline} ${className}`} aria-label={text.name}>
    {open ? <section className={styles.bubble} role="status">
      <button type="button" className={styles.close} onClick={() => { setOpen(false); setFact(null); }} aria-label={text.close}>×</button>
      {fact ? <><span className={styles.category}>{text.categories[fact.category]}{earnedXp ? " · +1 XP" : ""}</span><p>{expanded ? fact.fullText ?? fact.text : fact.text}</p>{fact.fullText ? <button type="button" className={styles.more} onClick={() => setExpanded((current) => !current)}>{expanded ? text.less : text.more}</button> : null}</> : null}
    </section> : null}
    <button type="button" className={styles.characterButton} onClick={() => void requestFact("CLICK")} aria-label={text.label} title={text.label}>
      <Image src="/icons/a-detailed-flat-vector-illustration-of-a-single-wh.svg" alt="" aria-hidden="true" width={64} height={64} sizes="64px" />
    </button>
  </aside>;
}
