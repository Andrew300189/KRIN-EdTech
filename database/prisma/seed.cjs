const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");

const prisma = new PrismaClient();

const levels = [
  ["A1", "Beginner", "Foundation English for everyday communication."],
  ["A2", "Elementary", "Everyday English with greater confidence and range."],
  ["B1", "Intermediate", "Independent communication in familiar situations."],
  ["B2", "Upper-Intermediate", "Confident communication for study and work."],
  ["C1", "Advanced", "Flexible and effective English for complex contexts."],
  ["C2", "Mastery", "Near-native control, nuance, and precision."],
];

const categories = [
  ["general-english", "General English", "English for everyday communication across all CEFR levels."],
  ["conversational-english", "Conversational English", "Practical speaking and listening for real conversations."],
  ["business-english", "Business English", "English for meetings, correspondence, and professional communication."],
  ["english-for-it", "English for IT", "English for software, data, product, and technology teams."],
  ["medical-english", "Medical English", "English for healthcare settings and medical communication."],
  ["legal-english", "Legal English", "English for legal documents and professional legal contexts."],
  ["military-english", "Military English", "English for military communication and operations."],
  ["aviation-english", "Aviation English", "English for aviation safety and communication."],
  ["maritime-english", "Maritime English", "English for shipping, ports, and maritime operations."],
  ["english-for-tourism", "English for Tourism", "English for hospitality, guides, and travel services."],
  ["academic-english", "Academic English", "English for research, study, and academic writing."],
  ["technical-english", "Technical English", "English for engineering and technical documentation."],
  ["english-for-exams", "English for Exams", "Targeted preparation for English language examinations."],
  ["english-for-travel", "English for Travel", "Practical English for independent travel."],
  ["english-for-work", "English for Work", "Workplace English for a wide range of roles."],
  ["english-for-children", "English for Children", "Age-appropriate English learning for children."],
];

const vocabulary = [
  { lemma: "apple", normalizedLemma: "apple", partOfSpeech: "NOUN", cefrLevel: "A1", britishTranscription: "ˈæp.əl", americanTranscription: "ˈæp.əl", meanings: [{ definition: "a round fruit with firm flesh", translation: "яблоко", article: "an", context: "I eat an apple every day." }], examples: [{ sentence: "She bought an apple at the market.", translation: "Она купила яблоко на рынке." }], collocations: [{ value: "an apple a day", translation: "яблоко в день" }] },
  { lemma: "achieve", normalizedLemma: "achieve", partOfSpeech: "VERB", cefrLevel: "B1", britishTranscription: "əˈtʃiːv", americanTranscription: "əˈtʃiːv", meanings: [{ definition: "to succeed in doing something after effort", translation: "достигать", context: "They achieved their goal." }], examples: [{ sentence: "She achieved excellent results.", translation: "Она достигла отличных результатов." }], collocations: [{ value: "achieve a goal", translation: "достичь цели" }] },
  { lemma: "get along", normalizedLemma: "get along", partOfSpeech: "PHRASAL_VERB", cefrLevel: "B1", isPhrasalVerb: true, meanings: [{ definition: "to have a friendly relationship", translation: "ладить", context: "We get along well." }], examples: [{ sentence: "The new colleagues get along well.", translation: "Новые коллеги хорошо ладят." }], collocations: [] },
  { lemma: "reliable", normalizedLemma: "reliable", partOfSpeech: "ADJECTIVE", cefrLevel: "B2", meanings: [{ definition: "able to be trusted or depended on", translation: "надёжный", context: "This is a reliable source." }], examples: [{ sentence: "Choose a reliable source of information.", translation: "Выберите надёжный источник информации." }], collocations: [{ value: "reliable information", translation: "надёжная информация" }] },
];

const rewardRules = [
  ["EXERCISE_CORRECT", 2, 0, 50], ["LESSON_COMPLETED", 50, 5, 1], ["HOMEWORK_COMPLETED", 30, 3, 3], ["VOCABULARY_REVIEW", 1, 0, 60], ["VOCABULARY_SESSION_COMPLETED", 20, 2, 3], ["WARM_UP_COMPLETED", 10, 1, 3], ["DAILY_GOAL", 25, 5, 1], ["COURSE_COMPLETED", 300, 25, null],
];

