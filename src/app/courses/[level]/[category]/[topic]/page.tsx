import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { getPublishedLessonBySlug, getPublishedModuleById } from "@/modules/courses/services/content.service";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import { LessonPlayer } from "@/modules/lessons/components/LessonPlayer";
import { prisma } from "@/core/server/prisma";
import { createLessonWarmUp } from "@/modules/vocabulary/services/vocabulary.service";

function AccessUpsell({ reason }: { reason: "AUTH_REQUIRED" | "PREMIUM_REQUIRED" | string }) {
  const signedOut = reason === "AUTH_REQUIRED";
  return <main className="mx-auto max-w-3xl px-6 py-12"><section className="rounded-2xl border border-amber-200 bg-amber-50 p-7"><h1 className="text-3xl font-bold text-amber-950">{signedOut ? "Sign in to continue" : "Premium access required"}</h1><p className="mt-3 text-amber-900">{signedOut ? "Sign in to open this lesson and save your progress." : "This lesson is locked until Premium or Corporate access is active."}</p><Link href={signedOut ? "/login" : "/dashboard/billing"} className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">{signedOut ? "Sign in" : "View plans"}</Link></section></main>;
}

export default async function ModuleOrLessonPage({ params }: { params: Promise<{ level: string; category: string; topic: string }> }) {
  const { level: courseSlug, category, topic } = await params;
  const authenticated = await requireAuth();

  if (category === "modules") {
    const courseModule = await getPublishedModuleById(courseSlug, topic);
    if (!courseModule) notFound();
    const access = await Promise.all(courseModule.lessons.map(async (lesson) => [lesson.id, await canAccessLesson(authenticated?.user.id ?? null, lesson.id)] as const));
    const accessByLessonId = new Map(access);
    return <main className="mx-auto max-w-4xl px-6 py-12"><Link href={`/courses/${courseModule.course.slug}`} className="text-sm font-semibold text-blue-700 hover:underline">← {courseModule.course.title}</Link><h1 className="mt-5 text-4xl font-bold text-slate-900">{courseModule.title}</h1>{courseModule.description ? <p className="mt-3 text-slate-600">{courseModule.description}</p> : null}<ol className="mt-8 space-y-3">{courseModule.lessons.map((lesson) => { const lessonAccess = accessByLessonId.get(lesson.id); return <li key={lesson.id}>{lessonAccess?.allowed ? <Link href={`/courses/${courseModule.course.slug}/lessons/${lesson.slug}`} className="flex min-h-14 justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-slate-900 shadow-sm hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"><span>{lesson.order}. {lesson.title}</span><span className="text-sm text-slate-500">{lesson.estimatedDuration || "—"} min</span></Link> : <div className="flex min-h-14 justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-500"><span>{lesson.order}. {lesson.title}</span><span className="text-sm font-semibold">🔒 {lessonAccess?.reason === "AUTH_REQUIRED" ? "Sign in" : "Premium"}</span></div>}</li>; })}</ol></main>;
  }

  if (category !== "lessons") notFound();
  const lesson = await getPublishedLessonBySlug(courseSlug, topic);
  if (!lesson) notFound();
  const access = await canAccessLesson(authenticated?.user.id ?? null, lesson.id);
  if (!access.allowed) return <AccessUpsell reason={access.reason} />;
  const [warmUp, warmUpConfiguration] = authenticated ? await Promise.all([
    createLessonWarmUp(authenticated.user.id, lesson.id),
    prisma.warmUpConfiguration.findUnique({ where: { id: "default" }, select: { isRequired: true } }),
  ]) : [null, null];
  return <LessonPlayer lessonId={lesson.id} courseSlug={lesson.module.course.slug} moduleTitle={lesson.module.title} title={lesson.title} estimatedDuration={lesson.estimatedDuration} objectives={lesson.learningObjectives} blocks={lesson.blocks} lessons={lesson.module.lessons} currentSlug={lesson.slug} canSaveProgress={Boolean(authenticated)} vocabulary={lesson.vocabulary} warmUpSessionId={warmUp?.id} warmUpRequired={warmUpConfiguration?.isRequired ?? false} />;
}
