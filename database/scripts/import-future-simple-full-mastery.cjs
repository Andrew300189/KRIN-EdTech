/* Imports the authored A1 Future Simple mastery course using the shared course architecture. */
const { createContinuousCourseImporter } = require("./continuous-course-importer.cjs");

const COURSE_SLUG = "future-simple-full-mastery";

function lesson(slug, title, role, topics) {
  return { slug, title, role, topics: topics.split("|").map((topic) => topic.trim()).filter(Boolean) };
}

const SKILLS = [
  ["future-simple-meaning", "Future Simple: значення", "Розпізнавати ситуації, у яких потрібен Future Simple."],
  ["future-simple-formula", "Future Simple: формула", "Будувати Future Simple за формулою subject + will + V1."],
  ["future-simple-base-verb", "Future Simple: початкова форма", "Уживати V1 після will, won’t і в питаннях."],
  ["future-simple-full-form", "Future Simple: повна форма will", "Уживати повну форму will у потрібному контексті."],
  ["future-simple-contraction", "Future Simple: скорочення 'll", "Уживати скорочення 'll у нейтральному мовленні."],
  ["future-simple-prediction", "Future Simple: прогноз", "Висловлювати прогноз або припущення про майбутнє."],
  ["future-simple-opinion", "Future Simple: думка про майбутнє", "Поєднувати will з I think та I believe."],
  ["future-simple-certainty", "Future Simple: ступінь упевненості", "Правильно розміщувати probably, perhaps і maybe."],
  ["future-simple-spontaneous-decision", "Future Simple: спонтанне рішення", "Уживати will для рішення, прийнятого в момент мовлення."],
  ["future-simple-promise", "Future Simple: обіцянка", "Давати обіцянки з will."],
  ["future-simple-offer", "Future Simple: пропозиція допомоги", "Пропонувати допомогу та добровільну дію з will."],
  ["future-simple-warning", "Future Simple: попередження", "Розпізнавати нейтральні попередження про наслідок."],
  ["future-simple-signal-words", "Future Simple: часові вказівники", "Уживати tomorrow, next, soon, later та in + period."],
  ["future-simple-negative", "Future Simple: заперечення", "Будувати will not і won’t + V1."],
  ["future-simple-wont", "Future Simple: won’t", "Розрізняти повну та скорочену заперечну форму."],
  ["future-simple-negative-base", "Future Simple: V1 після won’t", "Не додавати -s, -ed, to або -ing після won’t."],
  ["future-simple-negative-prediction", "Future Simple: негативний прогноз", "Висловлювати обережний негативний прогноз."],
  ["future-simple-negative-promise", "Future Simple: негативна обіцянка", "Обіцяти не виконувати дію з won’t."],
  ["future-simple-refusal", "Future Simple: відмова з won’t", "Розпізнавати відмову людини або пристрою з won’t."],
  ["future-simple-general-question", "Future Simple: загальне питання", "Будувати Will + subject + V1?"],
  ["future-simple-wh-question", "Future Simple: спеціальне питання", "Будувати Wh-word + will + subject + V1?"],
  ["future-simple-subject-question", "Future Simple: питання до підмета", "Розрізняти питання до підмета і до додатка."],
  ["future-simple-short-answer", "Future Simple: коротка відповідь", "Давати точні короткі відповіді Yes, ... will / No, ... won’t."],
  ["future-simple-shall-i", "Future Simple: Shall I?", "Пропонувати допомогу або запитувати рішення з Shall I?"],
  ["future-simple-shall-we", "Future Simple: Shall we?", "Пропонувати спільну дію з Shall we?"],
  ["future-simple-request", "Future Simple: прохання з Will you?", "Розрізняти питання про майбутнє та ввічливе прохання."],
  ["future-simple-time-clause", "Future Simple: придаточні часу", "Уживати Present Simple після when, before, after, until і as soon as."],
  ["future-simple-if-clause", "Future Simple: умова з if", "Уживати Present Simple в умові та will у головній частині."],
  ["future-simple-vs-going-to", "Future Simple і be going to", "Розрізняти спонтанне рішення, намір, думку і видимий доказ."],
  ["future-simple-vs-present-continuous", "Future Simple і Present Continuous", "Розрізняти спонтанне рішення та особисту домовленість."],
  ["future-simple-vs-present-simple", "Future Simple і Present Simple", "Розрізняти прогноз і майбутній розклад."],
  ["future-simple-production", "Future Simple: аудіювання, читання, письмо й мовлення", "Уживати Future Simple у зв’язному тексті, аудіо та діалозі."],
];

