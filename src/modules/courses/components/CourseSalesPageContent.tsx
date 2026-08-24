import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/app/courses/course-view.module.css";
import { requireAuth } from "@/core/server/session";
import { hasCourseEntitlement } from "@/modules/payments/services/entitlement.service";
import { listCourseLessonAccess } from "@/modules/courses/services/lesson-access.service";
import { getPublishedCourseBySlug, getPublishedLevelWithCourses, listLessonProgressByLessonIds } from "@/modules/courses/services/content.service";
import { CoursePurchasePanel } from "@/modules/courses/components/CoursePurchasePanel";
import { CourseHeroActions } from "@/modules/courses/components/CourseHeroActions";
import { FunnelEventReporter } from "@/modules/analytics/components/FunnelEventReporter";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import { LessonXpBadge } from "@/modules/motivation/components/LessonXpBadge";
import { LessonCardAnimation } from "@/modules/courses/components/LessonCardAnimation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const courseTypeLabels = { STANDARD: "Standard course", INTENSIVE: "Intensive course", EXAM_PREP: "Exam preparation", PROFESSIONAL: "Professional English", SPECIALIZATION: "Specialisation", SKILL: "Skill course" } as const;

function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function accessLabel(plan: string) { return plan === "FREE" ? "Free access" : plan === "CORPORATE" ? "Corporate access" : "Subscription access"; }
function resultDescription(outcomes: string[], fallback: string, language: string) {
  const visibleOutcomes = outcomes
    .slice(0, 3)
    .map((item) => item.trim().replace(/[.!…]+$/u, ""))
    .filter(Boolean);
  if (!visibleOutcomes.length) return fallback;
  const lowerCaseInitial = (value: string) => value.slice(0, 1).toLocaleLowerCase(language) + value.slice(1);
  const list = visibleOutcomes.map(lowerCaseInitial).join(", ");
  return language.toLowerCase().startsWith("ru")
    ? `После курса вы сможете ${list} — без угадывания и путаницы в базовых ситуациях.`
    : `After this course, you will be able to ${list} without guessing in everyday situations.`;
}

