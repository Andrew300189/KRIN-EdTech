import Link from "next/link";
import { requireRole } from "@/core/server/role-guard";
import { CmsManagedSlotBanner } from "@/modules/cms/components/CmsManagedSlotBanner";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { listTeacherGroups } from "@/modules/teaching/services/teaching.service";
import styles from "./TeacherHome.module.css";

export default async function TeacherHomePage() {
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) return null;

  const [groups, managedSlot] = await Promise.all([
    listTeacherGroups(guard.user.id),
    getPublishedCmsContentSlot("teacher.overview"),
  ]);
  const students = groups.reduce((total, group) => total + group._count.students, 0);
  const statistics = [
    ["Active groups", groups.filter((group) => group.status === "ACTIVE").length],
    ["Students", students],
    ["Awaiting review", 0],
    ["Average progress", "0%"],
  ];

  return (
    <section className={styles.page}>
      <CmsManagedSlotBanner slot={managedSlot} />
      <header className={styles.heading}><p>Teaching overview</p><h2>Your classroom at a glance</h2><span>Keep groups, learners and review work organised from one workspace.</span></header>
      <section className={styles.statistics} aria-label="Teaching overview">
        {statistics.map(([label, value]) => <article key={String(label)}><p>{label}</p><strong>{value}</strong></article>)}
      </section>
      {groups.length === 0 ? (
        <section className={styles.emptyState}>
          <h3>You do not have any groups yet</h3>
          <p>Create your first group, then add registered learners.</p>
          <Link href="/teacher/groups">Create a group</Link>
        </section>
      ) : (
        <section className={styles.nextStep}>
          <div><p>Your next step</p><h3>Review your active groups</h3><span>Open a group to see learner progress and plan assignments.</span></div>
          <Link href="/teacher/groups">Open groups</Link>
        </section>
      )}
    </section>
  );
}