const MODULES = [
  {
    slug: "future-simple-affirmatives",
    title: "Модуль 1. Стверджувальна форма Future Simple",
    description: "will + V1, скорочення 'll, прогнози, рішення, обіцянки, допомога й часові вказівники.",
    lessons: [
      lesson("future-simple-m1-01-overview", "1. Загальне знайомство з Future Simple", "OVERVIEW", "Що таке Future Simple|Формула subject + will + V1|Will для всіх осіб|Початкова форма дієслова|Повна й скорочена форми|Прогнози та припущення|Спонтанні рішення|Обіцянки та допомога|Signal words|Порядок слів і типові помилки"),
      lesson("future-simple-m1-02-formula", "2. Формула will + V1", "DEEP_DIVE", "Підмет перед will|Will з I|Will з you|Will з he she it|Will з we they|Правильні дієслова після will|Неправильні дієслова після will|Без -s після will|Без to та -ing|Автоматизація конструкції"),
      lesson("future-simple-m1-03-contractions", "3. Повні та скорочені форми", "DEEP_DIVE", "Will і 'll|I will та I’ll|You’ll he’ll she’ll|It’ll we’ll they’ll|Скорочення з підметом|Повна форма для наголосу|Нейтральне мовлення|Формальні ситуації|Аудіо: розпізнавання 'll|Повні та скорочені форми в діалозі"),
      lesson("future-simple-m1-04-predictions", "4. Прогнози про майбутнє", "PRACTICE", "Що таке прогноз|Прогноз як думка|Погода|Технології|Освіта і суспільство|Особисте майбутнє|I think|I believe|Можливий результат|Власні прогнози"),
      lesson("future-simple-m1-05-decisions", "5. Спонтанні рішення", "DEEP_DIVE", "Рішення в момент мовлення|Реакція на нову інформацію|Телефон дзвонить|Рішення допомогти|Рішення подзвонити|Рішення щось принести|Рішення купити|I’ll у короткій реакції|Не заздалегідь запланована дія|Діалогова практика"),
      lesson("future-simple-m1-06-promises", "6. Обіцянки та запевнення", "DEEP_DIVE", "Значення обіцянки|I will у обіцянці|Обіцянка допомогти|Обіцянка зателефонувати|Обіцянка виправити помилку|Обіцянка зберегти секрет|I promise|Запевнення співрозмовника|Формальна й неформальна обіцянка|Створення діалогів"),
      lesson("future-simple-m1-07-offers-warnings", "7. Допомога, попередження й нейтральні наслідки", "DEEP_DIVE", "Пропозиція допомоги|Добровільна дія|I’ll carry it|М’яке попередження|Наслідок із or|Умова й безпечний наслідок|Обіцянка позитивного результату|Тон у контексті|Розпізнавання функції|Діалогова практика"),
      lesson("future-simple-m1-08-signal-words", "8. Signal words і майбутній час", "DEEP_DIVE", "Tomorrow|Tomorrow morning і evening|Next week month year|Soon|Later|In the future|In two days|One day|Позиція часу в реченні|Кілька часових вказівників"),
      lesson("future-simple-m1-09-certainty", "9. Припущення і ступінь упевненості", "DEEP_DIVE", "Упевнений прогноз|Definitely|Certainly|Probably|Perhaps|Maybe|I think|I don’t think|Позиція прислівника|Порівняння ступеня впевненості"),
      lesson("future-simple-m1-10-final", "10. Підсумок стверджувальної форми", "FINAL", "Will + V1|Початкова форма|Повна й скорочена форми|Прогнози|Припущення|Спонтанні рішення|Обіцянки|Пропозиції допомоги|Signal words|Зв’язна практика"),
    ],
  },
  {
    slug: "future-simple-negatives",
    title: "Модуль 2. Заперечна форма Future Simple",
    description: "will not і won’t, заперечні прогнози, обіцянки, відмова та придаточні часу й умови.",
    lessons: [
      lesson("future-simple-m2-01-overview", "1. Загальне знайомство із запереченням", "OVERVIEW", "Значення заперечення в майбутньому|Формула subject + will not + V1|Скорочення won’t|Однакова форма для всіх осіб|Початкова форма дієслова|Негативний прогноз|Обіцянка не робити|Відмова з won’t|Порядок слів|Основні помилки"),
      lesson("future-simple-m2-02-will-not-wont", "2. Форми will not і won’t", "DEEP_DIVE", "Повна форма will not|Скорочена форма won’t|I you we they|He she it|Наголос у повній формі|Вимова won’t|Розмовне вживання|Письмове вживання|Вибір форми за контекстом|Аудіо: want і won’t"),
      lesson("future-simple-m2-03-base-after-wont", "3. Початкова форма після won’t", "DEEP_DIVE", "Формула won’t + V1|Правильні дієслова|Неправильні дієслова|Без -s|Без -ed|Без to|Без -ing|Виправлення неправильних форм|Швидке побудування заперечення|Змішана практика"),
      lesson("future-simple-m2-04-negative-predictions", "4. Негативні прогнози", "PRACTICE", "Подія не відбудеться|Негативна думка|I don’t think ... will|Погода|Технології|Навчання й робота|Особисті прогнози|Probably won’t|Ступінь упевненості|Власні прогнози"),
      lesson("future-simple-m2-05-negative-promises", "5. Обіцянки не робити щось", "DEEP_DIVE", "Негативна обіцянка|I won’t forget|I won’t tell anyone|I won’t be late|Зміна поведінки|Не повторювати помилку|I promise|Заспокоєння співрозмовника|Формальна ситуація|Діалоги"),
      lesson("future-simple-m2-06-refusal", "6. Відмова з won’t", "DEEP_DIVE", "Won’t як відмова людини|Відмова виконати прохання|Уперте небажання|Пристрій не працює|Машина не заводиться|Комп’ютер не вмикається|Нейтральне майбутнє й відмова|Визначення значення за контекстом|Емоційне забарвлення|Практика ситуацій"),
      lesson("future-simple-m2-07-wont-dont-didnt", "7. Won’t, don’t і didn’t", "DEEP_DIVE", "Don’t для теперішнього|Didn’t для минулого|Won’t для майбутнього|Звички тепер|Завершені минулі події|Майбутні події|Signal words різних часів|Вибір часу за контекстом|Виправлення змішаних помилок|Змішана практика"),
      lesson("future-simple-m2-08-time-conditions", "8. Заперечення у часі й умові", "DEEP_DIVE", "Майбутнє після when|Present Simple після when|Before|After|Until|As soon as|Умова після if|Заперечення в головній частині|Подвійне will як помилка|Контекстна практика"),
      lesson("future-simple-m2-09-dialogues", "9. Заперечення в діалогах і зв’язній мові", "PRACTICE", "Негативна відповідь про майбутнє|Незгода з прогнозом|Відмова від дії|Обіцянка не робити|Скасована дія|Заспокоєння|Негативний наслідок|Діалог про плани|Розповідь про майбутнє|Письмова практика"),
      lesson("future-simple-m2-10-final", "10. Підсумок заперечної форми", "FINAL", "Will not|Won’t|V1 після won’t|Негативні прогнози|Негативні обіцянки|Відмова|Won’t don’t didn’t|Придаточні часу|Умова з if|Усне й письмове застосування"),
    ],
  },
  {
    slug: "future-simple-questions",
    title: "Модуль 3. Питальна форма Future Simple",
    description: "Загальні, спеціальні й суб’єктні питання, відповіді, Shall I?/Shall we? та прохання.",
    lessons: [
      lesson("future-simple-m3-01-overview", "1. Загальне знайомство з питаннями", "OVERVIEW", "Типи питань|Формула загального питання|Will на початку|Початкова форма після will|Короткі відповіді|Спеціальні питання|Питальні слова|Питання до підмета|Shall I і Shall we|Основні помилки"),
      lesson("future-simple-m3-02-general-questions", "2. Загальні питання з will", "DEEP_DIVE", "Значення загального питання|Will + subject + V1|Питання з I і you|Питання з he she it|Питання з we they|Правильні дієслова|Неправильні дієслова|Інтонація|Перетворення твердження|Контекстна практика"),
      lesson("future-simple-m3-03-base-after-will", "3. Початкова форма після will у питаннях", "DEEP_DIVE", "Will + V1|Без -s|Без -ed|Без to|Без -ing|Правильні дієслова|Неправильні дієслова|Виправлення питань|Автоматичне побудування|Змішана практика"),
      lesson("future-simple-m3-04-answers", "4. Короткі й повні відповіді", "DEEP_DIVE", "Yes I will|No I won’t|Відповіді з you|Відповіді з he she it|Відповіді з we they|Заміна іменника займенником|Повна позитивна відповідь|Повна негативна відповідь|Причина або деталь|Діалогова практика"),
      lesson("future-simple-m3-05-wh-questions", "5. Спеціальні питання", "DEEP_DIVE", "Загальна формула Wh-питання|What will|Where will|When will|Why will|How will|How long will|How many і how much|Порядок слів|Розгорнута відповідь"),
      lesson("future-simple-m3-06-subject-questions", "6. Питання до підмета", "DEEP_DIVE", "Що таке підмет|Who will come|Who will help us|What will happen|Без окремого підмета після will|Підмет і додаток|Who will call Anna|Who will Anna call|Типові помилки|Змішана практика"),
      lesson("future-simple-m3-07-shall", "7. Shall I? і Shall we?", "DEEP_DIVE", "Сучасне значення shall|Shall I для допомоги|Shall I для рішення|Shall we для спільної дії|Відповіді на пропозицію|Will I і Shall I|Will we і Shall we|Формальна ситуація|Типові помилки|Діалогова практика"),
      lesson("future-simple-m3-08-requests", "8. Питання-прохання з will", "PRACTICE", "Will you як питання про майбутнє|Will you як прохання|Прості прохання|Прохання про допомогу|Прохання виконати дію|Ввічливий тон|Позитивна відповідь|Негативна відповідь|Значення за контекстом|Діалоги"),
      lesson("future-simple-m3-09-conversations", "9. Питання в розмовах про майбутнє", "PRACTICE", "Завтрашній день|Вихідні|Навчання|Робота|Подорожі|Технології|Особисте майбутнє|Уточнювальні питання|Міні-інтерв’ю|Створення діалогу"),
      lesson("future-simple-m3-10-final", "10. Підсумок питальної форми", "FINAL", "Загальні питання|Порядок слів|V1 після will|Короткі відповіді|Повні відповіді|Спеціальні питання|Питання до підмета|Прохання з will|Shall I і Shall we|Діалог"),
    ],
  },
  {
    slug: "future-simple-mixed",
    title: "Модуль 4. Змішані форми Future Simple",
    description: "Усі форми Future Simple, порівняння способів вираження майбутнього та практика в реальному контексті.",
    lessons: [
      lesson("future-simple-m4-01-overview", "1. Огляд усіх форм Future Simple", "OVERVIEW", "Основні випадки вживання|Ствердження|Заперечення|Загальне питання|Спеціальне питання|Короткі відповіді|Прогнози|Спонтанні рішення|Обіцянки пропозиції та прохання|Система Future Simple"),
      lesson("future-simple-m4-02-transformations", "2. Ствердження → заперечення → питання", "DEEP_DIVE", "Ствердження як основа|Додавання not|Скорочення won’t|Will на початок питання|V1 у всіх формах|Загальне питання|Спеціальне питання|Коротка відповідь|Повна відповідь|Змішані трансформації"),
      lesson("future-simple-m4-03-predictions", "3. Прогнози й припущення", "DEEP_DIVE", "Позитивний прогноз|Негативний прогноз|Питання про майбутнє|Спеціальне питання|Ступінь упевненості|I think|I don’t think|Probably|Maybe і perhaps|Власний прогноз"),
      lesson("future-simple-m4-04-decisions-promises", "4. Рішення, обіцянки й допомога", "DEEP_DIVE", "Спонтанне рішення|Рішення після нової інформації|Обіцянка|Негативна обіцянка|Пропозиція допомоги|Добровільна дія|Прохання|Shall I|Shall we|Ситуаційні діалоги"),
      lesson("future-simple-m4-05-going-to", "5. Future Simple і be going to", "DEEP_DIVE", "Загальне значення майбутнього|Рішення зараз із will|Заздалегідь сформований намір|Прогноз-думка з will|Видимий доказ із be going to|Порівняння контекстів|Вибір форми|Типові помилки|Діалогова практика|Змішана практика"),
      lesson("future-simple-m4-06-present-continuous", "6. Future Simple і Present Continuous", "DEEP_DIVE", "Майбутнє значення Present Continuous|Особиста домовленість|Призначена зустріч|Підготовлений план|Спонтанне рішення з will|Припущення з will|Порівняння контекстів|Вибір форми|Типові помилки|Змішана практика"),
      lesson("future-simple-m4-07-present-simple", "7. Future Simple і Present Simple", "DEEP_DIVE", "Розклад із Present Simple|Програма події|Громадський транспорт|Офіційний час|Прогноз з will|Спонтанне рішення з will|Розклад і прогноз|Вибір форми|Типові помилки|Контекстна практика"),
      lesson("future-simple-m4-08-time-clauses", "8. Придаточні часу й умови", "DEEP_DIVE", "Головна й придаточна частина|When|If|Before|After|Until|As soon as|Present Simple у придаточній частині|Will у головній частині|Змішана практика"),
      lesson("future-simple-m4-09-production", "9. Читання, аудіювання, письмо й мовлення", "PRACTICE", "Читання Future Simple у тексті|Значення will|Аудіо: скорочення 'll|Аудіо: won’t|Відповіді за аудіо|Переказ прогнозу|Усне спонтанне рішення|Діалог про майбутнє|Письмовий прогноз|Моє життя через десять років"),
      lesson("future-simple-m4-10-course-final", "10. Фінальний контроль Future Simple", "FINAL", "Will + V1|Скорочення 'll|Won’t|Загальні питання|Спеціальні питання|Короткі відповіді|Прогнози й рішення|Обіцянки допомога прохання|Час і умова|Порівняння майбутніх форм"),
    ],
  },
];

