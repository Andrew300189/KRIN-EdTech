/*
 * Shared importer for the authored continuous-tense mastery courses. It keeps
 * every course in the existing Course -> Module -> Lesson -> Block -> Exercise
 * model and leaves learner-owned records untouched.
 */
try {
  require("dotenv").config({ path: ".env", quiet: true });
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const PRACTICE_PER_FRAGMENT = 12;
const LESSON_DURATION_MINUTES = 55;
const CURRICULUM_ROLES = new Set(["OVERVIEW", "DEEP_DIVE", "PRACTICE", "REVIEW", "FINAL"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function task(id, type, engineKey, variantKey, instruction, question, content, correctAnswer, explanation, hint, skillSlug, alternativeAnswers) {
  return { id, type, engineKey, variantKey, instruction, question, content, correctAnswer, explanation, hint, skillSlug, alternativeAnswers };
}

function blockTypeFor(focus) {
  const text = focus.toLowerCase();
  if (text.includes("аудіо") || text.includes("слух")) return "LISTENING";
  if (text.includes("зображ") || text.includes("картина")) return "IMAGE";
  return "THEORY";
}

function stripPunctuation(value) {
  return value.replace(/[?.!]$/u, "");
}

function createContinuousCourseImporter(config) {
  function makeExercises(fragment, skillSlug, serial) {
    const first = config.makeScenario(skillSlug, serial);
    const second = config.makeScenario(skillSlug, serial + 13);
    const third = config.makeScenario(skillSlug, serial + 29);
    const tokens = stripPunctuation(first.correct).split(/\s+/u);
    const errorDetails = [{ incorrect: first.incorrect, correction: first.correct, explanation: first.rule }];
    const options = [second.answer, config.defaultAuxiliaryOne, config.defaultAuxiliaryTwo, config.defaultAuxiliaryThree]
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index);

    return [
      task("choice", "SINGLE_CHOICE", "single-choice", "FORM_SELECTION", "Оберіть граматично правильну форму.", `Яке речення точно відпрацьовує «${fragment.focus}»?`, { options: [first.correct, first.incorrect, second.incorrect], example: first.correct, errorDetails }, first.correct, first.rule, `Формула: ${first.formula}`, skillSlug),
      task("multi", "MULTIPLE_CHOICE", "multiple-choice", "MULTI_SELECT", "Оберіть усі правильні варіанти.", "Виберіть речення без граматичної помилки.", { options: [first.correct, second.correct, third.incorrect], example: first.correct, errorDetails: [{ incorrect: third.incorrect, correction: third.correct, explanation: third.rule }] }, [first.correct, second.correct], first.rule, "Перевірте допоміжне дієслово, not і форму V-ing.", skillSlug),
      task("matching", "MATCHING", "matching", "PAIR_MATCHING", "Зіставте приклад із його значенням.", "Знайдіть правильну пару.", { left: [first.correct, first.incorrect], right: [first.translation, "Граматична помилка"], example: first.correct }, { [first.correct]: first.translation, [first.incorrect]: "Граматична помилка" }, first.rule, "Шукайте форму, яка відповідає правилу.", skillSlug),
      task("gap", "FILL_IN_THE_BLANK", "fill-in-the-blanks", "GAP_FILL", "Впишіть точну форму.", first.prompt, { acceptedAnswers: [first.answer], ignorePunctuation: true, example: first.correct, errorDetails }, first.answer, first.rule, `Зосередьтеся на фрагменті: ${fragment.focus}.`, skillSlug),
      task("auxiliary", "SINGLE_CHOICE", "single-choice", "AUXILIARY_SELECTION", "Оберіть потрібну форму або частину форми.", second.prompt, { options, example: second.correct, errorDetails: [{ incorrect: second.incorrect, correction: second.correct, explanation: second.rule }] }, second.answer, second.rule, "Почніть із підмета та визначте потрібну конструкцію.", skillSlug),
      task("spelling", "TEXT_INPUT", "text-input", "ING_SPELLING", "Напишіть правильну форму без варіантів.", third.prompt, { acceptedAnswers: [third.answer], ignorePunctuation: true, example: third.correct, errorDetails: [{ incorrect: third.incorrect, correction: third.correct, explanation: third.rule }] }, third.answer, third.rule, "Перевірте форму to be та написання дієслова з -ing.", skillSlug),
      task("builder", "SENTENCE_ORDER", "sentence-builder", "SENTENCE_ORDER", "Розташуйте слова у правильному порядку.", `Побудуйте точне речення ${config.grammarName}.`, { options: tokens, preserveOrder: true, example: first.correct, errorDetails }, tokens, first.rule, "Перевірте порядок підмета, to be та V-ing.", skillSlug),
      task("correction", "ERROR_CORRECTION", "find-and-correct", "ERROR_CORRECTION", "Виправте речення, не змінюючи його зміст.", first.incorrect, { acceptedAnswers: [first.correct, stripPunctuation(first.correct)], ignorePunctuation: true, example: first.correct, errorDetails }, first.correct, `Правильно: ${first.correct} ${first.rule}`, "Виправте саме граматичну форму.", skillSlug, [stripPunctuation(first.correct)]),
      task("transform", "TENSE_TRANSFORMATION", "tense-transformation", "TRANSFORMATION", "Перетворіть речення на потрібну форму.", second.incorrect, { acceptedAnswers: [second.correct, stripPunctuation(second.correct)], ignorePunctuation: true, example: second.correct, errorDetails: [{ incorrect: second.incorrect, correction: second.correct, explanation: second.rule }] }, second.correct, second.rule, "Не втрачайте to be, not або -ing під час перетворення.", skillSlug, [stripPunctuation(second.correct)]),
      task("translation", "SENTENCE_TRANSLATION", "translation", "SENTENCE_TRANSLATION", "Перекладіть речення англійською.", third.translation, { acceptedAnswers: [third.correct, stripPunctuation(third.correct)], ignorePunctuation: true, example: third.correct }, third.correct, third.rule, "Передайте значення ситуації, а не лише окремі слова.", skillSlug, [stripPunctuation(third.correct)]),
      task("context", "SINGLE_CHOICE", "single-choice", "CONTEXT_SELECTION", "Оберіть форму, що відповідає контексту.", `Контекст: ${first.translation}. Яке речення точне?`, { options: [first.correct, first.incorrect, third.incorrect], example: first.correct, errorDetails }, first.correct, first.rule, "Часові слова допомагають, але головне — значення ситуації.", skillSlug),
      task("production", "TEXT_INPUT", "text-input", "FREE_RESPONSE", "Напишіть речення самостійно.", first.translation, { acceptedAnswers: [first.correct, stripPunctuation(first.correct)], ignorePunctuation: true, example: first.correct }, first.correct, `Правильний варіант: ${first.correct}. ${first.rule}`, `Формула: ${first.formula}`, skillSlug, [stripPunctuation(first.correct)]),
    ];
  }

  function fragmentBlocks(lessonPlan, moduleIndex, focus, fragmentIndex, offset) {
    const skillSlug = config.inferSkill(moduleIndex, focus, fragmentIndex);
    const scenario = config.makeScenario(skillSlug, moduleIndex * 10_000 + lessonPlan.order * 100 + fragmentIndex);
    const key = `${lessonPlan.slug}-fragment-${fragmentIndex + 1}`;
    const type = blockTypeFor(focus);
    const media = type === "LISTENING"
      ? { transcript: scenario.correct, transcriptTranslation: scenario.translation, accessibleText: scenario.correct, audioRequiredInCms: true }
      : type === "IMAGE"
        ? { alt: config.imageAlt, imagePrompt: scenario.correct, accessibleText: scenario.translation, imageRequiredInCms: true }
        : null;
    return [
      {
        type,
        title: focus,
        content: {
          text: scenario.rule,
          formula: scenario.formula,
          examples: [scenario.correct, config.makeScenario(skillSlug, fragmentIndex + 17).correct, config.makeScenario(skillSlug, fragmentIndex + 31).correct],
          translation: scenario.translation,
          commonMistake: scenario.incorrect,
          correction: scenario.correct,
          typicalContext: config.typicalContext,
          ...media,
        },
        learningFragmentKey: key,
        isLearningFragment: true,
        requiresTwelveExercises: false,
        order: offset + 1,
        grammarSkillSlugs: [skillSlug],
      },
      {
        type: "EXERCISE",
        title: `Практика: ${focus}`,
        content: { text: "12 різнотипних вправ: вибір, зіставлення, пропуск, правопис, порядок слів, виправлення, трансформація, переклад, контекст і самостійна відповідь.", exerciseCount: PRACTICE_PER_FRAGMENT },
        settings: { adaptiveSkillReview: true, exerciseSequence: "twelve-step" },
        learningFragmentKey: key,
        isLearningFragment: false,
        requiresTwelveExercises: true,
        order: offset + 2,
        grammarSkillSlugs: [skillSlug],
        exercises: makeExercises({ focus }, skillSlug, moduleIndex * 10_000 + lessonPlan.order * 100 + fragmentIndex),
      },
    ];
  }

  function reviewBlock(lessonPlan, moduleIndex, afterFragment, order) {
    const focuses = lessonPlan.topics.slice(afterFragment - 3, afterFragment);
    const grammarSkillSlugs = [...new Set(focuses.map((focus, index) => config.inferSkill(moduleIndex, focus, index + afterFragment - 3)))];
    return {
      type: "REVIEW",
      title: `Міні-повторення: фрагменти ${afterFragment - 2}–${afterFragment}`,
      content: { text: "Поверніться до трьох щойно вивчених правил. Після двох помилок за однією навичкою платформа додає її до персональної черги повторення.", focuses },
      settings: { reviewAfterFragment: afterFragment, adaptiveSkillReview: true },
      order,
      grammarSkillSlugs,
    };
  }

  function buildPlan() {
    const skills = config.skills.map(([slug, title, description], order) => ({ slug, title, description, order: order + 1 }));
    return {
      course: config.course,
      skills,
      modules: config.modules.map((modulePlan, moduleIndex) => ({
        ...modulePlan,
        order: moduleIndex + 1,
        lessons: modulePlan.lessons.map((lessonPlan, lessonIndex) => {
          const order = lessonIndex + 1;
          const orderedLesson = { ...lessonPlan, order };
          const skillSlugs = [...new Set(lessonPlan.topics.map((focus, fragmentIndex) => config.inferSkill(moduleIndex, focus, fragmentIndex)))];
          const fragments = lessonPlan.topics.flatMap((focus, fragmentIndex) => fragmentBlocks(orderedLesson, moduleIndex, focus, fragmentIndex, fragmentIndex * 2));
          const mixedExercises = Array.from({ length: PRACTICE_PER_FRAGMENT }, (_, index) => {
            const skillSlug = skillSlugs[index % skillSlugs.length];
            return makeExercises({ focus: lessonPlan.topics[index % lessonPlan.topics.length] }, skillSlug, moduleIndex * 50_000 + order * 1_000 + index * 12)[index];
          });
          const reviews = [3, 6, 9].map((afterFragment, reviewIndex) => reviewBlock(lessonPlan, moduleIndex, afterFragment, 21 + reviewIndex));
          return {
            ...lessonPlan,
            order,
            estimatedDuration: LESSON_DURATION_MINUTES,
            minimumCompletionScore: lessonPlan.role === "FINAL" ? 75 : 60,
            skillSlugs,
            description: `${lessonPlan.title}. Десять навчальних фрагментів, 120 пояснених вправ, три міні-повторення і підсумкова змішана практика.`,
            learningObjectives: skillSlugs.map((slug) => skills.find((skill) => skill.slug === slug)?.title ?? slug),
            previewText: "10 навчальних фрагментів і 120 вправ із перевіркою та поясненням помилок.",
            blocks: [
              ...fragments,
              ...reviews,
              {
                type: "EXERCISE",
                title: "Змішана практика наприкінці уроку",
                content: { text: "12 підсумкових вправ на різні навички уроку.", mixedPractice: true },
                learningFragmentKey: `${lessonPlan.slug}-fragment-10`,
                isLearningFragment: false,
                requiresTwelveExercises: true,
                order: 24,
                grammarSkillSlugs: skillSlugs,
                exercises: mixedExercises,
              },
              {
                type: "REVIEW",
                title: lessonPlan.role === "FINAL" ? "Фінальна перевірка модуля" : "Підсумок уроку й наступний крок",
                content: { text: "Перегляньте правила, приклади та особисті слабкі навички. Після завершення доступний перехід до наступного уроку.", finalSummary: true, nextLessonEnabled: true },
                settings: { finalLessonReview: lessonPlan.role === "FINAL", minimumScore: lessonPlan.role === "FINAL" ? 75 : 60 },
                order: 25,
                grammarSkillSlugs: [skillSlugs.at(-1) ?? config.skills[0][0]],
              },
            ].sort((left, right) => left.order - right.order),
          };
        }),
      })),
    };
  }

  function validatePlan(plan) {
    assert(plan.modules.length === 4, `${config.grammarName} must contain exactly four modules.`);
    assert(plan.skills.length === config.skills.length, `${config.grammarName} has an incomplete skill map.`);
    const skillSlugs = new Set(plan.skills.map((skill) => skill.slug));
    let lessonCount = 0;
    let blockCount = 0;
    let exerciseCount = 0;
    for (const modulePlan of plan.modules) {
      assert(modulePlan.lessons.length === 10, `${modulePlan.slug} must contain exactly ten lessons.`);
      assert(modulePlan.lessons[0].role === "OVERVIEW", `${modulePlan.slug} must start with an overview.`);
      assert(modulePlan.lessons.at(-1).role === "FINAL", `${modulePlan.slug} must end with a final.`);
      for (const lessonPlan of modulePlan.lessons) {
        lessonCount += 1;
        assert(CURRICULUM_ROLES.has(lessonPlan.role), `${lessonPlan.slug} has an unsupported curriculum role.`);
        assert(lessonPlan.topics.length === 10, `${lessonPlan.slug} must have ten learning fragments.`);
        assert(new Set(lessonPlan.blocks.map((block) => block.order)).size === lessonPlan.blocks.length, `${lessonPlan.slug} must assign a unique order to every block.`);
        const fragments = lessonPlan.blocks.filter((block) => block.isLearningFragment);
        assert(fragments.length === 10, `${lessonPlan.slug} must persist ten theory fragments.`);
        for (const block of lessonPlan.blocks) {
          blockCount += 1;
          assert(block.grammarSkillSlugs?.every((slug) => skillSlugs.has(slug)), `${lessonPlan.slug} has an unknown skill link.`);
          if (!block.requiresTwelveExercises) continue;
          assert(block.exercises?.length === PRACTICE_PER_FRAGMENT, `${block.learningFragmentKey} must have exactly twelve exercises.`);
          assert(fragments.some((fragment) => fragment.learningFragmentKey === block.learningFragmentKey), `${block.learningFragmentKey} needs a matching theory fragment.`);
          for (const exercise of block.exercises) {
            exerciseCount += 1;
            assert(exercise.correctAnswer !== undefined && exercise.correctAnswer !== null, `${block.learningFragmentKey} has an answerless exercise.`);
            assert(Boolean(exercise.explanation?.trim()), `${block.learningFragmentKey} has an unexplained exercise.`);
            assert(skillSlugs.has(exercise.skillSlug), `${block.learningFragmentKey} exercise lacks a valid skill.`);
          }
        }
      }
    }
    return { modules: plan.modules.length, lessons: lessonCount, blocks: blockCount, exercises: exerciseCount, skills: plan.skills.length };
  }

  function lifecycle(publish) {
    return publish ? { isPublished: true, contentStatus: "PUBLISHED", publishedAt: new Date() } : { isPublished: false, contentStatus: "DRAFT", publishedAt: null };
  }

  async function importCourse(plan, publish) {
    const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required to import an authored course.");
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try {
      const existing = await prisma.course.findUnique({ where: { slug: config.course.slug }, select: { id: true } });
      if (existing) return { status: "already-exists", courseId: existing.id };
      const [level, category, author] = await Promise.all([
        prisma.languageLevel.findUnique({ where: { code: "A1" }, select: { id: true, contentStatus: true } }),
        prisma.courseCategory.findUnique({ where: { slug: "general-english" }, select: { id: true, contentStatus: true } }),
        prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } }),
      ]);
      if (!level || !category || !author) throw new Error("The A1 level, General English category and a platform author are required before import.");
      if (publish && (level.contentStatus !== "PUBLISHED" || category.contentStatus !== "PUBLISHED")) throw new Error("Publish the A1 level and General English category before this course.");
      const planCounts = validatePlan(plan);
      const course = await prisma.$transaction(async (tx) => {
        const state = lifecycle(publish);
        const createdCourse = await tx.course.create({ data: {
          levelId: level.id, categoryId: category.id, slug: config.course.slug, title: config.course.title,
          shortDescription: config.course.shortDescription, fullDescription: config.course.fullDescription, language: "uk",
          estimatedDuration: plan.modules.reduce((sum, modulePlan) => sum + modulePlan.lessons.length * LESSON_DURATION_MINUTES, 0), lessonCount: 40,
          difficulty: "A1", courseType: "SKILL", accessMode: "FREE", accessPlan: "FREE", firstFreeLessonCount: 40,
          isVisibleInCatalog: true, isVisibleInSearch: true, isVisibleInLevelBlock: true, isVisibleInAcademy: true, isVisibleInStudentDashboard: true,
          legacyLevel: "BEGINNER", instructorId: author.id, createdById: author.id, updatedById: author.id,
          learningOutcomes: config.course.learningOutcomes, prerequisites: config.course.prerequisites, ...state,
        } });
        await tx.grammarSkill.createMany({ data: plan.skills.map((skill) => ({ ...skill, courseId: createdCourse.id })) });
        const storedSkills = await tx.grammarSkill.findMany({ where: { courseId: createdCourse.id }, select: { id: true, slug: true } });
        const skillIds = new Map(storedSkills.map((skill) => [skill.slug, skill.id]));
        let previousModuleId = null;
        for (const modulePlan of plan.modules) {
          const createdModule = await tx.courseModule.create({ data: { courseId: createdCourse.id, title: modulePlan.title, description: modulePlan.description, order: modulePlan.order, isRequired: true, requiresSequentialCompletion: Boolean(previousModuleId), unlockAfterModuleId: previousModuleId, requiredCompletionPercent: 100, minimumFinalLessonScore: 75, ...state } });
          let previousLessonId = null;
          for (const lessonPlan of modulePlan.lessons) {
            const lessonSkillIds = lessonPlan.skillSlugs.map((slug) => skillIds.get(slug)).filter(Boolean);
            const lesson = await tx.lesson.create({ data: { moduleId: createdModule.id, prerequisiteLessonId: previousLessonId, requiredPrerequisiteCompletion: 100, autoUnlockNextLesson: true, slug: lessonPlan.slug, title: lessonPlan.title, description: lessonPlan.description, type: "GRAMMAR", curriculumRole: lessonPlan.role, order: lessonPlan.order, estimatedDuration: lessonPlan.estimatedDuration, minimumCompletionScore: lessonPlan.minimumCompletionScore, learningObjectives: lessonPlan.learningObjectives, previewText: lessonPlan.previewText, isFree: true, grammarSkills: { create: lessonSkillIds.map((grammarSkillId) => ({ grammarSkillId })) }, ...state } });
            for (const blockPlan of lessonPlan.blocks) {
              const blockSkillIds = blockPlan.grammarSkillSlugs.map((slug) => skillIds.get(slug)).filter(Boolean);
              const contentState = publish ? { contentStatus: "PUBLISHED", publishedAt: new Date() } : { contentStatus: "DRAFT", publishedAt: null };
              const block = await tx.lessonBlock.create({ data: { lessonId: lesson.id, type: blockPlan.type, title: blockPlan.title, content: blockPlan.content, settings: blockPlan.settings, learningFragmentKey: blockPlan.learningFragmentKey, isLearningFragment: Boolean(blockPlan.isLearningFragment), requiresTwelveExercises: Boolean(blockPlan.requiresTwelveExercises), order: blockPlan.order, isRequired: true, grammarSkills: { create: blockSkillIds.map((grammarSkillId) => ({ grammarSkillId })) }, ...contentState } });
              for (const [exerciseIndex, exercisePlan] of (blockPlan.exercises ?? []).entries()) {
                const grammarSkillId = skillIds.get(exercisePlan.skillSlug);
                if (!grammarSkillId) throw new Error(`Unknown grammar skill in ${lessonPlan.slug}.`);
                await tx.exercise.create({ data: { lessonBlockId: block.id, type: exercisePlan.type, engineKey: exercisePlan.engineKey, variantKey: exercisePlan.variantKey, instruction: exercisePlan.instruction, question: exercisePlan.question, content: exercisePlan.content, correctAnswer: exercisePlan.correctAnswer, alternativeAnswers: exercisePlan.alternativeAnswers, explanation: exercisePlan.explanation, hint: exercisePlan.hint, hintsEnabled: true, difficulty: 2, basePoints: 2, allowInstantCheck: true, allowExtraExercise: true, order: exerciseIndex + 1, grammarSkills: { create: { grammarSkillId } }, ...contentState } });
              }
            }
            previousLessonId = lesson.id;
          }
          previousModuleId = createdModule.id;
        }
        await tx.cmsContentVersion.create({ data: { entityType: "COURSE", entityId: createdCourse.id, version: 1, action: "IMPORTED", snapshot: { import: config.course.slug, publish, counts: planCounts }, actorId: author.id } });
        await tx.contentAuditLog.create({ data: { actorId: author.id, action: `CMS_${config.auditKey}_COURSE_IMPORTED`, entityType: "Course", entityId: createdCourse.id, metadata: { publish, counts: planCounts } } });
        return createdCourse;
      }, { maxWait: 60_000, timeout: 600_000 });
      const counts = await Promise.all([
        prisma.courseModule.count({ where: { courseId: course.id } }),
        prisma.lesson.count({ where: { module: { courseId: course.id } } }),
        prisma.lessonBlock.count({ where: { lesson: { module: { courseId: course.id } } } }),
        prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { courseId: course.id } } } } }),
        prisma.grammarSkill.count({ where: { courseId: course.id } }),
      ]);
      assert(counts.every((count, index) => count === [planCounts.modules, planCounts.lessons, planCounts.blocks, planCounts.exercises, planCounts.skills][index]), `The stored ${config.grammarName} course does not match the validated plan.`);
      return { status: publish ? "published" : "draft-imported", courseId: course.id, counts: planCounts };
    } finally {
      await prisma.$disconnect();
    }
  }

  async function main() {
    const plan = buildPlan();
    const counts = validatePlan(plan);
    if (process.argv.includes("--validate")) {
      console.log(JSON.stringify({ status: "valid", course: config.course.slug, ...counts }));
      return;
    }
    console.log(JSON.stringify(await importCourse(plan, process.argv.includes("--publish"))));
  }

  return { buildPlan, validatePlan, importCourse, main };
}

module.exports = { createContinuousCourseImporter, PRACTICE_PER_FRAGMENT };
