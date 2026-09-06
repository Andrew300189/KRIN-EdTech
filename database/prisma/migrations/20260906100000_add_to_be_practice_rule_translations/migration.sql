-- Keep the learner-facing rule in the same block settings as its canonical
-- grammar guidance, while giving the player a translated value for each
-- supported interface language.
WITH rule_map(lesson_number, english_rule, ukrainian_rule) AS (
  VALUES
    (1, 'I am; he/she/it is; we/you/they are.', 'I am; he/she/it is; we/you/they are.'),
    (2, 'Use is for one; use are for more than one. But: I am, you are.', 'is — для однини; are — для множини. Але: I am, you are.'),
    (3, 'to be links a person or thing to a job, quality, place or state.', 'to be пов’язує людину або предмет із професією, якістю, місцем чи станом.'),
    (4, 'First find the subject, then choose am, is or are.', 'Спочатку знайдіть підмет, потім оберіть am, is або are.'),
    (5, 'Use to be with a name, job or nationality; use a/an before a job.', 'Уживайте to be з ім’ям, професією чи національністю; перед професією ставте a/an.'),
    (6, 'Use an adjective after to be: He is tall. They are kind.', 'Після to be використовуйте прикметник: He is tall. They are kind.'),
    (7, 'Use to be for age, state and feelings: I am 20. She is tired.', 'Вік, стан і почуття виражаються через to be: I am 20. She is tired.'),
    (8, 'Place: to be + preposition; time and weather: It is ...', 'Місце: to be + прийменник; час і погода: It is ...'),
    (9, 'Use there is for one thing and there are for more than one.', 'There is — для одного предмета; there are — для кількох.'),
    (10, 'Learn the whole phrase: be interested in, be good at, be ready for.', 'Вчіть словосполучення цілком: be interested in, be good at, be ready for.'),
    (11, 'Negation: am/is/are + not. Do not use do or does.', 'Заперечення: am/is/are + not. Не використовуйте do або does.'),
    (12, 'Use isn''t for one and aren''t for more than one. With I, use am not.', 'isn''t — для однини; aren''t — для множини. З I використовуйте am not.'),
    (13, 'In a negative sentence, choose am, is or are first, then add not.', 'У запереченні спочатку оберіть am, is або are, а потім додайте not.'),
    (14, 'Use there isn''t for one thing and there aren''t for more than one.', 'There isn''t — для одного предмета; there aren''t — для кількох.'),
    (15, 'Full and short forms are equal: is not = isn''t; are not = aren''t.', 'Повна й коротка форми рівнозначні: is not = isn''t; are not = aren''t.'),
    (16, 'With to be, make a negative without do/does: She isn''t, not She doesn''t be.', 'З to be заперечення утворюється без do/does: She isn''t, а не She doesn''t be.'),
    (17, 'Negate states and weather: He isn''t tired. It isn''t cold.', 'Заперечення стану й погоди: He isn''t tired. It isn''t cold.'),
    (18, 'With there, use isn''t for one and aren''t for more than one.', 'У конструкції there використовуйте isn''t для одного й aren''t для кількох.'),
    (19, 'Check the form and not: I am not; he/she/it isn''t; we/you/they aren''t.', 'Перевірте форму й not: I am not; he/she/it isn''t; we/you/they aren''t.'),
    (20, 'Negation: am/is/are + not; the form depends on the subject.', 'Заперечення: am/is/are + not; форма залежить від підмета.'),
    (21, 'For a yes/no question, put am, is or are before the subject.', 'У загальному питанні поставте am, is або are перед підметом.'),
    (22, 'Question word + am/is/are + subject: Where are they?', 'Питальне слово + am/is/are + підмет: Where are they?'),
    (23, 'Ask about a person with Is she ...? or Are they ...?', 'Про людину питайте так: Is she ...? або Are they ...?'),
    (24, 'Use Is there for one thing and Are there for more than one.', 'Is there — для одного предмета; Are there — для кількох.'),
    (25, 'Short answer: Yes, subject + am/is/are. No, subject + am not/isn''t/aren''t.', 'Коротка відповідь: Yes, subject + am/is/are. No, subject + am not/isn''t/aren''t.'),
    (26, 'In a to be question, the verb comes before the subject; do/does are not needed.', 'У питанні з to be дієслово стоїть перед підметом; do/does не потрібні.'),
    (27, 'Choose am, is or are for the subject and put it at the start of the question.', 'Оберіть am, is або are за підметом і поставте форму на початок питання.'),
    (28, 'Questions about place, time and weather: Where is ...? What time is it? Is it ...?', 'Питання про місце, час і погоду: Where is ...? What time is it? Is it ...?'),
    (29, 'In a dialogue, use a to be question and a short answer with the same form.', 'У діалозі використовуйте питання з to be і коротку відповідь з тією самою формою.'),
    (30, 'Question: am/is/are + subject; the answer repeats that form.', 'Питання: am/is/are + підмет; відповідь повторює цю форму.'),
    (31, 'I am; he/she/it is; we/you/they are.', 'I am; he/she/it is; we/you/they are.'),
    (32, 'Job or quality: subject + the correct form of to be + complement.', 'Професія або характеристика: підмет + правильна форма to be + доповнення.'),
    (33, 'Age, feelings, place, time and weather need the correct form of to be.', 'Вік, почуття, місце, час і погода потребують правильної форми to be.'),
    (34, 'Use there is for one thing and there are for more than one.', 'There is — для одного предмета; there are — для кількох.'),
    (35, 'Negation: am not, isn''t, aren''t — the form depends on the subject.', 'Заперечення: am not, isn''t, aren''t — форма залежить від підмета.'),
    (36, 'A to be negative is made without do/does: am/is/are + not.', 'Заперечення з to be утворюється без do/does: am/is/are + not.'),
    (37, 'For a yes/no question, put am/is/are before the subject.', 'У загальному питанні am/is/are стоїть перед підметом.'),
    (38, 'Wh-question: question word + am/is/are + subject.', 'Спеціальне питання: питальне слово + am/is/are + підмет.'),
    (39, 'Use Is there / Are there and short answers according to the number of things.', 'Використовуйте Is there / Are there й короткі відповіді відповідно до кількості предметів.'),
    (40, 'Choose to be by the subject and sentence type: statement, negative or question.', 'Оберіть форму to be за підметом і типом речення: твердження, заперечення чи питання.')
)
UPDATE "LessonBlock" AS block
SET "settings" = COALESCE(block."settings", '{}'::jsonb) || jsonb_build_object(
  'practiceRuleTranslations',
  jsonb_build_object(
    'en', rule_map.english_rule,
    'ru', COALESCE(block."settings" ->> 'practiceRule', ''),
    'uk', rule_map.ukrainian_rule
  )
),
"updatedAt" = CURRENT_TIMESTAMP
FROM "Lesson" AS lesson
JOIN "CourseModule" AS module ON module."id" = lesson."moduleId"
JOIN "Course" AS course ON course."id" = module."courseId"
JOIN rule_map ON rule_map.lesson_number = ((module."order" - 1) * 10 + lesson."order")
WHERE block."lessonId" = lesson."id"
  AND course."slug" = 'verb-to-be-masterclass'
  AND block."type" <> 'REVIEW';
