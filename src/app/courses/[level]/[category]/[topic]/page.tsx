import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { getPublishedCurriculumTopicPage, getPublishedLessonBySlug, getPublishedModuleById } from "@/modules/courses/services/content.service";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import { LessonPlayer } from "@/modules/lessons/components/LessonPlayer";
import { prisma } from "@/core/server/prisma";
import { getMistakeReviewLesson } from "@/modules/courses/services/mistake-review.service";
import { createLessonWarmUp } from "@/modules/vocabulary/services/vocabulary.service";
import { PublicCurriculumLayout } from "@/modules/courses/components/PublicCurriculumLayout";
import curriculumStyles from "@/modules/courses/components/PublicCurriculumCards.module.css";
import { PublicCurriculumCourseCards } from "@/modules/courses/components/PublicCurriculumCourseCards";

const CEFR_LEVEL_CODES = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const isCefrLevelCode = (value: string) => CEFR_LEVEL_CODES.has(value.toUpperCase());

export async function generateMetadata({ params }: { params: Promise<{ level: string; category: string; topic: string }> }): Promise<Metadata> {
  const { level: levelSlug, category, topic: topicSlug } = await params;
  const page = await getPublishedCurriculumTopicPage(levelSlug, category, topicSlug);
  if (isCefrLevelCode(levelSlug) && !page) notFound();
  const level = page ? { level: page.level.code } : null;
  const section = page?.breadcrumbs[0] ?? null;
  const topic = page ? { ...page.node, example: undefined as string | undefined } : null;
  if (!level || !section || !topic) return { title: "Lesson" };

  const canonical = `/courses/${level.level.toLowerCase()}/${section.slug}/${topic.slug}`;
  const description = `${topic.title} in the ${level.level} ${section.title} curriculum.${topic.example ? ` Example: ${topic.example}` : ""}`;
  return { title: `${topic.title} — ${level.level} English`, description, alternates: { canonical }, openGraph: { title: `${topic.title} — ${level.level} English`, description, url: canonical } };
}

function AccessUpsell({ reason, returnTo, courseHref }: { reason: "AUTH_REQUIRED" | "PREMIUM_REQUIRED" | string; returnTo: string; courseHref: string }) {
  const signedOut = reason === "AUTH_REQUIRED";
  const moduleLocked = reason === "SEQUENCE_LOCKED";
  const lessonLocked = reason === "PREREQUISITE_LOCKED";
  const title = signedOut
    ? "Sign in to continue"
    : moduleLocked
      ? "Complete the previous module first"
      : lessonLocked
        ? "Complete the prerequisite lesson first"
        : "Premium access required";
  const message = signedOut
    ? "Sign in to open this lesson and save your progress."
    : moduleLocked
      ? "This module is locked until its prerequisite module reaches the required completion percentage."
      : lessonLocked
        ? "This lesson opens automatically after its prerequisite lesson reaches the required completion percentage."
        : "This lesson is locked until Premium or Corporate access is active.";
  const backToCourse = moduleLocked || lessonLocked;
  return <main className="mx-auto max-w-3xl px-6 py-12"><section className="rounded-2xl border border-amber-200 bg-amber-50 p-7"><h1 className="text-3xl font-bold text-amber-950">{title}</h1><p className="mt-3 text-amber-900">{message}</p><Link href={signedOut ? `/login?next=${encodeURIComponent(returnTo)}` : backToCourse ? courseHref : "/dashboard/billing"} className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">{signedOut ? "Sign in" : backToCourse ? "Back to course" : "View plans"}</Link></section></main>;
}

