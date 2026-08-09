"use client";

import Link from "next/link";
import type { SearchContext, SearchResultType } from "@/modules/search/types";

export function SearchTrackedLink({
  href,
  className,
  context,
  query,
  resultType,
  resultId,
  position,
  children,
}: {
  href: string;
  className?: string;
  context: SearchContext;
  query: string;
  resultType: SearchResultType;
  resultId: string;
  position: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        const payload = {
          query,
          context,
          resultType,
          resultId,
          resultUrl: href,
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
      }}
    >
      {children}
    </Link>
  );
}