const achievements = [
  ["FIRST_STEP", "First step", "Complete your first lesson.", "🎯", "LESSONS", "COMMON", "LESSONS_COMPLETED", 1, 20, 2, false],
  ["TEN_LESSONS", "Learning momentum", "Complete 10 lessons.", "📚", "LESSONS", "RARE", "LESSONS_COMPLETED", 10, 75, 8, false],
  ["WORD_EXPLORER", "Word explorer", "Review 50 vocabulary cards.", "🗂️", "VOCABULARY", "RARE", "VOCABULARY_REVIEWS", 50, 50, 5, false],
  ["WEEK_STREAK", "Weekly streak", "Reach a 7-day learning streak.", "🔥", "STREAK", "EPIC", "STREAK_DAYS", 7, 100, 10, false],
  ["FOCUSED_HOUR", "Focused hour", "Accumulate 60 active learning minutes.", "⏱️", "TIME", "COMMON", "ACTIVE_MINUTES", 60, 35, 3, false],
  ["LEVEL_A1_TROPHY", "A1 completion trophy", "Complete a full A1 course.", "🏆", "COURSES", "EPIC", "COURSES_COMPLETED", 1, 150, 15, true],
  ["SECRET_PERFECT", "Perfect practice", "Complete a lesson without mistakes.", "✨", "ACCURACY", "RARE", "PERFECT_LESSONS", 1, 60, 6, false, true],
];

const commercePlans = [
  ["FREE", "free", "Free", "Free lessons, limited practice, and basic statistics.", 0, false, 0],
  ["BASIC", "basic", "Basic", "Core courses, full vocabulary, and learning progress.", 999, false, 0],
  ["PREMIUM", "premium", "Premium", "All general and professional courses with advanced analytics.", 1999, true, 7],
  ["PRO", "pro", "Pro", "Specialised courses, certificates, and advanced learning tools.", 2999, false, 0],
  ["CORPORATE", "corporate", "Corporate", "Organisation-wide Premium access.", 4999, false, 0],
];

const commerceFeatures = [
  ["COURSE_ACCESS", "Course access"], ["PROFESSIONAL_COURSES", "Professional courses"], ["VOCABULARY_LIMIT", "Vocabulary limit"], ["DAILY_TRAINING_LIMIT", "Daily training limit"], ["AI_REQUEST_LIMIT", "AI request limit"], ["ADVANCED_ANALYTICS", "Advanced analytics"], ["CERTIFICATES", "Certificates"], ["HOMEWORK_ACCESS", "Homework access"], ["DOWNLOAD_MATERIALS", "Download materials"],
];

