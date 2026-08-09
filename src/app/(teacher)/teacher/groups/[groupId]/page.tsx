import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";
import { prisma } from "@/core/server/prisma";
import { teacherHasAccessToGroup } from "@/modules/teaching/services/teaching.service";
import { GroupMembersPanel } from "@/modules/teaching/components/GroupMembersPanel";

export default async function TeacherGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const guard = await requireRole(["teacher"]); const { groupId } = await params;
  if (!guard.ok || !(await teacherHasAccessToGroup(guard.user.id, groupId))) notFound();
  const group = await prisma.learningGroup.findUnique({ where: { id: groupId }, include: { students: { where: { status: { in: ["ACTIVE", "INVITED", "PAUSED"] } }, include: { student: { select: { name: true, email: true } } } }, courseAssignments: { where: { status: "ACTIVE" }, include: { course: { select: { title: true } } } } } });
  if (!group) notFound();
  return <section className="space-y-6"><Link href="/teacher/groups" className="text-sm font-semibold text-blue-700">← Groups</Link><header><h2 className="mt-3 text-3xl font-bold">{group.name}</h2><p className="mt-2 text-slate-600">{group.description ?? "No description yet."}</p></header><div className="grid gap-4 md:grid-cols-2"><GroupMembersPanel groupId={group.id} initialMembers={group.students.map((member) => ({ id: member.id, name: member.student.name, email: member.student.email, status: member.status }))}/><article className="rounded-xl border bg-white p-5"><h3 className="font-bold">Assigned courses</h3>{group.courseAssignments.length ? <ul className="mt-3 space-y-2">{group.courseAssignments.map((item) => <li key={item.id}>{item.course.title}</li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No courses have been assigned. Use the course assignment API from your course workflow.</p>}</article></div></section>;
}
