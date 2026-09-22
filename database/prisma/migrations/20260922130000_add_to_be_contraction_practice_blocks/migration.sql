-- Module 1, lesson 1, blocks 10–12: recognise and write full and contracted
-- present-tense forms of "to be".  The seed script mirrors these cards for a
-- database created after this migration has already run.
DO $$
DECLARE
  target_lesson_id text;
  target_block_id text;
  definition jsonb;
  prompt jsonb;
  prompt_order bigint;
  target_order integer;
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
    RAISE NOTICE 'Verb to be module 1 lesson 1 is not installed; contraction practice skipped.';
    RETURN;
  END IF;

  FOR definition IN
    SELECT value
    FROM jsonb_array_elements($definitions$
      [
        {
          "order": 10,
          "marker": "TO_BE_CONTRACTION_TO_FULL_V1",
          "title": "Сокращённые формы: напишите полную",
          "goal": "Развернуть сокращённые формы глагола to be.",
          "ukrainianGoal": "Розгорнути скорочені форми дієслова to be.",
          "instruction": "Дана сокращённая форма. Впишите полную форму.",
          "variantKey": "TO_BE_CONTRACTION_TO_FULL",
          "prompts": [["I'm", "I am"], ["you're", "you are"], ["he's", "he is"], ["she's", "she is"], ["it's", "it is"], ["we're", "we are"], ["you're", "you are"], ["they're", "they are"], ["I'm", "I am"], ["she's", "she is"], ["we're", "we are"], ["they're", "they are"]]
        },
        {
          "order": 11,
          "marker": "TO_BE_FULL_TO_CONTRACTION_V1",
          "title": "Полные формы: напишите сокращённую",
          "goal": "Сократить полные формы глагола to be.",
          "ukrainianGoal": "Скоротити повні форми дієслова to be.",
          "instruction": "Дана полная форма. Впишите сокращённую форму.",
          "variantKey": "TO_BE_FULL_TO_CONTRACTION",
          "prompts": [["I am", "I'm"], ["you are", "you're"], ["he is", "he's"], ["she is", "she's"], ["it is", "it's"], ["we are", "we're"], ["you are", "you're"], ["they are", "they're"], ["I am", "I'm"], ["he is", "he's"], ["we are", "we're"], ["they are", "they're"]]
        },
        {
          "order": 12,
          "marker": "TO_BE_MIXED_CONTRACTIONS_V1",
          "title": "Полные и сокращённые формы: вперемешку",
          "goal": "Преобразовать полные и сокращённые формы глагола to be.",
          "ukrainianGoal": "Перетворити повні та скорочені форми дієслова to be.",
          "instruction": "Преобразуйте форму: сокращённую разверните, полную сократите.",
          "variantKey": "TO_BE_MIXED_CONTRACTIONS",
          "prompts": [["I'm", "I am"], ["he is", "he's"], ["we're", "we are"], ["they are", "they're"], ["it's", "it is"], ["you are", "you're"], ["she's", "she is"], ["I am", "I'm"], ["they're", "they are"], ["we are", "we're"], ["he's", "he is"], ["she is", "she's"]]
        }
      ]
    $definitions$::jsonb)
  LOOP
    target_order := (definition->>'order')::integer;
    SELECT id INTO target_block_id
    FROM "LessonBlock"
    WHERE "lessonId" = target_lesson_id AND "order" = target_order;

    IF target_block_id IS NULL THEN
      target_block_id := 'c' || substr(md5(target_lesson_id || ':to-be-contractions:' || target_order::text), 1, 24);
      INSERT INTO "LessonBlock" (
        id, "lessonId", type, title, settings, "order", "isRequired", "contentStatus", "publishedAt", "createdAt", "updatedAt"
      ) VALUES (
        target_block_id,
        target_lesson_id,
        'EXERCISE'::"LessonBlockType",
        definition->>'title',
        jsonb_build_object(
          'seedMarker', definition->>'marker',
          'lessonGoal', definition->>'goal',
          'lessonGoalTranslations', jsonb_build_object('ru', definition->>'goal', 'uk', definition->>'ukrainianGoal')
        ),
        target_order,
        true,
        'PUBLISHED'::"CmsContentStatus",
        now(), now(), now()
      );
    ELSE
      -- Keep historical attempts attached to their retired exercises.  This
      -- high range cannot overlap the new 1–12 exercise order positions.
      UPDATE "Exercise"
      SET "contentStatus" = 'ARCHIVED'::"CmsContentStatus",
          "archivedAt" = now(),
          "order" = "order" + 1000000000,
          "updatedAt" = now()
      WHERE "lessonBlockId" = target_block_id;

      UPDATE "LessonBlock"
      SET type = 'EXERCISE'::"LessonBlockType",
          title = definition->>'title',
          content = NULL,
          settings = jsonb_build_object(
            'seedMarker', definition->>'marker',
            'lessonGoal', definition->>'goal',
            'lessonGoalTranslations', jsonb_build_object('ru', definition->>'goal', 'uk', definition->>'ukrainianGoal')
          ),
          "isRequired" = true,
          "contentStatus" = 'PUBLISHED'::"CmsContentStatus",
          "publishedAt" = now(),
          "archivedAt" = NULL,
          "updatedAt" = now()
      WHERE id = target_block_id;
    END IF;

    FOR prompt, prompt_order IN
      SELECT value, ordinality
      FROM jsonb_array_elements(definition->'prompts') WITH ORDINALITY AS prompts(value, ordinality)
    LOOP
      INSERT INTO "Exercise" (
        id, "lessonBlockId", type, "engineKey", "variantKey", instruction, question, content, "correctAnswer",
        "alternativeAnswers", explanation, hint, "hintsEnabled", difficulty, "basePoints", "timeLimitSeconds",
        "solutionCost", "allowInstantCheck", "allowExtraExercise", "isGeneratedReview", "contentStatus", "publishedAt",
        "order", "createdAt", "updatedAt"
      ) VALUES (
        'c' || substr(md5(target_block_id || ':to-be-contraction:' || prompt_order::text || ':' || clock_timestamp()::text), 1, 24),
        target_block_id,
        'TEXT_INPUT'::"ExerciseType",
        'text-input',
        definition->>'variantKey',
        definition->>'instruction',
        prompt->>0,
        jsonb_build_object('ignorePunctuation', true),
        to_jsonb(prompt->>1),
        NULL, NULL, NULL,
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
        prompt_order::integer,
        now(), now()
      );
    END LOOP;
  END LOOP;
END $$;
