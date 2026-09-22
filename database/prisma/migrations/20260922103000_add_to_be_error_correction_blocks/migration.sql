-- Module 1, lesson 1: corrective practice after the personal-pronoun
-- translation blocks. Learners see an incorrect English to-be form and type
-- only am, is, or are. Historic exercise attempts remain on archived cards.
DO $$
DECLARE
  target_lesson_id text;
  block_order integer;
  block_title text;
  block_goal text;
  ukrainian_goal text;
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
    RAISE NOTICE 'Verb to be module 1 lesson 1 is not installed; correction blocks skipped.';
    RETURN;
  END IF;

  FOR block_order, block_title, block_goal, ukrainian_goal IN
    SELECT * FROM (VALUES
      (6, 'Исправляем ошибки: am, is, are', 'Исправить форму глагола to be в коротких фразах.', 'Виправити форму дієслова to be у коротких фразах.'),
      (7, 'Исправляем ошибки: находиться', 'Исправить форму глагола to be в фразах о местонахождении.', 'Виправити форму дієслова to be у фразах про місцезнаходження.'),
      (8, 'Исправляем ошибки: существовать', 'Исправить форму глагола to be в смешанных коротких фразах.', 'Виправити форму дієслова to be у змішаних коротких фразах.')
    ) AS source("order", title, goal, uk_goal)
  LOOP
    SELECT id INTO target_block_id
    FROM "LessonBlock"
    WHERE "lessonId" = target_lesson_id AND "order" = block_order;

    IF target_block_id IS NULL THEN
      target_block_id := 'c' || substr(md5(target_lesson_id || ':' || block_order || ':to-be-error-correction-block'), 1, 24);
      INSERT INTO "LessonBlock" (
        id, "lessonId", type, title, settings, "order", "isRequired", "contentStatus", "publishedAt", "createdAt", "updatedAt"
      ) VALUES (
        target_block_id,
        target_lesson_id,
        'EXERCISE'::"LessonBlockType",
        block_title,
        jsonb_build_object(
          'seedMarker', 'TO_BE_ERROR_CORRECTION_V1',
          'lessonGoal', block_goal,
          'lessonGoalTranslations', jsonb_build_object('ru', block_goal, 'uk', ukrainian_goal)
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
            'seedMarker', 'TO_BE_ERROR_CORRECTION_V1',
            'lessonGoal', block_goal,
            'lessonGoalTranslations', jsonb_build_object('ru', block_goal, 'uk', ukrainian_goal)
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
    'TO_BE_PERSONAL_PRONOUN_ERROR_CORRECTION',
    'В предложении есть ошибка. Впишите правильную форму глагола to be.',
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
    (6, 1, 'Я есть — I is.', 'am'), (6, 2, 'Ты есть — You am.', 'are'), (6, 3, 'Он есть — He are.', 'is'), (6, 4, 'Она есть — She are.', 'is'),
    (6, 5, 'Оно есть — It are.', 'is'), (6, 6, 'Мы есть — We am.', 'are'), (6, 7, 'Вы есть — You is.', 'are'), (6, 8, 'Они есть — They is.', 'are'),
    (6, 9, 'Я являюсь — I are.', 'am'), (6, 10, 'Ты являешься — You is.', 'are'), (6, 11, 'Он является — He am.', 'is'), (6, 12, 'Они являются — They am.', 'are'),
    (7, 1, 'Я нахожусь — I is.', 'am'), (7, 2, 'Ты находишься — You am.', 'are'), (7, 3, 'Он находится — He are.', 'is'), (7, 4, 'Она находится — She are.', 'is'),
    (7, 5, 'Оно находится — It are.', 'is'), (7, 6, 'Мы находимся — We is.', 'are'), (7, 7, 'Вы находитесь — You am.', 'are'), (7, 8, 'Они находятся — They is.', 'are'),
    (7, 9, 'Я нахожусь — I are.', 'am'), (7, 10, 'Ты находишься — You is.', 'are'), (7, 11, 'Она находится — She am.', 'is'), (7, 12, 'Они находятся — They am.', 'are'),
    (8, 1, 'Я существую — I is.', 'am'), (8, 2, 'Ты существуешь — You am.', 'are'), (8, 3, 'Он существует — He are.', 'is'), (8, 4, 'Они существуют — They is.', 'are'),
    (8, 5, 'Я есть — I are.', 'am'), (8, 6, 'Ты являешься — You is.', 'are'), (8, 7, 'Он находится — He am.', 'is'), (8, 8, 'Она есть — She are.', 'is'),
    (8, 9, 'Оно существует — It are.', 'is'), (8, 10, 'Мы являемся — We is.', 'are'), (8, 11, 'Вы находитесь — You am.', 'are'), (8, 12, 'Они существуют — They am.', 'are')
  ) AS prompt(block_order, exercise_order, question, answer)
  JOIN "LessonBlock" AS block
    ON block."lessonId" = target_lesson_id AND block."order" = prompt.block_order;
END $$;
