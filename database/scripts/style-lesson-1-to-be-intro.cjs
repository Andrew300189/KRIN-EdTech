/*
 * Applies presentation-only rich-text markup to the first block of lesson 1
 * in the published Verb TO BE Masterclass. Wording is verified before saving:
 * this script may add safe tags and colours, but never changes the text.
 *
 * Inspect first:
 *   node database/scripts/style-lesson-1-to-be-intro.cjs --dry-run
 * Apply:
 *   node database/scripts/style-lesson-1-to-be-intro.cjs --apply
 */

require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const COURSE_SLUG = "verb-to-be-masterclass";
const MARKER = "TO_BE_FOUNDATIONS_INTRO_STYLED_V2";
const shouldApply = process.argv.includes("--apply");
const toBeStyle = "color: #5b4ee8; background-color: #eeecff; font-weight: 700";
const exampleStyle = "color: #253260; background-color: #f1f5ff; font-weight: 700";
const correctStyle = "color: #16734a; background-color: #e8f8ef; font-weight: 700";
const incorrectStyle = "color: #b42339; background-color: #fff0f2; font-weight: 700";
const headingStyle = "color: #312e81; font-weight: 800; margin-bottom: 0.55rem";
const sectionStyle = "color: #4f46e5; font-weight: 800; margin-top: 1.45rem; margin-bottom: 0.45rem";

function readableText(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,:;!?])/g, "$1")
    .trim();
}

function withoutPresentationHeadings(value) {
  return value.replace(/<h[23][^>]*data-presentation-heading="true"[^>]*>[\s\S]*?<\/h[23]>/gu, "");
}

function wrapText(value, source, replacement) {
  if (!value.includes(source)) {
    throw new Error(`Expected lesson text was not found: ${source}`);
  }
  return value.replace(source, replacement);
}

function styledIntro(content) {
  if (!content.includes("Это прекрасно, что Вы решили изучить эту тему.")) {
    throw new Error("The expected first lesson theory text was not found.");
  }

  let styled = content;
  styled = styled.replace(/<em(?:\s+style="[^"]*")?>to be<\/em>/gu, `<em style="${toBeStyle}">to be</em>`);

  styled = wrapText(
    styled,
    "<p>Это прекрасно, что Вы решили изучить эту тему.",
    `<h2 data-presentation-heading="true" style="${headingStyle}">To be: маленький глагол, без которого не обойтись</h2><p>Это прекрасно, что Вы решили изучить эту тему.`,
  );
  styled = wrapText(
    styled,
    "<p>Глагол&nbsp;<em style=\"color: #5b4ee8; background-color: #eeecff; font-weight: 700\">to be</em>",
    `<h3 data-presentation-heading="true" style="${sectionStyle}">Почему <em style="${toBeStyle}">to be</em> так важен</h3><p>Глагол&nbsp;<em style="${toBeStyle}">to be</em>`,
  );
  styled = wrapText(
    styled,
    "<p>В настоящем времени глагол to be имеет три формы&nbsp;am, is, are:</p>",
    `<h3 data-presentation-heading="true" style="${sectionStyle}">Три формы в Present Simple</h3><p>В настоящем времени глагол <em style="${toBeStyle}">to be</em> имеет три формы&nbsp;<span style="${toBeStyle}">am, is, are</span>:</p>`,
  );
  styled = wrapText(
    styled,
    "<p>Таким образом, выбор формы зависит от того, о ком или о чём мы говорим:</p>",
    `<h3 data-presentation-heading="true" style="${sectionStyle}">Как выбрать нужную форму</h3><p>Таким образом, выбор формы зависит от того, о ком или о чём мы говорим:</p>`,
  );
  styled = wrapText(
    styled,
    "<p>Давайте проведем итог первой части урока.",
    `<h3 data-presentation-heading="true" style="${sectionStyle}">Когда мы используем <em style="${toBeStyle}">to be</em></h3><p>Давайте проведем итог первой части урока.`,
  );
  styled = wrapText(
    styled,
    "<p>Главное правило:",
    `<h3 data-presentation-heading="true" style="${sectionStyle}">Главное правило</h3><p>Главное правило:`,
  );

  styled = styled.replace(
    /<p>Неправильно: I a student\.<br>Правильно: I am a student\.<\/p>/gu,
    `<p>Неправильно: <span style="${incorrectStyle}">I a student.</span><br>Правильно: <span style="${correctStyle}">I am a student.</span></p>`,
  );

  const examples = [
    "I am a teacher.", "She is happy.", "The weather is cold.", "We are at home.", "They are interested in music.",
    "He is friendly.", "The book is interesting.", "You are right.", "The children are hungry.",
    "She is a doctor.", "The film is interesting.", "My parents are at home.", "She is happy.",
    "He is twelve years old.", "It is sunny.", "It is five o’clock.", "It is Monday.",
  ];
  for (const example of new Set(examples)) {
    styled = styled.replaceAll(example, `<span style="${exampleStyle}">${example}</span>`);
  }
  styled = styled.replace(
    "пропуск&nbsp;to be&nbsp;будет",
    `пропуск&nbsp;<em style="${toBeStyle}">to be</em>&nbsp;будет`,
  );
  styled = styled.replace(
    "формы глагола to be —",
    `формы глагола <em style="${toBeStyle}">to be</em> —`,
  );
  styled = styled.replace(/<li>am употребляется/gu, `<li><span style="${toBeStyle}">am</span> употребляется`);
  styled = styled.replace(/<li>is —/gu, `<li><span style="${toBeStyle}">is</span> —`);
  styled = styled.replace(/<li>are —/gu, `<li><span style="${toBeStyle}">are</span> —`);
  styled = styled.replace(/<li>am\/is&nbsp;-/gu, `<li><span style="${toBeStyle}">am/is</span>&nbsp;-`);
  styled = styled.replace(/<li>are&nbsp;-/gu, `<li><span style="${toBeStyle}">are</span>&nbsp;-`);
  return styled;
}

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: { module: { order: 1, course: { slug: COURSE_SLUG } }, order: 1 },
    select: {
      blocks: {
        select: { id: true, content: true, settings: true },
        orderBy: { order: "asc" },
      },
    },
  });

  const block = lesson?.blocks[0];
  if (!block || !block.content || typeof block.content !== "object" || Array.isArray(block.content) || typeof block.content.text !== "string") {
    throw new Error("The first lesson intro block was not found.");
  }
  if (block.settings && typeof block.settings === "object" && !Array.isArray(block.settings) && block.settings[MARKER] === true) {
    console.log("The first lesson intro is already styled.");
    return;
  }

  const styled = styledIntro(block.content.text);
  if (readableText(block.content.text) !== readableText(withoutPresentationHeadings(styled))) {
    throw new Error("Safety check failed: styling would change the intro wording.");
  }

  console.log("Intro wording verified: styling changes markup only.");
  if (!shouldApply) return;

  const settings = block.settings && typeof block.settings === "object" && !Array.isArray(block.settings)
    ? block.settings
    : {};
  await prisma.lessonBlock.update({
    where: { id: block.id },
    data: { content: { ...block.content, text: styled }, settings: { ...settings, [MARKER]: true } },
  });
  console.log("Styled the first lesson intro.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
