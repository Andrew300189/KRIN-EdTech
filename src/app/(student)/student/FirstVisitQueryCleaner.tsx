"use client";

import { useEffect } from "react";

export function FirstVisitQueryCleaner({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get("firstVisit") !== "1") return;

    url.searchParams.delete("firstVisit");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [active]);

  return null;
}
