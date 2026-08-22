import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { prisma } from "@/core/server/prisma";
import { defaultContentLocale, isTranslatableContentLocale, normalizeContentLocale } from "@/modules/courses/localization/content-locales";
import { getPublishedLessonBySlug } from "@/modules/courses/services/content.service";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import { LessonPlayer } from "@/modules/lessons/components/LessonPlayer";
import { createLessonWarmUp } from "@/modules/vocabulary/services/vocabulary.service";

function AccessUpsell({ reason, returnTo, courseHref }: { reason: string; returnTo: string; courseHref: string }) {
  const signedOut = reason === "AUTH_REQUIRED";
  return <main className="mx-auto max-w-3xl px-6 py-12"><section className="rounded-3xl border border-amber-200 bg-amber-50 p-7"><h1 className="text-3xl font-bold text-amber-950">{signedOut ? "Sign in to continue" : "Premium access required"}</h1><p className="mt-3 text-amber-900">{signedOut ? "Sign in to open this lesson and save your progress." : "This lesson is locked until your eligible access is active."}</p><Link href={signedOut ? `/login?next=${encodeURIComponent(returnTo)}` : courseHref} className="mt-5 inline-flex rounded-full bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-700">{signedOut ? "Sign in" : "Back to course"}</Link></section></main>;
}

export default async function LocalizedLessonPage({ params }: { params: Promise<{ locale: string; slug: string; lessonSlug: string }> }) {
  const { locale: inputLocale, slug, lessonSlug } = await params;
  const locale = normalizeContentLocale(inputLocale);
  if (!isTranslatableContentLocale(locale)) notFound();
  const lesson = await getPublishedLessonBySlug(slug, lessonSlug, locale);
  if (!lesson || lesson.contentLocale === defaultContentLocale || locale === defaultContentLocale) notFound();
  const authenticated = await requireAuth();
  const access = await canAccessLesson(authenticated?.user.id ?? null, lesson.id);
  const courseHref = `/${locale}/courses/${lesson.module.course.localizedSlug}`;
  const lessonHref = `${courseHref}/lessons/${lesson.localizedSlug}`;
  if (!access.allowed) return <AccessUpsell reason={access.reason} returnTo={lessonHref} courseHref={courseHref} />;
  const [warmUp, warmUpConfiguration] = authenticated ? await Promise.all([
    createLessonWarmUp(authenticated.user.id, lesson.id),
    prisma.warmUpConfiguration.findUnique({ where: { id: "default" }, select: { isRequired: true } }),
  ]) : [null, null];
  const firstCourseLessonId = lesson.module.course.modules.flatMap((courseModule) => courseModule.lessons).at(0)?.id;
  const isFirstCourseLesson = Boolean(authenticated && lesson.module.course.accessPlan !== "FREE" && firstCourseLessonId === lesson.id);
  return <LessonPlayer lessonId={lesson.id} courseSlug={lesson.module.course.slug} moduleTitle={lesson.module.title} title={lesson.title} estimatedDuration={lesson.estimatedDuration} objectives={lesson.learningObjectives} blocks={lesson.blocks} lessons={lesson.module.lessons} currentSlug={lesson.localizedSlug} canSaveProgress={Boolean(authenticated)} vocabulary={lesson.vocabulary} warmUpSessionId={warmUp?.id} warmUpRequired={warmUpConfiguration?.isRequired ?? false} autoUnlockNextLesson={lesson.autoUnlockNextLesson} isFirstCourseLesson={isFirstCourseLesson} returnHref={courseHref} lessonHrefPrefix={`${courseHref}/lessons`} />;
}
