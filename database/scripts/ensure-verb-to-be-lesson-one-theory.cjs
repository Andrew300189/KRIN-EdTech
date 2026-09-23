/*
 * Keep the Russian source theory for /ru and publish authored Ukrainian
 * translations for /uk. Keep separate reading steps for am/is/are after the
 * introduction and for contractions before their three practice blocks.
 * This runs after the initial course bootstrap and is safe on later deploys.
 */

try {
  require("dotenv").config({ path: ".env", quiet: true });
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime-v2");
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const THEORY_MARKER = "TO_BE_CONTRACTIONS_THEORY_V1";
const FORMS_THEORY_MARKER = "TO_BE_FORMS_THEORY_V1";
const violet = "color: rgb(91, 78, 232); background-color: rgb(238, 236, 255); font-weight: 700";
const green = "color: rgb(22, 115, 74); background-color: rgb(232, 248, 239); font-weight: 700";
const red = "color: rgb(180, 35, 57); background-color: rgb(255, 240, 242); font-weight: 700";
const blue = "color: rgb(37, 50, 96); background-color: rgb(241, 245, 255); font-weight: 700";

const firstTheoryUk = [
  `<h2 style="text-align: left; font-family: Georgia, serif"><span style="${violet}">To be</span>: маленьке дієслово, без якого не обійтися</h2>`,
  `<p><strong style="${violet}">To be</strong> — одне з найважливіших дієслів англійської мови. Українською в теперішньому часі ми зазвичай не вимовляємо «бути»: «я студент», «вона вдома», «вони щасливі». Англійською форму <em style="${violet}">to be</em> пропускати не можна: <strong style="${red}">I a student</strong> — помилка, а <strong style="${green}">I am a student</strong> — правильне речення.</p>`,
  `<p>За допомогою <em style="${violet}">to be</em> ми говоримо, <strong>хто ми, ким працюємо, які ми, де перебуваємо та як почуваємося</strong>. Воно також потрібне, коли йдеться про вік, погоду, час і день тижня.</p>`,
  `<ul><li><strong style="${blue}">I am a teacher.</strong> — Я вчитель.</li><li><strong style="${blue}">She is happy.</strong> — Вона щаслива.</li><li><strong style="${blue}">We are at home.</strong> — Ми вдома.</li><li><strong style="${blue}">The weather is cold.</strong> — Погода холодна.</li><li><strong style="${blue}">They are interested in music.</strong> — Вони цікавляться музикою.</li></ul>`,
  `<h3 style="font-family: Georgia, serif">Три форми в теперішньому часі</h3>`,
  `<ul><li><strong style="${violet}">am</strong> — лише з <strong>I</strong>: <em>I am ready.</em></li><li><strong style="${violet}">is</strong> — з <strong>he, she, it</strong> та з однією людиною або предметом: <em>She is kind. The book is interesting.</em></li><li><strong style="${violet}">are</strong> — з <strong>we, you, they</strong> та з кількома людьми або предметами: <em>We are friends. The children are hungry.</em></li></ul>`,
  `<p><strong style="${red}">Важливо:</strong> <em>am</em> та <em>is</em> уживаються з одниною, а <em>are</em> — з множиною. Але <strong style="${green}">you are</strong> потрібне завжди, навіть коли ви звертаєтеся до однієї людини.</p>`,
  `<h3 style="font-family: Georgia, serif">Де ви побачите to be</h3>`,
  `<ul><li>професія: <strong style="${blue}">My brother is a doctor.</strong></li><li>ознака: <strong style="${blue}">The film is interesting.</strong></li><li>місце: <strong style="${blue}">My friends are at the cinema.</strong></li><li>стан і почуття: <strong style="${blue}">I am tired. We are happy.</strong></li><li>вік: <strong style="${blue}">She is twenty years old.</strong></li><li>погода, час і дата: <strong style="${blue}">It is rainy. It is five o’clock. Today is Saturday.</strong></li></ul>`,
  `<p><strong style="${green}">Головне правило:</strong> якщо треба поєднати людину чи предмет із професією, ознакою, місцем або станом, оберіть відповідну форму <strong style="${violet}">am, is або are</strong>.</p>`,
].join("\n");

const formsRu = [
  `<h2 style="font-family: Georgia, serif"><span style="${violet}">Am, is, are</span>: выбираем форму</h2>`,
  `<p>Перед каждым ответом посмотрите на <strong style="${blue}">подлежащее</strong> — кто или что перед вами. Именно оно определяет форму глагола <em style="${violet}">to be</em>.</p>`,
  `<ul><li><strong style="${violet}">I → am</strong>: <em>I am ready.</em></li><li><strong style="${green}">he / she / it → is</strong>: <em>She is here. It is cold.</em></li><li><strong style="${blue}">we / you / they → are</strong>: <em>We are friends. You are right.</em></li></ul>`,
  `<p><strong style="${red}">Важно:</strong> <strong>you</strong> всегда требует <strong style="${blue}">are</strong> — и для одного человека («ты»), и для нескольких («вы»). С именем одного человека используйте <strong style="${green}">is</strong>, с несколькими именами — <strong style="${blue}">are</strong>.</p>`,
  `<p><strong style="${green}">Проверьте себя:</strong> <em>I ___ ready</em> → <strong>am</strong>; <em>She ___ here</em> → <strong>is</strong>; <em>They ___ at home</em> → <strong>are</strong>. В следующем блоке нужно вписывать только одну подходящую форму.</p>`,
].join("\n");

const formsUk = [
  `<h2 style="font-family: Georgia, serif"><span style="${violet}">Am, is, are</span>: обираємо форму</h2>`,
  `<p>Перед кожною відповіддю подивіться на <strong style="${blue}">підмет</strong> — хто або що перед вами. Саме він визначає форму дієслова <em style="${violet}">to be</em>.</p>`,
  `<ul><li><strong style="${violet}">I → am</strong>: <em>I am ready.</em></li><li><strong style="${green}">he / she / it → is</strong>: <em>She is here. It is cold.</em></li><li><strong style="${blue}">we / you / they → are</strong>: <em>We are friends. You are right.</em></li></ul>`,
  `<p><strong style="${red}">Важливо:</strong> <strong>you</strong> завжди потребує <strong style="${blue}">are</strong> — і для однієї людини («ти»), і для кількох («ви»). З ім’ям однієї людини вживайте <strong style="${green}">is</strong>, із кількома іменами — <strong style="${blue}">are</strong>.</p>`,
  `<p><strong style="${green}">Перевірте себе:</strong> <em>I ___ ready</em> → <strong>am</strong>; <em>She ___ here</em> → <strong>is</strong>; <em>They ___ at home</em> → <strong>are</strong>. У наступному блоці потрібно вписувати лише одну відповідну форму.</p>`,
].join("\n");

const formPrompts = [
  ["I ___ ready.", "am"], ["He ___ a doctor.", "is"], ["We ___ classmates.", "are"],
  ["She ___ a teacher.", "is"], ["They ___ students.", "are"], ["You ___ my friend.", "are"],
  ["It ___ sunny today.", "is"], ["You ___ in the right place.", "are"], ["It ___ a good idea.", "is"],
  ["I ___ a student.", "am"], ["They ___ at work.", "are"], ["She ___ at home.", "is"],
  ["We ___ ready for class.", "are"], ["He ___ at school.", "is"], ["It ___ my book.", "is"],
  ["I ___ at home.", "am"], ["He ___ happy today.", "is"], ["You ___ very kind.", "are"],
  ["They ___ my friends.", "are"], ["She ___ very friendly.", "is"], ["We ___ in the same team.", "are"],
  ["She ___ my sister.", "is"], ["We ___ at home.", "are"], ["You ___ a great student.", "are"],
  ["It ___ cold outside.", "is"], ["I ___ happy today.", "am"], ["He ___ my brother.", "is"],
  ["They ___ from Kyiv.", "are"], ["They ___ ready for class.", "are"], ["He ___ from Poland.", "is"],
  ["I ___ from Ukraine.", "am"], ["It ___ five o'clock.", "is"], ["You ___ ready.", "are"],
  ["She ___ ready for class.", "is"], ["We ___ friends.", "are"],
];

const contractionsRu = [
  `<h2 style="text-align: left; font-family: Georgia, serif"><span style="${violet}">I'm, you're, he's…</span> Как сокращать to be</h2>`,
  `<p>В разговоре и неформальном письме местоимение и форму <em style="${violet}">to be</em> часто соединяют. <strong style="${green}">I am → I'm</strong>: значение не меняется, меняется только запись и произношение.</p>`,
  `<ul><li><strong style="${blue}">I am → I'm</strong></li><li><strong style="${blue}">you are → you're</strong></li><li><strong style="${blue}">he is → he's</strong></li><li><strong style="${blue}">she is → she's</strong></li><li><strong style="${blue}">it is → it's</strong></li><li><strong style="${blue}">we are → we're</strong></li><li><strong style="${blue}">they are → they're</strong></li></ul>`,
  `<p><strong style="${red}">Апостроф обязателен:</strong> он стоит на месте пропущенной буквы. Пишите <strong style="${green}">I'm</strong>, а не <strong style="${red}">Im</strong>; <strong style="${green}">they're</strong>, а не <strong style="${red}">theyre</strong>.</p>`,
  `<p><strong style="${violet}">You are → you're</strong> подходит и для «ты», и для «вы». В этом блоке <strong>he's, she's, it's</strong> означают <em>he is, she is, it is</em>.</p>`,
  `<p><strong style="${green}">Сравните:</strong> <em>I am ready.</em> = <em>I'm ready.</em> («Я готов»); <em>She is here.</em> = <em>She's here.</em> («Она здесь»); <em>They are friends.</em> = <em>They're friends.</em> («Они друзья»).</p>`,
  `<p>Полные формы удобны, когда нужно сделать слово заметнее; сокращённые естественны в обычной речи. В следующих заданиях вы будете переходить <strong style="${violet}">от краткой формы к полной и обратно</strong>.</p>`,
].join("\n");

const contractionsUk = [
  `<h2 style="text-align: left; font-family: Georgia, serif"><span style="${violet}">I'm, you're, he's…</span> Як скорочувати to be</h2>`,
  `<p>У розмові та неформальному письмі займенник і форму <em style="${violet}">to be</em> часто об’єднують. <strong style="${green}">I am → I'm</strong>: значення не змінюється, змінюються лише написання й вимова.</p>`,
  `<ul><li><strong style="${blue}">I am → I'm</strong></li><li><strong style="${blue}">you are → you're</strong></li><li><strong style="${blue}">he is → he's</strong></li><li><strong style="${blue}">she is → she's</strong></li><li><strong style="${blue}">it is → it's</strong></li><li><strong style="${blue}">we are → we're</strong></li><li><strong style="${blue}">they are → they're</strong></li></ul>`,
  `<p><strong style="${red}">Апостроф обов’язковий:</strong> він стоїть на місці пропущеної літери. Пишіть <strong style="${green}">I'm</strong>, а не <strong style="${red}">Im</strong>; <strong style="${green}">they're</strong>, а не <strong style="${red}">theyre</strong>.</p>`,
  `<p><strong style="${violet}">You are → you're</strong> підходить і для «ти», і для «ви». У цьому блоці <strong>he's, she's, it's</strong> означають <em>he is, she is, it is</em>.</p>`,
  `<p><strong style="${green}">Порівняйте:</strong> <em>I am ready.</em> = <em>I'm ready.</em> («Я готовий»); <em>She is here.</em> = <em>She's here.</em> («Вона тут»); <em>They are friends.</em> = <em>They're friends.</em> («Вони друзі»).</p>`,
  `<p>Повні форми зручні, коли потрібно наголосити на слові; скорочені природні у звичайному мовленні. У наступних завданнях ви переходитимете <strong style="${violet}">від скороченої форми до повної та навпаки</strong>.</p>`,
].join("\n");

async function publishTranslation(tx, lessonBlockId, locale, title, text) {
  await tx.lessonBlockTranslation.upsert({
    where: { lessonBlockId_locale: { lessonBlockId, locale } },
    create: { lessonBlockId, locale, title, content: { text }, contentStatus: "PUBLISHED", publishedAt: new Date() },
    update: { title, content: { text }, contentStatus: "PUBLISHED", publishedAt: new Date() },
  });
}

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: { order: 1, module: { order: 1, course: { slug: "verb-to-be-masterclass" } } },
    select: { id: true, blocks: { orderBy: { order: "desc" }, select: { id: true, order: true, type: true, settings: true, translations: { where: { locale: "uk" }, select: { title: true, content: true } } } } },
  });
  if (!lesson) {
    console.log("Verb to be module 1 lesson 1 is not installed; theory update skipped.");
    return;
  }

  const firstTheory = lesson.blocks.find((block) => block.order === 1 && block.type === "THEORY");
  if (!firstTheory) throw new Error("The first To Be theory block is missing.");
  const existingFormsTheory = lesson.blocks.find((block) => block.settings?.seedMarker === FORMS_THEORY_MARKER);
  const existingContractionsTheory = lesson.blocks.find((block) => block.settings?.seedMarker === THEORY_MARKER
    || block.translations.some((translation) => translation.title === "Скорочені форми to be" && translation.content?.text));

  await prisma.$transaction(async (tx) => {
    await publishTranslation(tx, firstTheory.id, "uk", "Як працює to be", firstTheoryUk);

    let formsTheoryId = existingFormsTheory?.id;
    if (!formsTheoryId) {
      for (const block of lesson.blocks.filter((item) => item.order >= 2)) {
        await tx.lessonBlock.update({ where: { id: block.id }, data: { order: block.order + 1 } });
      }
      const theory = await tx.lessonBlock.create({
        data: {
          lessonId: lesson.id,
          order: 2,
          type: "THEORY",
          title: "Формы am, is, are",
          content: { text: formsRu },
          settings: {
            seedMarker: FORMS_THEORY_MARKER,
            lessonGoal: "Научиться выбирать am, is или are по подлежащему.",
            lessonGoalTranslations: {
              ru: "Научиться выбирать am, is или are по подлежащему.",
              uk: "Навчитися обирати am, is або are за підметом.",
            },
          },
          isRequired: true,
          contentStatus: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
      formsTheoryId = theory.id;
    }
    await publishTranslation(tx, formsTheoryId, "uk", "Форми am, is, are", formsUk);

    // A former order-based practice refresh could overwrite the original
    // 35-card block after theory was inserted. Revive its stable card IDs so
    // previous attempts and first-correct XP remain attached to those cards.
    const formsExercise = await tx.lessonBlock.findFirst({
      where: { lessonId: lesson.id, order: 3 },
      select: { id: true, settings: true, exercises: { select: { id: true, order: true, contentStatus: true, variantKey: true, question: true, correctAnswer: true, _count: { select: { attempts: true } } } } },
    });
    if (!formsExercise) throw new Error("The To Be am/is/are practice block is missing.");
    if (formsExercise.settings?.seedMarker !== "TO_BE_MODULE_1_LESSON_1_FORMS_V1") {
      const offset = Math.ceil((Math.max(0, ...formsExercise.exercises.map((exercise) => exercise.order)) + 1) / 1_000_000) * 1_000_000;
      await tx.exercise.updateMany({
        where: { lessonBlockId: formsExercise.id, contentStatus: "PUBLISHED" },
        data: { contentStatus: "ARCHIVED", archivedAt: new Date(), order: { increment: offset } },
      });
      for (const [index, [question, answer]] of formPrompts.entries()) {
        const historical = formsExercise.exercises
          .filter((exercise) => exercise.variantKey === "TO_BE_FORM_INPUT"
            && exercise.question === question
            && exercise.correctAnswer === answer
            && exercise.order % 1_000_000 === index + 1)
          .sort((left, right) => right._count.attempts - left._count.attempts)[0];
        if (historical) {
          await tx.exercise.update({ where: { id: historical.id }, data: { order: index + 1, contentStatus: "PUBLISHED", archivedAt: null } });
        } else {
          await tx.exercise.create({ data: {
            lessonBlockId: formsExercise.id, type: "TEXT_INPUT", engineKey: "text-input", variantKey: "TO_BE_FORM_INPUT",
            instruction: "Впишите правильную форму: am, is или are.", question,
            content: { acceptedAnswers: [answer], ignorePunctuation: true }, correctAnswer: answer, alternativeAnswers: [answer],
            explanation: `Верно: ${question.replace("___", answer)}`, hint: "Сначала найдите подлежащее.", hintsEnabled: true,
            difficulty: 1, basePoints: 1, timeLimitSeconds: 12, solutionCost: 0, allowInstantCheck: true,
            allowExtraExercise: false, isGeneratedReview: false, contentStatus: "PUBLISHED", publishedAt: new Date(), order: index + 1,
          } });
        }
      }
      await tx.lessonBlock.update({
        where: { id: formsExercise.id },
        data: {
          type: "EXERCISE", title: "Впишите правильную форму", content: null,
          settings: {
            seedMarker: "TO_BE_MODULE_1_LESSON_1_FORMS_V1",
            lessonGoal: "Запоминаем формы am, is, are",
            lessonGoalTranslations: { ru: "Запоминаем формы am, is, are", uk: "Запам’ятовуємо форми am, is, are" },
          },
          isRequired: true, contentStatus: "PUBLISHED", publishedAt: new Date(), archivedAt: null,
        },
      });
    }

    let theoryId = existingContractionsTheory?.id;
    if (theoryId && (existingContractionsTheory.type !== "THEORY" || existingContractionsTheory.settings?.seedMarker !== THEORY_MARKER)) {
      const exercises = await tx.exercise.findMany({ where: { lessonBlockId: theoryId }, select: { order: true } });
      const offset = Math.ceil((Math.max(0, ...exercises.map((exercise) => exercise.order)) + 1) / 1_000_000) * 1_000_000;
      await tx.exercise.updateMany({
        where: { lessonBlockId: theoryId, contentStatus: "PUBLISHED" },
        data: { contentStatus: "ARCHIVED", archivedAt: new Date(), order: { increment: offset } },
      });
      await tx.lessonBlock.update({
        where: { id: theoryId },
        data: {
          type: "THEORY", title: "Сокращённые формы to be", content: { text: contractionsRu },
          settings: {
            seedMarker: THEORY_MARKER,
            lessonGoal: "Понять, как сокращаются формы am, is, are.",
            lessonGoalTranslations: { ru: "Понять, как сокращаются формы am, is, are.", uk: "Зрозуміти, як скорочуються форми am, is, are." },
          },
          isRequired: true, contentStatus: "PUBLISHED", publishedAt: new Date(), archivedAt: null,
        },
      });
    } else if (!theoryId) {
      const currentBlocks = await tx.lessonBlock.findMany({
        where: { lessonId: lesson.id },
        orderBy: { order: "desc" },
        select: { id: true, order: true, settings: true },
      });
      const contractionsOrder = currentBlocks.find((block) => block.settings?.seedMarker === "TO_BE_CONTRACTION_TO_FULL_V1")?.order
        ?? (existingFormsTheory ? 10 : 11);
      for (const block of currentBlocks.filter((item) => item.order >= contractionsOrder)) {
        await tx.lessonBlock.update({ where: { id: block.id }, data: { order: block.order + 1 } });
      }
      const theory = await tx.lessonBlock.create({
        data: {
          lessonId: lesson.id,
          order: contractionsOrder,
          type: "THEORY",
          title: "Сокращённые формы to be",
          content: { text: contractionsRu },
          settings: {
            seedMarker: THEORY_MARKER,
            lessonGoal: "Понять, как сокращаются формы am, is, are.",
            lessonGoalTranslations: {
              ru: "Понять, как сокращаются формы am, is, are.",
              uk: "Зрозуміти, як скорочуються форми am, is, are.",
            },
          },
          isRequired: true,
          contentStatus: "PUBLISHED",
          publishedAt: new Date(),
        },
      });
      theoryId = theory.id;
    }
    await publishTranslation(tx, theoryId, "uk", "Скорочені форми to be", contractionsUk);
  }, { maxWait: 30_000, timeout: 120_000 });

  console.log("Ensured To Be introductory, am/is/are, and contractions theory.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
