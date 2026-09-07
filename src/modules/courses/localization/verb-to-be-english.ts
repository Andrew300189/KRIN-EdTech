/**
 * English learner copy for the legacy To Be curriculum.
 *
 * The original course was authored in Russian.  The public English route is
 * therefore localised at read time until the CMS owns separate English rows.
 * English grammar examples are deliberately preserved as written.
 */

export const verbToBeEnglishCourseSlug = "verb-to-be-masterclass";

const exactReplacements: ReadonlyArray<readonly [string, string]> = [
  ["Глагол to be: Present Simple для A1", "The verb to be: Present Simple for A1"],
  ["Полный A1-курс по to be: утверждения, отрицания и вопросы в 40 интерактивных уроках по 20 минут.", "A complete A1 course on to be: statements, negatives and questions in 40 interactive 20-minute lessons."],
  ["Практический курс A1 по глаголу to be: am, is и are в обычных жизненных ситуациях. Четыре 20-минутных урока с теорией, интерактивными заданиями, XP и KRIN-coins за подтверждённый прогресс.", "A practical A1 course on the verb to be: am, is and are in everyday situations. Learn through clear theory, interactive tasks, XP and KRIN coins for confirmed progress."],
  ["Практический курс по глаголу to be в Present Simple уровня А1.", "A practical A1 course on the verb to be in the Present Simple."],
  ["Программа содержит 40 последовательных уроков по 20 минут: утверждения и жизненные ситуации, отрицания, вопросы и отдельный итоговый модуль, который проверяет все изученные аспекты.", "The programme contains 40 sequential 20-minute lessons: statements in everyday situations, negatives, questions and a final module that checks every topic you have learned."],
  ["Уверенно выбирать am, is и are в простых фразах.", "Confidently choose am, is and are in simple sentences."],
  ["Рассказывать о себе, возрасте, профессии, месте, времени и погоде.", "Talk about yourself, age, jobs, places, time and weather."],
  ["Строить отрицания с am not, isn't и aren't без do/does.", "Build negatives with am not, isn't and aren't without do/does."],
  ["Использовать there is / there are и их отрицательные формы.", "Use there is / there are and their negative forms."],
  ["Задавать общие и специальные вопросы, а также давать короткие ответы.", "Ask yes/no and wh-questions, and give short answers."],
  ["Замечать и исправлять типичные ошибки A1.", "Notice and correct common A1 mistakes."],
  ["Модуль 1. Настоящее время: am, is, are", "Module 1. Present tense: am, is, are"],
  ["Модуль 2. Отрицания с to be", "Module 2. Negatives with to be"],
  ["Модуль 3. Вопросы с to be", "Module 3. Questions with to be"],
  ["Модуль 4. Итоговая проверка: все аспекты to be", "Module 4. Final check: every aspect of to be"],
  ["Урок 1. To be: основная идея и формы am, is, are", "Lesson 1. To be: the core idea and the forms am, is, are"],
  ["Урок 2. Единственное и множественное число с to be", "Lesson 2. Singular and plural with to be"],
  ["Урок 3. To be в обычных жизненных ситуациях", "Lesson 3. To be in everyday situations"],
  ["Урок 4. To be по ситуациям: говорим уверенно", "Lesson 4. To be by situation: speak with confidence"],
  ["Урок 5. To be: имя, профессия и национальность", "Lesson 5. To be: names, jobs and nationality"],
  ["Урок 6. To be: внешность и характер", "Lesson 6. To be: appearance and character"],
  ["Урок 7. To be: возраст, состояние и чувства", "Lesson 7. To be: age, states and feelings"],
  ["Урок 8. To be: место, время и погода", "Lesson 8. To be: place, time and weather"],
  ["Урок 9. There is и there are: что где есть", "Lesson 9. There is and there are: what is where"],
  ["Урок 10. To be: полезные устойчивые выражения", "Lesson 10. To be: useful fixed expressions"],
  ["Урок 11. Отрицания: am not, isn't, aren't", "Lesson 11. Negatives: am not, isn't, aren't"],
  ["Урок 12. Отрицания: один или несколько", "Lesson 12. Negatives: one or more"],
  ["Урок 13. Отрицания в жизненных ситуациях", "Lesson 13. Negatives in everyday situations"],
  ["Урок 14. There isn't / There aren't", "Lesson 14. There isn't / There aren't"],
  ["Урок 15. Полные и краткие отрицания", "Lesson 15. Full and short negatives"],
  ["Урок 16. Отрицания с to be без do и does", "Lesson 16. Negatives with to be without do and does"],
  ["Урок 17. Отрицания: чувства, время и погода", "Lesson 17. Negatives: feelings, time and weather"],
  ["Урок 18. There isn't и there aren't вокруг нас", "Lesson 18. There isn't and there aren't around us"],
  ["Урок 19. Отрицания: смешанная практика", "Lesson 19. Negatives: mixed practice"],
  ["Урок 20. Модуль 2: итог по отрицаниям", "Lesson 20. Module 2: negative forms review"],
  ["Урок 21. Общие вопросы: Am I? Is he? Are they?", "Lesson 21. Yes/no questions: Am I? Is he? Are they?"],
  ["Урок 22. Вопросительные слова: who, what, where, how old", "Lesson 22. Question words: who, what, where, how old"],
  ["Урок 23. Вопросы о человеке и жизни", "Lesson 23. Questions about people and life"],
  ["Урок 24. Вопросы с Is there? / Are there?", "Lesson 24. Questions with Is there? / Are there?"],
  ["Урок 25. Краткие ответы на вопросы", "Lesson 25. Short answers to questions"],
  ["Урок 26. Вопросы: порядок слов без ошибок", "Lesson 26. Questions: correct word order"],
  ["Урок 27. Вопросы о людях и фактах", "Lesson 27. Questions about people and facts"],
  ["Урок 28. Вопросы о месте, времени и погоде", "Lesson 28. Questions about place, time and weather"],
  ["Урок 29. Вопросы с to be: мини-диалоги", "Lesson 29. Questions with to be: mini-dialogues"],
  ["Урок 30. Модуль 3: итог по вопросам", "Lesson 30. Module 3: question forms review"],
  ["Урок 31. Проверка форм am, is и are", "Lesson 31. Checking the forms am, is and are"],
  ["Урок 32. Проверка: люди, профессии и характеристики", "Lesson 32. Check: people, jobs and descriptions"],
  ["Урок 33. Проверка: возраст, чувства, место, время и погода", "Lesson 33. Check: age, feelings, place, time and weather"],
  ["Урок 34. Проверка: there is и there are", "Lesson 34. Check: there is and there are"],
  ["Урок 35. Проверка отрицаний: am not, isn't, aren't", "Lesson 35. Checking negatives: am not, isn't, aren't"],
  ["Урок 36. Проверка отрицаний в жизненных ситуациях", "Lesson 36. Checking negatives in everyday situations"],
  ["Урок 37. Проверка общих вопросов", "Lesson 37. Checking yes/no questions"],
  ["Урок 38. Проверка специальных вопросов", "Lesson 38. Checking wh-questions"],
  ["Урок 39. Проверка: Is there? Are there? и короткие ответы", "Lesson 39. Check: Is there? Are there? and short answers"],
  ["Урок 40. Финальная проверка курса: to be", "Lesson 40. Final course check: to be"],
  ["Основа Present Simple: зачем нужен to be и как выбирать am, is или are по лицу и числу.", "Present Simple basics: why English needs to be and how to choose am, is or are by person and number."],
  ["Понимать, когда в английском предложении нужен to be.", "Understand when an English sentence needs to be."],
  ["Соотносить am, is и are с единственным и множественным числом.", "Match am, is and are to singular and plural subjects."],
  ["Выбирать форму to be с I, you, he, she, it, we и they.", "Choose the form of to be with I, you, he, she, it, we and they."],
  ["Использовать формы в ситуациях о профессии, состоянии, месте, погоде и времени.", "Use the forms when talking about jobs, states, places, weather and time."],
  ["Вводный урок: 32 коротких задания и понятное правило без грамматического жаргона.", "An introductory lesson with 32 short tasks and a clear rule without grammar jargon."],
  ["Ваша цель — не заучить таблицу, а начать узнавать форму to be автоматически.", "Your goal is not to memorise a table, but to start recognising the form of to be automatically."],
  ["Как работает to be", "How to use to be"],
  ["маленький глагол, без которого не обойтись", "a small verb you cannot do without"],
  ["кажется коротким и незаметным, но это один из главных глаголов английского языка.", "may look small and easy to miss, but it is one of the most important verbs in English."],
  ["В русском настоящем времени мы обычно не произносим слово «быть»: «я студент», «она дома», «они счастливы».", "English needs a form of to be to connect the subject with information about it."],
  ["В английском его пропускать нельзя:", "You cannot leave it out in English:"],
  ["ошибка, а", "is incorrect, while"],
  ["правильное предложение.", "is correct."],
  ["С помощью", "With"],
  ["мы говорим, кто мы, кем работаем, какие мы, где находимся и в каком состоянии пребываем.", "we say who we are, what we do, what we are like, where we are and how we feel."],
  ["Он нужен и для возраста, погоды, времени и дня недели.", "We also use it for age, weather, time and days of the week."],
  ["Я учитель.", "I am a teacher."], ["Она счастлива.", "She is happy."], ["Мы дома.", "We are at home."], ["Погода холодная.", "The weather is cold."], ["Они интересуются музыкой.", "They are interested in music."],
  ["Три формы в настоящем времени", "Three forms in the present tense"],
  ["только с", "only with"], ["и с одним человеком или предметом:", "and with one person or thing:"], ["и с несколькими людьми или предметами:", "and with more than one person or thing:"],
  ["Важно:", "Important:"], ["относятся к единственному числу, а", "go with singular subjects, while"], ["к множественному.", "goes with plural subjects."], ["Но", "But"], ["всегда использует", "always uses"], ["даже когда вы обращаетесь к одному человеку.", "even when you are speaking to one person."],
  ["Где вы встретите to be", "Where you use to be"], ["профессия:", "job:"], ["качество:", "quality:"], ["место:", "place:"], ["состояние и чувства:", "state and feelings:"], ["возраст:", "age:"], ["погода, время и дата:", "weather, time and date:"],
  ["Главное правило этого урока:", "The main rule of this lesson:"], ["если в предложении нет действия, но нужно соединить человека или предмет с профессией, качеством, местом или состоянием, выберите подходящую форму", "if there is no action in a sentence but you need to connect a person or thing with a job, quality, place or state, choose the correct form of"],
  ["Выберите один правильный вариант.", "Choose one correct answer."], ["Сопоставьте все пары.", "Match all pairs."], ["Соедините элемент из левой колонки с правильным элементом справа.", "Match an item from the left column with the correct item on the right."], ["Напишите ответ. Точка и заглавная буква не обязательны.", "Type the answer. A full stop and capital letter are not required."], ["Впишите ответ. Точка и заглавная буква не обязательны.", "Type the answer. A full stop and capital letter are not required."], ["Впишите ответ. Можно писать без точки и заглавной буквы.", "Type the answer. You may omit the full stop and capital letter."], ["Найдите ошибочное слово и впишите только правильное слово.", "Find the incorrect word and type only the correct word."], ["Соберите предложение из слов по порядку.", "Build the sentence by putting the words in order."], ["Выберите правильную форму глагола to be.", "Choose the correct form of to be."], ["Впишите одну правильную форму: am, is или are.", "Type one correct form: am, is or are."], ["Отметьте, верно или неверно утверждение.", "Mark the statement as true or false."],
  ["Правильный ответ:", "Correct answer:"], ["Правильная связь:", "Correct match:"], ["Правильный порядок:", "Correct order:"], ["Верно:", "Correct:"], ["В предложении есть ошибка:", "There is an error in the sentence:"], ["Впишите только правильное слово.", "Type only the correct word."],
];

function replaceEvery(value: string, source: string, target: string) {
  return value.split(source).join(target);
}

/** Converts the legacy Russian learner copy to English without changing answers. */
export function translateVerbToBeTextToEnglish(value: string | null | undefined) {
  if (!value) return value;
  return exactReplacements.reduce((translated, [source, target]) => replaceEvery(translated, source, target), value);
}

/** Recursively translates strings inside lesson, block and exercise JSON. */
export function translateVerbToBeJsonToEnglish<T>(value: T): T {
  if (typeof value === "string") return translateVerbToBeTextToEnglish(value) as T;
  if (Array.isArray(value)) return value.map((item) => translateVerbToBeJsonToEnglish(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, translateVerbToBeJsonToEnglish(item)])) as T;
  }
  return value;
}
