import { prisma } from "@/core/server/prisma";

/** Published courses whose learner path is built around vocabulary blocks.
 * This is deliberately structural rather than slug-based, so new vocabulary
 * courses automatically appear in the learner's Vocabulary area. */
export async function listPublishedVocabularyCourses() {
  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      isTemplate: false,
      isVisibleInCatalog: true,
      accessMode: { not: "HIDDEN" },
      modules: { some: { isPublished: true, lessons: { some: { isPublished: true, type: "VOCABULARY" } } } },
    },
    orderBy: [{ level: { order: "asc" } }, { order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      difficulty: true,
      estimatedDuration: true,
      level: { select: { code: true } },
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: {
          lessons: {
            where: { isPublished: true, type: "VOCABULARY" },
            orderBy: { order: "asc" },
            take: 1,
            select: { slug: true },
          },
        },
      },
    },
  });
  return courses.map((course) => ({
    ...course,
    firstLessonSlug: course.modules.flatMap((module) => module.lessons)[0]?.slug ?? null,
  }));
}