const communicationTemplates = [
  ["WELCOME_EMAIL", "EMAIL", "en", "Welcome to KRIN", "Welcome, {{userName}}", "Your learning space is ready."],
  ["WELCOME_EMAIL", "EMAIL", "uk", "Ласкаво просимо до KRIN", "Вітаємо, {{userName}}", "Ваш навчальний простір готовий."],
  ["WELCOME_EMAIL", "EMAIL", "ru", "Добро пожаловать в KRIN", "Добро пожаловать, {{userName}}", "Ваше учебное пространство готово."],
  ["PAYMENT_SUCCEEDED_EMAIL", "EMAIL", "en", "Payment confirmed", "Payment confirmed", "Your payment of {{amount}} was confirmed."],
  ["PAYMENT_SUCCEEDED_EMAIL", "EMAIL", "uk", "Оплату підтверджено", "Оплату підтверджено", "Ваш платіж {{amount}} підтверджено."],
  ["PAYMENT_SUCCEEDED_EMAIL", "EMAIL", "ru", "Оплата подтверждена", "Оплата подтверждена", "Ваш платёж {{amount}} подтверждён."],
  ["PAYMENT_FAILED_EMAIL", "EMAIL", "en", "Payment needs attention", "Payment was not completed", "Open billing to safely try again."],
  ["PAYMENT_FAILED_EMAIL", "EMAIL", "uk", "Платіж потребує уваги", "Платіж не завершено", "Відкрийте білінг, щоб безпечно спробувати ще раз."],
  ["PAYMENT_FAILED_EMAIL", "EMAIL", "ru", "Оплата требует внимания", "Оплата не завершена", "Откройте биллинг, чтобы безопасно повторить попытку."],
  ["SUPPORT_TICKET_REPLIED_EMAIL", "EMAIL", "en", "Support replied", "Support replied to ticket {{ticketNumber}}", "Open the support center to read the reply."],
  ["SUPPORT_TICKET_REPLIED_EMAIL", "EMAIL", "uk", "Підтримка відповіла", "Підтримка відповіла на звернення {{ticketNumber}}", "Відкрийте центр підтримки, щоб прочитати відповідь."],
  ["SUPPORT_TICKET_REPLIED_EMAIL", "EMAIL", "ru", "Поддержка ответила", "Поддержка ответила на обращение {{ticketNumber}}", "Откройте центр поддержки, чтобы прочитать ответ."],
  ["DAILY_LEARNING_REMINDER_EMAIL", "EMAIL", "en", "Your learning reminder", "Your learning goal is waiting", "A short lesson today keeps your learning streak moving."],
  ["DAILY_LEARNING_REMINDER_EMAIL", "EMAIL", "uk", "Нагадування про навчання", "Ваша навчальна ціль чекає", "Короткий урок сьогодні допоможе зберегти серію."],
  ["DAILY_LEARNING_REMINDER_EMAIL", "EMAIL", "ru", "Напоминание об обучении", "Ваша учебная цель ждёт", "Короткий урок сегодня поможет сохранить серию."],
  ["SYSTEM_ANNOUNCEMENT_EMAIL", "EMAIL", "en", "KRIN update", "{{platformName}} update", "{{actionUrl}}"],
  ["SYSTEM_ANNOUNCEMENT_EMAIL", "EMAIL", "uk", "Оновлення KRIN", "Оновлення {{platformName}}", "{{actionUrl}}"],
  ["SYSTEM_ANNOUNCEMENT_EMAIL", "EMAIL", "ru", "Обновление KRIN", "Обновление {{platformName}}", "{{actionUrl}}"],
];