const ACTIONS = [
  ["I", "call", "you", "Я подзвоню тобі"],
  ["Anna", "visit", "her friend", "Анна відвідає подругу"],
  ["He", "go", "to work", "Він піде на роботу"],
  ["The dog", "sleep", "under the table", "Собака спатиме під столом"],
  ["We", "meet", "at the station", "Ми зустрінемося на станції"],
  ["They", "finish", "the project", "Вони завершать проєкт"],
  ["The children", "play", "in the park", "Діти гратимуть у парку"],
  ["My friends", "travel", "to Lviv", "Мої друзі подорожуватимуть до Львова"],
];

const RULES = {
  "future-simple-meaning": ["Future Simple передає прогноз, рішення в момент мовлення, обіцянку або майбутній факт.", "subject + will + V1"],
  "future-simple-formula": ["Після підмета використовуйте will, а після will — початкову форму дієслова.", "subject + will + V1"],
  "future-simple-base-verb": ["Після will, won’t і в питаннях використовуйте V1 без -s, -ed, to та -ing.", "will + V1"],
  "future-simple-full-form": ["Повна форма will доречна для наголосу або формального стилю.", "subject + will + V1"],
  "future-simple-contraction": ["Скорочення 'll приєднується до підмета: I’ll, you’ll, she’ll.", "subject + 'll + V1"],
  "future-simple-prediction": ["Для прогнозу, заснованого на думці, використовуйте will.", "I think + subject + will + V1"],
  "future-simple-opinion": ["Після I think і I believe для майбутнього прогнозу використовуйте will.", "I think + subject + will + V1"],
  "future-simple-certainty": ["Probably зазвичай стоїть після will, а perhaps і maybe — перед підметом.", "subject + will probably + V1"],
  "future-simple-spontaneous-decision": ["Для рішення, прийнятого саме зараз, використовуйте I’ll + V1.", "I’ll + V1"],
  "future-simple-promise": ["Обіцянка будується з I will або I’ll + V1.", "I’ll + V1"],
  "future-simple-offer": ["Добровільна пропозиція допомоги використовує I’ll + V1.", "I’ll + V1"],
  "future-simple-warning": ["У нейтральному попередженні після or можна використати will для наслідку.", "imperative + or + subject + will + V1"],
  "future-simple-signal-words": ["Tomorrow, next week, soon і in two days уточнюють час майбутньої дії; не кажемо in next week.", "will + V1 + time"],
  "future-simple-negative": ["Заперечення: subject + will not/won’t + V1.", "subject + won’t + V1"],
  "future-simple-wont": ["Won’t — скорочення від will not; після нього завжди V1.", "subject + won’t + V1"],
  "future-simple-negative-base": ["Після won’t не додавайте -s, -ed, to або -ing.", "won’t + V1"],
  "future-simple-negative-prediction": ["Нейтральний негативний прогноз часто звучить як I don’t think + subject + will + V1.", "I don’t think + subject + will + V1"],
  "future-simple-negative-promise": ["Негативна обіцянка: I won’t + V1.", "I won’t + V1"],
  "future-simple-refusal": ["Won’t може означати відмову людини або те, що пристрій не працює.", "subject + won’t + V1"],
  "future-simple-general-question": ["У загальному питанні will переходить перед підметом.", "Will + subject + V1?"],
  "future-simple-wh-question": ["У спеціальному питанні після Wh-слова ставте will, підмет і V1.", "Wh-word + will + subject + V1?"],
  "future-simple-subject-question": ["У питанні до підмета після who не додавайте окремий підмет.", "Who + will + V1?"],
  "future-simple-short-answer": ["Коротка відповідь повторює will або won’t, а не повне смислове дієслово.", "Yes, subject + will. / No, subject + won’t."],
  "future-simple-shall-i": ["Shall I...? — сучасний спосіб запропонувати допомогу або запитати рішення.", "Shall I + V1?"],
  "future-simple-shall-we": ["Shall we...? — пропозиція зробити щось разом.", "Shall we + V1?"],
  "future-simple-request": ["Will you...? може бути ввічливим проханням; форма після you — V1.", "Will you + V1?"],
  "future-simple-time-clause": ["Після when, before, after, until і as soon as для майбутнього використовуйте Present Simple, не will.", "will + V1 + when + Present Simple"],
  "future-simple-if-clause": ["Після if для реальної майбутньої умови використовуйте Present Simple, а will — у головній частині.", "will + V1 + if + Present Simple"],
  "future-simple-vs-going-to": ["Will виражає рішення зараз або думку; be going to — намір, сформований раніше, або видимий доказ.", "I’ll + V1 / be going to + V1"],
  "future-simple-vs-present-continuous": ["Present Continuous передає домовленість, Future Simple — рішення зараз або прогноз.", "I’m meeting / I’ll + V1"],
  "future-simple-vs-present-simple": ["Present Simple передає розклад, Future Simple — прогноз чи рішення.", "The train leaves / I think it will be late"],
  "future-simple-production": ["Застосовуйте Future Simple у тексті, аудіо, письмі та діалозі відповідно до змісту ситуації.", "will / won’t + V1"],
};

