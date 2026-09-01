"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SearchDialog } from "@/modules/search/components/SearchDialog";
import { SearchEmpty } from "@/modules/search/components/SearchEmpty";
import { SearchError } from "@/modules/search/components/SearchError";
import { SearchGroup } from "@/modules/search/components/SearchGroup";
import { SearchLoading } from "@/modules/search/components/SearchLoading";
import styles from "./GlobalSearch.module.css";
import {
  DEBOUNCE_MS,
  MIN_QUERY_LENGTH,
  type SearchContext,
  type SearchResult,
  type SearchResponse,
} from "@/modules/search/types";

type SearchStatus = "IDLE" | "TYPING" | "LOADING" | "SUCCESS" | "EMPTY" | "ERROR";
type SearchSurface = "desktop" | "mobile";

function fullResultsPath(context: SearchContext, query: string) {
  const encoded = encodeURIComponent(query.trim());
  if (context === "STUDENT") return `/student/catalog?q=${encoded}`;
  if (context === "TEACHER") return `/teacher/search?q=${encoded}`;
  return `/search?q=${encoded}`;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return target.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
}

/** Shared server-backed search. Results remain filtered by the API, not by the UI. */
export function GlobalSearch({ context, placeholder, compact = false, dialogUntil = "md" }: { context: SearchContext; placeholder: string; compact?: boolean; dialogUntil?: "md" | "lg" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [status, setStatus] = useState<SearchStatus>("IDLE");
  const [message, setMessage] = useState("Type a query to search.");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retryKey, setRetryKey] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const desktopRootRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const id = useId().replace(/:/g, "");
  const baseId = `global-search-${id}`;
  const allItems = useMemo(() => results?.groups.flatMap((group) => group.items) ?? [], [results]);

  const runSearch = useCallback(async (value: string, currentRequestId: number, signal: AbortSignal) => {
    const normalizedValue = value.trim();
    if (normalizedValue.length < MIN_QUERY_LENGTH) {
      setStatus("IDLE");
      setResults(null);
      setMessage("Type at least two characters.");
      return;
    }

    setStatus("LOADING");
    const params = new URLSearchParams({ q: normalizedValue, context, limit: "20" });
    const response = await fetch(`/api/search?${params.toString()}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("search_failed");
    const payload = (await response.json()) as SearchResponse;
    if (requestIdRef.current !== currentRequestId) return;
    setResults(payload);
    setActiveIndex(-1);
    if (payload.items.length === 0) {
      setStatus("EMPTY");
      setMessage(`No results for \"${normalizedValue}\".`);
    } else {
      setStatus("SUCCESS");
    }
  }, [context]);

  const trackResultClick = useCallback((item: SearchResult, position: number) => {
    const payload = { query, context, resultType: item.type, resultId: item.id, resultUrl: item.url, position };
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/search/click", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      return;
    }
    void fetch("/api/search/click", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => undefined);
  }, [context, query]);

  useEffect(() => {
    setStatus(query.length ? "TYPING" : "IDLE");
    if (!query) {
      setResults(null);
      setMessage("Type a query to search.");
      return;
    }

    const controller = new AbortController();
    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;
    const timer = window.setTimeout(() => {
      void runSearch(query, nextRequestId, controller.signal).catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("ERROR");
      });
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, retryKey, runSearch]);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (mobileOpen || !desktopRootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [mobileOpen]);

  useEffect(() => {
    if (context === "PUBLIC") return;
    const listener = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k" || isEditableTarget(event.target)) return;
      event.preventDefault();
      setMobileOpen(window.matchMedia(dialogUntil === "lg" ? "(max-width: 1023px)" : "(max-width: 767px)").matches);
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [context, dialogUntil]);

  const close = () => {
    setOpen(false);
    setMobileOpen(false);
  };

  const submitFullSearch = () => {
    if (query.trim().length >= MIN_QUERY_LENGTH) window.location.assign(fullResultsPath(context, query));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, allItems.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const selected = allItems[activeIndex];
      if (selected) window.location.assign(selected.url);
    }
  };

  const searchControl = (surface: SearchSurface) => {
    const listboxId = `${baseId}-${surface}-listbox`;
    const inputId = `${baseId}-${surface}-input`;
    const isMobile = surface === "mobile";
    return (
      <div ref={isMobile ? undefined : desktopRootRef} className={`${styles.root} ${compact ? styles.compact : ""}`}>
        <form className={styles.control} role="search" onSubmit={(event) => { event.preventDefault(); submitFullSearch(); }}>
          <label className={styles.prefix} htmlFor={inputId}>Search</label>
          <input
            id={inputId}
            ref={inputRef}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className={styles.input}
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `${baseId}-${surface}-option-${activeIndex}` : undefined}
            aria-label="Global search"
            data-search-dialog-input={isMobile ? "true" : undefined}
            autoComplete="off"
          />
          {query ? <button type="button" onClick={() => { setQuery(""); setResults(null); setStatus("IDLE"); inputRef.current?.focus(); }} className={styles.clearButton} aria-label="Clear search">Clear</button> : null}
          <button className={styles.submitButton} type="submit">Search</button>
        </form>
        {open ? <div id={listboxId} role="listbox" className={styles.resultsPanel} aria-label="Search suggestions">
          {status === "LOADING" || status === "TYPING" ? <SearchLoading /> : null}
          {status === "ERROR" ? <SearchError onRetry={() => setRetryKey((value) => value + 1)} /> : null}
          {status === "EMPTY" || status === "IDLE" ? <SearchEmpty message={message} /> : null}
          {status === "SUCCESS" && results ? <>
            {results.groups.map((group, groupIndex) => {
              const offset = results.groups.slice(0, groupIndex).reduce((sum, value) => sum + value.items.length, 0);
              return <SearchGroup key={group.key} group={group} query={query} activeIndex={activeIndex} offset={offset} idPrefix={`${baseId}-${surface}`} onHover={setActiveIndex} onResultClick={trackResultClick} onSelect={close} />;
            })}
            <div className={styles.allResults}><Link className={styles.allResultsLink} href={fullResultsPath(context, query)} onClick={close}>Show all results</Link></div>
          </> : null}
        </div> : null}
      </div>
    );
  };

  return <>
    <div className={dialogUntil === "lg" ? styles.lgDesktopOnly : styles.desktopOnly}>{searchControl("desktop")}</div>
    <div className={dialogUntil === "lg" ? styles.lgMobileOnly : styles.mobileOnly}><button type="button" onClick={() => { setMobileOpen(true); setOpen(true); }} className={styles.mobileTrigger}>Search</button></div>
    <SearchDialog open={mobileOpen} onClose={close}>{searchControl("mobile")}</SearchDialog>
  </>;
}
