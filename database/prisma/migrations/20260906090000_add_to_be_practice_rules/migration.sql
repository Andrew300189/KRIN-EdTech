-- Put a short, learner-facing grammar rule at the top of every non-review
-- block in the published "to be" course. Existing block settings are kept.
WITH rule_map(lesson_number, rule) AS (
  VALUES
    (1, 'I am; he/she/it is; we/you/they are.'),
    (2, 'is — один; are — несколько. Но: I am, you are.'),
    (3, 'to be связывает человека или предмет с профессией, качеством, местом или состоянием.'),
    (4, 'Сначала найдите подлежащее, затем выберите am, is или are.'),
    (5, 'С именем, профессией и национальностью используйте to be; перед профессией — a/an.'),
    (6, 'После to be используйте прилагательное: He is tall. They are kind.'),
    (7, 'Возраст, состояние и чувства выражаются через to be: I am 20. She is tired.'),
    (8, 'Место: to be + предлог; время и погода: It is ...'),
    (9, 'There is — один предмет; there are — несколько.'),
    (10, 'Учите сочетание целиком: be interested in, be good at, be ready for.'),
    (11, 'Отрицание: am/is/are + not. Не используйте do или does.'),
    (12, 'isn''t — один; aren''t — несколько. С I: am not.'),
    (13, 'В отрицании сначала выберите am, is или are, затем добавьте not.'),
    (14, 'There isn''t — один предмет; there aren''t — несколько.'),
    (15, 'Полная и краткая формы равны: is not = isn''t; are not = aren''t.'),
    (16, 'С to be отрицание строится без do/does: She isn''t, не She doesn''t be.'),
    (17, 'Отрицание состояния и погоды: He isn''t tired. It isn''t cold.'),
    (18, 'В конструкции there используйте isn''t для одного и aren''t для нескольких.'),
    (19, 'Проверьте форму и not: I am not; he/she/it isn''t; we/you/they aren''t.'),
    (20, 'Отрицание: am/is/are + not; форма зависит от подлежащего.'),
    (21, 'Общий вопрос: поставьте am, is или are перед подлежащим.'),
    (22, 'Вопросительное слово + am/is/are + подлежащее: Where are they?'),
    (23, 'Вопрос о человеке: Is she ...? Are they ...?'),
    (24, 'Is there — один предмет? Are there — несколько?'),
    (25, 'Краткий ответ: Yes, subject + am/is/are. No, subject + am not/isn''t/aren''t.'),
    (26, 'В вопросе to be стоит перед подлежащим; do/does не нужны.'),
    (27, 'Для вопроса выберите am, is или are по подлежащему и поставьте форму в начало.'),
    (28, 'Вопросы о месте, времени и погоде: Where is ...? What time is it? Is it ...?'),
    (29, 'В диалоге: вопрос с to be + короткий ответ с той же формой.'),
    (30, 'Вопрос: am/is/are + подлежащее; ответ повторяет эту форму.'),
    (31, 'I am; he/she/it is; we/you/they are.'),
    (32, 'Профессия и характеристика: подлежащее + нужная форма to be + дополнение.'),
    (33, 'Возраст, чувства, место, время и погода требуют правильной формы to be.'),
    (34, 'There is — один предмет; there are — несколько.'),
    (35, 'Отрицание: am not, isn''t, aren''t — форма зависит от подлежащего.'),
    (36, 'Отрицание с to be строится без do/does: am/is/are + not.'),
    (37, 'Общий вопрос: am/is/are перед подлежащим.'),
    (38, 'Специальный вопрос: вопросительное слово + am/is/are + подлежащее.'),
    (39, 'Is there / Are there и короткие ответы зависят от количества предметов.'),
    (40, 'Выберите форму to be по подлежащему и типу предложения: утверждение, отрицание или вопрос.')
)
UPDATE "LessonBlock" AS block
SET "settings" = COALESCE(block."settings", '{}'::jsonb) || jsonb_build_object('practiceRule', rule_map.rule),
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Lesson" AS lesson
JOIN "Module" AS module ON module."id" = lesson."moduleId"
JOIN "Course" AS course ON course."id" = module."courseId"
JOIN rule_map ON rule_map.lesson_number = ((module."order" - 1) * 10 + lesson."order")
WHERE block."lessonId" = lesson."id"
  AND course."slug" = 'verb-to-be-masterclass'
  AND block."type" <> 'REVIEW'
  AND COALESCE(block."settings" ->> 'practiceRule', '') = '';
