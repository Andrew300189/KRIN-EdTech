import Link from "next/link";
import { prisma } from "@/core/server/prisma";
import { CmsPageShell } from "@/modules/cms/components/CmsPageShell";
import styles from "./CmsOverview.module.css";

type OverviewCard = {
  href: string;
  label: string;
  value: number;
  description: string;
  detail: string;
};

export default async function CmsEntryPage() {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);

  const [users, registrations, activeEnrollments, paidPayments, failedPayments, courses, publishedCourses, drafts, scheduled, openTickets, media, slots] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: lastWeek } } }),
    prisma.studentCourse.count({ where: { status: "ACTIVE" } }),
    prisma.payment.count({ where: { status: { in: ["PAID", "SUCCEEDED"] } } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.course.count(),
    prisma.course.count({ where: { contentStatus: "PUBLISHED" } }),
    prisma.course.count({ where: { contentStatus: "DRAFT" } }),
    prisma.course.count({ where: { contentStatus: "SCHEDULED" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.cmsMediaAsset.count({ where: { isArchived: false } }),
    prisma.cmsContentSlot.count({ where: { contentStatus: { not: "ARCHIVED" } } }),
  ]);

  const cards: OverviewCard[] = [
    { href: "/cms/users", label: "Users", value: users, description: "Registered accounts", detail: `${registrations} new in the last 7 days` },
    { href: "/cms/courses", label: "Courses", value: courses, description: "Canonical course records", detail: `${publishedCourses} published · ${drafts} drafts · ${scheduled} scheduled` },
    { href: "/admin/billing/orders", label: "Confirmed payments", value: paidPayments, description: "Provider-confirmed payment records", detail: failedPayments ? `${failedPayments} failed payments need review` : "No failed payments recorded" },
    { href: "/admin/support/tickets", label: "Open support", value: openTickets, description: "Tickets currently open or in progress", detail: "Use the support queue to reply or assign work" },
  ];

  return (
    <CmsPageShell
      eyebrow="Platform management"
      title="Content CMS"
      description="Manage the live curriculum without editing code. Publication, archive and preview operations are protected on the server and recorded in the audit trail."
      actions={<Link href="/cms/courses/new" className={styles.primaryAction}>Create course</Link>}
    >
      <section className={styles.cards} aria-label="Platform overview">
        {cards.map((card) => <Link key={card.href} href={card.href} className={styles.metricCard}><p>{card.label}</p><strong>{card.value}</strong><span>{card.description}</span><small>{card.detail}</small></Link>)}
      </section>

      <section className={styles.operations} aria-label="CMS quick actions">
        <div>
          <p className={styles.eyebrow}>Content operations</p>
          <h2>Keep a clear publishing path.</h2>
          <p>Courses, curriculum placement, assets and public slots use canonical records. Draft and scheduled content does not leak into public discovery.</p>
        </div>
        <div className={styles.operationLinks}>
          <Link href="/cms/courses">Manage courses</Link>
          <Link href="/cms/levels">Review curriculum</Link>
          <Link href="/cms/media">Open media library</Link>
          <Link href="/cms/platform-features">Review platform features</Link>
        </div>
      </section>

      <section className={styles.attention} aria-labelledby="attention-heading">
        <div><p className={styles.eyebrow}>Requires attention</p><h2 id="attention-heading">Use real operational signals.</h2><p>Totals combine only like-for-like records. Revenue is deliberately not aggregated across currencies here; review confirmed orders for the currency-specific amounts.</p></div>
        <dl>
          <div><dt>Draft courses</dt><dd>{drafts}</dd></div>
          <div><dt>Scheduled courses</dt><dd>{scheduled}</dd></div>
          <div><dt>Active enrolments</dt><dd>{activeEnrollments}</dd></div>
          <div><dt>Reusable media assets</dt><dd>{media}</dd></div>
          <div><dt>Structured page slots</dt><dd>{slots}</dd></div>
        </dl>
      </section>

      <section className={styles.safety}>
        <h2>Publication safety</h2>
        <p>New courses and copied course structures start as drafts. The CMS validates their parent structure before publishing, preserves version snapshots, and archives records instead of deleting them when learning history may exist.</p>
        <Link href="/cms/audit">Open audit history</Link>
      </section>
    </CmsPageShell>
  );
}
