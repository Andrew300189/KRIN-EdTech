import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { listUserHomework } from "@/modules/courses/services/content.service";

export default async function HomeworkPage() {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login");
  const homework = await listUserHomework(authenticated.user.id);
  return <main className="mx-auto max-w-5xl px-6 py-12"><h1 className="text-4xl font-bold text-slate-900">My homework</h1><p className="mt-3 text-slate-600">Drafts and submitted work from your lessons.</p>{homework.length === 0 ? <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">Homework assigned in lessons will appear here.</p> : <ul className="mt-8 space-y-3">{homework.map((item) => <li key={item.id}><Link href={`/courses/${item.lessonBlock.lesson.module.course.slug}/lessons/${item.lessonBlock.lesson.slug}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"><span><span className="font-semibold text-slate-900">{item.lessonBlock.title ?? "Homework"}</span><span className="block text-sm text-slate-600">{item.lessonBlock.lesson.module.course.level.code} · {item.lessonBlock.lesson.module.course.title} · {item.lessonBlock.lesson.title}</span></span><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">{item.status === "SUBMITTED" ? "Submitted" : "Draft"}{item.grade ? ` · Grade ${item.grade}/5` : ""}</span></Link></li>)}</ul>}</main>;
}
