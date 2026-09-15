/*
 * Imports a draft professional-English course. The learner engine itself lives
 * in the app; this script only supplies its 100 authored dental terms, nine
 * sequential lessons and one server-owned mastery block in every lesson.
 *
 * Usage:
 *   node database/scripts/import-dental-english-vocabulary-mastery.cjs --validate
 *   node database/scripts/import-dental-english-vocabulary-mastery.cjs
 *   node database/scripts/import-dental-english-vocabulary-mastery.cjs --publish
 */
try {
  require("dotenv").config({ path: ".env", quiet: true });
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const COURSE_SLUG = "english-for-dentists-vocabulary";
const publishRequested = process.argv.includes("--publish");
const words = [
  ["dentist", "стоматолог"],
  ["dental clinic", "стоматологическая клиника"],
  ["patient", "пациент"],
  ["appointment", "приём"],
  ["tooth", "зуб"],
  ["teeth", "зубы"],
  ["gum", "десна"],
  ["jaw", "челюсть"],
  ["tongue", "язык"],
  ["palate", "нёбо"],
  ["cheek", "щека"],
  ["saliva", "слюна"],
  ["enamel", "эмаль"],
  ["dentin", "дентин"],
  ["pulp", "пульпа"],
  ["root", "корень зуба"],
  ["crown", "коронка"],
  ["filling", "пломба"],
  ["cavity", "кариозная полость"],
  ["tooth decay", "кариес"],
  ["plaque", "зубной налёт"],
  ["tartar", "зубной камень"],
  ["dental floss", "зубная нить"],
  ["toothbrush", "зубная щётка"],
  ["toothpaste", "зубная паста"],
  ["mouthwash", "ополаскиватель для рта"],
  ["rinse", "полоскать"],
  ["brush your teeth", "чистить зубы"],
  ["dental hygiene", "гигиена полости рта"],
  ["check-up", "профилактический осмотр"],
  ["examination", "обследование"],
  ["X-ray", "рентгеновский снимок"],
  ["diagnosis", "диагноз"],
  ["dental chart", "стоматологическая карта"],
  ["treatment plan", "план лечения"],
  ["symptom", "симптом"],
  ["toothache", "зубная боль"],
  ["sensitivity", "чувствительность"],
  ["swelling", "отёк"],
  ["bleeding gums", "кровоточивость дёсен"],
  ["bad breath", "неприятный запах изо рта"],
  ["numb", "онемевший"],
  ["anaesthetic", "анестетик"],
  ["local anaesthesia", "местная анестезия"],
  ["injection", "укол"],
  ["drill", "бормашина"],
  ["scaler", "скейлер"],
  ["dental probe", "стоматологический зонд"],
  ["dental mirror", "стоматологическое зеркало"],
  ["forceps", "щипцы"],
  ["suction", "слюноотсос"],
  ["sterilise", "стерилизовать"],
  ["protective gloves", "защитные перчатки"],
  ["dental bib", "стоматологический нагрудник"],
  ["composite", "композит"],
  ["temporary filling", "временная пломба"],
  ["root canal", "корневой канал"],
  ["root canal treatment", "лечение корневых каналов"],
  ["extraction", "удаление зуба"],
  ["wisdom tooth", "зуб мудрости"],
  ["dental implant", "зубной имплант"],
  ["implant post", "имплантационный штифт"],
  ["denture", "зубной протез"],
  ["bridge", "мостовидный протез"],
  ["veneer", "винир"],
  ["braces", "брекеты"],
  ["aligner", "элайнер"],
  ["retainer", "ретейнер"],
  ["bite", "прикус"],
  ["overbite", "глубокий прикус"],
  ["orthodontist", "ортодонт"],
  ["periodontist", "пародонтолог"],
  ["oral surgeon", "челюстно-лицевой хирург"],
  ["dental hygienist", "стоматологический гигиенист"],
  ["cavity filling", "пломбирование"],
  ["dental restoration", "реставрация зуба"],
  ["polish", "полировать"],
  ["teeth whitening", "отбеливание зубов"],
  ["whitening tray", "капа для отбеливания"],
  ["dental sealant", "герметик для фиссур"],
  ["fluoride", "фтор"],
  ["fluoride treatment", "фторирование"],
  ["periodontal disease", "заболевание пародонта"],
  ["gingivitis", "гингивит"],
  ["periodontitis", "пародонтит"],
  ["abscess", "абсцесс"],
  ["infection", "инфекция"],
  ["emergency appointment", "срочный приём"],
  ["cracked tooth", "треснувший зуб"],
  ["chipped tooth", "сколотый зуб"],
  ["loose tooth", "подвижный зуб"],
  ["replace a filling", "заменить пломбу"],
  ["open your mouth", "откройте рот"],
  ["bite down", "сомкните зубы"],
  ["rinse your mouth", "прополощите рот"],
  ["spit out", "сплюньте"],
  ["does it hurt?", "вам больно?"],
  ["take a deep breath", "сделайте глубокий вдох"],
  ["next appointment", "следующий приём"],
  ["aftercare instructions", "рекомендации по уходу после лечения"],
];

// The course has one English prompt set and two learner-facing target
// languages. Keep these translations with the authored course rather than a
// user's personal dictionary preference.
const ukrainianTranslations = {
  "dentist": "стоматолог", "dental clinic": "стоматологічна клініка", "patient": "пацієнт", "appointment": "прийом",
  "tooth": "зуб", "teeth": "зуби", "gum": "ясна", "jaw": "щелепа", "tongue": "язик", "palate": "піднебіння", "cheek": "щока", "saliva": "слина",
  "enamel": "емаль", "dentin": "дентин", "pulp": "пульпа", "root": "корінь зуба", "crown": "коронка", "filling": "пломба", "cavity": "каріозна порожнина", "tooth decay": "карієс",
  "plaque": "зубний наліт", "tartar": "зубний камінь", "dental floss": "зубна нитка", "toothbrush": "зубна щітка", "toothpaste": "зубна паста", "mouthwash": "ополіскувач для рота",
  "rinse": "полоскати", "brush your teeth": "чистити зуби", "dental hygiene": "гігієна порожнини рота", "check-up": "профілактичний огляд", "examination": "обстеження", "X-ray": "рентгенівський знімок",
  "diagnosis": "діагноз", "dental chart": "стоматологічна карта", "treatment plan": "план лікування", "symptom": "симптом", "toothache": "зубний біль", "sensitivity": "чутливість",
  "swelling": "набряк", "bleeding gums": "кровоточивість ясен", "bad breath": "неприємний запах з рота", "numb": "онімілий", "anaesthetic": "анестетик", "local anaesthesia": "місцева анестезія",
  "injection": "ін'єкція", "drill": "бормашина", "scaler": "скейлер", "dental probe": "стоматологічний зонд", "dental mirror": "стоматологічне дзеркало", "forceps": "щипці",
  "suction": "слиновідсмоктувач", "sterilise": "стерилізувати", "protective gloves": "захисні рукавички", "dental bib": "стоматологічний нагрудник", "composite": "композит", "temporary filling": "тимчасова пломба",
  "root canal": "кореневий канал", "root canal treatment": "лікування кореневих каналів", "extraction": "видалення зуба", "wisdom tooth": "зуб мудрості", "dental implant": "зубний імплантат", "implant post": "імплантаційний штифт",
  "denture": "зубний протез", "bridge": "мостоподібний протез", "veneer": "вінір", "braces": "брекети", "aligner": "елайнер", "retainer": "ретейнер", "bite": "прикус", "overbite": "глибокий прикус",
  "orthodontist": "ортодонт", "periodontist": "пародонтолог", "oral surgeon": "щелепно-лицевий хірург", "dental hygienist": "стоматологічний гігієніст", "cavity filling": "пломбування", "dental restoration": "реставрація зуба",
  "polish": "полірувати", "teeth whitening": "відбілювання зубів", "whitening tray": "капа для відбілювання", "dental sealant": "герметик для фісур", "fluoride": "фтор", "fluoride treatment": "фторування",
  "periodontal disease": "захворювання пародонту", "gingivitis": "гінгівіт", "periodontitis": "пародонтит", "abscess": "абсцес", "infection": "інфекція", "emergency appointment": "терміновий прийом",
  "cracked tooth": "тріснутий зуб", "chipped tooth": "відколотий зуб", "loose tooth": "рухомий зуб", "replace a filling": "замінити пломбу", "open your mouth": "відкрийте рот", "bite down": "зімкніть зуби",
  "rinse your mouth": "прополощіть рот", "spit out": "сплюньте", "does it hurt?": "вам боляче?", "take a deep breath": "зробіть глибокий вдих", "next appointment": "наступний прийом", "aftercare instructions": "рекомендації з догляду після лікування",
};

const lessonTitles = [
  "1. First visit: people and oral anatomy",
  "2. Tooth structure and daily care",
  "3. Examination: symptoms and diagnosis",
  "4. At the chair: anaesthesia and instruments",
  "5. Restorations and root canal treatment",
  "6. Implants, prosthetics and orthodontics",
  "7. Prevention and gum health",
  "8. Dental emergencies and clear instructions",
  "9. Professional recall: final dental vocabulary",
];

function normalizeLemma(value) {
  return value.toLocaleLowerCase("en").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function normalizeLocalizedTranslationKey(value) {
  return value.toLocaleLowerCase("en").trim().replace(/\s+/g, " ");
}

function localizedTranslations() {
  return {
    ru: Object.fromEntries(words.map(([lemma, translation]) => [normalizeLocalizedTranslationKey(lemma), translation])),
    uk: Object.fromEntries(words.map(([lemma]) => [normalizeLocalizedTranslationKey(lemma), ukrainianTranslations[lemma]])),
  };
}

const courseLocaleCopy = {
  ru: {
    title: "Английский для стоматологов: 100 ключевых слов и фраз",
    shortDescription: "100 ключевых стоматологических терминов и фраз: произношение, строгие серии перевода и накопительное повторение.",
    fullDescription: "Профессиональный словарный курс для стоматологов. Каждый урок знакомит максимум с двенадцатью терминами, а затем закрепляет их через произношение и переводы подряд.",
  },
  uk: {
    title: "Англійська для стоматологів: 100 ключових слів і фраз",
    shortDescription: "100 ключових стоматологічних термінів і фраз: вимова, строгі серії перекладу та накопичувальне повторення.",
    fullDescription: "Професійний словниковий курс для стоматологів. Кожен урок знайомить максимум із дванадцятьма термінами, а потім закріплює їх через вимову та послідовні переклади.",
  },
};

async function synchronizeCourseTranslations(prisma, courseId, isPublished) {
  const status = isPublished ? "PUBLISHED" : "DRAFT";
  const publishedAt = isPublished ? new Date() : null;
  await Promise.all(Object.entries(courseLocaleCopy).map(([locale, value]) => prisma.courseTranslation.upsert({
    where: { courseId_locale: { courseId, locale } },
    update: isPublished ? { contentStatus: status, publishedAt } : {},
    create: { courseId, locale, slug: COURSE_SLUG, ...value, contentStatus: status, publishedAt },
  })));
}

function stageCount(wordCount) {
  const groups = Math.ceil(wordCount / 4);
  let count = 0;
  for (let group = 0; group < groups; group += 1) {
    const size = Math.min(4, wordCount - group * 4);
    count += size * 3;
    count += Math.max(0, size - 1) * 2;
    if (group === 1) count += 2;
  }
  return count + 2;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function courseState() {
  if (publishRequested) {
    return { isPublished: true, contentStatus: "PUBLISHED", publishedAt: new Date(), scheduledAt: null, archivedAt: null };
  }
  return { isPublished: false, contentStatus: "DRAFT", publishedAt: null, scheduledAt: null, archivedAt: null };
}

function blockState() {
  if (publishRequested) {
    return { contentStatus: "PUBLISHED", publishedAt: new Date(), scheduledAt: null, archivedAt: null };
  }
  return { contentStatus: "DRAFT", publishedAt: null, scheduledAt: null, archivedAt: null };
}

async function publishExistingCourse(prisma, courseId, actorId, counts) {
  const publishedAt = new Date();
  const lifecycle = { contentStatus: "PUBLISHED", publishedAt, scheduledAt: null, archivedAt: null };
  await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id: courseId },
      data: { ...lifecycle, isPublished: true, isVisibleOnHomepage: true, isVisibleInCatalog: true, isVisibleInSearch: true, updatedById: actorId },
    });
    await tx.courseModule.updateMany({ where: { courseId }, data: { ...lifecycle, isPublished: true } });
    await tx.lesson.updateMany({ where: { module: { courseId } }, data: { ...lifecycle, isPublished: true } });
    await tx.lessonBlock.updateMany({ where: { lesson: { module: { courseId } } }, data: lifecycle });
    await tx.exercise.updateMany({ where: { lessonBlock: { lesson: { module: { courseId } } } }, data: lifecycle });
    const latestVersion = await tx.cmsContentVersion.aggregate({ where: { entityType: "COURSE", entityId: courseId }, _max: { version: true } });
    await tx.cmsContentVersion.create({
      data: {
        entityType: "COURSE",
        entityId: courseId,
        version: (latestVersion._max.version ?? 0) + 1,
        action: "PUBLISHED",
        snapshot: { importer: "dental-vocabulary-mastery", course: COURSE_SLUG, ...counts, status: "PUBLISHED" },
        actorId,
      },
    });
    await tx.contentAuditLog.create({
      data: { actorId, action: "CMS_DENTAL_VOCABULARY_COURSE_PUBLISHED", entityType: "Course", entityId: courseId, metadata: { ...counts, status: "PUBLISHED" } },
    });
  }, { maxWait: 60_000, timeout: 600_000 });
}

