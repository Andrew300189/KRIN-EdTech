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
import { listPublicCourseReviews } from "@/modules/courses/services/course-review.service";
import { CourseLearningPath } from "@/modules/courses/components/CourseLearningPath";
import { CourseLocaleSync } from "@/modules/courses/components/CourseLocaleSync";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type CourseUiLocale = "en" | "uk" | "ru";

const coursePageCopy = {
  en: { back: "All courses", lesson: "lesson", lessons: "lessons", minute: "minutes estimated total", selfPaced: "Self-paced duration", standard: "Standard course", intensive: "Intensive course", examPrep: "Exam preparation", professional: "Professional English", specialization: "Specialisation", skill: "Skill course", free: "Free access", corporate: "Corporate access", subscription: "Subscription access", showContent: "Show content", startCourse: "Start course", outcomeEyebrow: "Course result", outcomes: "What you will learn", faqTitle: "Course FAQ", faqDescription: "Information based on current course and billing data.", faqTrial: "Can I try the course before payment?", faqTrialYes: "Yes. This course has a published lesson you can open from this page.", faqTrialNo: "No published free lesson is configured for this course yet.", faqStructure: "Will I see the course structure before purchase?", faqStructureAnswer: "Yes. Open the course programme to view published modules and lessons.", faqPayment: "What happens after payment?", faqPaymentAnswer: "Verified payment adds the course to your account and unlocks eligible lessons.", faqReviews: "Are course reviews available?", faqReviewsAnswer: "Verified learners can leave a 1–7 star rating and a comment after completing the paid course.", feedback: "Learner feedback", reviews: "Course reviews", from: "from", review: "review", reviewsPlural: "reviews", firstReview: "The first verified learner review will appear here after course completion.", programme: "Course programme", module: "module", modules: "modules", close: "Close", closeContent: "Close course content", noModules: "No published modules are available yet." },
  uk: { back: "Усі курси", lesson: "урок", lessons: "уроків", minute: "хвилин орієнтовно", selfPaced: "Навчайтеся у власному темпі", standard: "Стандартний курс", intensive: "Інтенсивний курс", examPrep: "Підготовка до іспиту", professional: "Професійна англійська", specialization: "Спеціалізація", skill: "Курс навички", free: "Безкоштовний доступ", corporate: "Корпоративний доступ", subscription: "Доступ за підпискою", showContent: "Переглянути програму", startCourse: "Почати курс", outcomeEyebrow: "Результат курсу", outcomes: "Чого ви навчитеся", faqTitle: "Питання про курс", faqDescription: "Інформація про доступ і оплату цього курсу.", faqTrial: "Чи можна спробувати курс до оплати?", faqTrialYes: "Так. На цій сторінці є опублікований урок, який можна відкрити для ознайомлення.", faqTrialNo: "Для цього курсу ще не налаштовано безкоштовний ознайомчий урок.", faqStructure: "Чи побачу я структуру курсу до придбання?", faqStructureAnswer: "Так. Відкрийте програму курсу, щоб переглянути опубліковані модулі та уроки.", faqPayment: "Що відбувається після оплати?", faqPaymentAnswer: "Після підтвердження оплати курс додається до вашого акаунта й відкриває доступні уроки.", faqReviews: "Чи доступні відгуки про курс?", faqReviewsAnswer: "Підтверджені учні можуть залишити оцінку від 1 до 7 зірок і коментар після завершення платного курсу.", feedback: "Відгуки учнів", reviews: "Відгуки про курс", from: "від", review: "відгук", reviewsPlural: "відгуків", firstReview: "Перший відгук підтвердженого учня з’явиться тут після завершення курсу.", programme: "Програма курсу", module: "модуль", modules: "модулів", close: "Закрити", closeContent: "Закрити програму курсу", noModules: "Опублікованих модулів поки немає." },
  ru: { back: "Все курсы", lesson: "урок", lessons: "уроков", minute: "минут ориентировочно", selfPaced: "Учитесь в своём темпе", standard: "Стандартный курс", intensive: "Интенсивный курс", examPrep: "Подготовка к экзамену", professional: "Профессиональный английский", specialization: "Специализация", skill: "Курс навыка", free: "Бесплатный доступ", corporate: "Корпоративный доступ", subscription: "Доступ по подписке", showContent: "Посмотреть программу", startCourse: "Начать курс", outcomeEyebrow: "Результат курса", outcomes: "Чему вы научитесь", faqTitle: "Вопросы о курсе", faqDescription: "Информация о доступе и оплате этого курса.", faqTrial: "Можно ли попробовать курс до оплаты?", faqTrialYes: "Да. На этой странице есть опубликованный урок, который можно открыть для ознакомления.", faqTrialNo: "Для этого курса ещё не настроен бесплатный ознакомительный урок.", faqStructure: "Увижу ли я структуру курса до покупки?", faqStructureAnswer: "Да. Откройте программу курса, чтобы посмотреть опубликованные модули и уроки.", faqPayment: "Что происходит после оплаты?", faqPaymentAnswer: "После подтверждения оплаты курс добавляется в ваш аккаунт и открывает доступные уроки.", faqReviews: "Доступны ли отзывы о курсе?", faqReviewsAnswer: "Подтверждённые ученики могут оставить оценку от 1 до 7 звёзд и комментарий после завершения платного курса.", feedback: "Отзывы учеников", reviews: "Отзывы о курсе", from: "из", review: "отзыв", reviewsPlural: "отзывов", firstReview: "Первый отзыв подтверждённого ученика появится здесь после завершения курса.", programme: "Программа курса", module: "модуль", modules: "модулей", close: "Закрыть", closeContent: "Закрыть программу курса", noModules: "Опубликованных модулей пока нет." },
} as const;
type CoursePageText = (typeof coursePageCopy)[CourseUiLocale];

