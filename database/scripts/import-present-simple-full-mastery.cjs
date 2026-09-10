/*
 * Imports a complete, canonical A1 Present Simple course without replacing
 * legacy courses or learner history.
 *
 * Run a structural dry validation:
 *   node database/scripts/import-present-simple-full-mastery.cjs --validate
 *
 * Import a reviewable draft:
 *   node database/scripts/import-present-simple-full-mastery.cjs
 *
 * Import learner-visible content after the CMS/migration deployment:
 *   node database/scripts/import-present-simple-full-mastery.cjs --publish
 */
try {
  require("dotenv").config({ path: ".env", quiet: true });
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

// Vercel and the production bootstrap generate this schema-aware client. The
// legacy runtime path can remain present locally, but does not expose newly
// added models such as GrammarSkill.
const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");

const COURSE_SLUG = "present-simple-full-mastery";
const LESSON_DURATION_MINUTES = 20;
const PRACTICE_PER_FRAGMENT = 12;

const SKILLS = [
  ["present-simple-uses", "Present Simple: uses", "Use the tense for routines, habits, facts and permanent situations."],
  ["present-simple-time-markers", "Present Simple: time markers", "Recognise time markers that commonly signal Present Simple."],
  ["present-simple-frequency", "Present Simple: frequency adverbs", "Place always, usually, often, sometimes and never naturally."],
  ["present-simple-word-order", "Present Simple: word order", "Build accurate affirmative Present Simple sentences."],
  ["present-simple-base-form", "Present Simple: base form", "Use the base verb with I, you, we and they."],
  ["present-simple-third-person-s", "Present Simple: third-person -s", "Add -s accurately with he, she and it."],
  ["present-simple-es-ies", "Present Simple: -es and -ies", "Apply spelling rules for -es and -ies."],
  ["present-simple-irregular-third-person", "Present Simple: irregular third-person forms", "Use has, does and goes accurately."],
  ["present-simple-do-does", "Present Simple: do / does", "Choose do or does in questions and short answers."],
  ["present-simple-negatives", "Present Simple: negatives", "Build negatives with do not and does not."],
  ["present-simple-wh-questions", "Present Simple: Wh-questions", "Form information questions with correct auxiliary word order."],
  ["present-simple-error-correction", "Present Simple: error correction", "Identify, explain and repair common Present Simple errors."],
];

function lesson(slug, title, role, skillSlugs, core, use) {
  return { slug, title, role, skillSlugs, core, use };
}

const MODULES = [
  {
    slug: "meaning-and-routines",
    title: "Модуль 1. Значення та рутини",
    description: "Зрозумійте, коли Present Simple описує звички, факти й повторювані дії.",
    lessons: [
      lesson("m1-01-present-simple-overview", "1. Present Simple: коли ми його використовуємо", "OVERVIEW", ["present-simple-uses", "present-simple-time-markers"],
        ["Рутини та факти", "Використовуйте Present Simple для звичних і регулярних дій, а також фактів.", "I study English every day.", "I am studying English every day.", "I ___ English every day.", "study", "Я вивчаю англійську щодня."],
        ["Постійні ситуації", "Present Simple описує те, що зазвичай є правдою.", "My family lives in Kyiv.", "My family is living in Kyiv.", "My family ___ in Kyiv.", "lives", "Моя родина живе в Києві."]),
      lesson("m1-02-habits-and-routines", "2. Звички та щоденні рутини", "DEEP_DIVE", ["present-simple-uses", "present-simple-word-order"],
        ["Щоденна дія", "Опишіть регулярну дію базовою формою дієслова.", "We walk to school on weekdays.", "We walks to school on weekdays.", "We ___ to school on weekdays.", "walk", "Ми ходимо до школи пішки у будні."],
        ["Ранкова рутина", "Часова фраза допомагає показати, що дія повторюється.", "I drink tea every morning.", "I drink tea now every morning.", "I ___ tea every morning.", "drink", "Я п'ю чай щоранку."]),
      lesson("m1-03-facts-and-permanent-states", "3. Факти й постійні ситуації", "DEEP_DIVE", ["present-simple-uses", "present-simple-base-form"],
        ["Загальний факт", "Використовуйте Present Simple для фактів, що не залежать від моменту мовлення.", "Water boils at 100°C.", "Water is boiling at 100°C.", "Water ___ at 100°C.", "boils", "Вода кипить за 100°C."],
        ["Постійна характеристика", "Професія, адреса або вподобання часто є постійною ситуацією.", "They work in a hospital.", "They works in a hospital.", "They ___ in a hospital.", "work", "Вони працюють у лікарні."]),
      lesson("m1-04-time-markers", "4. Маркери часу: every day, on Mondays, at weekends", "DEEP_DIVE", ["present-simple-time-markers", "present-simple-uses"],
        ["Every / each", "Every day і each week підкреслюють регулярність.", "She calls her mum every Sunday.", "She is calling her mum every Sunday.", "She ___ her mum every Sunday.", "calls", "Вона телефонує мамі щонеділі."],
        ["Дні та вихідні", "On Mondays і at weekends часто супроводжують Present Simple.", "We play tennis at weekends.", "We are playing tennis at weekends.", "We ___ tennis at weekends.", "play", "Ми граємо в теніс на вихідних."]),
      lesson("m1-05-frequency-adverbs", "5. Прислівники частотності", "DEEP_DIVE", ["present-simple-frequency", "present-simple-word-order"],
        ["Always та usually", "Прислівник частотності зазвичай стоїть перед основним дієсловом.", "I usually finish work at six.", "I finish usually work at six.", "I ___ finish work at six.", "usually", "Я зазвичай закінчую роботу о шостій."],
        ["Never", "Never уже має негативне значення, тому не додавайте do not.", "He never eats meat.", "He doesn't never eat meat.", "He ___ eats meat.", "never", "Він ніколи не їсть м'яса."]),
      lesson("m1-06-word-order-affirmative", "6. Порядок слів у ствердженні", "PRACTICE", ["present-simple-word-order", "present-simple-base-form"],
        ["Базова схема", "Починайте зі підмета, потім ставте дієслово й решту інформації.", "They watch films after dinner.", "Watch they films after dinner.", "They ___ films after dinner.", "watch", "Вони дивляться фільми після вечері."],
        ["Місце частотності", "Поставте прислівник частотності між підметом і основним дієсловом.", "My brother often cooks dinner.", "My brother cooks often dinner.", "My brother ___ cooks dinner.", "often", "Мій брат часто готує вечерю."]),
      lesson("m1-07-stative-verbs", "7. Дієслова стану: know, like, need", "DEEP_DIVE", ["present-simple-uses", "present-simple-base-form"],
        ["Думка й знання", "Know, understand і believe зазвичай описують стан, тому вживайте Present Simple.", "I know the answer.", "I am knowing the answer.", "I ___ the answer.", "know", "Я знаю відповідь."],
        ["Почуття та потреби", "Like, love, need і want часто описують сталий стан.", "We need more time.", "We are needing more time.", "We ___ more time.", "need", "Нам потрібно більше часу."]),
      lesson("m1-08-routine-contexts", "8. Рутини в контексті", "PRACTICE", ["present-simple-uses", "present-simple-time-markers"],
        ["Робочий день", "Поєднайте Present Simple з конкретним моментом регулярної рутини.", "Anna starts work at nine.", "Anna is starting work at nine every day.", "Anna ___ work at nine.", "starts", "Анна починає роботу о дев'ятій."],
        ["Навчання", "Опишіть звичну навчальну дію коротким ствердженням.", "Our class meets on Tuesdays.", "Our class meeting on Tuesdays.", "Our class ___ on Tuesdays.", "meets", "Наша група зустрічається щовівторка."]),
      lesson("m1-09-meaning-review", "9. Повторення: значення та маркери", "REVIEW", ["present-simple-uses", "present-simple-time-markers"],
        ["Вибір часу", "Звичка, факт або розклад потребують Present Simple.", "The train leaves at 7:15.", "The train is leaving at 7:15 every day.", "The train ___ at 7:15.", "leaves", "Потяг відправляється о 7:15."],
        ["Швидка перевірка", "Перевірте, чи є в реченні ознака регулярності.", "I often read before bed.", "I often am reading before bed.", "I often ___ before bed.", "read", "Я часто читаю перед сном."]),
      lesson("m1-10-meaning-final", "10. Підсумок модуля: значення Present Simple", "FINAL", ["present-simple-uses", "present-simple-frequency"],
        ["Інтегрована рутина", "Оберіть форму, що точно передає регулярну дію.", "Marta usually takes the bus to work.", "Marta usually take the bus to work.", "Marta usually ___ the bus to work.", "takes", "Марта зазвичай їде автобусом на роботу."],
        ["Інтегрований факт", "Застосуйте правило в новому контексті без підказки часу теперішнього моменту.", "My parents live near the sea.", "My parents lives near the sea.", "My parents ___ near the sea.", "live", "Мої батьки живуть біля моря."]),
    ],
  },
  {
    slug: "subject-verb-agreement",
    title: "Модуль 2. Підмет і форма дієслова",
    description: "Навчіться впевнено обирати базову форму, -s, -es, -ies та нерегулярні форми.",
    lessons: [
      lesson("m2-01-agreement-overview", "1. Огляд: хто виконує дію?", "OVERVIEW", ["present-simple-base-form", "present-simple-third-person-s"],
        ["Підмет визначає форму", "I, you, we і they беруть базову форму; he, she і it — форму третьої особи.", "They play chess after school.", "They plays chess after school.", "They ___ chess after school.", "play", "Вони грають у шахи після школи."],
        ["Одна людина", "Один виконавець у третій особі потребує закінчення -s.", "He plays chess after school.", "He play chess after school.", "He ___ chess after school.", "plays", "Він грає у шахи після школи."]),
      lesson("m2-02-pronouns-and-base-form", "2. I, you, we, they: базова форма", "DEEP_DIVE", ["present-simple-base-form", "present-simple-word-order"],
        ["I та you", "Після I і you не додавайте -s.", "You speak English very well.", "You speaks English very well.", "You ___ English very well.", "speak", "Ти дуже добре говориш англійською."],
        ["We та they", "Множинний підмет також потребує базової форми.", "We cook dinner together.", "We cooks dinner together.", "We ___ dinner together.", "cook", "Ми готуємо вечерю разом."]),
      lesson("m2-03-he-she-it-s", "3. He, she, it: закінчення -s", "DEEP_DIVE", ["present-simple-third-person-s", "present-simple-base-form"],
        ["Звичайне -s", "Додайте -s до більшості дієслів після he, she та it.", "She reads before bed.", "She read before bed.", "She ___ before bed.", "reads", "Вона читає перед сном."],
        ["It як підмет", "It також є третьою особою однини.", "The phone costs too much.", "The phone cost too much.", "The phone ___ too much.", "costs", "Телефон коштує надто дорого."]),
      lesson("m2-04-nouns-as-subjects", "4. Іменники як підмети", "DEEP_DIVE", ["present-simple-third-person-s", "present-simple-base-form"],
        ["Один іменник", "Один іменник працює як he, she або it.", "My sister drives to work.", "My sister drive to work.", "My sister ___ to work.", "drives", "Моя сестра їздить на роботу машиною."],
        ["Множинний іменник", "Множинний іменник потребує базової форми.", "My friends drive to work.", "My friends drives to work.", "My friends ___ to work.", "drive", "Мої друзі їздять на роботу машиною."]),
      lesson("m2-05-es-spelling", "5. Орфографія: -es після s, sh, ch, x, o", "DEEP_DIVE", ["present-simple-es-ies", "present-simple-third-person-s"],
        ["Закінчення -es", "Додайте -es після дієслів на -s, -sh, -ch, -x та -o.", "He watches videos at night.", "He watchs videos at night.", "He ___ videos at night.", "watches", "Він дивиться відео ввечері."],
        ["Go → goes", "Дієслово go має форму goes у третій особі однини.", "She goes home by bus.", "She gos home by bus.", "She ___ home by bus.", "goes", "Вона їде додому автобусом."]),
      lesson("m2-06-ies-spelling", "6. Орфографія: -y → -ies", "DEEP_DIVE", ["present-simple-es-ies", "present-simple-third-person-s"],
        ["Приголосний + y", "Після приголосного змініть y на ies.", "He studies every evening.", "He studys every evening.", "He ___ every evening.", "studies", "Він навчається щовечора."],
        ["Голосний + y", "Після голосного просто додайте -s.", "She plays the piano.", "She plaies the piano.", "She ___ the piano.", "plays", "Вона грає на піаніно."]),
      lesson("m2-07-irregular-forms", "7. Особливі форми: has, does, goes", "DEEP_DIVE", ["present-simple-irregular-third-person", "present-simple-third-person-s"],
        ["Have → has", "У третій особі have змінюється на has.", "My teacher has a new laptop.", "My teacher haves a new laptop.", "My teacher ___ a new laptop.", "has", "У мого викладача є новий ноутбук."],
        ["Do → does", "У третій особі do змінюється на does.", "He does his homework after lunch.", "He dos his homework after lunch.", "He ___ his homework after lunch.", "does", "Він робить домашнє завдання після обіду."]),
      lesson("m2-08-pronunciation-s", "8. Вимова закінчення -s", "PRACTICE", ["present-simple-third-person-s", "present-simple-es-ies"],
        ["Форма перед вимовою", "Спершу оберіть правильну написану форму, а потім промовте її вголос.", "Liam works in a café.", "Liam work in a café.", "Liam ___ in a café.", "works", "Ліам працює в кафе."],
        ["Ще одна форма -es", "Форма watches має додатковий склад у вимові.", "Nina watches cartoons with her son.", "Nina watch cartoons with her son.", "Nina ___ cartoons with her son.", "watches", "Ніна дивиться мультфільми із сином."]),
      lesson("m2-09-agreement-review", "9. Повторення: узгодження", "REVIEW", ["present-simple-base-form", "present-simple-third-person-s"],
        ["Порівняйте підмети", "Перевіряйте, чи підмет один чи множинний, перш ніж писати дієслово.", "The dog sleeps near the door.", "The dog sleep near the door.", "The dog ___ near the door.", "sleeps", "Собака спить біля дверей."],
        ["Множина", "Не переносіть закінчення -s на множинний підмет.", "The dogs sleep near the door.", "The dogs sleeps near the door.", "The dogs ___ near the door.", "sleep", "Собаки сплять біля дверей."]),
      lesson("m2-10-agreement-final", "10. Підсумок модуля: точні форми", "FINAL", ["present-simple-es-ies", "present-simple-irregular-third-person"],
        ["Змішані правила", "Використайте -ies, якщо перед y стоїть приголосний.", "My cousin carries a heavy bag.", "My cousin carrys a heavy bag.", "My cousin ___ a heavy bag.", "carries", "Мій двоюрідний брат несе важку сумку."],
        ["Нерегулярна форма", "Запам'ятайте goes як окрему форму третьої особи.", "Our guide goes first.", "Our guide go first.", "Our guide ___ first.", "goes", "Наш гід іде першим."]),
    ],
  },
  {
    slug: "questions-and-negatives",
    title: "Модуль 3. Запитання та заперечення",
    description: "Будуйте точні запитання, короткі відповіді й заперечення з do та does.",
    lessons: [
      lesson("m3-01-questions-overview", "1. Огляд: do та does", "OVERVIEW", ["present-simple-do-does", "present-simple-negatives"],
        ["Допоміжне дієслово", "У запитаннях Present Simple використовуйте do або does перед підметом.", "Do you work on Saturdays?", "You do work on Saturdays?", "___ you work on Saturdays?", "Do", "Ти працюєш по суботах?"],
        ["Третя особа", "З he, she та it у запитанні використовуйте does.", "Does she live nearby?", "Do she live nearby?", "___ she live nearby?", "Does", "Вона живе поруч?"]),
      lesson("m3-02-do-questions", "2. Запитання з do", "DEEP_DIVE", ["present-simple-do-does", "present-simple-base-form"],
        ["I та you", "Після do основне дієслово завжди залишається в базовій формі.", "Do you like coffee?", "Do you likes coffee?", "Do you ___ coffee?", "like", "Ти любиш каву?"],
        ["We та they", "Множинні підмети також беруть do.", "Do they study here?", "Does they study here?", "___ they study here?", "Do", "Вони тут навчаються?"]),
      lesson("m3-03-does-questions", "3. Запитання з does", "DEEP_DIVE", ["present-simple-do-does", "present-simple-third-person-s"],
        ["Does + base verb", "Після does не додавайте -s до основного дієслова.", "Does he play football?", "Does he plays football?", "Does he ___ football?", "play", "Він грає у футбол?"],
        ["Іменник в однині", "Один іменник потребує does, як і he або she.", "Does your friend speak Polish?", "Do your friend speak Polish?", "___ your friend speak Polish?", "Does", "Твій друг говорить польською?"]),
      lesson("m3-04-short-answers", "4. Короткі відповіді", "PRACTICE", ["present-simple-do-does", "present-simple-base-form"],
        ["Позитивна відповідь", "Повторіть допоміжне дієслово в короткій відповіді.", "Yes, I do.", "Yes, I am.", "Yes, I ___.", "do", "Так, працюю / так, роблю."],
        ["Третя особа", "Для he, she та it коротка відповідь містить does.", "No, she doesn't.", "No, she don't.", "No, she ___.", "doesn't", "Ні, вона не робить."]),
      lesson("m3-05-negative-do-not", "5. Заперечення з do not", "DEEP_DIVE", ["present-simple-negatives", "present-simple-base-form"],
        ["Don't + base verb", "З I, you, we та they використовуйте do not / don't і базову форму.", "We don't eat meat.", "We don't eats meat.", "We don't ___ meat.", "eat", "Ми не їмо м'яса."],
        ["Повна форма", "Do not доречне, коли потрібен формальніший або підкреслений стиль.", "I do not watch TV in the morning.", "I do not watches TV in the morning.", "I do not ___ TV in the morning.", "watch", "Я не дивлюся телевізор вранці."]),
      lesson("m3-06-negative-does-not", "6. Заперечення з does not", "DEEP_DIVE", ["present-simple-negatives", "present-simple-do-does"],
        ["Doesn't + base verb", "Після doesn't поверніть основне дієслово до базової форми.", "He doesn't drive to work.", "He doesn't drives to work.", "He doesn't ___ to work.", "drive", "Він не їздить на роботу машиною."],
        ["Іменник в однині", "Один іменник у запереченні потребує does not.", "My sister does not drink coffee.", "My sister do not drink coffee.", "My sister ___ not drink coffee.", "does", "Моя сестра не п'є кави."]),
      lesson("m3-07-wh-questions", "7. Wh-запитання", "DEEP_DIVE", ["present-simple-wh-questions", "present-simple-do-does"],
        ["Питальне слово + do", "Починайте з what, where, when або why, а потім ставте do / does.", "Where do you work?", "Where you do work?", "Where ___ you work?", "do", "Де ти працюєш?"],
        ["Питальне слово + does", "Після Wh-слова та does основний дієслово лишається базовим.", "What does he do after class?", "What does he does after class?", "What does he ___ after class?", "do", "Що він робить після заняття?"]),
      lesson("m3-08-question-word-order", "8. Порядок слів у запитанні", "PRACTICE", ["present-simple-wh-questions", "present-simple-word-order"],
        ["Загальне запитання", "Допоміжне дієслово стоїть перед підметом.", "Do your parents travel often?", "Your parents do travel often?", "___ your parents travel often?", "Do", "Твої батьки часто подорожують?"],
        ["Інформаційне запитання", "Порядок: Wh-слово + do/does + підмет + базове дієслово.", "When does the shop open?", "When the shop does open?", "When ___ the shop open?", "does", "Коли відкривається магазин?"]),
      lesson("m3-09-questions-review", "9. Повторення: запитання й заперечення", "REVIEW", ["present-simple-do-does", "present-simple-negatives"],
        ["Змішана форма", "Виберіть do або does за підметом і залиште основне дієслово базовим.", "Does Maria teach online?", "Does Maria teaches online?", "Does Maria ___ online?", "teach", "Марія викладає онлайн?"],
        ["Змішане заперечення", "Використайте doesn't для третьої особи.", "The café doesn't open on Monday.", "The café don't open on Monday.", "The café ___ open on Monday.", "doesn't", "Кафе не відчиняється в понеділок."]),
      lesson("m3-10-questions-final", "10. Підсумок модуля: точна взаємодія", "FINAL", ["present-simple-wh-questions", "present-simple-error-correction"],
        ["Питання про звичку", "Сформуйте інформаційне запитання без зайвого -s.", "Why does Alex walk to work?", "Why does Alex walks to work?", "Why does Alex ___ to work?", "walk", "Чому Алекс ходить на роботу пішки?"],
        ["Виправлення помилки", "Знайдіть помилку в допоміжному дієслові та виправте все речення.", "She doesn't need a car.", "She don't need a car.", "She ___ need a car.", "doesn't", "Їй не потрібна машина."]),
    ],
  },
  {
    slug: "accuracy-and-fluency",
    title: "Модуль 4. Точність і вільне застосування",
    description: "Закріпіть Present Simple у реальних контекстах, редагуванні й підсумкових завданнях.",
    lessons: [
      lesson("m4-01-accuracy-overview", "1. Огляд: від правила до точного речення", "OVERVIEW", ["present-simple-error-correction", "present-simple-word-order"],
        ["Три перевірки", "Перевірте підмет, форму дієслова й порядок слів перед відповіддю.", "My neighbour works from home.", "My neighbour work from home.", "My neighbour ___ from home.", "works", "Мій сусід працює з дому."],
        ["Чітке речення", "Додайте час або місце після правильної основи речення.", "I practise pronunciation after class.", "I practise after class pronunciation.", "I ___ pronunciation after class.", "practise", "Я треную вимову після заняття."]),
      lesson("m4-02-work-and-study", "2. Контекст: робота та навчання", "PRACTICE", ["present-simple-uses", "present-simple-third-person-s"],
        ["Робоча рутина", "Опишіть регулярну дію на роботі Present Simple.", "Our manager checks emails at eight.", "Our manager check emails at eight.", "Our manager ___ emails at eight.", "checks", "Наш менеджер перевіряє листи о восьмій."],
        ["Навчальна рутина", "Використайте базову форму з множинним підметом.", "Students revise before a test.", "Students revises before a test.", "Students ___ before a test.", "revise", "Студенти повторюють матеріал перед тестом."]),
      lesson("m4-03-home-and-hobbies", "3. Контекст: дім і хобі", "PRACTICE", ["present-simple-frequency", "present-simple-base-form"],
        ["Домашні справи", "Прислівник частотності робить опис рутини конкретнішим.", "I often clean the kitchen on Friday.", "I clean often the kitchen on Friday.", "I ___ clean the kitchen on Friday.", "often", "Я часто прибираю кухню в п'ятницю."],
        ["Хобі", "Використовуйте базову форму з I, щоб говорити про улюблену діяльність.", "I paint landscapes in summer.", "I paints landscapes in summer.", "I ___ landscapes in summer.", "paint", "Я малюю пейзажі влітку."]),
      lesson("m4-04-schedules-and-facts", "4. Контекст: розклади та факти", "PRACTICE", ["present-simple-time-markers", "present-simple-uses"],
        ["Розклад", "Для офіційного розкладу використовуйте Present Simple.", "The museum opens at ten.", "The museum is opening at ten every day.", "The museum ___ at ten.", "opens", "Музей відкривається о десятій."],
        ["Факт", "Загальний факт не залежить від того, що відбувається зараз.", "The Earth moves around the Sun.", "The Earth is moving around the Sun.", "The Earth ___ around the Sun.", "moves", "Земля рухається навколо Сонця."]),
      lesson("m4-05-common-errors", "5. Типові помилки", "DEEP_DIVE", ["present-simple-error-correction", "present-simple-third-person-s"],
        ["Зайве -s", "Не додавайте -s після do, does, don't або doesn't.", "Does he live here?", "Does he lives here?", "Does he ___ here?", "live", "Він тут живе?"],
        ["Відсутнє -s", "Додайте -s, якщо підмет — одна третя особа.", "My uncle teaches maths.", "My uncle teach maths.", "My uncle ___ maths.", "teaches", "Мій дядько викладає математику."]),
      lesson("m4-06-present-simple-or-continuous", "6. Present Simple чи Present Continuous?", "DEEP_DIVE", ["present-simple-uses", "present-simple-error-correction"],
        ["Звичка проти моменту", "Для звички використайте Present Simple, навіть якщо дія звучить активною.", "She usually wears glasses.", "She is usually wearing glasses.", "She usually ___ glasses.", "wears", "Вона зазвичай носить окуляри."],
        ["Постійний стан", "Знання та вподобання частіше потребують Present Simple.", "I understand this rule.", "I am understanding this rule.", "I ___ this rule.", "understand", "Я розумію це правило."]),
      lesson("m4-07-reading-context", "7. Present Simple у короткому тексті", "PRACTICE", ["present-simple-word-order", "present-simple-time-markers"],
        ["Опис розкладу", "У тексті кожне речення має зберігати свою точну форму.", "The library closes at six.", "The library close at six.", "The library ___ at six.", "closes", "Бібліотека зачиняється о шостій."],
        ["Опис звички", "Зв'яжіть час і звичну дію в одному простому реченні.", "Visitors usually arrive early.", "Visitors usually arrives early.", "Visitors usually ___ early.", "arrive", "Відвідувачі зазвичай приходять рано."]),
      lesson("m4-08-writing-and-speaking", "8. Письмо й мовлення: моя рутина", "PRACTICE", ["present-simple-frequency", "present-simple-word-order"],
        ["Особисте речення", "Побудуйте речення про свою регулярну дію за правильною схемою.", "I normally call my grandmother on Sunday.", "I call normally my grandmother on Sunday.", "I ___ call my grandmother on Sunday.", "normally", "Я зазвичай телефоную бабусі в неділю."],
        ["Третя особа", "Опишіть рутину іншої людини з потрібним закінченням.", "My friend practises yoga every morning.", "My friend practise yoga every morning.", "My friend ___ yoga every morning.", "practises", "Моя подруга займається йогою щоранку."]),
      lesson("m4-09-mastery-review", "9. Повторення: точність перед фіналом", "REVIEW", ["present-simple-error-correction", "present-simple-do-does"],
        ["Перевірка запитання", "Поєднайте do/does із базовою формою.", "Do your colleagues speak English?", "Do your colleagues speaks English?", "Do your colleagues ___ English?", "speak", "Твої колеги говорять англійською?"],
        ["Перевірка заперечення", "Після don't основне дієслово не має -s.", "They don't work on Sundays.", "They don't works on Sundays.", "They don't ___ on Sundays.", "work", "Вони не працюють у неділю."]),
      lesson("m4-10-course-final", "10. Фінал курсу: Present Simple у дії", "FINAL", ["present-simple-error-correction", "present-simple-wh-questions"],
        ["Фінальне застосування", "Застосуйте всі правила, щоб описати регулярну дію точно й природно.", "Olena teaches children every weekday.", "Olena teach children every weekday.", "Olena ___ children every weekday.", "teaches", "Олена навчає дітей щодня у будні."],
        ["Фінальна взаємодія", "Сформуйте Wh-запитання з правильною допоміжною формою.", "Where does Olena teach?", "Where Olena does teach?", "Where ___ Olena teach?", "does", "Де викладає Олена?"]),
    ],
  },
];

function task(id, type, engineKey, variantKey, instruction, question, content, correctAnswer, explanation, hint, skillSlug, alternativeAnswers) {
  return { id, type, engineKey, variantKey, instruction, question, content, correctAnswer, explanation, hint, skillSlug, alternativeAnswers };
}

function makeExercises(fragment, skillSlug) {
  const [focus, rule, correct, incorrect, prompt, answer, translation] = fragment;
  const correctTokens = correct.replace(/[?.!]$/g, "").split(/\s+/);
  const options = [correct, incorrect, `Now ${correct.charAt(0).toLowerCase()}${correct.slice(1)}`];
  return [
    task("gap", "FILL_IN_THE_BLANK", "fill-in-the-blanks", "GAP_FILL", "Впишіть правильну форму дієслова.", prompt, { acceptedAnswers: [answer], example: correct, errorDetails: [{ incorrect, correction: correct, explanation: rule }] }, answer, rule, `Зосередьтеся на правилі: ${focus}.`, skillSlug),
    task("choice", "SINGLE_CHOICE", "single-choice", "CONTEXT_SELECTION", "Оберіть граматично правильне речення.", `Яке речення правильно застосовує правило «${focus}»?`, { options, example: correct, errorDetails: [{ incorrect, correction: correct, explanation: rule }] }, correct, rule, "Перевірте підмет і форму основного дієслова.", skillSlug),
    task("text", "TEXT_INPUT", "text-input", "SHORT_ANSWER", "Напишіть лише потрібне слово або форму.", prompt, { acceptedAnswers: [answer], ignorePunctuation: true, example: correct }, answer, rule, `Згадайте: ${focus}.`, skillSlug),
    task("matching", "MATCHING", "matching", "PAIR_MATCHING", "Зіставте правило з прикладом.", "Поєднайте кожен ярлик із відповідним реченням.", { left: ["Правильний приклад", "Типова помилка"], right: [correct, incorrect], example: `${correct} / ${incorrect}` }, { "Правильний приклад": correct, "Типова помилка": incorrect }, rule, "Спершу знайдіть речення, яке відповідає правилу.", skillSlug),
    task("builder", "SENTENCE_ORDER", "sentence-builder", "SENTENCE_ORDER", "Розташуйте слова у правильному порядку.", "Побудуйте правильне речення Present Simple.", { options: correctTokens, preserveOrder: true, example: correct, errorDetails: [{ incorrect, correction: correct, explanation: rule }] }, correctTokens, rule, "Почніть із підмета, потім поставте правильну форму дієслова.", skillSlug),
    task("correct", "ERROR_CORRECTION", "find-and-correct", "ERROR_CORRECTION", "Перепишіть речення правильно.", incorrect, { acceptedAnswers: [correct.replace(/[.]$/, ""), correct], ignorePunctuation: true, example: correct, errorDetails: [{ incorrect, correction: correct, explanation: rule }] }, correct, rule, "Знайдіть форму, що не відповідає підмету або схемі.", skillSlug, [correct.replace(/[.]$/, "")]),
    task("multi", "MULTIPLE_CHOICE", "multiple-choice", "MULTI_SELECT", "Оберіть усі правильні варіанти.", "Виберіть речення, у якому правило застосовано правильно.", { options: [correct, incorrect, `Not ${correct.charAt(0).toLowerCase()}${correct.slice(1)}`], example: correct }, [correct], rule, "У цьому наборі правильний лише один варіант.", skillSlug),
    task("translation", "SENTENCE_TRANSLATION", "translation", "SENTENCE_TRANSLATION", "Перекладіть фразу англійською.", translation, { acceptedAnswers: [correct], ignorePunctuation: true, example: correct }, correct, rule, `Побудуйте речення за правилом: ${focus}.`, skillSlug, [correct.replace(/[.]$/, "")]),
    task("gap-repeat", "FILL_IN_THE_BLANK", "fill-in-the-blanks", "GAP_FILL", "Ще раз впишіть точну форму.", prompt, { acceptedAnswers: [answer], example: correct }, answer, `Правильна відповідь: ${answer}. ${rule}`, "Перевірте, чи не потрібне -s, -es, do або does.", skillSlug),
    task("choice-repeat", "SINGLE_CHOICE", "single-choice", "CONTEXT_SELECTION", "Оберіть точний варіант.", "Яке речення ви б використали у цій ситуації?", { options: [correct, incorrect, `Always ${incorrect.charAt(0).toLowerCase()}${incorrect.slice(1)}`], example: correct }, correct, rule, "Оберіть природне речення без граматичної помилки.", skillSlug),
    task("error-repeat", "ERROR_CORRECTION", "find-and-correct", "ERROR_CORRECTION", "Виправте помилку та напишіть повне речення.", incorrect, { acceptedAnswers: [correct.replace(/[.]$/, ""), correct], ignorePunctuation: true, example: correct }, correct, `Виправлена форма: ${correct}. ${rule}`, "Не змінюйте зміст; виправте лише граматику.", skillSlug, [correct.replace(/[.]$/, "")]),
    task("recall", "TEXT_INPUT", "text-input", "SHORT_ANSWER", "Відтворіть правильну форму за правилом.", prompt, { acceptedAnswers: [answer], ignorePunctuation: true, example: correct }, answer, `У цьому прикладі потрібна форма «${answer}». ${rule}`, `Фокус фрагмента: ${focus}.`, skillSlug),
  ];
}

function fragmentBlocks(lessonPlan, key, fragment, skillSlug, offset) {
  const [focus, rule, correct, incorrect, prompt, answer, translation] = fragment;
  const exerciseKey = `${lessonPlan.slug}-${key}`;
  const practice = makeExercises(fragment, skillSlug);
  return [
    {
      type: "THEORY",
      title: `${focus}: правило`,
      content: { text: `${rule}\n\nПравильно: ${correct}\nПоширена помилка: ${incorrect}\nУкраїнською: ${translation}`, examples: [{ correct, incorrect, translation }] },
      learningFragmentKey: exerciseKey,
      isLearningFragment: true,
      requiresTwelveExercises: false,
      order: offset + 1,
      grammarSkillSlugs: [skillSlug],
    },
    {
      type: "EXERCISE",
      title: `Практика: ${focus}`,
      content: { text: `12 завдань для закріплення: ${focus}.`, practiceFocus: focus },
      learningFragmentKey: exerciseKey,
      isLearningFragment: false,
      requiresTwelveExercises: true,
      order: offset + 2,
      grammarSkillSlugs: [skillSlug],
      exercises: practice,
    },
    {
      type: "REVIEW",
      title: `Швидке повторення: ${focus}`,
      content: { text: `Зупиніться на хвилину: поясніть собі правило «${rule}» і вимовте приклад: ${correct}` },
      settings: { reviewAfterBlock: offset + 2, focus: key },
      order: offset + 3,
      grammarSkillSlugs: [skillSlug],
    },
  ];
}

function buildPlan() {
  return {
    course: {
      slug: COURSE_SLUG,
      title: "Present Simple: повне опанування",
      shortDescription: "Повний курс A1 з Present Simple: значення, форми, запитання, заперечення та точне застосування.",
      fullDescription: "Структурований курс із чотирьох модулів і сорока уроків. Кожен урок пояснює два вимірювані фрагменти правила, містить 24 різнотипні перевірені вправи й короткі етапи пригадування.",
      learningOutcomes: SKILLS.map(([, title, description]) => `${title}: ${description}`),
      prerequisites: ["Розуміти базові англійські займенники I, you, he, she, it, we, they."],
    },
    skills: SKILLS.map(([slug, title, description], index) => ({ slug, title, description, order: index + 1 })),
    modules: MODULES.map((modulePlan, moduleIndex) => ({
      ...modulePlan,
      order: moduleIndex + 1,
      lessons: modulePlan.lessons.map((lessonPlan, lessonIndex) => ({
        ...lessonPlan,
        order: lessonIndex + 1,
        estimatedDuration: LESSON_DURATION_MINUTES,
        minimumCompletionScore: lessonPlan.role === "FINAL" ? 75 : 60,
        description: `${lessonPlan.title}. Опрацюйте правило, типову помилку та закріпіть навичку у вправах.`,
        learningObjectives: lessonPlan.skillSlugs.map((slug) => SKILLS.find(([skillSlug]) => skillSlug === slug)?.[1] ?? slug),
        previewText: `Два короткі фрагменти правила та ${PRACTICE_PER_FRAGMENT * 2} перевірених вправ.`,
        blocks: [
          ...fragmentBlocks(lessonPlan, "core", lessonPlan.core, lessonPlan.skillSlugs[0], 0),
          ...fragmentBlocks(lessonPlan, "use", lessonPlan.use, lessonPlan.skillSlugs[1], 3),
        ],
      })),
    })),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validatePlan(plan) {
  assert(plan.modules.length === 4, "Present Simple course must contain exactly four modules.");
  assert(plan.skills.length >= 12, "Present Simple course needs at least twelve measurable grammar skills.");
  const skillSlugs = new Set(plan.skills.map((skill) => skill.slug));
  let lessonCount = 0;
  let blockCount = 0;
  let exerciseCount = 0;
  for (const modulePlan of plan.modules) {
    assert(modulePlan.lessons.length === 10, `${modulePlan.slug} must contain exactly ten lessons.`);
    assert(modulePlan.lessons[0].role === "OVERVIEW", `${modulePlan.slug} must start with an overview.`);
    assert(modulePlan.lessons.at(-1).role === "FINAL", `${modulePlan.slug} must end with a final lesson.`);
    for (const lessonPlan of modulePlan.lessons) {
      lessonCount += 1;
      assert(lessonPlan.minimumCompletionScore >= 60, `${lessonPlan.slug} needs at least a 60% completion threshold.`);
      assert(lessonPlan.skillSlugs.length >= 1 && lessonPlan.skillSlugs.every((slug) => skillSlugs.has(slug)), `${lessonPlan.slug} contains an unknown grammar skill.`);
      const fragments = lessonPlan.blocks.filter((block) => block.isLearningFragment);
      assert(fragments.length === 2, `${lessonPlan.slug} must explain two learning fragments.`);
      for (const block of lessonPlan.blocks) {
        blockCount += 1;
        assert(block.grammarSkillSlugs?.every((slug) => skillSlugs.has(slug)), `${lessonPlan.slug} block has an unknown skill.`);
        if (!block.requiresTwelveExercises) continue;
        assert(block.exercises?.length === PRACTICE_PER_FRAGMENT, `${lessonPlan.slug} practice must have exactly twelve exercises.`);
        const matchingFragment = fragments.find((fragment) => fragment.learningFragmentKey === block.learningFragmentKey);
        assert(matchingFragment, `${lessonPlan.slug} practice does not point to a learning fragment.`);
        for (const exercise of block.exercises) {
          exerciseCount += 1;
          assert(exercise.correctAnswer !== undefined && exercise.correctAnswer !== null, `${lessonPlan.slug} exercise has no answer.`);
          assert(Boolean(exercise.explanation?.trim()), `${lessonPlan.slug} exercise has no explanation.`);
          assert(skillSlugs.has(exercise.skillSlug), `${lessonPlan.slug} exercise has no valid grammar skill.`);
        }
      }
    }
  }
  return { modules: plan.modules.length, lessons: lessonCount, blocks: blockCount, exercises: exerciseCount, skills: plan.skills.length };
}

function contentLifecycle(publish) {
  return publish
    ? { contentStatus: "PUBLISHED", publishedAt: new Date() }
    : { contentStatus: "DRAFT", publishedAt: null };
}

function publishableLifecycle(publish) {
  return publish
    ? { isPublished: true, ...contentLifecycle(true) }
    : { isPublished: false, ...contentLifecycle(false) };
}

async function importCourse(plan, publish) {
  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required to import the Present Simple course.");
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const existing = await prisma.course.findUnique({ where: { slug: COURSE_SLUG }, select: { id: true } });
    if (existing) return { status: "already-exists", courseId: existing.id };

    const [level, category, author] = await Promise.all([
      prisma.languageLevel.findUnique({ where: { code: "A1" }, select: { id: true, contentStatus: true } }),
      prisma.courseCategory.findUnique({ where: { slug: "general-english" }, select: { id: true, contentStatus: true } }),
      prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } }),
    ]);
    if (!level) throw new Error("The A1 level must exist before importing the Present Simple course.");
    if (!category) throw new Error("The general-english course category must exist before importing the Present Simple course.");
    if (!author) throw new Error("Create a platform user before importing course content.");
    if (publish && (level.contentStatus !== "PUBLISHED" || category.contentStatus !== "PUBLISHED")) {
      throw new Error("Publish the A1 level and General English category before publishing this course.");
    }

    // Courses, modules and lessons expose an isPublished flag. Blocks and
    // exercises deliberately use only CMS lifecycle fields, so keep the
    // payloads schema-specific instead of sharing an invalid superset.
    const publishableState = publishableLifecycle(publish);
    const contentState = contentLifecycle(publish);
    const course = await prisma.$transaction(async (tx) => {
      const createdCourse = await tx.course.create({
        data: {
          levelId: level.id,
          categoryId: category.id,
          slug: plan.course.slug,
          title: plan.course.title,
          shortDescription: plan.course.shortDescription,
          fullDescription: plan.course.fullDescription,
          language: "uk",
          estimatedDuration: plan.modules.reduce((sum, modulePlan) => sum + modulePlan.lessons.length * LESSON_DURATION_MINUTES, 0),
          lessonCount: 40,
          difficulty: "A1",
          courseType: "SKILL",
          accessMode: "FREE",
          accessPlan: "FREE",
          firstFreeLessonCount: 40,
          isVisibleInCatalog: true,
          isVisibleInSearch: true,
          isVisibleInLevelBlock: true,
          isVisibleInAcademy: true,
          isVisibleInStudentDashboard: true,
          legacyLevel: "BEGINNER",
          instructorId: author.id,
          createdById: author.id,
          updatedById: author.id,
          learningOutcomes: plan.course.learningOutcomes,
          prerequisites: plan.course.prerequisites,
          ...publishableState,
        },
      });
      await tx.grammarSkill.createMany({ data: plan.skills.map((skill) => ({ ...skill, courseId: createdCourse.id })) });
      const storedSkills = await tx.grammarSkill.findMany({ where: { courseId: createdCourse.id }, select: { id: true, slug: true } });
      const skillIds = new Map(storedSkills.map((skill) => [skill.slug, skill.id]));
      let previousModuleId = null;

      for (const modulePlan of plan.modules) {
        const createdModule = await tx.courseModule.create({
          data: {
            courseId: createdCourse.id,
            title: modulePlan.title,
            description: modulePlan.description,
            order: modulePlan.order,
            isRequired: true,
            requiresSequentialCompletion: Boolean(previousModuleId),
            unlockAfterModuleId: previousModuleId,
            requiredCompletionPercent: 100,
            minimumFinalLessonScore: 75,
            ...publishableState,
          },
        });
        let previousLessonId = null;
        for (const lessonPlan of modulePlan.lessons) {
          const lessonSkillIds = lessonPlan.skillSlugs.map((slug) => skillIds.get(slug)).filter(Boolean);
          const createdLesson = await tx.lesson.create({
            data: {
              moduleId: createdModule.id,
              prerequisiteLessonId: previousLessonId,
              requiredPrerequisiteCompletion: 100,
              autoUnlockNextLesson: true,
              slug: lessonPlan.slug,
              title: lessonPlan.title,
              description: lessonPlan.description,
              type: "GRAMMAR",
              curriculumRole: lessonPlan.role,
              order: lessonPlan.order,
              estimatedDuration: lessonPlan.estimatedDuration,
              minimumCompletionScore: lessonPlan.minimumCompletionScore,
              learningObjectives: lessonPlan.learningObjectives,
              previewText: lessonPlan.previewText,
              isFree: true,
              grammarSkills: { create: lessonSkillIds.map((grammarSkillId) => ({ grammarSkillId })) },
              ...publishableState,
            },
          });
          for (const blockPlan of lessonPlan.blocks) {
            const blockSkillIds = blockPlan.grammarSkillSlugs.map((slug) => skillIds.get(slug)).filter(Boolean);
            const createdBlock = await tx.lessonBlock.create({
              data: {
                lessonId: createdLesson.id,
                type: blockPlan.type,
                title: blockPlan.title,
                content: blockPlan.content,
                settings: blockPlan.settings,
                learningFragmentKey: blockPlan.learningFragmentKey,
                isLearningFragment: Boolean(blockPlan.isLearningFragment),
                requiresTwelveExercises: Boolean(blockPlan.requiresTwelveExercises),
                order: blockPlan.order,
                isRequired: true,
                grammarSkills: { create: blockSkillIds.map((grammarSkillId) => ({ grammarSkillId })) },
                ...contentState,
              },
            });
            for (const [exerciseIndex, exercisePlan] of (blockPlan.exercises ?? []).entries()) {
              const grammarSkillId = skillIds.get(exercisePlan.skillSlug);
              if (!grammarSkillId) throw new Error(`Unknown grammar skill for ${lessonPlan.slug}.`);
              await tx.exercise.create({
                data: {
                  lessonBlockId: createdBlock.id,
                  type: exercisePlan.type,
                  engineKey: exercisePlan.engineKey,
                  variantKey: exercisePlan.variantKey,
                  instruction: exercisePlan.instruction,
                  question: exercisePlan.question,
                  content: exercisePlan.content,
                  correctAnswer: exercisePlan.correctAnswer,
                  alternativeAnswers: exercisePlan.alternativeAnswers,
                  explanation: exercisePlan.explanation,
                  hint: exercisePlan.hint,
                  hintsEnabled: true,
                  difficulty: 2,
                  basePoints: 2,
                  allowInstantCheck: true,
                  allowExtraExercise: true,
                  order: exerciseIndex + 1,
                  grammarSkills: { create: { grammarSkillId } },
                  ...contentState,
                },
              });
            }
          }
          previousLessonId = createdLesson.id;
        }
        previousModuleId = createdModule.id;
      }
      await tx.cmsContentVersion.create({
        data: {
          entityType: "COURSE",
          entityId: createdCourse.id,
          version: 1,
          action: "IMPORTED",
          snapshot: { import: "present-simple-full-mastery", publish, counts: validatePlan(plan) },
          actorId: author.id,
        },
      });
      await tx.contentAuditLog.create({
        data: {
          actorId: author.id,
          action: "CMS_PRESENT_SIMPLE_COURSE_IMPORTED",
          entityType: "Course",
          entityId: createdCourse.id,
          metadata: { publish, counts: validatePlan(plan) },
        },
      });
      return createdCourse;
    }, { maxWait: 60_000, timeout: 600_000 });

    const counts = await Promise.all([
      prisma.courseModule.count({ where: { courseId: course.id } }),
      prisma.lesson.count({ where: { module: { courseId: course.id } } }),
      prisma.lessonBlock.count({ where: { lesson: { module: { courseId: course.id } } } }),
      prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { courseId: course.id } } } } }),
      prisma.grammarSkill.count({ where: { courseId: course.id } }),
    ]);
    const expected = validatePlan(plan);
    assert(counts[0] === expected.modules && counts[1] === expected.lessons && counts[2] === expected.blocks && counts[3] === expected.exercises && counts[4] === expected.skills, "The stored course counts do not match the validated course plan.");
    return { status: publish ? "published" : "draft-imported", courseId: course.id, counts: expected };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const plan = buildPlan();
  const counts = validatePlan(plan);
  if (process.argv.includes("--validate")) {
    console.log(JSON.stringify({ status: "valid", course: COURSE_SLUG, ...counts }));
    return;
  }
  console.log(JSON.stringify(await importCourse(plan, process.argv.includes("--publish"))));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { buildPlan, validatePlan };
