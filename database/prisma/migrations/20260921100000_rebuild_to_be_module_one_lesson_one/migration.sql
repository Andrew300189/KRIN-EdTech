-- Rebuild only Module 1 / Lesson 1 of the published Verb to Be course.
--
-- Block 1 stays a theory block and its authored text is deliberately never
-- changed here.  Existing practice is archived rather than deleted so past
-- attempts, mistakes and analytics remain intact.  No other lesson or module
-- is selected by this migration.

WITH target_lesson AS (
  SELECT lesson.id
  FROM "Lesson" AS lesson
  INNER JOIN "CourseModule" AS module ON module.id = lesson."moduleId"
  INNER JOIN "Course" AS course ON course.id = module."courseId"
  WHERE course.slug = 'verb-to-be-masterclass'
    AND module."order" = 1
    AND lesson."order" = 1
)
UPDATE "LessonBlock" AS block
SET
  "settings" = (
    COALESCE(block."settings", '{}'::jsonb)
      - 'practiceRule'
      - 'practiceRuleTranslations'
  ) || jsonb_build_object(
    'seedMarker', 'TO_BE_MODULE_1_LESSON_1_TWO_BLOCKS_V1',
    'lessonGoal', 'Знакомство с глаголом to be',
    'lessonGoalTranslations', jsonb_build_object(
      'en', 'Getting to know the verb to be',
      'ru', 'Знакомство с глаголом to be',
      'uk', 'Знайомство з дієсловом to be'
    )
  ),
  "updatedAt" = CURRENT_TIMESTAMP
FROM target_lesson
WHERE block."lessonId" = target_lesson.id
  AND block."order" = 1;

-- Retire the old questions in the reused second block before reusing orders
-- 1–35.  Moving archived rows keeps the unique block/order key intact.
WITH target_lesson AS (
  SELECT lesson.id
  FROM "Lesson" AS lesson
  INNER JOIN "CourseModule" AS module ON module.id = lesson."moduleId"
  INNER JOIN "Course" AS course ON course.id = module."courseId"
  WHERE course.slug = 'verb-to-be-masterclass'
    AND module."order" = 1
    AND lesson."order" = 1
),
practice_block AS (
  SELECT block.id
  FROM "LessonBlock" AS block
  INNER JOIN target_lesson ON target_lesson.id = block."lessonId"
  WHERE block."order" = 2
)
UPDATE "Exercise" AS exercise
SET
  "order" = exercise."order" + 1000,
  "contentStatus" = 'ARCHIVED'::"CmsContentStatus",
  "archivedAt" = COALESCE(exercise."archivedAt", CURRENT_TIMESTAMP),
  "updatedAt" = CURRENT_TIMESTAMP
FROM practice_block
WHERE exercise."lessonBlockId" = practice_block.id
  AND exercise."contentStatus" <> 'ARCHIVED'::"CmsContentStatus";

-- Keep later lesson-one content in the database for auditability, but make
-- the learner path consist only of the requested two published blocks.
WITH target_lesson AS (
  SELECT lesson.id
  FROM "Lesson" AS lesson
  INNER JOIN "CourseModule" AS module ON module.id = lesson."moduleId"
  INNER JOIN "Course" AS course ON course.id = module."courseId"
  WHERE course.slug = 'verb-to-be-masterclass'
    AND module."order" = 1
    AND lesson."order" = 1
),
retired_blocks AS (
  SELECT block.id
  FROM "LessonBlock" AS block
  INNER JOIN target_lesson ON target_lesson.id = block."lessonId"
  WHERE block."order" >= 3
    AND block."contentStatus" <> 'ARCHIVED'::"CmsContentStatus"
)
UPDATE "Exercise" AS exercise
SET
  "contentStatus" = 'ARCHIVED'::"CmsContentStatus",
  "archivedAt" = COALESCE(exercise."archivedAt", CURRENT_TIMESTAMP),
  "updatedAt" = CURRENT_TIMESTAMP
FROM retired_blocks
WHERE exercise."lessonBlockId" = retired_blocks.id
  AND exercise."contentStatus" <> 'ARCHIVED'::"CmsContentStatus";

WITH target_lesson AS (
  SELECT lesson.id
  FROM "Lesson" AS lesson
  INNER JOIN "CourseModule" AS module ON module.id = lesson."moduleId"
  INNER JOIN "Course" AS course ON course.id = module."courseId"
  WHERE course.slug = 'verb-to-be-masterclass'
    AND module."order" = 1
    AND lesson."order" = 1
)
UPDATE "LessonBlock" AS block
SET
  "contentStatus" = 'ARCHIVED'::"CmsContentStatus",
  "archivedAt" = COALESCE(block."archivedAt", CURRENT_TIMESTAMP),
  "updatedAt" = CURRENT_TIMESTAMP
FROM target_lesson
WHERE block."lessonId" = target_lesson.id
  AND block."order" >= 3
  AND block."contentStatus" <> 'ARCHIVED'::"CmsContentStatus";