async function main() {
  await Promise.all(
    levels.map(([code, title, description], index) =>
      prisma.languageLevel.upsert({
        where: { code },
        update: { title, description, order: index + 1, isPublished: true },
        create: {
          id: `cefr-${code.toLowerCase()}`,
          code,
          title,
          description,
          order: index + 1,
          isPublished: true,
        },
      }),
    ),
  );
  await Promise.all(
    categories.map(([slug, title, description], index) =>
      prisma.courseCategory.upsert({
        where: { slug },
        update: { title, description, order: index + 1, isPublished: true },
        create: {
          id: `course-category-${slug}`,
          slug,
          title,
          description,
          order: index + 1,
          isPublished: true,
        },
      }),
    ),
  );
  await prisma.warmUpConfiguration.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  await Promise.all(rewardRules.map(([eventType, experienceAmount, coinAmount, dailyLimit]) => prisma.rewardRule.upsert({ where: { eventType }, update: { experienceAmount, coinAmount, dailyLimit, isActive: true }, create: { eventType, experienceAmount, coinAmount, dailyLimit, isActive: true } })));
  await Promise.all(achievements.map(([code, title, description, icon, category, rarity, conditionType, target, experienceReward, coinReward, isTrophy, isHidden = false], index) => prisma.achievement.upsert({ where: { code }, update: { title, description, icon, category, rarity, conditionType, conditionConfig: { target }, experienceReward, coinReward, isTrophy, isHidden, isActive: true, order: index + 1 }, create: { code, title, description, icon, category, rarity, conditionType, conditionConfig: { target }, experienceReward, coinReward, isTrophy, isHidden, isActive: true, order: index + 1 } })));
  const plans = {};
  for (const [code, slug, title, description, priceAmount, isFeatured, trialDays] of commercePlans) {
    plans[code] = await prisma.plan.upsert({ where: { code }, update: { slug, title, description, type: "SUBSCRIPTION", billingPeriod: code === "FREE" ? "NONE" : "MONTH", priceAmount, currency: "USD", trialDays, isActive: true, isPublic: true, isFeatured, order: commercePlans.findIndex((entry) => entry[0] === code) }, create: { id: `plan-${slug}`, code, slug, title, description, type: "SUBSCRIPTION", billingPeriod: code === "FREE" ? "NONE" : "MONTH", priceAmount, currency: "USD", trialDays, isActive: true, isPublic: true, isFeatured, order: commercePlans.findIndex((entry) => entry[0] === code) } });
  }
  const features = {};
  for (const [code, title] of commerceFeatures) features[code] = await prisma.feature.upsert({ where: { code }, update: { title, type: "BOOLEAN" }, create: { id: `feature-${code.toLowerCase()}`, code, title, type: "BOOLEAN" } });
  for (const code of ["BASIC", "PREMIUM", "PRO", "CORPORATE"]) {
    const enabled = code === "BASIC" ? ["COURSE_ACCESS", "VOCABULARY_LIMIT", "DAILY_TRAINING_LIMIT"] : code === "PREMIUM" ? ["COURSE_ACCESS", "VOCABULARY_LIMIT", "DAILY_TRAINING_LIMIT", "PROFESSIONAL_COURSES", "ADVANCED_ANALYTICS", "HOMEWORK_ACCESS"] : commerceFeatures.map(([featureCode]) => featureCode);
    for (const featureCode of enabled) await prisma.planFeature.upsert({ where: { planId_featureId: { planId: plans[code].id, featureId: features[featureCode].id } }, update: { enabled: true }, create: { planId: plans[code].id, featureId: features[featureCode].id, enabled: true } });
  }
  for (const [code, slug, title, description, amount] of commercePlans.filter(([code]) => code !== "FREE")) {
    const product = await prisma.product.upsert({ where: { code: `SUBSCRIPTION_${code}` }, update: { slug: `subscription-${slug}`, title, description, type: "SUBSCRIPTION_PLAN", planId: plans[code].id, isActive: true, isPublic: true }, create: { id: `product-subscription-${slug}`, code: `SUBSCRIPTION_${code}`, slug: `subscription-${slug}`, title, description, type: "SUBSCRIPTION_PLAN", planId: plans[code].id, isActive: true, isPublic: true } });
    const prices = [["STRIPE", "USD", amount, `price_test_krin_${slug}_monthly`], ["LIQPAY", "UAH", amount * 40, null]];
    for (const [provider, currency, priceAmount, providerPriceId] of prices) await prisma.productPrice.upsert({ where: { id: `price-${slug}-${provider.toLowerCase()}` }, update: { productId: product.id, provider, currency, amount: priceAmount, billingPeriod: "MONTH", providerPriceId, isActive: true }, create: { id: `price-${slug}-${provider.toLowerCase()}`, productId: product.id, provider, currency, amount: priceAmount, billingPeriod: "MONTH", providerPriceId, isActive: true } });
  }
  const seedInstructor = await prisma.user.upsert({ where: { email: "content@seed.krin.local" }, update: { role: "CONTENT_MANAGER", name: "Seed Content Manager" }, create: { id: "seed-content-manager", email: "content@seed.krin.local", username: "seed-content-manager", name: "Seed Content Manager", passwordHash: "seed-account-not-for-login", role: "CONTENT_MANAGER", emailVerified: true } });
  for (const [code, channel, locale, subject, title, body] of communicationTemplates) await prisma.notificationTemplate.upsert({ where: { code_channel_locale: { code, channel, locale } }, update: { subject, title, body, htmlBody: `<p>${body}</p>`, isActive: true }, create: { code, channel, locale, subject, title, body, htmlBody: `<p>${body}</p>`, isActive: true } });
  const supportTeam = await prisma.supportTeam.upsert({ where: { slug: "learner-support" }, update: { title: "Learner Support", isActive: true }, create: { slug: "learner-support", title: "Learner Support", isActive: true } });
  await prisma.supportTeamMember.upsert({ where: { teamId_userId: { teamId: supportTeam.id, userId: seedInstructor.id } }, update: { isActive: true }, create: { teamId: supportTeam.id, userId: seedInstructor.id, isActive: true } });
  const supportCategories = {};
  for (const [slug, title, description] of [["account", "Account and sign-in", "Profile, login, and account questions."], ["billing", "Billing and purchases", "Subscriptions, payments, and course access."], ["learning", "Learning content", "Lessons, exercises, and progress."], ["technical", "Technical issue", "Site or browser problem."]]) supportCategories[slug] = await prisma.supportCategory.upsert({ where: { slug }, update: { title, description, defaultTeamId: supportTeam.id, isActive: true }, create: { slug, title, description, defaultTeamId: supportTeam.id, isActive: true } });
  for (const category of Object.values(supportCategories)) for (const [priority, firstResponseMinutes, resolutionMinutes] of [["LOW", 1440, 4320], ["NORMAL", 480, 1440], ["HIGH", 120, 480], ["URGENT", 30, 120]]) await prisma.supportSlaPolicy.upsert({ where: { categoryId_priority: { categoryId: category.id, priority } }, update: { firstResponseMinutes, resolutionMinutes, isActive: true }, create: { categoryId: category.id, priority, firstResponseMinutes, resolutionMinutes, isActive: true } });
  const helpCategory = await prisma.helpCategory.upsert({ where: { slug: "getting-started" }, update: { title: "Getting started", isActive: true }, create: { slug: "getting-started", title: "Getting started", description: "Guides for your KRIN account and first lesson.", order: 1, isActive: true } });
  await prisma.helpArticle.upsert({ where: { slug: "how-to-start-learning" }, update: { title: "How to start learning", categoryId: helpCategory.id, authorId: seedInstructor.id, locale: "en", status: "PUBLISHED", publishedAt: new Date(), summary: "Choose a course and start your first lesson.", content: "# Start learning\n\nOpen Courses, choose a level, and start with a lesson that suits your current goal." }, create: { slug: "how-to-start-learning", title: "How to start learning", categoryId: helpCategory.id, authorId: seedInstructor.id, locale: "en", status: "PUBLISHED", publishedAt: new Date(), summary: "Choose a course and start your first lesson.", content: "# Start learning\n\nOpen Courses, choose a level, and start with a lesson that suits your current goal." } });
  const announcement = await prisma.systemAnnouncement.findFirst({ where: { title: "Welcome to the communication center" }, select: { id: true } });
  if (!announcement) await prisma.systemAnnouncement.create({ data: { authorId: seedInstructor.id, title: "Welcome to the communication center", message: "Notification preferences and private support are now available.", actionUrl: "/profile/notifications", status: "PUBLISHED", publishedAt: new Date() } });
  const freeCourse = await prisma.course.upsert({ where: { slug: "demo-free-course" }, update: { isPublished: true, accessPlan: "FREE" }, create: { id: "course-demo-free", levelId: "cefr-a1", categoryId: "course-category-general-english", slug: "demo-free-course", title: "Free English Foundations", shortDescription: "A free sample course for checkout and access testing.", isPublished: true, firstFreeLessonCount: 1, accessPlan: "FREE", instructorId: seedInstructor.id, createdById: seedInstructor.id, updatedById: seedInstructor.id } });
  const paidCourse = await prisma.course.upsert({ where: { slug: "demo-premium-course" }, update: { isPublished: true, accessPlan: "PREMIUM" }, create: { id: "course-demo-premium", levelId: "cefr-b2", categoryId: "course-category-business-english", slug: "demo-premium-course", title: "Professional English Intensive", shortDescription: "A paid course for secure order and entitlement testing.", isPublished: true, accessPlan: "PREMIUM", priceAmount: 4900, priceCurrency: "USD", instructorId: seedInstructor.id, createdById: seedInstructor.id, updatedById: seedInstructor.id } });
  const freeCourseProduct = await prisma.product.upsert({ where: { code: "COURSE_DEMO_FREE" }, update: { courseId: freeCourse.id, isActive: true, isPublic: true }, create: { id: "product-course-demo-free", code: "COURSE_DEMO_FREE", slug: "course-demo-free", title: freeCourse.title, description: freeCourse.shortDescription, type: "COURSE", courseId: freeCourse.id, isActive: true, isPublic: true } });
  const paidCourseProduct = await prisma.product.upsert({ where: { code: "COURSE_DEMO_PREMIUM" }, update: { courseId: paidCourse.id, isActive: true, isPublic: true }, create: { id: "product-course-demo-premium", code: "COURSE_DEMO_PREMIUM", slug: "course-demo-premium", title: paidCourse.title, description: paidCourse.shortDescription, type: "COURSE", courseId: paidCourse.id, isActive: true, isPublic: true } });
  for (const [provider, currency, priceAmount, providerPriceId] of [["STRIPE", "USD", 4900, "price_test_krin_demo_course"], ["LIQPAY", "UAH", 199000, null]]) await prisma.productPrice.upsert({ where: { id: `price-course-demo-premium-${provider.toLowerCase()}` }, update: { productId: paidCourseProduct.id, provider, currency, amount: priceAmount, billingPeriod: "NONE", providerPriceId, isActive: true }, create: { id: `price-course-demo-premium-${provider.toLowerCase()}`, productId: paidCourseProduct.id, provider, currency, amount: priceAmount, billingPeriod: "NONE", providerPriceId, isActive: true } });
  const bundle = await prisma.product.upsert({ where: { code: "BUNDLE_DEMO_PROFESSIONAL" }, update: { isActive: true, isPublic: true }, create: { id: "product-bundle-demo-professional", code: "BUNDLE_DEMO_PROFESSIONAL", slug: "bundle-demo-professional", title: "Professional English Bundle", description: "A bundle containing the paid professional course.", type: "COURSE_BUNDLE", isActive: true, isPublic: true } });
  await prisma.productBundleItem.upsert({ where: { bundleProductId_includedProductId: { bundleProductId: bundle.id, includedProductId: paidCourseProduct.id } }, update: { order: 1 }, create: { bundleProductId: bundle.id, includedProductId: paidCourseProduct.id, order: 1 } });
  for (const [provider, currency, priceAmount, providerPriceId] of [["STRIPE", "USD", 3900, "price_test_krin_demo_bundle"], ["LIQPAY", "UAH", 159000, null]]) await prisma.productPrice.upsert({ where: { id: `price-bundle-demo-professional-${provider.toLowerCase()}` }, update: { productId: bundle.id, provider, currency, amount: priceAmount, billingPeriod: "NONE", providerPriceId, isActive: true }, create: { id: `price-bundle-demo-professional-${provider.toLowerCase()}`, productId: bundle.id, provider, currency, amount: priceAmount, billingPeriod: "NONE", providerPriceId, isActive: true } });
  await prisma.promotion.upsert({ where: { code: "WELCOME10" }, update: { type: "PERCENT", amount: 10, maxDiscount: 1000, isActive: true }, create: { id: "promotion-welcome10", code: "WELCOME10", type: "PERCENT", amount: 10, maxDiscount: 1000, isActive: true, perUserLimit: 1 } });
  for (const entry of vocabulary) {
    await prisma.word.upsert({
      where: { normalizedLemma_partOfSpeech: { normalizedLemma: entry.normalizedLemma, partOfSpeech: entry.partOfSpeech } },
      update: {
        lemma: entry.lemma,
        cefrLevel: entry.cefrLevel,
        britishTranscription: entry.britishTranscription ?? null,
        americanTranscription: entry.americanTranscription ?? null,
        isPhrasalVerb: entry.isPhrasalVerb ?? false,
        meanings: { deleteMany: {}, create: entry.meanings.map((meaning, index) => ({ ...meaning, order: index + 1 })) },
        examples: { deleteMany: {}, create: entry.examples.map((example, index) => ({ ...example, order: index + 1 })) },
        collocations: { deleteMany: {}, create: entry.collocations.map((collocation, index) => ({ ...collocation, order: index + 1 })) },
      },
      create: {
        ...entry,
        meanings: { create: entry.meanings.map((meaning, index) => ({ ...meaning, order: index + 1 })) },
        examples: { create: entry.examples.map((example, index) => ({ ...example, order: index + 1 })) },
        collocations: { create: entry.collocations.map((collocation, index) => ({ ...collocation, order: index + 1 })) },
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
