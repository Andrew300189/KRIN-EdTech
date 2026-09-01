"use client";

import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./LessonWordHoverDictionary.module.css";

type DictionaryWord = {
  id: string;
  lemma: string;
  partOfSpeech: string | null;
  meanings: Array<{ translation: string | null; definition: string }>;
};

type HoveredWord = {
  term: string;
  translation: string;
  anchor: WordUnderPointer["rect"];
  position: { top: number; left: number };
  loading: boolean;
};

type WordUnderPointer = {
  term: string;
  rect: Pick<DOMRect, "top" | "right" | "bottom" | "left">;
};

type Props = {
  children: ReactNode;
  sourceLessonId: string;
  words: Array<{ wordId: string; word: Omit<DictionaryWord, "id"> }>;
};

const dismissedTermsStorageKey = "krin:vocabulary-hover-dismissed";

function normalize(term: string) {
  return term.trim().toLocaleLowerCase("en-US");
}

function dismissedTerms() {
  try {
    const stored = window.localStorage.getItem(dismissedTermsStorageKey);
    const parsed = stored ? JSON.parse(stored) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function rememberDismissedTerm(term: string) {
  try {
    const terms = dismissedTerms();
    terms.add(normalize(term));
    window.localStorage.setItem(dismissedTermsStorageKey, JSON.stringify([...terms].slice(-500)));
  } catch {
    // The lesson remains fully usable when browser storage is disabled.
  }
}

function translationFor(word: Omit<DictionaryWord, "id"> | DictionaryWord | undefined) {
  const meaning = word?.meanings[0];
  return meaning?.translation?.trim() || "";
}

function matchesLemma(term: string, lemma: string) {
  const normalizedTerm = normalize(term);
  const normalizedLemma = normalize(lemma);
  return normalizedLemma === normalizedTerm || normalizedLemma === `to ${normalizedTerm}`;
}

/**
 * Adds an unobtrusive dictionary affordance to lesson prose without changing
 * the authored HTML. CMS authors can link vocabulary in the usual way; words
 * not yet linked fall back to an exact central-dictionary lookup.
 */
export function LessonWordHoverDictionary({ children, sourceLessonId, words }: Props) {
  const [hovered, setHovered] = useState<HoveredWord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [closingAfterSave, setClosingAfterSave] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookupCache = useRef(new Map<string, DictionaryWord | null>());
  const translationCache = useRef(new Map<string, string>());
  const alreadyAddedCache = useRef(new Map<string, boolean>());
  const requestedTerm = useRef<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const knownWords = useMemo(() => {
    const entries = new Map<string, Omit<DictionaryWord, "id">>();
    for (const item of words) {
      const normalizedLemma = normalize(item.word.lemma);
      entries.set(normalizedLemma, item.word);
      if (normalizedLemma.startsWith("to ")) entries.set(normalizedLemma.slice(3), item.word);
    }
    return entries;
  }, [words]);

  function cancelClose() {
    if (!closeTimer.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      requestedTerm.current = null;
      setHovered(null);
      closeTimer.current = null;
    }, 380);
  }

  useEffect(() => () => {
    cancelClose();
    if (savedCloseTimer.current) clearTimeout(savedCloseTimer.current);
  }, []);

  function positionFor(rect: WordUnderPointer["rect"], size = { width: 288, height: 176 }) {
    const cardWidth = size.width;
    const cardHeight = size.height;
    const gap = 3;
    const shouldOpenAbove = rect.bottom + gap + cardHeight > window.innerHeight;
    return {
      left: Math.max(8, Math.min(rect.left + (rect.right - rect.left - cardWidth) / 2, window.innerWidth - cardWidth - 8)),
      top: shouldOpenAbove
        ? Math.max(8, rect.top - cardHeight - gap)
        : Math.min(rect.bottom + gap, window.innerHeight - cardHeight - 8),
    };
  }

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!hovered || !tooltip) return;

    const updatePosition = () => {
      const bounds = tooltip.getBoundingClientRect();
      const next = positionFor(hovered.anchor, { width: bounds.width, height: bounds.height });
      setHovered((current) => {
        if (!current || current.term !== hovered.term) return current;
        if (Math.abs(current.position.top - next.top) < 1 && Math.abs(current.position.left - next.left) < 1) return current;
        return { ...current, position: next };
      });
    };

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(tooltip);
    window.addEventListener("resize", updatePosition);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePosition);
    };
  }, [hovered]);

  async function isAlreadyAdded(term: string) {
    const normalizedTerm = normalize(term);
    const cached = alreadyAddedCache.current.get(normalizedTerm);
    if (cached !== undefined) return cached;
    try {
      const response = await fetch(`/api/profile/vocabulary/contains?q=${encodeURIComponent(term)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: { contains?: boolean } } | null;
      const contains = response.ok && payload?.data?.contains === true;
      alreadyAddedCache.current.set(normalizedTerm, contains);
      return contains;
    } catch {
      return false;
    }
  }

  async function translatedTerm(term: string) {
    const normalizedTerm = normalize(term);
    const cached = translationCache.current.get(normalizedTerm);
    if (cached !== undefined) return cached;
    const response = await fetch(`/api/vocabulary/translate?q=${encodeURIComponent(term)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => null) as { data?: { translation?: string } } | null;
    const translation = response.ok && typeof payload?.data?.translation === "string" ? payload.data.translation.trim() : "";
    if (translation) translationCache.current.set(normalizedTerm, translation);
    return translation;
  }

  async function showTranslation(term: string, rect: WordUnderPointer["rect"], knownTranslation = "") {
    const normalizedTerm = normalize(term);
    if (knownTranslation) {
      setHovered({ term, translation: knownTranslation, anchor: rect, position: positionFor(rect), loading: false });
      return;
    }
    setHovered({ term, translation: "", anchor: rect, position: positionFor(rect), loading: true });
    try {
      const translation = await translatedTerm(term);
      if (requestedTerm.current === normalizedTerm) {
        setHovered({ term, translation, anchor: rect, position: positionFor(rect), loading: false });
      }
    } catch {
      if (requestedTerm.current === normalizedTerm) {
        setHovered({ term, translation: "", anchor: rect, position: positionFor(rect), loading: false });
      }
    }
  }

  async function showTerm(term: string, rect: WordUnderPointer["rect"]) {
    cancelClose();
    const normalizedTerm = normalize(term);
    if (requestedTerm.current === normalizedTerm) return;
    requestedTerm.current = normalizedTerm;
    setSaved(false);
    setClosingAfterSave(false);
    setEditingTranslation(false);
    setError(null);

    if (dismissedTerms().has(normalizedTerm)) {
      setHovered(null);
      return;
    }
    if (await isAlreadyAdded(term)) {
      if (requestedTerm.current === normalizedTerm) setHovered(null);
      return;
    }
    if (requestedTerm.current !== normalizedTerm) return;

    const known = knownWords.get(normalizedTerm);
    if (known) {
      await showTranslation(term, rect, translationFor(known));
      return;
    }

    const cached = lookupCache.current.get(normalizedTerm);
    if (cached !== undefined) {
      await showTranslation(term, rect, translationFor(cached ?? undefined));
      return;
    }

    try {
      const response = await fetch(`/api/vocabulary/search?q=${encodeURIComponent(term)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: DictionaryWord[] } | null;
      const match = payload?.data?.find((item) => matchesLemma(term, item.lemma)) ?? null;
      lookupCache.current.set(normalizedTerm, match);
      if (requestedTerm.current === normalizedTerm) {
        await showTranslation(term, rect, translationFor(match ?? undefined));
      }
    } catch {
      lookupCache.current.set(normalizedTerm, null);
      if (requestedTerm.current === normalizedTerm) {
        await showTranslation(term, rect);
      }
    }
  }

  function showSelectedWord() {
    window.requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      const term = selection.toString().trim();
      if (!/^[A-Za-z][A-Za-z'-]*$/.test(term)) return;

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : range.commonAncestorContainer as Element;
      if (!container || !rootRef.current?.contains(container) || container.closest("[data-vocabulary-tooltip]")) return;

      const rect = range.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      cancelClose();
      void showTerm(term, rect);
    });
  }

  async function addToDictionary() {
    if (!hovered || !hovered.translation.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      // A custom record preserves the learner's editable translation and
      // never mutates the shared dictionary entry used by other learners.
      const response = await fetch("/api/profile/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term: hovered.term, translation: hovered.translation.trim(), note: `Added from lesson ${sourceLessonId}` }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to add this word.");
      alreadyAddedCache.current.set(normalize(hovered.term), true);
      setSaved(true);
      setClosingAfterSave(true);
      savedCloseTimer.current = setTimeout(() => {
        requestedTerm.current = null;
        setHovered(null);
        setSaved(false);
        setClosingAfterSave(false);
        savedCloseTimer.current = null;
      }, 760);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add this word.");
    } finally {
      setSaving(false);
    }
  }

  function dismissCurrentTerm() {
    if (!hovered) return;
    rememberDismissedTerm(hovered.term);
    requestedTerm.current = normalize(hovered.term);
    setHovered(null);
  }

  return <div ref={rootRef} className={styles.root} onPointerUp={showSelectedWord} onDoubleClick={showSelectedWord} onPointerLeave={scheduleClose}>
    {children}
    {hovered ? <aside ref={tooltipRef} data-vocabulary-tooltip className={`${styles.tooltip} ${closingAfterSave ? styles.tooltipClosing : ""}`} style={hovered.position} role="dialog" aria-label={`Add ${hovered.term} to your dictionary`} onPointerEnter={cancelClose} onPointerLeave={scheduleClose} onPointerMove={(event) => event.stopPropagation()}>
      <p className={styles.word}>{hovered.term}</p>
      {editingTranslation ? <label className={styles.translationLabel}>
        <span className={styles.visuallyHidden}>Translation</span>
        <input
          autoFocus
          className={styles.translationInput}
          value={hovered.translation}
          disabled={hovered.loading}
          onChange={(event) => setHovered((current) => current ? { ...current, translation: event.target.value } : current)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.blur();
              setEditingTranslation(false);
            }
          }}
          onBlur={() => setEditingTranslation(false)}
          placeholder={hovered.loading ? "Looking up translation…" : "Write your translation"}
        />
      </label> : <button
        type="button"
        className={styles.translationButton}
        disabled={hovered.loading}
        onClick={() => setEditingTranslation(true)}
        aria-label={`Edit translation for ${hovered.term}`}
      >
        <span>{hovered.loading ? "Looking up translation…" : hovered.translation || "Add your translation"}</span>
        <span className={styles.editHint}>Edit</span>
      </button>}
      <div className={styles.actions}>
        <button type="button" className={styles.addButton} disabled={hovered.loading || !hovered.translation.trim() || saving} onClick={() => void addToDictionary()}>{saving ? "Saving…" : "Add"}</button>
        {!saved ? <button type="button" className={styles.dismissButton} onClick={dismissCurrentTerm}>Not now</button> : null}
      </div>
      {saved ? <p className={styles.status}>Added to your dictionary.</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </aside> : null}
  </div>;
}