function actionAt(serial) {
  const [subject, base, object, translation] = ACTIONS[serial % ACTIONS.length];
  const time = ["tomorrow", "next week", "later", "in two days", "soon"][Math.floor(serial / ACTIONS.length) % 5];
  return { subject, base, object, translation, time };
}

function pronounFor(subject) {
  if (subject === "I") return "I";
  if (["We", "They", "The children", "My friends"].includes(subject)) return "they";
  if (subject === "The dog") return "it";
  if (subject === "Anna") return "she";
  return "he";
}

function makeScenario(skillSlug, serial) {
  const action = actionAt(serial);
  const { subject, base, object, translation, time } = action;
  const subjectLower = subject === "I" ? "I" : subject.toLowerCase();
  const positive = `${subject} will ${base} ${object} ${time}.`;
  const negative = `${subject} won’t ${base} ${object} ${time}.`;
  const question = `Will ${subjectLower} ${base} ${object} ${time}?`;
  const baseError = `${subject} will ${base}s ${object} ${time}.`;
  const [rule, formula] = RULES[skillSlug] ?? RULES["future-simple-formula"];

  if (["future-simple-formula", "future-simple-base-verb"].includes(skillSlug)) return { rule, formula, correct: positive, incorrect: baseError, prompt: `${subject} will ___ ${object} ${time}.`, answer: base, translation };
  if (skillSlug === "future-simple-full-form") return { rule, formula, correct: "I will call you tomorrow.", incorrect: "I’ll calling you tomorrow.", prompt: "I ___ call you tomorrow.", answer: "will", translation: "Я подзвоню тобі завтра." };
  if (skillSlug === "future-simple-contraction") return { rule, formula, correct: "I’ll call you tomorrow.", incorrect: "I’ll calling you tomorrow.", prompt: "I___ call you tomorrow.", answer: "'ll", translation: "Я подзвоню тобі завтра." };
  if (["future-simple-prediction", "future-simple-opinion"].includes(skillSlug)) return { rule, formula, correct: "I think it will rain tomorrow.", incorrect: "I think it will rains tomorrow.", prompt: "I think it ___ rain tomorrow.", answer: "will", translation: "Я думаю, що завтра піде дощ." };
  if (skillSlug === "future-simple-certainty") return { rule, formula, correct: "She will probably come later.", incorrect: "She will come probably later.", prompt: "She will ___ come later.", answer: "probably", translation: "Вона, ймовірно, прийде пізніше." };
  if (skillSlug === "future-simple-spontaneous-decision") return { rule, formula, correct: "The phone is ringing. I’ll answer it.", incorrect: "The phone is ringing. I’ll to answer it.", prompt: "The phone is ringing. I’ll ___ it.", answer: "answer", translation: "Телефон дзвонить. Я відповім." };
  if (skillSlug === "future-simple-promise") return { rule, formula, correct: "I promise I’ll call you.", incorrect: "I promise I’ll calling you.", prompt: "I promise I’ll ___ you.", answer: "call", translation: "Я обіцяю, що подзвоню тобі." };
  if (skillSlug === "future-simple-offer") return { rule, formula, correct: "I’ll carry your bag.", incorrect: "I’ll to carry your bag.", prompt: "I’ll ___ your bag.", answer: "carry", translation: "Я понесу твою сумку." };
  if (skillSlug === "future-simple-warning") return { rule, formula, correct: "Be careful or you’ll fall.", incorrect: "Be careful or you’ll falling.", prompt: "Be careful or you’ll ___.", answer: "fall", translation: "Будь обережним, інакше впадеш." };
  if (skillSlug === "future-simple-signal-words") return { rule, formula, correct: "We will meet next week.", incorrect: "We will meet in next week.", prompt: "We will meet ___ week.", answer: "next", translation: "Ми зустрінемося наступного тижня." };
  if (["future-simple-negative", "future-simple-wont", "future-simple-negative-base"].includes(skillSlug)) return { rule, formula, correct: negative, incorrect: `${subject} won’t ${base}s ${object} ${time}.`, prompt: `${subject} ___ ${base} ${object} ${time}.`, answer: "won’t", translation: `${translation}, але цього не буде.` };
  if (skillSlug === "future-simple-negative-prediction") return { rule, formula, correct: "I don’t think she will come.", incorrect: "I don’t think she will comes.", prompt: "I don’t think she will ___.", answer: "come", translation: "Я не думаю, що вона прийде." };
  if (skillSlug === "future-simple-negative-promise") return { rule, formula, correct: "I promise I won’t tell anyone.", incorrect: "I promise I won’t telling anyone.", prompt: "I promise I won’t ___ anyone.", answer: "tell", translation: "Я обіцяю, що нікому не скажу." };
  if (skillSlug === "future-simple-refusal") return { rule, formula, correct: "The car won’t start.", incorrect: "The car won’t starts.", prompt: "The car won’t ___.", answer: "start", translation: "Машина не заводиться." };
  if (skillSlug === "future-simple-general-question") return { rule, formula, correct: question, incorrect: `${subject} will ${base} ${object} ${time}?`, prompt: "___ " + `${subjectLower} ${base} ${object} ${time}?`, answer: "Will", translation: `Чи ${translation.toLowerCase()}?` };
  if (skillSlug === "future-simple-wh-question") return { rule, formula, correct: `Where will ${subjectLower} ${base} ${time}?`, incorrect: `Where ${subjectLower} will ${base} ${time}?`, prompt: `Where will ${subjectLower} ___ ${time}?`, answer: base, translation: `Де ${translation.toLowerCase()}?` };
  if (skillSlug === "future-simple-subject-question") return { rule, formula, correct: "Who will help Tom?", incorrect: "Who will helps Tom?", prompt: "Who will ___ Tom?", answer: "help", translation: "Хто допоможе Тому?" };
  if (skillSlug === "future-simple-short-answer") { const pronoun = pronounFor(subject); return { rule, formula, correct: `Yes, ${pronoun} will. ${positive}`, incorrect: `Yes, ${pronoun} will ${base}.`, prompt: `Yes, ${pronoun} ___.`, answer: "will", translation: `Так, ${translation.toLowerCase()}.` }; }
  if (skillSlug === "future-simple-shall-i") return { rule, formula, correct: "Shall I open the window?", incorrect: "Shall I to open the window?", prompt: "Shall I ___ the window?", answer: "open", translation: "Мені відкрити вікно?" };
  if (skillSlug === "future-simple-shall-we") return { rule, formula, correct: "Shall we start now?", incorrect: "Shall we to start now?", prompt: "Shall we ___ now?", answer: "start", translation: "Почнемо зараз?" };
  if (skillSlug === "future-simple-request") return { rule, formula, correct: "Will you help me?", incorrect: "Will you to help me?", prompt: "Will you ___ me?", answer: "help", translation: "Ти допоможеш мені?" };
  if (skillSlug === "future-simple-time-clause") return { rule, formula, correct: "I will call you when I arrive.", incorrect: "I will call you when I will arrive.", prompt: "I will call you when I ___.", answer: "arrive", translation: "Я подзвоню тобі, коли приїду." };
  if (skillSlug === "future-simple-if-clause") return { rule, formula, correct: "We will go out if the weather is good.", incorrect: "We will go out if the weather will be good.", prompt: "We will go out if the weather ___ good.", answer: "is", translation: "Ми підемо гуляти, якщо погода буде гарною." };
  if (skillSlug === "future-simple-vs-going-to") return { rule, formula, correct: "The phone is ringing. I’ll answer it.", incorrect: "The phone is ringing. I’m going to answer it.", prompt: "The phone is ringing. I’ll ___ it.", answer: "answer", translation: "Телефон дзвонить. Я відповім." };
  if (skillSlug === "future-simple-vs-present-continuous") return { rule, formula, correct: "I’m meeting the doctor at five.", incorrect: "I will meeting the doctor at five.", prompt: "I’m ___ the doctor at five.", answer: "meeting", translation: "Я зустрічаюся з лікарем о п’ятій." };
  if (skillSlug === "future-simple-vs-present-simple") return { rule, formula, correct: "The train leaves at six.", incorrect: "The train will leaves at six.", prompt: "The train ___ at six.", answer: "leaves", translation: "Поїзд вирушає о шостій." };
  if (skillSlug === "future-simple-production") return { rule, formula, correct: "I’ll write a short prediction tomorrow.", incorrect: "I’ll writing a short prediction tomorrow.", prompt: "I’ll ___ a short prediction tomorrow.", answer: "write", translation: "Я напишу короткий прогноз завтра." };
  return { rule, formula, correct: positive, incorrect: baseError, prompt: `${subject} will ___ ${object} ${time}.`, answer: base, translation };
}

