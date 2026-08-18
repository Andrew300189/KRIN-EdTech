"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keeps the owner-only directory aligned with incoming user heartbeats. */
export function CmsUsersPresenceRefresh() {
  const router = useRouter();

  useEffect(() => {
    const firstRefresh = window.setTimeout(() => router.refresh(), 1_200);
    const refreshInterval = window.setInterval(() => router.refresh(), 30_000);

    return () => {
      window.clearTimeout(firstRefresh);
      window.clearInterval(refreshInterval);
    };
  }, [router]);

  return null;
}