export default async function ModuleOrLessonPage({ params, searchParams }: {
  params: Promise<{ level: string; category: string; topic: string }>;
  searchParams: Promise<{
    reviewMistake?: string | string[];
    reviewPosition?: string | string[];
    reviewRun?: string | string[];
    reviewExercise?: string | string[];
  }>;
}) {
  // This route intentionally serves both the typed CEFR hierarchy and the
  // public course lesson URL: /courses/[courseSlug]/lessons/[lessonSlug].
  const { level: courseSlug, category, topic } = await params;
  const curriculumPage = isCefrLevelCode(courseSlug) ? await getPublishedCurriculumTopicPage(courseSlug, category, topic) : null;
  const curriculumLevel = curriculumPage ? { level: curriculumPage.level.code, title: curriculumPage.level.title, description: curriculumPage.level.description } : null;

  // A typed CEFR topic is public information, while the legacy module and
  // lesson routes below remain entitlement-protected.  Keeping this branch
  // first prevents a valid curriculum topic from being interpreted as a course
  // identifier and prevents any cross-level fallback.
  if (curriculumLevel) {
    const section = curriculumPage?.breadcrumbs[0] ?? null;
    const curriculumTopic = curriculumPage ? { ...curriculumPage.node, example: undefined as string | undefined } : null;
    if (!section || !curriculumTopic) notFound();

    const levelHref = `/courses/${curriculumLevel.level.toLowerCase()}`;
    const sectionHref = `${levelHref}/${section.slug}`;
    return (
      <PublicCurriculumLayout
        breadcrumbs={[
          { label: "Courses", href: "/courses" },
          { label: curriculumLevel.level, href: levelHref },
          { label: section.title, href: sectionHref },
          { label: curriculumTopic.title },
        ]}
        eyebrow={`${curriculumLevel.level} · ${section.title}`}
        title={curriculumTopic.title}
        description={curriculumTopic.description ?? "This topic belongs only to the selected CEFR level and section."}
      >
        <article className={curriculumStyles.detail}>
          <h2>Topic overview</h2>
          <p>Use this page to understand the focus before starting a linked course or lesson. Learning activity and progress are available after sign-in.</p>
          {curriculumTopic.example ? <section className={curriculumStyles.example} aria-label="Example"><strong>Example</strong><p>{curriculumTopic.example}</p></section> : null}
        </article>
        {curriculumPage && curriculumPage.childNodes.length ? <section className={curriculumStyles.grid} aria-label={`${curriculumTopic.title} subtopics`}>{curriculumPage.childNodes.map((subtopic) => <Link key={subtopic.id} href={`${sectionHref}/${curriculumTopic.slug}/${subtopic.slug}`} className={curriculumStyles.card}><p className={curriculumStyles.meta}>{curriculumLevel.level} subtopic</p><h2>{subtopic.title}</h2>{subtopic.description ? <p className={curriculumStyles.description}>{subtopic.description}</p> : null}<span className={curriculumStyles.cta}>Open subtopic <span aria-hidden="true">→</span></span></Link>)}</section> : null}
        {curriculumPage ? <PublicCurriculumCourseCards courses={curriculumPage.courses} /> : null}
      </PublicCurriculumLayout>
    );
  }

  if (isCefrLevelCode(courseSlug)) notFound();

  const authenticated = await requireAuth();

  if (category === "modules") {
    const courseModule = await getPublishedModuleById(courseSlug, topic);
    if (!courseModule) notFound();
    const access = await Promise.all(courseModule.lessons.map(async (lesson) => [lesson.id, await canAccessLesson(authenticated?.user.id ?? null, lesson.id)] as const));
    const accessByLessonId = new Map(access);
    return <main className="mx-auto max-w-4xl px-6 py-12"><Link href={`/courses/${courseModule.course.slug}`} className="text-sm font-semibold text-blue-700 hover:underline">← {courseModule.course.title}</Link><h1 className="mt-5 text-4xl font-bold text-slate-900">{courseModule.title}</h1>{courseModule.description ? <p className="mt-3 text-slate-600">{courseModule.description}</p> : null}<ol className="mt-8 space-y-3">{courseModule.lessons.map((lesson) => { const lessonAccess = accessByLessonId.get(lesson.id); const lockLabel = lessonAccess?.reason === "AUTH_REQUIRED" ? "Sign in" : lessonAccess?.reason === "SEQUENCE_LOCKED" ? "Complete previous module" : lessonAccess?.reason === "PREREQUISITE_LOCKED" ? "Complete prerequisite" : "Premium"; return <li key={lesson.id}>{lessonAccess?.allowed ? <Link href={`/courses/${courseModule.course.slug}/lessons/${lesson.slug}`} className="flex min-h-14 justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-slate-900 shadow-sm hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"><span>{lesson.order}. {lesson.title}</span><span className="text-sm text-slate-500">{lesson.estimatedDuration || "—"} min</span></Link> : <div className="flex min-h-14 justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-500"><span>{lesson.order}. {lesson.title}</span><span className="text-sm font-semibold">🔒 {lockLabel}</span></div>}</li>; })}</ol></main>;
  }

  if (category !== "lessons") notFound();
  const lesson = await getPublishedLessonBySlug(courseSlug, topic);
  if (!lesson) notFound();
  const lessonSearchParams = await searchParams;
  const reviewRunId = typeof lessonSearchParams.reviewRun === "string" ? lessonSearchParams.reviewRun : null;
  const requestedReviewExerciseId = typeof lessonSearchParams.reviewExercise === "string" ? lessonSearchParams.reviewExercise : null;
  const reviewRun = reviewRunId && authenticated
    ? await getMistakeReviewLesson(authenticated.user.id, reviewRunId, courseSlug, topic)
    : null;
  const access = await canAccessLesson(authenticated?.user.id ?? null, lesson.id);
  // A verified review run may bypass only curriculum sequence locks. Its
  // server-owned items prove that this learner previously reached the task;
  // premium entitlement and authentication are never bypassed.
  const canOpenForReview = Boolean(reviewRun && (access.reason === "SEQUENCE_LOCKED" || access.reason === "PREREQUISITE_LOCKED"));
  if (!access.allowed && !canOpenForReview) return <AccessUpsell reason={access.reason} returnTo={`/courses/${courseSlug}/lessons/${topic}`} courseHref={`/courses/${courseSlug}`} />;
  const [warmUp, warmUpConfiguration] = authenticated ? await Promise.all([
    createLessonWarmUp(authenticated.user.id, lesson.id),
    prisma.warmUpConfiguration.findUnique({ where: { id: "default" }, select: { isRequired: true } }),
  ]) : [null, null];
  const firstCourseLessonId = lesson.module.course.modules.flatMap((courseModule) => courseModule.lessons).at(0)?.id;
  const isFirstCourseLesson = Boolean(authenticated && lesson.module.course.accessPlan !== "FREE" && firstCourseLessonId === lesson.id);
  const reviewMistakeId = typeof lessonSearchParams.reviewMistake === "string" ? lessonSearchParams.reviewMistake : null;
  const reviewPositionRaw = typeof lessonSearchParams.reviewPosition === "string"
    ? lessonSearchParams.reviewPosition
    : null;
  const reviewPosition = reviewPositionRaw && /^(?:0|[1-9]\d*)$/.test(reviewPositionRaw)
    ? Number(reviewPositionRaw)
    : null;
  const safeReviewPosition = reviewPosition !== null && Number.isSafeInteger(reviewPosition)
    ? reviewPosition
    : null;
  const reviewMistake = reviewMistakeId && authenticated ? await prisma.userMistake.findFirst({
    where: { id: reviewMistakeId, userId: authenticated.user.id, lessonId: lesson.id, resolvedAt: null },
    select: { id: true, exerciseId: true },
  }) : null;
  const reviewReturnHref = reviewMistake
    ? `/student/mistakes?resolved=${encodeURIComponent(reviewMistake.id)}${safeReviewPosition !== null ? `&position=${safeReviewPosition}` : ""}`
    : undefined;
  const reviewBlocks = reviewRun ? lesson.blocks
    .map((block) => ({ ...block, exercises: block.exercises.filter((exercise) => reviewRun.exerciseIds.includes(exercise.id)) }))
    .filter((block) => block.exercises.length > 0)
    : lesson.blocks;
  if (reviewRun && !reviewBlocks.length) notFound();
  const initialReviewExerciseId = reviewRun && requestedReviewExerciseId && reviewRun.exerciseIds.includes(requestedReviewExerciseId)
    ? requestedReviewExerciseId
    : reviewRun?.exerciseIds[0];
  return <LessonPlayer lessonId={lesson.id} courseSlug={lesson.module.course.slug} moduleTitle={lesson.module.title} title={lesson.title} estimatedDuration={lesson.estimatedDuration} objectives={lesson.learningObjectives} blocks={reviewBlocks} lessons={lesson.module.lessons} currentSlug={lesson.slug} canSaveProgress={Boolean(authenticated)} vocabulary={reviewRun ? [] : lesson.vocabulary} warmUpSessionId={reviewRun ? null : warmUp?.id} warmUpRequired={reviewRun ? false : (warmUpConfiguration?.isRequired ?? false)} autoUnlockNextLesson={reviewMistake || reviewRun ? false : lesson.autoUnlockNextLesson} isFirstCourseLesson={isFirstCourseLesson} returnHref={reviewReturnHref} reviewMistake={reviewMistake?.exerciseId ? { exerciseId: reviewMistake.exerciseId, returnHref: reviewReturnHref! } : undefined} reviewSession={reviewRun ? { runId: reviewRun.runId, exerciseIds: reviewRun.exerciseIds, initialMistakeCount: reviewRun.initialMistakeCount, initialExerciseId: initialReviewExerciseId } : undefined} />;
}
