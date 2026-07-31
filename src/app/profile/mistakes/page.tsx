import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { listUserMistakes } from "@/modules/courses/services/content.service";

export default async function ProfileMistakesPage() {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?next=/profile/mistakes");
  const mistakes = await listUserMistakes(authenticated.user.id);
  return <main className="mx-auto max-w-5xl px-6 py-12"><h1 className="text-4xl font-bold text-slate-900">My mistakes</h1><p className="mt-3 text-slate-600">Review incorrect answers and return to the relevant lesson.</p>{mistakes.length === 0 ? <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">No mistakes recorded yet.</p> : <div className="mt-8 space-y-4">{mistakes.map((mistake) => <article key={mistake.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="font-semibold text-slate-900">{mistake.exercise?.question ?? "Lesson activity"}</p>{mistake.lesson ? <p className="mt-2 text-sm text-slate-500">{mistake.lesson.module.course.level.code} · {mistake.lesson.module.course.title} · {mistake.lesson.title}</p> : null}{mistake.explanation ? <p className="mt-2 text-slate-600">{mistake.explanation}</p> : null}<p className="mt-3 text-sm text-slate-500">Occurrences: {mistake.occurrenceCount} · Last seen {mistake.lastOccurredAt.toLocaleDateString()}</p>{mistake.lesson ? <Link className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline" href={`/courses/${mistake.lesson.module.course.slug}/lessons/${mistake.lesson.slug}`}>Open lesson →</Link> : null}</article>)}</div>}</main>;
}
