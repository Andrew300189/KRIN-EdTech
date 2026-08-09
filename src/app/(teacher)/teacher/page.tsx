import Link from "next/link";
import { requireRole } from "@/core/server/role-guard";
import { CmsManagedSlotBanner } from "@/modules/cms/components/CmsManagedSlotBanner";
import { getPublishedCmsContentSlot } from "@/modules/cms/services/content-slot.service";
import { listTeacherGroups } from "@/modules/teaching/services/teaching.service";

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
  return <section className="space-y-6"><CmsManagedSlotBanner slot={managedSlot} /><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Teaching overview</p><h2 className="mt-2 text-3xl font-bold">Your classroom at a glance</h2></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statistics.map(([label, value]) => <article key={String(label)} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>)}</div>{groups.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-8 text-center"><h3 className="text-xl font-bold">You do not have any groups yet</h3><p className="mt-2 text-slate-600">Create your first group, then add registered learners.</p><Link href="/teacher/groups" className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Create a group</Link></div> : null}</section>;
}
