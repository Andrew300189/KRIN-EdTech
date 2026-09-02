/*
 * Sets up a brand-new production database without ever overwriting a
 * populated platform. It is intended for the first Vercel + Neon deploy.
 *
 * The course snapshot is an export of the owner-authored public A1 course.
 * Once the course exists (or a real user / another real course exists), this
 * script becomes a no-op. That makes it safe to keep in the build pipeline.
 */

// Local development may use .env; Vercel injects its environment variables
// directly and deliberately does not need dotenv as a runtime dependency.
try {
  require("dotenv").config({ path: ".env", quiet: true });
} catch (error) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;
}

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { PrismaClient } = require("../../src/generated/prisma-client-payments-runtime");
const courseSnapshot = require("../seed-data/verb-to-be-masterclass.json");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL,
    },
  },
});

const COURSE_SLUG = "verb-to-be-masterclass";
const SYSTEM_AUTHOR_EMAIL = "content@seed.krin.local";
const DEMO_COURSE_SLUGS = ["demo-free-course", "demo-premium-course"];
const dateFields = ["scheduledAt", "publishedAt", "archivedAt"];

function restoreDates(data) {
  const restored = { ...data };
  for (const field of dateFields) {
    if (typeof restored[field] === "string") restored[field] = new Date(restored[field]);
  }
  return restored;
}

function runSeedScript(relativePath) {
  const projectRoot = path.resolve(__dirname, "../..");
  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
  const result = spawnSync(process.execPath, [path.join(projectRoot, relativePath)], {
    cwd: projectRoot,
    env: {
      ...process.env,
      // The database supplied by Neon is authoritative in production. Some
      // legacy scripts prefer DIRECT_DATABASE_URL, so pin both to Neon here.
      DATABASE_URL: databaseUrl,
      DIRECT_DATABASE_URL: databaseUrl,
    },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Initial data setup failed while running ${relativePath}.`);
  }
}

async function hasRealPlatformData() {
  const [existingCourse, otherCourses, nonSystemUsers] = await Promise.all([
    prisma.course.findUnique({ where: { slug: COURSE_SLUG }, select: { id: true } }),
    prisma.course.count({ where: { slug: { notIn: DEMO_COURSE_SLUGS } } }),
    prisma.user.count({ where: { email: { not: SYSTEM_AUTHOR_EMAIL } } }),
  ]);

  return { existingCourse, otherCourses, nonSystemUsers };
}

async function createCourseFromSnapshot(authorId) {
  await prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        ...restoreDates(courseSnapshot.course),
        levelId: "cefr-a1",
        categoryId: "course-category-general-english",
        instructorId: authorId,
        createdById: authorId,
        updatedById: authorId,
      },
    });

    const moduleIds = new Map();
    for (const module of courseSnapshot.modules) {
      const createdModule = await tx.courseModule.create({
        data: {
          ...restoreDates(module.data),
          courseId: course.id,
          unlockAfterModuleId: null,
        },
      });
      moduleIds.set(module.data.order, createdModule.id);
    }

    for (const module of courseSnapshot.modules) {
      if (!module.unlockAfterModuleOrder) continue;
      await tx.courseModule.update({
        where: { id: moduleIds.get(module.data.order) },
        data: { unlockAfterModuleId: moduleIds.get(module.unlockAfterModuleOrder) ?? null },
      });
    }

    const lessonIds = new Map();
    for (const module of courseSnapshot.modules) {
      for (const lesson of module.lessons) {
        const createdLesson = await tx.lesson.create({
          data: {
            ...restoreDates(lesson.data),
            moduleId: moduleIds.get(module.data.order),
            prerequisiteLessonId: null,
          },
        });
        lessonIds.set(lesson.data.slug, createdLesson.id);
      }
    }

    for (const module of courseSnapshot.modules) {
      for (const lesson of module.lessons) {
        const lessonId = lessonIds.get(lesson.data.slug);
        if (lesson.prerequisiteLessonSlug) {
          await tx.lesson.update({
            where: { id: lessonId },
            data: { prerequisiteLessonId: lessonIds.get(lesson.prerequisiteLessonSlug) ?? null },
          });
        }

        for (const block of lesson.blocks) {
          const createdBlock = await tx.lessonBlock.create({
            data: {
              ...restoreDates(block.data),
              lessonId,
            },
          });

          if (block.exercises.length) {
            await tx.exercise.createMany({
              data: block.exercises.map((exercise) => ({
                ...restoreDates(exercise),
                lessonBlockId: createdBlock.id,
                previousVersionId: null,
              })),
            });
          }
        }
      }
    }
  }, { maxWait: 60_000, timeout: 600_000 });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for initial production data setup.");

  const before = await hasRealPlatformData();
  if (before.existingCourse) {
    console.log("Initial course already exists; production bootstrap skipped.");
    return;
  }
  if (before.otherCourses || before.nonSystemUsers) {
    console.log("Database already contains platform data; production bootstrap skipped to preserve it.");
    return;
  }

  console.log("Empty database detected. Adding core platform records and the authored A1 course…");
  runSeedScript("database/prisma/seed.cjs");

  const author = await prisma.user.findUnique({
    where: { email: SYSTEM_AUTHOR_EMAIL },
    select: { id: true },
  });
  if (!author) throw new Error("The system content author was not created by the initial seed.");

  await createCourseFromSnapshot(author.id);
  await prisma.course.updateMany({
    where: { slug: { in: DEMO_COURSE_SLUGS } },
    data: {
      isPublished: false,
      isVisibleInCatalog: false,
      isVisibleOnHomepage: false,
      isVisibleInSearch: false,
    },
  });

  const [modules, lessons, blocks, exercises] = await Promise.all([
    prisma.courseModule.count({ where: { course: { slug: COURSE_SLUG } } }),
    prisma.lesson.count({ where: { module: { course: { slug: COURSE_SLUG } } } }),
    prisma.lessonBlock.count({ where: { lesson: { module: { course: { slug: COURSE_SLUG } } } } }),
    prisma.exercise.count({ where: { lessonBlock: { lesson: { module: { course: { slug: COURSE_SLUG } } } } } }),
  ]);
  console.log(JSON.stringify({ course: COURSE_SLUG, modules, lessons, blocks, exercises }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
