import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { prisma } from "@/core/server/prisma";
import { defaultContentLocale, isTranslatableContentLocale, normalizeContentLocale } from "@/modules/courses/localization/content-locales";
import { getPublishedLessonBySlug } from "@/modules/courses/services/content.service";
import { canAccessLesson } from "@/modules/courses/services/lesson-access.service";
import { LessonPlayer } from "@/modules/lessons/components/LessonPlayer";
import { createLessonWarmUp } from "@/modules/vocabulary/services/vocabulary.service";
import accessStyles from "@/modules/courses/components/LessonAccessGate.module.css";

function AccessUpsell({ reason, returnTo, courseHref, locale }: { reason: string; returnTo: string; courseHref: string; locale: "ru" | "uk" }) {
  const signedOut = reason === "AUTH_REQUIRED";
  const moduleLocked = reason === "SEQUENCE_LOCKED";
  const lessonLocked = reason === "PREREQUISITE_LOCKED";
  const ukrainian = locale === "uk";
  const copy = ukrainian
    ? {
      title: signedOut ? "Увійдіть, щоб продовжити" : moduleLocked ? "Спершу завершіть попередній модуль" : lessonLocked ? "Спершу завершіть попередній урок" : "Потрібен доступ Premium",
      message: signedOut ? "Увійдіть, щоб відкрити цей урок і зберігати свій прогрес." : moduleLocked ? "Цей модуль відкриється після завершення попереднього модуля." : lessonLocked ? "Цей урок відкриється автоматично, щойно ви завершите попередній урок." : "Цей урок доступний з активним планом Premium або Corporate.",
      eyebrow: signedOut ? "ВАШЕ НАВЧАННЯ ЧЕКАЄ" : "УРОК ЩЕ НЕ ВІДКРИТО",
      tip: "Завершіть попередній урок і поверніться сюди — доступ оновиться автоматично.",
      action: signedOut ? "Увійти" : moduleLocked || lessonLocked ? "До курсу" : "Переглянути плани",
      dashboard: "Відкрити кабінет",
    }
    : {
      title: signedOut ? "Войдите, чтобы продолжить" : moduleLocked ? "Сначала завершите предыдущий модуль" : lessonLocked ? "Сначала завершите предыдущий урок" : "Нужен доступ Premium",
      message: signedOut ? "Войдите, чтобы открыть этот урок и сохранять свой прогресс." : moduleLocked ? "Этот модуль откроется после завершения предыдущего модуля." : lessonLocked ? "Этот урок откроется автоматически, как только вы завершите предыдущий урок." : "Этот урок доступен при активном плане Premium или Corporate.",
      eyebrow: signedOut ? "ВАШЕ ОБУЧЕНИЕ ЖДЁТ" : "УРОК ЕЩЁ НЕ ОТКРЫТ",
      tip: "Завершите предыдущий урок и вернитесь сюда — доступ обновится автоматически.",
      action: signedOut ? "Войти" : moduleLocked || lessonLocked ? "К курсу" : "Посмотреть планы",
      dashboard: "Открыть кабинет",
    };
  const backToCourse = moduleLocked || lessonLocked;
  const href = signedOut ? `/login?next=${encodeURIComponent(returnTo)}` : backToCourse ? courseHref : "/dashboard/billing";

  return (
    <main className={accessStyles.page}>
      <section className={accessStyles.card} aria-labelledby="lesson-access-title">
        <div className={accessStyles.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><path d="M7.5 10V7.75a4.5 4.5 0 0 1 9 0V10M6.75 10h10.5c.69 0 1.25.56 1.25 1.25v7.5c0 .69-.56 1.25-1.25 1.25H6.75c-.69 0-1.25-.56-1.25-1.25v-7.5c0-.69.56-1.25 1.25-1.25Z" /></svg>
        </div>
        <div className={accessStyles.content}>
          <p className={accessStyles.eyebrow}>{copy.eyebrow}</p>
          <h1 id="lesson-access-title">{copy.title}</h1>
          <p className={accessStyles.message}>{copy.message}</p>
          {backToCourse ? <p className={accessStyles.tip}><span aria-hidden="true">↳</span> {copy.tip}</p> : null}
          <div className={accessStyles.actions}>
            <Link href={href} className={accessStyles.primaryAction}>{copy.action} <span aria-hidden="true">→</span></Link>
            {backToCourse ? <Link href="/student" className={accessStyles.secondaryAction}>{copy.dashboard}</Link> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function LocalizedLessonPage({ params }: { params: Promise<{ locale: string; slug: string; lessonSlug: string }> }) {
  const { locale: inputLocale, slug, lessonSlug } = await params;
  const locale = normalizeContentLocale(inputLocale);
  if (!isTranslatableContentLocale(locale)) notFound();
  const lesson = await getPublishedLessonBySlug(slug, lessonSlug, locale);
  if (!lesson || lesson.contentLocale !== locale || locale === defaultContentLocale) notFound();
  const authenticated = await requireAuth();
  const access = await canAccessLesson(authenticated?.user.id ?? null, lesson.id);
  const courseHref = `/${locale}/courses/${lesson.module.course.localizedSlug}`;
  const lessonHref = `${courseHref}/lessons/${lesson.localizedSlug}`;
  if (!access.allowed) return <AccessUpsell reason={access.reason} returnTo={lessonHref} courseHref={courseHref} locale={locale === "uk" ? "uk" : "ru"} />;
  const [warmUp, warmUpConfiguration] = authenticated ? await Promise.all([
    createLessonWarmUp(authenticated.user.id, lesson.id),
    prisma.warmUpConfiguration.findUnique({ where: { id: "default" }, select: { isRequired: true } }),
  ]) : [null, null];
  const firstCourseLessonId = lesson.module.course.modules.flatMap((courseModule) => courseModule.lessons).at(0)?.id;
  const isFirstCourseLesson = Boolean(authenticated && lesson.module.course.accessPlan !== "FREE" && firstCourseLessonId === lesson.id);
  const courseLessons = lesson.module.course.modules.flatMap((courseModule) => courseModule.lessons);
  return <LessonPlayer lessonId={lesson.id} courseSlug={lesson.module.course.slug} moduleTitle={lesson.module.title} title={lesson.title} estimatedDuration={lesson.estimatedDuration} objectives={lesson.learningObjectives} blocks={lesson.blocks} lessons={courseLessons} currentSlug={lesson.localizedSlug} canSaveProgress={Boolean(authenticated)} vocabulary={lesson.vocabulary} warmUpSessionId={warmUp?.id} warmUpRequired={warmUpConfiguration?.isRequired ?? false} autoUnlockNextLesson={lesson.autoUnlockNextLesson} isFirstCourseLesson={isFirstCourseLesson} returnHref={courseHref} lessonHrefPrefix={`${courseHref}/lessons`} contentLocale={locale === "uk" || locale === "ru" ? locale : undefined} routeLocale={locale === "uk" || locale === "ru" ? locale : undefined} />;
}
