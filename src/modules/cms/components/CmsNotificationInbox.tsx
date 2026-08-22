"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { CmsNotificationSummary } from "@/modules/cms/types/cms-notification-inbox.types";
import styles from "./CmsNotifications.module.css";

type CmsNotificationInboxProps = {
  summary: CmsNotificationSummary;
};

function formatTime(value: string | null) {
  if (!value) return "No events yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CmsNotificationInbox({ summary }: CmsNotificationInboxProps) {
  useEffect(() => {
    void fetch("/api/admin/cms/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seenThrough: summary.generatedAt }),
    });
  }, [summary.generatedAt]);

  return (
    <section className={styles.inbox} aria-label="Platform notification categories">
      <div className={styles.inboxIntro}>
        <p>{summary.unreadTotal > 0 ? `${summary.unreadTotal} new event${summary.unreadTotal === 1 ? "" : "s"} since your last visit.` : "You are up to date with current platform activity."}</p>
        <span>Opening this screen marks only the events already shown as seen.</span>
      </div>
      <div className={styles.categoryGrid}>
        {summary.categories.map((category, index) => (
          <Link key={category.category} href={category.href} className={styles.categoryCard}>
            <span className={`${styles.categoryIcon} ${styles[`categoryIcon${index + 1}`]}`} aria-hidden="true">{index + 1}</span>
            <div className={styles.cardTopline}>
              <span>{category.unreadCount > 0 ? "New activity" : "Up to date"}</span>
              {category.unreadCount > 0 ? <strong>{category.unreadCount}</strong> : null}
            </div>
            <h2>{category.title}</h2>
            <p>{category.description}</p>
            <footer>Latest: {formatTime(category.latestAt)} <span aria-hidden="true">→</span></footer>
          </Link>
        ))}
      </div>
    </section>
  );
}