function courseUiLocale(value?: string | null): CourseUiLocale {
  return value?.toLowerCase().startsWith("uk") ? "uk" : value?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function courseTypeLabel(type: "STANDARD" | "INTENSIVE" | "EXAM_PREP" | "PROFESSIONAL" | "SPECIALIZATION" | "SKILL", text: CoursePageText) {
  return ({ STANDARD: text.standard, INTENSIVE: text.intensive, EXAM_PREP: text.examPrep, PROFESSIONAL: text.professional, SPECIALIZATION: text.specialization, SKILL: text.skill } as const)[type];
}

function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function accessLabel(plan: string, text: CoursePageText = coursePageCopy.en) { return plan === "FREE" ? text.free : plan === "CORPORATE" ? text.corporate : text.subscription; }
function stars(rating: number) { return `${"★".repeat(rating)}${"☆".repeat(7 - rating)}`; }
function resultDescription(outcomes: string[], fallback: string, language: string) {
  const visibleOutcomes = outcomes
    .slice(0, 3)
    .map((item) => item.trim().replace(/[.!…]+$/u, ""))
    .filter(Boolean);
  if (!visibleOutcomes.length) return fallback;
  const lowerCaseInitial = (value: string) => value.slice(0, 1).toLocaleLowerCase(language) + value.slice(1);
  const list = visibleOutcomes.map(lowerCaseInitial).join(", ");
  if (language.toLowerCase().startsWith("uk")) {
    return `Після курсу ви зможете ${list} — без здогадок і плутанини в базових ситуаціях.`;
  }
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
  const [lessonAccessEntries, progress, entitlement, publicReviews] = await Promise.all([
    listCourseLessonAccess(authenticated?.user.id ?? null, course.id),
    authenticated ? listLessonProgressByLessonIds(authenticated.user.id, lessonIds) : [],
    authenticated ? hasCourseEntitlement(authenticated.user.id, course.id) : false,
    listPublicCourseReviews(course.slug),
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
  const interfaceLocale = courseUiLocale(locale ?? course.contentLocale);
  const text = coursePageCopy[interfaceLocale];
  const courseResult = resultDescription(outcomes, course.shortDescription, course.contentLocale);
  const learningOutcomesTitle = text.outcomes;
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

  const purchase = <CoursePurchasePanel courseId={course.id} courseSlug={course.slug} coursePath={coursePath} accessPlan={course.accessPlan} products={products} signedIn={Boolean(authenticated)} hasFullAccess={hasFullAccess} continueHref={continueHref} initialPriceId={selectedPriceId} locale={interfaceLocale} />;

  const courseFaq = <section className={styles.sidePanel} aria-labelledby="course-faq-title"><div className={styles.sidePanelHeading}><h2 id="course-faq-title">{text.faqTitle}</h2><p>{text.faqDescription}</p></div><div className={styles.faq}><details><summary>{text.faqTrial}</summary><p>{trialLesson ? text.faqTrialYes : text.faqTrialNo}</p></details><details><summary>{text.faqStructure}</summary><p>{text.faqStructureAnswer}</p></details><details><summary>{text.faqPayment}</summary><p>{text.faqPaymentAnswer}</p></details><details><summary>{text.faqReviews}</summary><p>{text.faqReviewsAnswer}</p></details></div></section>;

  return <main className={styles.page}><PublicSiteHeader /><CourseLocaleSync courseSlug={course.slug} routeLocale={locale} /><div className={styles.shell}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
    <FunnelEventReporter eventType="COURSE_VIEW" courseId={course.id} levelCode={course.level.code} planCode={course.accessPlan} />
    <Link href={`/courses?category=${encodeURIComponent(course.category.slug)}`} className={styles.back}>← {text.back}</Link>
    <div className={styles.courseLayout}>
      <div className={styles.courseMain}>
        <header className={styles.courseHero}>
          <p className={styles.eyebrow}>{course.level.code} · {interfaceLocale === "uk" && course.category.slug === "general-english" ? "Загальна англійська" : interfaceLocale === "ru" && course.category.slug === "general-english" ? "Общий английский" : course.category.title}</p>
          <h1>{course.title}</h1>
          <p>{courseResult}</p>
          <div className={styles.summary}><span>{course.lessonCount} {course.lessonCount === 1 ? text.lesson : text.lessons}</span>{course.estimatedDuration > 0 ? <span>{course.estimatedDuration} {text.minute}</span> : <span>{text.selfPaced}</span>}<span>{courseTypeLabel(course.courseType, text)}</span><span>{accessLabel(course.accessPlan, text)}</span></div>
          <CourseHeroActions actionClassName={styles.publicLesson} containerClassName={styles.heroActions} startCourseHref={startCourseHref} labels={{ showContent: text.showContent, startCourse: text.startCourse }} />
          <div className={styles.mobilePurchase}>{purchase}</div>
        </header>
        {outcomes.length ? <section className={styles.learningOutcomes} aria-labelledby="learning-outcomes-title"><div><p className={styles.outcomesEyebrow}>{text.outcomeEyebrow}</p><h2 id="learning-outcomes-title">{learningOutcomesTitle}</h2></div><ul>{outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul></section> : null}

        <section className={styles.courseReviews} aria-labelledby="course-reviews-title">
          <div className={styles.courseReviewsHeading}>
            <div><p className={styles.outcomesEyebrow}>{text.feedback}</p><h2 id="course-reviews-title">{text.reviews}</h2></div>
            {publicReviews.total ? <p className={styles.courseRatingSummary}><span aria-hidden="true">★</span> {publicReviews.averageRating?.toFixed(1)}/7 <small>{text.from} {publicReviews.total} {publicReviews.total === 1 ? text.review : text.reviewsPlural}</small></p> : null}
          </div>
          {publicReviews.reviews.length ? <div className={styles.courseReviewList}>{publicReviews.reviews.map((review) => <article key={`${review.reviewerName}-${review.updatedAt.toISOString()}`} className={styles.publicCourseReview}>
            <div className={styles.publicCourseReviewMeta}><div><strong>{review.reviewerName}</strong><span className={styles.publicCourseReviewStars} aria-label={`${review.rating} / 7`}>{stars(review.rating)}</span></div><time dateTime={review.updatedAt.toISOString()}>{new Intl.DateTimeFormat(interfaceLocale === "uk" ? "uk-UA" : interfaceLocale === "ru" ? "ru-RU" : "en", { month: "short", year: "numeric" }).format(review.updatedAt)}</time></div>
            <p>{review.comment}</p>
          </article>)}</div> : <p className={styles.noCourseReviews}>{text.firstReview}</p>}
        </section>

        <dialog id="course-content-dialog" className={styles.courseContentDialog} aria-labelledby="outline-title">
          <div className={styles.dialogHeader}><div><p className={styles.programmeEyebrow}>{text.programme}</p><h2 id="outline-title">{course.modules.length} {course.modules.length === 1 ? text.module : text.modules} · {lessons.length} {lessons.length === 1 ? text.lesson : text.lessons}</h2></div><form method="dialog"><button type="submit" className={styles.dialogCloseButton} aria-label={text.closeContent}>{text.close}</button></form></div>
          <div className={styles.outline}>
            {course.modules.length ? <CourseLearningPath modules={course.modules} accessByLessonId={accessByLessonId} progressByLessonId={progressByLessonId} coursePath={coursePath} locale={interfaceLocale} /> : <p className={styles.empty}>{text.noModules}</p>}
          </div>
        </dialog>
      </div>
      <aside className={styles.courseSidebar}>{purchase}{courseFaq}</aside>
    </div>
  </div></main>;
}
