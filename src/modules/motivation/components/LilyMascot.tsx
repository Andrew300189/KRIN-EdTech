"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale } from "@/core/i18n/locale";
import type { LilyFactContext } from "@/modules/motivation/services/lily-facts.service";
import styles from "./LilyMascot.module.css";

type Fact = {
  id: string;
  text: string;
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
  en: { name: "Lily", label: "Ask Lily for a language fact", close: "Close Lily's fact", categories: { PHILOLOGY: "Philology", LANGUAGES: "Languages", LITERATURE: "Literature" } },
  ru: { name: "Лили", label: "Спросить Лили о языке", close: "Закрыть факт Лили", categories: { PHILOLOGY: "Филология", LANGUAGES: "Языки", LITERATURE: "Литература" } },
  uk: { name: "Лілі", label: "Запитати Лілі про мови", close: "Закрити факт Лілі", categories: { PHILOLOGY: "Філологія", LANGUAGES: "Мови", LITERATURE: "Література" } },
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
  const loadedContextRef = useRef<string | null>(null);
  const requestInFlightRef = useRef(false);

  const requestFact = useCallback(async (requestedContext: LilyFactContext) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    try {
      const response = await fetch(`/api/profile/lily/fact?context=${requestedContext}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: { fact?: Fact | null }; error?: string } | null;
      if (!response.ok) return;
      if (payload?.data?.fact) {
        setFact(payload.data.fact);
        setOpen(true);
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
  const emotion = fact?.characterEmotion?.toLowerCase() ?? "joyful";
  return <aside className={`${styles.root} ${placement === "fixed" ? styles.fixed : styles.inline} ${styles[`emotion${emotion[0]?.toUpperCase() ?? "J"}${emotion.slice(1)}`] ?? ""} ${className}`} aria-label={text.name}>
    {open ? <section className={styles.bubble} role="status">
      <button type="button" className={styles.close} onClick={() => { setOpen(false); setFact(null); }} aria-label={text.close}>×</button>
      {fact ? <><span className={styles.category}>{text.categories[fact.category]}</span><p>{fact.text}</p></> : null}
    </section> : null}
    <button type="button" className={styles.characterButton} onClick={() => void requestFact("CLICK")} aria-label={text.label} title={text.label}>
      <span className={styles.characterGlow} aria-hidden="true" />
      <Image src="/mascots/lily-mascot.png" alt="" aria-hidden="true" width={320} height={384} sizes="80px" />
      <span className={styles.name}>{text.name}</span>
    </button>
  </aside>;
}