function inferSkill(_moduleIndex, focus, fragmentIndex) {
  const text = focus.toLowerCase();
  if (text.includes("shall i")) return "future-simple-shall-i";
  if (text.includes("shall we")) return "future-simple-shall-we";
  if (text.includes("прохання") || text.includes("will you")) return "future-simple-request";
  if (text.includes("до підмет")) return "future-simple-subject-question";
  if (text.includes("спеціаль") || text.includes("питальні слова") || text.includes("wh-")) return "future-simple-wh-question";
  if (text.includes("коротк") || text.includes("повна відповід")) return "future-simple-short-answer";
  if (text.includes("питання") || text.includes("інтонаці") || text.includes("will на початок")) return "future-simple-general-question";
  if (text.includes("відмова") || text.includes("пристр") || text.includes("машина") || text.includes("комп’ютер")) return "future-simple-refusal";
  if (text.includes("негативн") || text.includes("запереч") || text.includes("will not") || text.includes("won’t")) {
    if (text.includes("прогноз") || text.includes("i don’t think")) return "future-simple-negative-prediction";
    if (text.includes("обіцян")) return "future-simple-negative-promise";
    if (text.includes("початкова") || text.includes("без -") || text.includes("неправильн")) return "future-simple-negative-base";
    if (text.includes("скороч") || text.includes("повна форма") || text.includes("вимова")) return "future-simple-wont";
    return "future-simple-negative";
  }
  if (text.includes("when") || text.includes("before") || text.includes("after") || text.includes("until") || text.includes("as soon")) return "future-simple-time-clause";
  if (text.includes("умов") || text.includes(" if")) return "future-simple-if-clause";
  if (text.includes("going to") || text.includes("намір") || text.includes("видимий доказ")) return "future-simple-vs-going-to";
  if (text.includes("present continuous") || text.includes("домовлен") || text.includes("зустріч")) return "future-simple-vs-present-continuous";
  if (text.includes("present simple") || text.includes("розклад") || text.includes("транспорт") || text.includes("офіційний час")) return "future-simple-vs-present-simple";
  if (text.includes("аудіо") || text.includes("читан") || text.includes("письм") || text.includes("усн") || text.includes("діалог") || text.includes("інтерв’ю")) return "future-simple-production";
  if (text.includes("спонтан") || text.includes("реакці") || text.includes("рішення")) return "future-simple-spontaneous-decision";
  if (text.includes("обіцян") || text.includes("запевнен")) return "future-simple-promise";
  if (text.includes("допомог") || text.includes("добровільн")) return "future-simple-offer";
  if (text.includes("попередж") || text.includes("наслід")) return "future-simple-warning";
  if (text.includes("прогноз")) return "future-simple-prediction";
  if (text.includes("i think") || text.includes("i believe") || text.includes("думк")) return "future-simple-opinion";
  if (text.includes("probably") || text.includes("perhaps") || text.includes("maybe") || text.includes("упевнен")) return "future-simple-certainty";
  if (text.includes("signal") || text.includes("tomorrow") || text.includes("next ") || text.includes("soon") || text.includes("later") || text.includes("in two")) return "future-simple-signal-words";
  if (text.includes("скороч") || text.includes("'ll")) return "future-simple-contraction";
  if (text.includes("повна форма")) return "future-simple-full-form";
  if (text.includes("початкова") || text.includes("без -s") || text.includes("без to") || text.includes("без -ing") || text.includes("v1")) return "future-simple-base-verb";
  if (text.includes("формула") || text.includes("порядок слів") || text.includes("will для всіх")) return "future-simple-formula";
  return fragmentIndex % 2 === 0 ? "future-simple-meaning" : "future-simple-formula";
}

