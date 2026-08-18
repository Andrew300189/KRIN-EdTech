"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 60_000;

/** Sends a small authenticated heartbeat only while the application is visible. */
export function PresenceHeartbeat() {
  useEffect(() => {
    const heartbeat = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/auth/presence", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        keepalive: true,
      }).catch(() => undefined);
    };

    heartbeat();
    const interval = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", heartbeat);
    window.addEventListener("focus", heartbeat);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeat);
      window.removeEventListener("focus", heartbeat);
    };
  }, []);

  return null;
}
