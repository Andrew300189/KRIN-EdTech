import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { listUserProgress } from "@/modules/courses/services/content.service";

export default async function ProfileProgressPage() {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?next=/profile/progress");
  const progress = await listUserProgress(authenticated.user.id);
  return <main className="mx-auto max-w-5xl px-6 py-12"><h1 className="text-4xl font-bold text-slate-900">My progress</h1><p className="mt-3 text-slate-600">Your saved lesson completion, score and current position.</p>{progress.length === 0 ? <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">Start a lesson to see your progress here.</p> : <ul className="mt-8 space-y-3">{progress.map((item) => <li key={item.id}><Link href={`/courses/${item.lesson.module.course.slug}/lessons/${item.lesson.slug}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"><span><span className="font-semibold text-slate-900">{item.lesson.title}</span><span className="block text-sm text-slate-600">{item.lesson.module.course.level.code} · {item.lesson.module.course.title}</span><span className="mt-2 block text-sm text-slate-600">{item.completionPercent}% complete · {item.correctAnswers} correct · {item.incorrectAnswers} incorrect · {item.score} points{item.grade ? ` · Grade ${item.grade}/5` : ""}</span></span><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">{item.status === "COMPLETED" ? "Completed" : "In progress"}</span></Link></li>)}</ul>}</main>;
}
