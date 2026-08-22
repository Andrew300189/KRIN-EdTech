import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePlatformOwner } from "@/core/server/platform-owner-guard";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import styles from "@/modules/cms/components/CmsNotifications.module.css";
import { getCmsNotificationDetail } from "@/modules/cms/services/cms-notification-inbox.service";
import { isCmsNotificationCategory } from "@/modules/cms/types/cms-notification-inbox.types";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function CmsNotificationCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const guard = await requirePlatformOwner();
  if (!guard.ok) redirect(guard.status === 401 ? "/login?callbackUrl=/cms/notifications" : "/student");

  const { category: rawCategory } = await params;
  if (!isCmsNotificationCategory(rawCategory)) notFound();
  const notificationDetail = await getCmsNotificationDetail(rawCategory);

  return (
    <CmsPageShell
      compact
      dense
      eyebrow="Platform activity"
      title={notificationDetail.title}
      description={notificationDetail.description}
      actions={<Link href="/cms/notifications" className={styles.backLink}>← All notifications</Link>}
    >
      <div className={styles.detailToolbar}>
        <p className={styles.eventCount}>{notificationDetail.items.length ? `Showing the latest ${notificationDetail.items.length} event${notificationDetail.items.length === 1 ? "" : "s"}.` : "No events have been recorded in this category."}</p>
      </div>
      {notificationDetail.items.length ? <section className={styles.eventList} aria-label={`${notificationDetail.title} event list`}>
        {notificationDetail.items.map((item) => (
          <article key={item.id} className={styles.eventRow}>
            <div className={styles.eventCopy}>
              <h2>{item.title}</h2>
              <p>{item.detail}</p>
            </div>
            <div className={styles.eventMeta}>
              <span className={styles.status}>{item.status}</span>
              <time dateTime={item.occurredAt}>{formatTime(item.occurredAt)}</time>
            </div>
            {item.href ? <Link className={styles.openLink} href={item.href}>Open →</Link> : <span aria-hidden="true" />}
          </article>
        ))}
      </section> : <section className={styles.empty}><h2>Nothing to review</h2><p>New activity of this type will appear here automatically.</p></section>}
    </CmsPageShell>
  );
}
