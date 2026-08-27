/*
 * Applies presentation-only emphasis to the theory in lesson 1 of the
 * published Verb TO BE Masterclass. The source words are preserved exactly;
 * only safe rich-text tags and inline colours are added.
 *
 * Inspect first:
 *   node database/scripts/style-lesson-1-to-be-theory.cjs --dry-run
 * Apply:
 *   node database/scripts/style-lesson-1-to-be-theory.cjs --apply
 */

require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const COURSE_SLUG = "verb-to-be-masterclass";
const MARKER = "TO_BE_FOUNDATIONS_THEORY_STYLED_V1";
const shouldApply = process.argv.includes("--apply");
const toBeStyle = "color: #5b4ee8; background-color: #eeecff; font-weight: 700";
const exampleStyle = "color: #253260; background-color: #f1f5ff; font-weight: 700";
const correctStyle = "color: #16734a; background-color: #e8f8ef; font-weight: 700";
const incorrectStyle = "color: #b42339; background-color: #fff0f2; font-weight: 700";

function readableText(value) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,:;!?])/g, "$1")
    .trim();
}

function replaceExact(content, before, after) {
  if (!content.includes(before)) throw new Error(`The expected theory fragment was not found: ${before}`);
  return content.replace(before, after);
}

function styleTheory(content) {
  let styled = content;
  styled = replaceExact(styled, "<h2>To be: маленький глагол, без которого не обойтись</h2>", `<h2><span style=\"${toBeStyle}\">To be</span>: маленький глагол, без которого не обойтись</h2>`);
  styled = replaceExact(styled, "<strong>To be</strong> кажется", `<strong style=\"${toBeStyle}\">To be</strong> кажется`);
  styled = replaceExact(styled, "<em>to be</em> мы говорим", `<em style=\"${toBeStyle}\">to be</em> мы говорим`);
  styled = replaceExact(styled, "<strong>I a student</strong>", `<strong style=\"${incorrectStyle}\">I a student</strong>`);
  styled = replaceExact(styled, "<strong>I am a student</strong>", `<strong style=\"${correctStyle}\">I am a student</strong>`);
  styled = replaceExact(styled, "<strong>am, is</strong> или <strong>are</strong>", `<strong style=\"${toBeStyle}\">am, is</strong> или <strong style=\"${toBeStyle}\">are</strong>`);

  styled = styled.replace(/<li><strong>([^<]+)<\/strong> —/gu, `<li><strong style=\"${exampleStyle}\">$1</strong> —`);
  styled = styled.replace(/<strong>(am|is|are)<\/strong>/gu, `<strong style=\"${toBeStyle}\">$1</strong>`);
  styled = styled.replace(/<em>(am|is|are)<\/em>/gu, `<em style=\"${toBeStyle}\">$1</em>`);
  styled = styled.replace(/<strong>(My brother is a doctor\.|The film is interesting\.|My friends are at the cinema\.|I am tired\. We are happy\.|She is twenty years old\.|It is rainy\. It is five o’clock\. Today is Saturday\.)<\/strong>/gu, `<strong style=\"${exampleStyle}\">$1</strong>`);
  return styled;
}

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: { module: { order: 1, course: { slug: COURSE_SLUG } }, order: 1 },
    select: {
      blocks: {
        where: { order: 2 },
        select: { id: true, content: true, settings: true },
      },
    },
  });
  const block = lesson?.blocks[0];
  if (!block || typeof block.content !== "string") throw new Error("The first lesson theory block was not found.");
  if (block.settings && typeof block.settings === "object" && !Array.isArray(block.settings) && block.settings[MARKER] === true) {
    console.log("The first lesson theory is already styled.");
    return;
  }

  const styled = styleTheory(block.content);
  if (readableText(block.content) !== readableText(styled)) {
    throw new Error("Safety check failed: styling would change the theory words.");
  }
  console.log("Theory wording verified: styling changes markup only.");
  if (!shouldApply) return;

  const currentSettings = block.settings && typeof block.settings === "object" && !Array.isArray(block.settings)
    ? block.settings
    : {};
  await prisma.lessonBlock.update({
    where: { id: block.id },
    data: { content: styled, settings: { ...currentSettings, [MARKER]: true } },
  });
  console.log("Styled the first lesson theory.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
