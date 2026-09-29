import { prisma } from "@/core/server/prisma";

const rebuiltBagCourseSlug = "a-bag-of-food-vocabulary";

/** Old links may remain in an open tab after the A bag of curriculum rebuild. */
export async function replacementForArchivedBagLesson(courseSlug: string, lessonSlug: string): Promise<string | null> {
  if (courseSlug !== rebuiltBagCourseSlug) return null;

  const archivedLesson = await prisma.lesson.findFirst({
    where: {
      slug: lessonSlug,
      isPublished: false,
      module: { course: { slug: rebuiltBagCourseSlug } },
    },
    select: { id: true },
  });
  if (!archivedLesson) return null;

  const firstModule = await prisma.courseModule.findFirst({
    where: { course: { slug: rebuiltBagCourseSlug, isPublished: true }, isPublished: true },
    orderBy: { order: "asc" },
    select: {
      lessons: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        take: 1,
        select: { slug: true },
      },
    },
  });
  return firstModule?.lessons[0]?.slug ?? null;
}
