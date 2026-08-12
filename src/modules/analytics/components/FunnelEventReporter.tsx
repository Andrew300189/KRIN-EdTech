"use client";

import { useEffect, useRef } from "react";
import type { FunnelDeviceType, FunnelEventResult, FunnelEventType, FunnelLevelCode } from "@/modules/analytics/funnel-events";

export type FunnelEventContext = {
  courseId?: string;
  levelCode?: FunnelLevelCode;
  planCode?: string;
  currency?: string;
  result?: FunnelEventResult;
};

type Props = FunnelEventContext & { eventType: FunnelEventType };

function storageKey(eventType: FunnelEventType, pagePath: string, context: FunnelEventContext) {
  return `krin:funnel:${eventType}:${pagePath}:${context.courseId ?? ""}:${context.result ?? ""}`;
}

function browserSessionId() {
  const key = "krin:funnel:session-id";
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID();
    window.sessionStorage.setItem(key, value);
    return value;
  } catch {
    // Private browsing may block session storage. The event remains anonymous.
    return undefined;
  }
}

function safeReferrerPath() {
  try {
    if (!document.referrer) return undefined;
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin && /^\/(?!\/)/.test(referrer.pathname) ? referrer.pathname : undefined;
  } catch {
    return undefined;
  }
}

function deviceType(): FunnelDeviceType {
  if (window.matchMedia("(max-width: 767px)").matches) return "MOBILE";
  if (window.matchMedia("(max-width: 1023px)").matches) return "TABLET";
  return "DESKTOP";
}

function sendFunnelEvent(eventType: FunnelEventType, context: FunnelEventContext) {
  const pagePath = window.location.pathname;
  const key = storageKey(eventType, pagePath, context);
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // A single page interaction remains safe to record without storage.
  }

  void fetch("/api/analytics/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: crypto.randomUUID(),
      eventType,
      pagePath,
      sessionId: browserSessionId(),
      referrerPath: safeReferrerPath(),
      deviceType: deviceType(),
      ...context,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

/** Sends one event per browser session/path, even if React re-renders a page. */
export function FunnelEventReporter({ eventType, ...context }: Props) {
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    sendFunnelEvent(eventType, context);
  }, [context, eventType]);

  return null;
}

export function reportFunnelEvent(eventType: FunnelEventType, context: FunnelEventContext = {}) {
  if (typeof window === "undefined") return;
  sendFunnelEvent(eventType, context);
}
