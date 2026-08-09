"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SearchDialog } from "@/modules/search/components/SearchDialog";
import { SearchEmpty } from "@/modules/search/components/SearchEmpty";
import { SearchError } from "@/modules/search/components/SearchError";
import { SearchGroup } from "@/modules/search/components/SearchGroup";
import { SearchLoading } from "@/modules/search/components/SearchLoading";
import {
  DEBOUNCE_MS,
  MIN_QUERY_LENGTH,
  type SearchContext,
  type SearchResult,
  type SearchResponse,
} from "@/modules/search/types";

type SearchStatus = "IDLE" | "TYPING" | "LOADING" | "SUCCESS" | "EMPTY" | "ERROR";

function fullResultsPath(context: SearchContext, query: string) {
  const encoded = encodeURIComponent(query);
  if (context === "STUDENT") return `/student/search?q=${encoded}`;
  if (context === "TEACHER") return `/teacher/search?q=${encoded}`;
  return `/search?q=${encoded}`;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return target.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
}

export function GlobalSearch({
  context,
  placeholder,
  compact = false,
}: {
  context: SearchContext;
  placeholder: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [status, setStatus] = useState<SearchStatus>("IDLE");
  const [message, setMessage] = useState("Type a query to search.");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);

  const allItems = useMemo(() => results?.groups.flatMap((group) => group.items) ?? [], [results]);

  const runSearch = useCallback(async (value: string, currentRequestId: number, signal: AbortSignal) => {
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setStatus("IDLE");
      setResults(null);
      setMessage("Type at least two characters.");
      return;
    }

    setStatus("LOADING");
    const params = new URLSearchParams({ q: value, context, limit: "20" });
    const response = await fetch(`/api/search?${params.toString()}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("search_failed");
    const payload = (await response.json()) as SearchResponse;
    if (requestIdRef.current !== currentRequestId) return;
    setResults(payload);
    setActiveIndex(-1);
    if (payload.items.length === 0) {
      setStatus("EMPTY");
      setMessage(`No results for \"${value}\".`);
    } else {
      setStatus("SUCCESS");
    }
  }, [context]);

  const trackResultClick = useCallback((item: SearchResult, position: number) => {
    const payload = {
      query,
      context,
      resultType: item.type,
      resultId: item.id,
      resultUrl: item.url,
      position,
    };

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon("/api/search/click", body);
      return;
    }

    void fetch("/api/search/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
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
  }, [query, runSearch]);

  useEffect(() => {
    if (context === "PUBLIC") return;
    const listener = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      setMobileOpen(window.matchMedia("(max-width: 767px)").matches);
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [context]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (event.key === "Escape") {
      setOpen(false);
      setMobileOpen(false);
      return;
    }
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

  const dropdown = (
    <div className="relative">
      <div
        className={`flex items-center gap-2 border border-slate-300 bg-white px-3 shadow-sm ${compact ? "min-h-9 rounded-lg" : "min-h-11 rounded-xl"}`}
      >
        <span aria-hidden className="text-xs font-semibold uppercase tracking-wide text-slate-400">Search</span>
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`w-full bg-transparent text-slate-900 outline-none ${compact ? "py-1.5 text-xs" : "py-2 text-sm"}`}
          role="combobox"
          aria-expanded={open}
          aria-controls="global-search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
          aria-label="Global search"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
              setStatus("IDLE");
            }}
            className={`font-semibold text-slate-500 hover:text-slate-800 ${compact ? "text-[11px]" : "text-xs"}`}
          >
            Clear
          </button>
        ) : null}
      </div>

      {open ? (
        <div id="global-search-listbox" role="listbox" className="absolute z-30 mt-2 max-h-[70vh] w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {status === "LOADING" || status === "TYPING" ? <SearchLoading /> : null}
          {status === "ERROR" ? <SearchError onRetry={() => setQuery((value) => value)} /> : null}
          {status === "EMPTY" ? <SearchEmpty message={message} /> : null}
          {status === "IDLE" ? <SearchEmpty message={message} /> : null}
          {status === "SUCCESS" && results ? (
            <>
              {results.groups.map((group, groupIndex) => {
                const offset = results.groups.slice(0, groupIndex).reduce((sum, value) => sum + value.items.length, 0);
                return (
                  <SearchGroup
                    key={group.key}
                    group={group}
                    query={query}
                    activeIndex={activeIndex}
                    offset={offset}
                    onHover={setActiveIndex}
                    onResultClick={trackResultClick}
                    onSelect={() => {
                      setOpen(false);
                      setMobileOpen(false);
                    }}
                  />
                );
              })}
              <div className="border-t border-slate-100 p-2">
                <Link className="block rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50" href={fullResultsPath(context, query)}>
                  Show all results
                </Link>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="hidden md:block">{dropdown}</div>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(true);
            setOpen(true);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Search
        </button>
      </div>
      <SearchDialog
        open={mobileOpen}
        onClose={() => {
          setMobileOpen(false);
          setOpen(false);
        }}
      >
        {dropdown}
      </SearchDialog>
    </>
  );
}
