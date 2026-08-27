/*
 * Moves the concise "Как работает to be" theory block to the first position
 * in lesson 1. It preserves every block and only changes canonical ordering.
 *
 * Inspect:
 *   node database/scripts/move-lesson-1-core-theory-first.cjs --dry-run
 * Apply:
 *   node database/scripts/move-lesson-1-core-theory-first.cjs --apply
 */

require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL } },
});

const COURSE_SLUG = "verb-to-be-masterclass";
const THEORY_TITLE = "Как работает to be";
const shouldApply = process.argv.includes("--apply");

async function main() {
  const lesson = await prisma.lesson.findFirst({
    where: { module: { order: 1, course: { slug: COURSE_SLUG } }, order: 1 },
    select: { id: true, blocks: { select: { id: true, title: true, order: true }, orderBy: { order: "asc" } } },
  });
  if (!lesson) throw new Error("The first lesson was not found.");

  const target = lesson.blocks.find((block) => block.title === THEORY_TITLE);
  if (!target) throw new Error(`The theory block \"${THEORY_TITLE}\" was not found.`);

  const ordered = [target, ...lesson.blocks.filter((block) => block.id !== target.id)];
  const summary = ordered.map((block, index) => `${index + 1}. ${block.title ?? "Untitled block"}`).join("\n");
  console.log(`New lesson-block order:\n${summary}`);
  if (!shouldApply) return;

  await prisma.$transaction(async (tx) => {
    // Shift first so a unique (lessonId, order) index can never collide.
    await tx.lessonBlock.updateMany({ where: { lessonId: lesson.id }, data: { order: { increment: ordered.length + 10_000 } } });
    for (const [index, block] of ordered.entries()) {
      await tx.lessonBlock.update({ where: { id: block.id }, data: { order: index + 1 } });
    }
  });

  console.log("Moved the concise theory block to the first lesson position.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