export async function CourseSalesPageContent({ params, searchParams, locale }: { params: Promise<{ level: string }>; searchParams: SearchParams; locale?: string }) {
  const [{ level: slug }, query] = await Promise.all([params, searchParams]);
  const dbLevel = await getPublishedLevelWithCourses(slug);
  if (dbLevel) return <main className={styles.page}><PublicSiteHeader /><div className={styles.shell}>
    <Link href="/courses" className={styles.back}>← All courses</Link>
    <header className={styles.levelHeader}><p className={styles.eyebrow}>CEFR level</p><h1>{dbLevel.code} — {dbLevel.title}</h1>{dbLevel.description ? <p>{dbLevel.description}</p> : null}</header>
    {dbLevel.courses.length ? <section className={styles.courseGrid} aria-label={`${dbLevel.code} courses`}>{dbLevel.courses.map((course) => <Link key={course.slug} href={`/courses/${course.slug}`} className={styles.courseCard}><div className={styles.chips}><span>{course.category.title}</span><span>{accessLabel(course.accessPlan)}</span></div><h2>{course.title}</h2><p>{course.shortDescription}</p><p className={styles.cardDetails}>{course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}{course.estimatedDuration > 0 ? ` · ${course.estimatedDuration} min` : ""}</p><span className={styles.cardCta}>View course →</span></Link>)}</section> : <p className={styles.empty}>Published courses for this level are being prepared. Other levels are not substituted here.</p>}
  </div></main>;

  const course = await getPublishedCourseBySlug(slug, locale);
  if (!course) notFound();
  const authenticated = await requireAuth();
  const lessons = course.modules.flatMap((module) => module.lessons);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const [lessonAccessEntries, progress, entitlement] = await Promise.all([
    listCourseLessonAccess(authenticated?.user.id ?? null, course.id),
    authenticated ? listLessonProgressByLessonIds(authenticated.user.id, lessonIds) : [],
    authenticated ? hasCourseEntitlement(authenticated.user.id, course.id) : false,
  ]);
  const accessByLessonId = new Map(lessonAccessEntries);
  const progressByLessonId = new Map(progress.map((item) => [item.lessonId, item]));
  const hasPrivilegedAccess = authenticated ? ["ADMIN", "SUPER_ADMIN", "CONTENT_MANAGER"].includes(authenticated.user.role) : false;
  const hasFullAccess = course.accessPlan === "FREE" || entitlement || hasPrivilegedAccess;
  const firstAvailable = lessons.find((lesson) => accessByLessonId.get(lesson.id)?.allowed) ?? null;
  const nextAvailable = lessons.find((lesson) => (
    accessByLessonId.get(lesson.id)?.allowed
    && progressByLessonId.get(lesson.id)?.status !== "COMPLETED"
  )) ?? firstAvailable;
  const trialLesson = lessons.find((lesson, index) => course.accessPlan === "FREE" || lesson.isFree || index < course.firstFreeLessonCount) ?? null;
  const outcomes = strings(course.learningOutcomes);
  const courseResult = resultDescription(outcomes, course.shortDescription, course.language);
  const learningOutcomesTitle = course.contentLocale.toLowerCase().startsWith("ru") ? "Чему вы научитесь" : "What you will learn";
  const selectedPriceId = first(query.price);
  const author = course.instructor;
  const profile = author.teacherProfile?.status === "ACTIVE" ? author.teacherProfile : null;
  const products = course.commerceProducts.map((product) => ({ id: product.id, title: product.title, description: product.description, plan: product.plan, prices: product.prices }));
  const coursePath = locale && course.contentLocale !== "en" ? `/${course.contentLocale}/courses/${course.localizedSlug}` : `/courses/${course.slug}`;
  const continueHref = nextAvailable ? `${coursePath}/lessons/${nextAvailable.localizedSlug ?? nextAvailable.slug}` : null;
  const startCourseHref = continueHref ?? (course.accessPlan === "FREE" && trialLesson ? `${coursePath}/lessons/${trialLesson.localizedSlug ?? trialLesson.slug}` : null);
  const offers = products.flatMap((product) => product.prices.map((price) => ({ "@type": "Offer", name: product.title, price: price.amount / 100, priceCurrency: price.currency, availability: "https://schema.org/InStock", url: `https://krin-edtech.com/courses/${course.slug}?price=${encodeURIComponent(price.id)}` })));
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        name: course.title,
        description: course.shortDescription,
        url: `https://krin-edtech.com/courses/${course.slug}`,
        inLanguage: course.language,
        educationalLevel: course.level.code,
        provider: { "@type": "Organization", name: "KRIN EdTech", url: "https://krin-edtech.com" },
        ...(author.name ? { author: { "@type": "Person", name: profile?.displayName || author.name } } : {}),
        ...(course.estimatedDuration > 0 ? { timeRequired: `PT${course.estimatedDuration}M` } : {}),
        ...(offers.length ? { offers } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Courses", item: "https://krin-edtech.com/courses" },
          { "@type": "ListItem", position: 2, name: course.level.code, item: `https://krin-edtech.com/courses/${course.level.code.toLowerCase()}` },
          { "@type": "ListItem", position: 3, name: course.title, item: `https://krin-edtech.com/courses/${course.slug}` },
        ],
      },
    ],
  }).replace(/</g, "\\u003c");

  const purchase = <CoursePurchasePanel courseId={course.id} courseSlug={course.slug} coursePath={coursePath} accessPlan={course.accessPlan} products={products} signedIn={Boolean(authenticated)} hasFullAccess={hasFullAccess} continueHref={continueHref} initialPriceId={selectedPriceId} />;

  const courseFaq = <section className={styles.sidePanel} aria-labelledby="course-faq-title"><div className={styles.sidePanelHeading}><h2 id="course-faq-title">Course FAQ</h2><p>Information based on current course and billing data.</p></div><div className={styles.faq}><details><summary>Can I try the course before payment?</summary><p>{trialLesson ? "Yes. This course has a published lesson that opens from this page and uses the same learning components as enrolled study." : "No published free lesson is configured for this course yet."}</p></details><details><summary>Will I see the course structure before purchase?</summary><p>Yes. Open the course programme to view published modules and lessons without exposing unpublished content.</p></details><details><summary>What happens after payment?</summary><p>Verified payment creates course entitlement, adds the course to your account and unlocks eligible lessons.</p></details><details><summary>Are public reviews available?</summary><p>Course reviews are not published for this course yet, so no ratings or testimonials are displayed here.</p></details></div></section>;

  return <main className={styles.page}><PublicSiteHeader /><div className={styles.shell}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
    <FunnelEventReporter eventType="COURSE_VIEW" courseId={course.id} levelCode={course.level.code} planCode={course.accessPlan} />
    <Link href={`/courses?category=${encodeURIComponent(course.category.slug)}`} className={styles.back}>← {course.category.title}</Link>
    <div className={styles.courseLayout}>
      <div className={styles.courseMain}>
        <header className={styles.courseHero}>
          <p className={styles.eyebrow}>{course.level.code} · {course.category.title}</p>
          <h1>{course.title}</h1>
          <p>{courseResult}</p>
          <div className={styles.summary}><span>{course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}</span>{course.estimatedDuration > 0 ? <span>{course.estimatedDuration} minutes estimated total</span> : <span>Self-paced duration</span>}<span>{courseTypeLabels[course.courseType]}</span><span>{accessLabel(course.accessPlan)}</span></div>
          <CourseHeroActions actionClassName={styles.publicLesson} containerClassName={styles.heroActions} startCourseHref={startCourseHref} />
          <div className={styles.mobilePurchase}>{purchase}</div>
        </header>
        {outcomes.length ? <section className={styles.learningOutcomes} aria-labelledby="learning-outcomes-title"><div><p className={styles.outcomesEyebrow}>Course result</p><h2 id="learning-outcomes-title">{learningOutcomesTitle}</h2></div><ul>{outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul></section> : null}

        <dialog id="course-content-dialog" className={styles.courseContentDialog} aria-labelledby="outline-title"><div className={styles.dialogHeader}><div><p className={styles.programmeEyebrow}>Course programme</p><h2 id="outline-title">{course.modules.length} {course.modules.length === 1 ? "module" : "modules"} · {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}</h2></div><form method="dialog"><button type="submit" className={styles.dialogCloseButton} aria-label="Close course content">Close</button></form></div><section className={styles.outline} aria-labelledby="programme-title"><div className={styles.outlineHeading}><h2 id="programme-title">Published programme</h2><p>Module and lesson titles are visible before purchase.</p></div>
          {course.modules.length ? <div className={styles.moduleList}>{course.modules.map((module) => <details key={module.id} className={styles.module} name="course-modules"><summary className={styles.moduleHeader}><div><p className={styles.moduleEyebrow}>Module {module.order}</p><h3>{module.title}</h3>{module.description ? <p>{module.description}</p> : null}</div><span className={styles.moduleCount}>{module.lessons.length} lessons</span></summary><ol className={styles.lessonList}>{module.lessons.map((lesson) => {
            const access = accessByLessonId.get(lesson.id);
            const lessonProgress = progressByLessonId.get(lesson.id);
            const state = lessonProgress?.status === "COMPLETED" ? "Completed" : lessonProgress ? "In progress" : access?.allowed ? "Available" : lesson.isFree ? "Free lesson" : access?.reason === "AUTH_REQUIRED" ? "Sign in to unlock" : "Locked";
            const stateClass = state === "Completed" ? styles.completed : state === "In progress" ? styles.inProgress : state === "Locked" || state === "Sign in to unlock" ? styles.locked : "";
            const earnedExperience = lessonProgress?.status === "COMPLETED" ? lessonProgress.experienceEarned : 0;
            const content = <><LessonCardAnimation lessonOrder={lesson.order} /><span className={styles.lessonTitle}><b>{lesson.order}.</b>{lesson.title}</span><span className={`${styles.lessonState} ${stateClass}`}>{state}{lessonProgress ? ` · ${lessonProgress.completionPercent}%` : ""}</span><LessonXpBadge className={styles.lessonXpBadge} experience={earnedExperience} correctAnswers={lessonProgress?.attemptAccuracy.correctAnswers ?? 0} incorrectAnswers={lessonProgress?.attemptAccuracy.incorrectAnswers ?? 0} progressPercent={lessonProgress?.completionPercent ?? 0} /></>;
            return <li key={lesson.id}>{access?.allowed ? <Link href={`${coursePath}/lessons/${lesson.localizedSlug ?? lesson.slug}`} className={styles.lessonLink}>{content}</Link> : <div className={styles.lockedLesson}>{content}</div>}</li>;
          })}</ol></details>)}</div> : <p className={styles.empty}>No published modules are available yet. The course page does not substitute unrelated content.</p>}
        </section></dialog>
      </div>
      <aside className={styles.courseSidebar}>{purchase}{courseFaq}</aside>
    </div>
  </div></main>;
}
