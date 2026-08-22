"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./CmsNavigation.module.css";

type CmsNotificationNavLinkProps = {
  active: boolean;
};

export function CmsNotificationNavLink({ active }: CmsNotificationNavLinkProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const response = await fetch("/api/admin/cms/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json() as { data?: { unreadTotal?: number } };
      setUnreadCount(Math.max(0, payload.data?.unreadTotal ?? 0));
    } catch {
      // Navigation remains usable if a transient request fails.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisibilityChange = () => void refresh();
    const intervalId = window.setInterval(() => void refresh(), 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const label = unreadCount > 0
    ? `Notifications, ${unreadCount} new platform event${unreadCount === 1 ? "" : "s"}`
    : "Notifications";

  return (
    <Link
      href="/cms/notifications"
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={`${styles.link} ${styles.notificationLink} ${active ? styles.linkActive : ""}`}
    >
      Notifications
      {unreadCount > 0 ? <span className={styles.notificationBadge} aria-hidden="true" /> : null}
    </Link>
  );
}
