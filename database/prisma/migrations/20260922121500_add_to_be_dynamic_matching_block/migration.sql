-- Module 1, lesson 1, block 9: a single dynamic matching card. Its 36
-- server-authored pronoun/form pairs are displayed in small changing batches.
DO $$
DECLARE
  target_lesson_id text;
  target_block_id text;
BEGIN
  SELECT lesson.id
  INTO target_lesson_id
  FROM "Lesson" AS lesson
  JOIN "CourseModule" AS module ON module.id = lesson."moduleId"
  JOIN "Course" AS course ON course.id = module."courseId"
  WHERE course.slug = 'verb-to-be-masterclass'
    AND module."order" = 1
    AND lesson."order" = 1
  LIMIT 1;

  IF target_lesson_id IS NULL THEN
    RAISE NOTICE 'Verb to be module 1 lesson 1 is not installed; dynamic matching skipped.';
    RETURN;
  END IF;

  SELECT id INTO target_block_id
  FROM "LessonBlock"
  WHERE "lessonId" = target_lesson_id AND "order" = 9;

  IF target_block_id IS NULL THEN
    target_block_id := 'c' || substr(md5(target_lesson_id || ':9:to-be-dynamic-matching'), 1, 24);
    INSERT INTO "LessonBlock" (
      id, "lessonId", type, title, settings, "order", "isRequired", "contentStatus", "publishedAt", "createdAt", "updatedAt"
    ) VALUES (
      target_block_id,
      target_lesson_id,
      'EXERCISE'::"LessonBlockType",
      'Матчинг: личные местоимения и to be',
      jsonb_build_object(
        'seedMarker', 'TO_BE_DYNAMIC_MATCHING_V1',
        'lessonGoal', 'Соединить личные местоимения с правильной формой глагола to be.',
        'lessonGoalTranslations', jsonb_build_object(
          'ru', 'Соединить личные местоимения с правильной формой глагола to be.',
          'uk', 'Зіставити особові займенники з правильною формою дієслова to be.'
        )
      ),
      9,
      true,
      'PUBLISHED'::"CmsContentStatus",
      now(), now(), now()
    );
  ELSE
    UPDATE "Exercise"
    SET "contentStatus" = 'ARCHIVED'::"CmsContentStatus",
        "archivedAt" = now(),
        "order" = "order" + 1000,
        "updatedAt" = now()
    WHERE "lessonBlockId" = target_block_id;

    UPDATE "LessonBlock"
    SET type = 'EXERCISE'::"LessonBlockType",
        title = 'Матчинг: личные местоимения и to be',
        content = NULL,
        settings = jsonb_build_object(
          'seedMarker', 'TO_BE_DYNAMIC_MATCHING_V1',
          'lessonGoal', 'Соединить личные местоимения с правильной формой глагола to be.',
          'lessonGoalTranslations', jsonb_build_object(
            'ru', 'Соединить личные местоимения с правильной формой глагола to be.',
            'uk', 'Зіставити особові займенники з правильною формою дієслова to be.'
          )
        ),
        "isRequired" = true,
        "contentStatus" = 'PUBLISHED'::"CmsContentStatus",
        "publishedAt" = now(),
        "archivedAt" = NULL,
        "updatedAt" = now()
    WHERE id = target_block_id;
  END IF;

  WITH form_cycle(cycle_order, left_value, right_value) AS (
    VALUES
      (1, 'I', 'am'), (2, 'you', 'are'), (3, 'he', 'is'), (4, 'she', 'is'),
      (5, 'it', 'is'), (6, 'we', 'are'), (7, 'you', 'are'), (8, 'they', 'are')
  ),
  pairs AS (
    SELECT
      sequence.pair_order,
      'p' || lpad(sequence.pair_order::text, 2, '0') AS pair_id,
      form_cycle.left_value,
      form_cycle.right_value
    FROM generate_series(1, 36) AS sequence(pair_order)
    JOIN form_cycle ON form_cycle.cycle_order = ((sequence.pair_order - 1) % 8) + 1
  )
  INSERT INTO "Exercise" (
    id, "lessonBlockId", type, "engineKey", "variantKey", instruction, question, content, "correctAnswer",
    "alternativeAnswers", explanation, hint, "hintsEnabled", difficulty, "basePoints", "timeLimitSeconds",
    "solutionCost", "allowInstantCheck", "allowExtraExercise", "isGeneratedReview", "contentStatus", "publishedAt",
    "order", "createdAt", "updatedAt"
  )
  SELECT
    'c' || substr(md5(target_block_id || ':dynamic-matching:' || clock_timestamp()::text), 1, 24),
    target_block_id,
    'MATCHING'::"ExerciseType",
    'matching',
    'TO_BE_DYNAMIC_PRONOUN_MATCHING',
    'Соедините личное местоимение с правильной формой глагола to be.',
    'am, is, are',
    jsonb_build_object(
      'dynamicMatching', true,
      'pairs', jsonb_agg(jsonb_build_object('id', pair_id, 'left', left_value, 'right', right_value) ORDER BY pair_order)
    ),
    jsonb_object_agg(pair_id, right_value),
    NULL,
    NULL,
    NULL,
    false,
    1,
    36,
    15,
    0,
    true,
    false,
    false,
    'PUBLISHED'::"CmsContentStatus",
    now(),
    1,
    now(), now()
  FROM pairs;
END $$;
