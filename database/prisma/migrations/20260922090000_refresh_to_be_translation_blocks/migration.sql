-- Lesson 1, module 1: three short translation blocks.  Existing attempts are
-- retained on archived exercise versions; the new prompts receive new CUIDs
-- so completed historic content can never be mistaken for the new practice.
DO $$
DECLARE
  target_lesson_id text;
  block_order integer;
  block_title text;
  block_goal text;
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
    RAISE NOTICE 'Verb to be module 1 lesson 1 is not installed; content refresh skipped.';
    RETURN;
  END IF;

  FOR block_order, block_title, block_goal IN
    SELECT * FROM (VALUES
      (3, 'Личные местоимения: быть', 'Перевести простые личные местоимения с формой «быть».') ,
      (4, 'Личные местоимения: являться', 'Перевести личные местоимения с формой «являться».') ,
      (5, 'Личные местоимения: находиться и существовать', 'Перевести личные местоимения с формами «находиться» и «существовать».')
    ) AS source("order", title, goal)
  LOOP
    SELECT id INTO target_block_id
    FROM "LessonBlock"
    WHERE "lessonId" = target_lesson_id AND "order" = block_order;

    IF target_block_id IS NULL THEN
      target_block_id := 'c' || substr(md5(target_lesson_id || ':' || block_order || ':to-be-translation-block'), 1, 24);
      INSERT INTO "LessonBlock" (
        id, "lessonId", type, title, settings, "order", "isRequired", "contentStatus", "publishedAt", "createdAt", "updatedAt"
      ) VALUES (
        target_block_id,
        target_lesson_id,
        'EXERCISE'::"LessonBlockType",
        block_title,
        jsonb_build_object(
          'seedMarker', 'TO_BE_TRANSLATION_PERSONAL_PRONOUNS_V1',
          'lessonGoal', block_goal,
          'lessonGoalTranslations', jsonb_build_object(
            'ru', block_goal,
            'uk', CASE block_order
              WHEN 3 THEN 'Перекласти прості особові займенники з формою «бути».'
              WHEN 4 THEN 'Перекласти особові займенники з формою «бути».'
              ELSE 'Перекласти особові займенники з формами «перебувати» та «існувати».'
            END
          )
        ),
        block_order,
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
          title = block_title,
          content = NULL,
          settings = jsonb_build_object(
            'seedMarker', 'TO_BE_TRANSLATION_PERSONAL_PRONOUNS_V1',
            'lessonGoal', block_goal,
            'lessonGoalTranslations', jsonb_build_object(
              'ru', block_goal,
              'uk', CASE block_order
                WHEN 3 THEN 'Перекласти прості особові займенники з формою «бути».'
                WHEN 4 THEN 'Перекласти особові займенники з формою «бути».'
                ELSE 'Перекласти особові займенники з формами «перебувати» та «існувати».'
              END
            )
          ),
          "isRequired" = true,
          "contentStatus" = 'PUBLISHED'::"CmsContentStatus",
          "publishedAt" = now(),
          "archivedAt" = NULL,
          "updatedAt" = now()
      WHERE id = target_block_id;
    END IF;
  END LOOP;

  INSERT INTO "Exercise" (
    id, "lessonBlockId", type, "engineKey", "variantKey", instruction, question, content, "correctAnswer",
    "alternativeAnswers", explanation, hint, "hintsEnabled", difficulty, "basePoints", "timeLimitSeconds",
    "solutionCost", "allowInstantCheck", "allowExtraExercise", "isGeneratedReview", "contentStatus", "publishedAt",
    "order", "createdAt", "updatedAt"
  )
  SELECT
    'c' || substr(md5(prompt.block_order::text || ':' || prompt.exercise_order::text || ':' || clock_timestamp()::text), 1, 24),
    block.id,
    'TEXT_INPUT'::"ExerciseType",
    'text-input',
    'TO_BE_PERSONAL_PRONOUN_TRANSLATION',
    'Переведите на английский. Впишите только два слова.',
    prompt.question,
    '{"ignorePunctuation":true}'::jsonb,
    to_jsonb(prompt.answer),
    NULL,
    NULL,
    NULL,
    false,
    1,
    1,
    15,
    0,
    true,
    false,
    false,
    'PUBLISHED'::"CmsContentStatus",
    now(),
    prompt.exercise_order,
    now(), now()
  FROM (VALUES
    (3, 1, 'Я есть', 'I am'), (3, 2, 'Ты есть', 'You are'), (3, 3, 'Он есть', 'He is'), (3, 4, 'Она есть', 'She is'),
    (3, 5, 'Оно есть', 'It is'), (3, 6, 'Мы есть', 'We are'), (3, 7, 'Вы есть', 'You are'), (3, 8, 'Они есть', 'They are'),
    (3, 9, 'Я есть', 'I am'), (3, 10, 'Ты есть', 'You are'), (3, 11, 'Он есть', 'He is'), (3, 12, 'Они есть', 'They are'),
    (4, 1, 'Я являюсь', 'I am'), (4, 2, 'Ты являешься', 'You are'), (4, 3, 'Он является', 'He is'), (4, 4, 'Она является', 'She is'),
    (4, 5, 'Оно является', 'It is'), (4, 6, 'Мы являемся', 'We are'), (4, 7, 'Вы являетесь', 'You are'), (4, 8, 'Они являются', 'They are'),
    (4, 9, 'Я являюсь', 'I am'), (4, 10, 'Ты являешься', 'You are'), (4, 11, 'Она является', 'She is'), (4, 12, 'Они являются', 'They are'),
    (5, 1, 'Я нахожусь', 'I am'), (5, 2, 'Ты находишься', 'You are'), (5, 3, 'Он находится', 'He is'), (5, 4, 'Она находится', 'She is'),
    (5, 5, 'Оно находится', 'It is'), (5, 6, 'Мы находимся', 'We are'), (5, 7, 'Вы находитесь', 'You are'), (5, 8, 'Они находятся', 'They are'),
    (5, 9, 'Я существую', 'I am'), (5, 10, 'Ты существуешь', 'You are'), (5, 11, 'Он существует', 'He is'), (5, 12, 'Они существуют', 'They are')
  ) AS prompt(block_order, exercise_order, question, answer)
  JOIN "LessonBlock" AS block
    ON block."lessonId" = target_lesson_id AND block."order" = prompt.block_order;
END $$;