const importer = createContinuousCourseImporter({
  grammarName: "Future Simple",
  auditKey: "FUTURE_SIMPLE",
  imageAlt: "Everyday future-oriented scene with people deciding, planning and helping.",
  typicalContext: "Прогноз, рішення в момент мовлення, обіцянка, пропозиція або питання про майбутнє.",
  defaultAuxiliaryOne: "will",
  defaultAuxiliaryTwo: "won’t",
  defaultAuxiliaryThree: "V1",
  formCheckHint: "Перевірте will або won’t і початкову форму дієслова.",
  spellingVariant: "SHORT_ANSWER",
  spellingHint: "Перевірте, чи після will/won’t стоїть початкова форма без -s, -ed, to та -ing.",
  builderHint: "Перевірте порядок слів: підмет + will/won’t + V1 або Will + підмет + V1.",
  transformHint: "Під час перетворення збережіть will/won’t і початкову форму дієслова.",
  practiceDescription: "12 різнотипних вправ: вибір, зіставлення, пропуск, початкова форма, порядок слів, виправлення, трансформація, переклад, контекст і самостійна відповідь.",
  skills: SKILLS,
  modules: MODULES,
  makeScenario,
  inferSkill,
  course: {
    slug: COURSE_SLUG,
    title: "Future Simple: повне опанування",
    shortDescription: "Інтерактивний курс Future Simple: will + V1, скорочення, заперечення, питання, прогнози, рішення та порівняння майбутніх форм.",
    fullDescription: "Сорок уроків у чотирьох модулях, десять навчальних фрагментів у кожному уроці, 12 пояснених вправ після кожного фрагмента та вимірювані навички для адаптивного повторення.",
    learningOutcomes: ["Утворювати will + V1, will not і won’t", "Будувати загальні, спеціальні та суб’єктні питання", "Висловлювати прогнози, рішення, обіцянки, пропозиції та прохання", "Розрізняти Future Simple, be going to, Present Continuous і Present Simple", "Уживати Present Simple після when, if, before, after, until і as soon as"],
    prerequisites: ["Базові англійські займенники", "Початкова лексика рівня A1", "Розуміння поняття початкової форми дієслова"],
  },
});

if (require.main === module) importer.main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { ...importer, makeScenario };
