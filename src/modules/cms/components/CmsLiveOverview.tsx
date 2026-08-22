"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CmsLiveActivity,
  CmsLiveOverview,
} from "@/modules/cms/types/cms-live-overview.types";
import styles from "@/app/cms/CmsOverview.module.css";

type CmsOverviewResponse = { data?: unknown };

function isCmsLiveOverview(value: unknown): value is CmsLiveOverview {
  if (typeof value !== "object" || value === null) return false;
  const overview = value as Partial<CmsLiveOverview>;
  return Boolean(
    typeof overview.generatedAt === "string" &&
      overview.users &&
      overview.courses &&
      overview.payments &&
      overview.support &&
      overview.operations &&
      Array.isArray(overview.recentActivity),
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatActivityTime(value: string): string {
  const date = new Date(value);
  const now = Date.now();
  const elapsedMinutes = Math.max(0, Math.round((now - date.getTime()) / 60_000));

  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  if (elapsedMinutes < 24 * 60) return `${Math.floor(elapsedMinutes / 60)} h ago`;
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function activityClass(kind: CmsLiveActivity["kind"]): string {
  if (kind === "SECURITY") return styles.activitySecurity;
  if (kind === "BILLING") return styles.activityBilling;
  return styles.activitySupport;
}

function activityTypeLabel(type: CmsLiveActivity["type"]): string {
  if (type === "SECURITY_ALERT") return "Security";
  if (type === "PAYMENT_FAILURE") return "Billing";
  return "Support";
}

export function CmsLiveOverview({
  initialOverview,
}: {
  initialOverview: CmsLiveOverview;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [activityFilter, setActivityFilter] = useState<CmsLiveActivity["kind"] | "ALL">("ALL");
  const refreshInFlight = useRef(false);

  const refreshOverview = useCallback(async () => {
    // Live data stays current every five seconds, but a slow database/API
    // response must never stack concurrent requests and degrade the CMS.
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/admin/cms/overview", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as CmsOverviewResponse | null;
      if (!response.ok || !isCmsLiveOverview(payload?.data)) {
        setRefreshError(true);
        return;
      }

      setOverview(payload.data);
      setRefreshError(false);
    } catch {
      setRefreshError(true);
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshOverview();
      }
    };

    const timer = window.setInterval(refreshWhenVisible, 5_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshOverview]);

  const cards = useMemo(
    () => [
      {
        href: "/cms/users",
        label: "Students",
        value: overview.users.students,
        description: "Active student accounts",
        detail: `${overview.users.registrationsLast24Hours} new in the last 24 h · ${overview.users.registrationsLast7Days} in 7 days`,
      },
      {
        href: "/cms/users",
        label: "Accounts",
        value: overview.users.accounts,
        description: "All non-archived accounts",
        detail: `${overview.users.teachers} active teachers`,
      },
      {
        href: "/cms/courses",
        label: "Courses",
        value: overview.courses.total,
        description: "Canonical course records",
        detail: `${overview.courses.published} published · ${overview.courses.drafts} drafts · ${overview.courses.scheduled} scheduled`,
      },
      {
        href: "/admin/billing/orders",
        label: "Confirmed payments",
        value: overview.payments.confirmed,
        description: "Provider-confirmed payment records",
        detail: overview.payments.failed
          ? `${overview.payments.failed} failed payments need review`
          : "No failed payments recorded",
      },
      {
        href: "/admin/support/tickets",
        label: "Open support",
        value: overview.support.open,
        description: "Tickets currently open or in progress",
        detail: "Use the support queue to reply or assign work",
      },
    ],
    [overview],
  );

  const activityFilters = useMemo(() => {
    const count = (kind?: CmsLiveActivity["kind"]) => overview.recentActivity.filter((activity) => !kind || activity.kind === kind).length;
    return [
      { kind: "ALL" as const, label: "All critical", count: count() },
      { kind: "SECURITY" as const, label: "Security", count: count("SECURITY") },
      { kind: "BILLING" as const, label: "Billing", count: count("BILLING") },
      { kind: "SUPPORT" as const, label: "Support", count: count("SUPPORT") },
    ];
  }, [overview.recentActivity]);

  const visibleActivity = useMemo(
    () => overview.recentActivity.filter((activity) => activityFilter === "ALL" || activity.kind === activityFilter),
    [activityFilter, overview.recentActivity],
  );

  return (
    <>
      <div className={styles.liveToolbar}>
        <p className={styles.liveStatus} aria-live="polite">
          <span className={styles.liveDot} aria-hidden="true" />
          Live data · updated {formatTime(overview.generatedAt)}
          {refreshError ? " · Reconnecting…" : ""}
        </p>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void refreshOverview()}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Updating…" : "Refresh now"}
        </button>
      </div>

      <section className={styles.cards} aria-label="Live platform overview">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className={styles.metricCard}>
            <p>{card.label}</p>
            <strong>{card.value.toLocaleString("en-US")}</strong>
            <span>{card.description}</span>
            <small>{card.detail}</small>
          </Link>
        ))}
      </section>

      <section className={styles.operations} aria-label="CMS quick actions">
        <div>
          <p className={styles.eyebrow}>Content operations</p>
          <h2>Keep a clear publishing path.</h2>
          <p>
            Courses, curriculum placement, assets and public slots use canonical
            records. Draft and scheduled content does not leak into public
            discovery.
          </p>
        </div>
        <div className={styles.operationLinks}>
          <Link href="/cms/courses">Manage courses</Link>
          <Link href="/cms/levels">Review curriculum</Link>
          <Link href="/cms/media">Open media library</Link>
          <Link href="/cms/platform-features">Review platform features</Link>
        </div>
      </section>

      <section className={styles.attention} aria-labelledby="attention-heading">
        <div>
          <p className={styles.eyebrow}>Requires attention</p>
          <h2 id="attention-heading">Use real operational signals.</h2>
          <p>
            Totals combine only like-for-like records. Revenue is deliberately
            not aggregated across currencies here; review confirmed orders for
            currency-specific amounts.
          </p>
        </div>
        <dl>
          <div>
            <dt>Draft courses</dt>
            <dd>{overview.courses.drafts}</dd>
          </div>
          <div>
            <dt>Scheduled courses</dt>
            <dd>{overview.courses.scheduled}</dd>
          </div>
          <div>
            <dt>Active enrolments</dt>
            <dd>{overview.operations.activeEnrollments}</dd>
          </div>
          <div>
            <dt>Reusable media assets</dt>
            <dd>{overview.operations.reusableMediaAssets}</dd>
          </div>
          <div>
            <dt>Structured page slots</dt>
            <dd>{overview.operations.structuredPageSlots}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.activity} aria-labelledby="live-activity-heading">
        <div className={styles.activityIntro}>
          <p className={styles.eyebrow}>Live activity</p>
          <h2 id="live-activity-heading">Latest platform events</h2>
          <p>
            Only high-priority signals appear here. Registrations and learning
            activity stay in the aggregate metrics above, even at large scale.
          </p>
          <div className={styles.activityFilters} role="group" aria-label="Filter critical platform events">
            {activityFilters.map((filter) => (
              <button
                key={filter.kind}
                type="button"
                className={`${styles.activityFilter} ${activityFilter === filter.kind ? styles.activityFilterActive : ""}`}
                aria-pressed={activityFilter === filter.kind}
                onClick={() => setActivityFilter(filter.kind)}
              >
                {filter.label} <span>{filter.count}</span>
              </button>
            ))}
          </div>
        </div>
        {visibleActivity.length ? (
          <ol className={styles.activityList}>
            {visibleActivity.map((activity) => (
              <li key={activity.id} className={styles.activityItem}>
                <span className={`${styles.activityMarker} ${activityClass(activity.kind)}`} aria-hidden="true" />
                <div className={styles.activityContent}>
                  <div className={styles.activityTitleRow}>
                    <strong>{activity.title}</strong>
                    <span className={`${styles.activityType} ${activity.severity === "CRITICAL" ? styles.activityCritical : styles.activityHigh}`}>
                      {activityTypeLabel(activity.type)} · {activity.severity.toLowerCase()}
                    </span>
                  </div>
                  <span className={styles.activityDetail}>{activity.detail}</span>
                </div>
                <time dateTime={activity.occurredAt}>
                  {formatActivityTime(activity.occurredAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.activityEmpty}>No critical {activityFilter === "ALL" ? "platform events" : `${activityFilter.toLowerCase()} events`} need attention right now.</p>
        )}
      </section>

      <section className={styles.safety}>
        <h2>Publication safety</h2>
        <p>
          New courses and copied course structures start as drafts. The CMS
          validates their parent structure before publishing, preserves version
          snapshots, and archives records instead of deleting them when learning
          history may exist.
        </p>
        <Link href="/cms/audit">Open audit history</Link>
      </section>
    </>
  );
}