-- Reuse the existing order-two block as the single practice block.  Its old
-- content was archived above; this is the new learner-facing configuration.
WITH target_lesson AS (
  SELECT lesson.id
  FROM "Lesson" AS lesson
  INNER JOIN "CourseModule" AS module ON module.id = lesson."moduleId"
  INNER JOIN "Course" AS course ON course.id = module."courseId"
  WHERE course.slug = 'verb-to-be-masterclass'
    AND module."order" = 1
    AND lesson."order" = 1
)
UPDATE "LessonBlock" AS block
SET
  "type" = 'EXERCISE'::"LessonBlockType",
  "title" = 'Впишите правильную форму',
  "content" = NULL,
  "settings" = jsonb_build_object(
    'seedMarker', 'TO_BE_MODULE_1_LESSON_1_FORMS_V1',
    'lessonGoal', 'Запоминаем формы am, is, are',
    'lessonGoalTranslations', jsonb_build_object(
      'en', 'Learning the forms am, is and are',
      'ru', 'Запоминаем формы am, is, are',
      'uk', 'Запам’ятовуємо форми am, is, are'
    )
  ),
  "isRequired" = true,
  "contentStatus" = 'PUBLISHED'::"CmsContentStatus",
  "publishedAt" = COALESCE(block."publishedAt", CURRENT_TIMESTAMP),
  "archivedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
FROM target_lesson
WHERE block."lessonId" = target_lesson.id
  AND block."order" = 2;

-- Seven personal subjects appear exactly five times each.  The order is
-- deliberately mixed so learners recall the form instead of following a
-- repeated am/is/are pattern.
WITH target_lesson AS (
  SELECT lesson.id
  FROM "Lesson" AS lesson
  INNER JOIN "CourseModule" AS module ON module.id = lesson."moduleId"
  INNER JOIN "Course" AS course ON course.id = module."courseId"
  WHERE course.slug = 'verb-to-be-masterclass'
    AND module."order" = 1
    AND lesson."order" = 1
),
practice_block AS (
  SELECT block.id
  FROM "LessonBlock" AS block
  INNER JOIN target_lesson ON target_lesson.id = block."lessonId"
  WHERE block."order" = 2
),
forms (ordinal, sentence, answer) AS (
  VALUES
    (1,  'I ___ ready.', 'am'),
    (2,  'He ___ a doctor.', 'is'),
    (3,  'We ___ classmates.', 'are'),
    (4,  'She ___ a teacher.', 'is'),
    (5,  'They ___ students.', 'are'),
    (6,  'You ___ my friend.', 'are'),
    (7,  'It ___ sunny today.', 'is'),
    (8,  'You ___ in the right place.', 'are'),
    (9,  'It ___ a good idea.', 'is'),
    (10, 'I ___ a student.', 'am'),
    (11, 'They ___ at work.', 'are'),
    (12, 'She ___ at home.', 'is'),
    (13, 'We ___ ready for class.', 'are'),
    (14, 'He ___ at school.', 'is'),
    (15, 'It ___ my book.', 'is'),
    (16, 'I ___ at home.', 'am'),
    (17, 'He ___ happy today.', 'is'),
    (18, 'You ___ very kind.', 'are'),
    (19, 'They ___ my friends.', 'are'),
    (20, 'She ___ very friendly.', 'is'),
    (21, 'We ___ in the same team.', 'are'),
    (22, 'She ___ my sister.', 'is'),
    (23, 'We ___ at home.', 'are'),
    (24, 'You ___ a great student.', 'are'),
    (25, 'It ___ cold outside.', 'is'),
    (26, 'I ___ happy today.', 'am'),
    (27, 'He ___ my brother.', 'is'),
    (28, 'They ___ from Kyiv.', 'are'),
    (29, 'They ___ ready for class.', 'are'),
    (30, 'He ___ from Poland.', 'is'),
    (31, 'I ___ from Ukraine.', 'am'),
    (32, 'It ___ five o''clock.', 'is'),
    (33, 'You ___ ready.', 'are'),
    (34, 'She ___ ready for class.', 'is'),
    (35, 'We ___ friends.', 'are')
)
INSERT INTO "Exercise" (
  "id", "lessonBlockId", "type", "engineKey", "variantKey",
  "instruction", "question", "content", "correctAnswer", "alternativeAnswers",
  "explanation", "hint", "hintsEnabled", "difficulty", "basePoints",
  "timeLimitSeconds", "solutionCost", "allowInstantCheck", "allowExtraExercise",
  "isGeneratedReview", "contentStatus", "publishedAt", "archivedAt", "order",
  "createdAt", "updatedAt"
)
SELECT
  'to-be-m1-l1-form-' || lpad(forms.ordinal::text, 3, '0'),
  practice_block.id,
  'TEXT_INPUT'::"ExerciseType",
  'text-input',
  'TO_BE_FORM_INPUT',
  'Впишите правильную форму: am, is или are.',
  forms.sentence,
  jsonb_build_object('acceptedAnswers', jsonb_build_array(forms.answer), 'ignorePunctuation', true),
  to_jsonb(forms.answer),
  jsonb_build_array(forms.answer),
  'Верно: ' || replace(forms.sentence, '___', forms.answer),
  'Сначала найдите подлежащее.',
  true,
  1,
  1,
  12,
  0,
  true,
  false,
  false,
  'PUBLISHED'::"CmsContentStatus",
  CURRENT_TIMESTAMP,
  NULL,
  forms.ordinal,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM forms
CROSS JOIN practice_block
ON CONFLICT ("id") DO NOTHING;