async function synchronizeLocalizedMasteryBlocks(prisma, courseId) {
  const blocks = await prisma.lessonBlock.findMany({
    where: { lesson: { module: { courseId } }, type: "VOCABULARY" },
    select: { id: true, settings: true },
  });
  const translations = localizedTranslations();
  const updates = blocks
    .filter((block) => block.settings && typeof block.settings === "object" && !Array.isArray(block.settings))
    .map((block) => ({ id: block.id, settings: block.settings }))
    .filter((block) => block.settings.engine === "vocabulary-mastery" && block.settings.localizationVersion !== 1)
    .map((block) => prisma.lessonBlock.update({
      where: { id: block.id },
      data: { settings: { ...block.settings, localizedTranslations: translations, localizationVersion: 1 } },
    }));
  if (updates.length) await prisma.$transaction(updates);
  return updates.length;
}

async function main() {
  assert(words.length === 100, `Expected 100 dental words, received ${words.length}.`);
  assert(new Set(words.map(([lemma]) => normalizeLemma(lemma))).size === words.length, "Every dental term must be unique.");
  assert(words.every(([lemma]) => typeof ukrainianTranslations[lemma] === "string" && ukrainianTranslations[lemma].trim()), "Every dental term must have a Ukrainian translation.");
  const counts = { words: words.length, lessons: lessonTitles.length, blocks: lessonTitles.length, exercises: 0 };
  const lessonWords = Array.from({ length: 9 }, (_, lessonIndex) => words.slice(lessonIndex * 12, lessonIndex === 8 ? 100 : lessonIndex * 12 + 12));
  counts.exercises = lessonWords.reduce((sum, group) => sum + stageCount(group.length), 0);

  if (process.argv.includes("--validate")) {
    console.log(JSON.stringify({ status: "valid", course: COURSE_SLUG, ...counts, stageCounts: lessonWords.map((group) => stageCount(group.length)) }));
    return;
  }

  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required to import the dental course.");
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const existing = await prisma.course.findUnique({ where: { slug: COURSE_SLUG }, select: { id: true, updatedById: true, isPublished: true } });
    if (existing) {
      const localizedBlocks = await synchronizeLocalizedMasteryBlocks(prisma, existing.id);
      if (publishRequested) {
        await publishExistingCourse(prisma, existing.id, existing.updatedById, counts);
        await synchronizeCourseTranslations(prisma, existing.id, true);
        console.log(JSON.stringify({ status: "published-existing", courseId: existing.id, localizedBlocks, ...counts }));
      } else {
        await synchronizeCourseTranslations(prisma, existing.id, existing.isPublished);
        console.log(JSON.stringify({ status: "already-exists", courseId: existing.id, localizedBlocks, ...counts }));
      }
      return;
    }
    const [level, category, author] = await Promise.all([
      prisma.languageLevel.findUnique({ where: { code: "B1" }, select: { id: true } }),
      prisma.courseCategory.findUnique({ where: { slug: "general-english" }, select: { id: true } }),
      prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } }),
    ]);
    if (!level || !category || !author) throw new Error("B1, General English and a platform author are required before import.");

    const course = await prisma.$transaction(async (tx) => {
      const state = courseState();
      const storedWords = [];
      for (const [lemma, translation] of words) {
        const word = await tx.word.upsert({
          where: { normalizedLemma_partOfSpeech: { normalizedLemma: normalizeLemma(lemma), partOfSpeech: "PHRASE" } },
          create: {
            lemma,
            normalizedLemma: normalizeLemma(lemma),
            partOfSpeech: "PHRASE",
            cefrLevel: "B1",
            isActive: true,
            contentStatus: "DRAFT",
            meanings: { create: { definition: translation, translation, order: 1 } },
          },
          update: {},
          select: { id: true, lemma: true },
        });
        storedWords.push(word);
      }
      const createdCourse = await tx.course.create({
        data: {
          levelId: level.id,
          categoryId: category.id,
          slug: COURSE_SLUG,
          title: "English for Dentists: 100 Essential Words & Phrases",
          shortDescription: "100 essential dental English terms and phrases with pronunciation, strict recall series and cumulative practice.",
          fullDescription: "A professional vocabulary course for dentists. Each lesson introduces up to twelve terms in three four-word blocks, then returns to them in strict pronunciation and translation series before expanding to cumulative recall.",
          language: "ru",
          estimatedDuration: 595,
          lessonCount: lessonTitles.length,
          difficulty: "B1",
          courseType: "PROFESSIONAL",
          accessMode: "FREE",
          accessPlan: "FREE",
          firstFreeLessonCount: lessonTitles.length,
          isVisibleInCatalog: true,
          isVisibleInSearch: true,
          isVisibleOnHomepage: publishRequested,
          isVisibleInLevelBlock: true,
          isVisibleInAcademy: true,
          isVisibleInStudentDashboard: true,
          legacyLevel: "INTERMEDIATE",
          academySlug: "professional-english",
          pathSlug: "medical-english",
          stageSlug: "dental-vocabulary",
          instructorId: author.id,
          createdById: author.id,
          updatedById: author.id,
          learningOutcomes: ["Pronounce dental terms with a listening model.", "Translate 100 professional dental words and phrases in both directions.", "Recall words in strict consecutive-answer series and cumulative blocks."],
          prerequisites: ["Basic English reading skills (A2+)."],
          ...state,
        },
      });
      const module = await tx.courseModule.create({
        data: {
          courseId: createdCourse.id,
          title: "Dental English vocabulary mastery",
          description: "Nine sequential vocabulary lessons from first appointment language to cumulative professional recall.",
          order: 1,
          isRequired: true,
          requiresSequentialCompletion: false,
          requiredCompletionPercent: 100,
          ...state,
        },
        select: { id: true },
      });

      let previousLessonId = null;
      for (const [lessonIndex, terms] of lessonWords.entries()) {
        const lesson = await tx.lesson.create({
          data: {
            moduleId: module.id,
            prerequisiteLessonId: previousLessonId,
            requiredPrerequisiteCompletion: 100,
            autoUnlockNextLesson: true,
            slug: `dentists-vocabulary-${String(lessonIndex + 1).padStart(2, "0")}`,
            title: lessonTitles[lessonIndex],
            description: `${terms.length} new dental terms. Learn each term through pronunciation, English-to-Russian and Russian-to-English consecutive recall.`,
            type: "VOCABULARY",
            curriculumRole: lessonIndex === 8 ? "FINAL" : lessonIndex === 0 ? "OVERVIEW" : "PRACTICE",
            order: lessonIndex + 1,
            estimatedDuration: terms.length === 4 ? 35 : 70,
            minimumCompletionScore: 0,
            learningObjectives: terms.map(([lemma]) => lemma),
            previewText: `${terms.length} new dental terms with strict recall and pronunciation practice.`,
            isFree: true,
            ...state,
          },
          select: { id: true },
        });
        const currentBlockState = blockState();
        const block = await tx.lessonBlock.create({
          data: {
            lessonId: lesson.id,
            type: "VOCABULARY",
            title: `Mastery block · ${terms.length} dental words`,
            content: {
              text: "Listen and repeat each word three times correctly in a row. Then complete five consecutive translations in both directions. Every group of four is consolidated before the course expands the review pool.",
              engine: "vocabulary-mastery",
              newWordCount: terms.length,
              cumulativeWordCount: Math.min(words.length, (lessonIndex + 1) * 12),
            },
            settings: { engine: "vocabulary-mastery", version: 1, source: "course-lesson-vocabulary", localizedTranslations: localizedTranslations(), localizationVersion: 1 },
            order: 1,
            isRequired: true,
            ...currentBlockState,
          },
          select: { id: true },
        });
        for (const [wordIndex, [lemma]] of terms.entries()) {
          const stored = storedWords.find((candidate) => candidate.lemma === lemma);
          if (!stored) throw new Error(`Missing stored word: ${lemma}`);
          await tx.lessonVocabulary.create({ data: { lessonId: lesson.id, wordId: stored.id, role: "NEW", order: wordIndex + 1, isRequired: true } });
        }
        const stages = stageCount(terms.length);
        for (let stage = 0; stage < stages; stage += 1) {
          await tx.exercise.create({
            data: {
              lessonBlockId: block.id,
              type: "TEXT_INPUT",
              engineKey: "text-input",
              variantKey: "VOCABULARY_MASTERY_STAGE",
              instruction: "Server-owned vocabulary mastery stage.",
              question: `Vocabulary mastery stage ${stage + 1}`,
              content: { engine: "vocabulary-mastery", stage: stage + 1 },
              correctAnswer: "server-owned",
              explanation: "This stage is evaluated by the vocabulary mastery engine.",
              hintsEnabled: false,
              difficulty: 1,
              basePoints: 1,
              allowInstantCheck: true,
              allowExtraExercise: false,
              order: stage + 1,
              ...currentBlockState,
            },
          });
        }
        previousLessonId = lesson.id;
      }
      await tx.cmsContentVersion.create({
        data: {
          entityType: "COURSE",
          entityId: createdCourse.id,
          version: 1,
          action: "IMPORTED",
          snapshot: { importer: "dental-vocabulary-mastery", course: COURSE_SLUG, ...counts, status: publishRequested ? "PUBLISHED" : "DRAFT" },
          actorId: author.id,
        },
      });
      await tx.contentAuditLog.create({
        data: { actorId: author.id, action: "CMS_DENTAL_VOCABULARY_COURSE_IMPORTED", entityType: "Course", entityId: createdCourse.id, metadata: { ...counts, status: publishRequested ? "PUBLISHED" : "DRAFT" } },
      });
      return createdCourse;
    }, { maxWait: 60_000, timeout: 600_000 });

    await synchronizeCourseTranslations(prisma, course.id, publishRequested);
    const [storedLessonCount, storedBlockCount, storedExerciseCount, storedVocabularyCount] = await Promise.all([
      prisma.lesson.count({ where: { module: { courseId: course.id } } }),
      prisma.lessonBlock.count({ where: { lesson: { module: { courseId: course.id } } } }),
      prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { courseId: course.id } } } } }),
      prisma.lessonVocabulary.count({ where: { lesson: { module: { courseId: course.id } } } }),
    ]);
    assert(storedLessonCount === counts.lessons, "Stored lesson count is incorrect.");
    assert(storedBlockCount === counts.blocks, "Stored block count is incorrect.");
    assert(storedExerciseCount === counts.exercises, "Stored mastery-stage count is incorrect.");
    assert(storedVocabularyCount === counts.words, "Stored vocabulary count is incorrect.");
    console.log(JSON.stringify({ status: publishRequested ? "published-imported" : "draft-imported", courseId: course.id, ...counts }));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
