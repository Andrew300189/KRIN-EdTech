import { prisma } from "@/core/server/prisma";
import { estimateBlockSeconds } from "@/modules/lessons/utils/learning-duration";

export type CourseDurationEstimate = {
  minutes: number;
  totalSeconds: number;
  lessonCount: number;
  exerciseCount: number;
};

function lessonSeconds(blocks: Array<{
  type: string;
  title: string | null;
  content: unknown;
  settings: unknown;
  exercises: Array<{ engineKey: string; difficulty: number; content: unknown; correctAnswer: unknown; instruction: string; question: string }>;
}>) {
  return blocks.reduce((total, block) => total + estimateBlockSeconds(block), 0);
}

export async function getCourseDurationEstimate(courseId: string): Promise<CourseDurationEstimate> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      modules: {
        where: { contentStatus: { not: "ARCHIVED" } },
        select: {
          lessons: {
            where: { contentStatus: { not: "ARCHIVED" } },
            select: {
              estimatedDuration: true,
              blocks: {
                where: { contentStatus: { not: "ARCHIVED" } },
                select: {
                  type: true,
                  title: true,
                  content: true,
                  settings: true,
                  exercises: {
                    where: { contentStatus: { not: "ARCHIVED" } },
                    select: { engineKey: true, difficulty: true, content: true, correctAnswer: true, instruction: true, question: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!course) throw new Error("Course not found");

  const lessons = course.modules.flatMap((module) => module.lessons);
  const exerciseCount = lessons.reduce((total, lesson) => total + lesson.blocks.reduce((blocksTotal, block) => blocksTotal + block.exercises.length, 0), 0);
  const totalSeconds = lessons.reduce((total, lesson) => {
    const authoredSeconds = lessonSeconds(lesson.blocks);
    return total + (authoredSeconds || Math.max(0, lesson.estimatedDuration) * 60);
  }, 0);

  return {
    totalSeconds,
    minutes: totalSeconds > 0 ? Math.max(1, Math.ceil(totalSeconds / 60)) : 0,
    lessonCount: lessons.length,
    exerciseCount,
  };
}

/** Uses the same model as the course total so lesson cards never show a stale manual duration. */
export async function syncLessonEstimatedDuration(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      blocks: {
        where: { contentStatus: { not: "ARCHIVED" } },
        select: {
          type: true,
          title: true,
          content: true,
          settings: true,
          exercises: {
            where: { contentStatus: { not: "ARCHIVED" } },
            select: { engineKey: true, difficulty: true, content: true, correctAnswer: true, instruction: true, question: true },
          },
        },
      },
    },
  });
  if (!lesson) return null;
  const totalSeconds = lessonSeconds(lesson.blocks);
  const minutes = totalSeconds > 0 ? Math.max(1, Math.ceil(totalSeconds / 60)) : 0;
  await prisma.lesson.update({ where: { id: lessonId }, data: { estimatedDuration: minutes } });
  return { totalSeconds, minutes };
}

/** Keeps the stored public course duration in sync with authored lesson content. */
export async function syncCourseEstimatedDuration(courseId: string) {
  const estimate = await getCourseDurationEstimate(courseId);
  await prisma.course.update({ where: { id: courseId }, data: { estimatedDuration: estimate.minutes, lessonCount: estimate.lessonCount } });
  return estimate;
}

export async function syncCourseDurationForLessonBlock(lessonBlockId: string) {
  const block = await prisma.lessonBlock.findUnique({
    where: { id: lessonBlockId },
    select: { lesson: { select: { id: true, module: { select: { courseId: true } } } } },
  });
  if (!block) return null;
  await syncLessonEstimatedDuration(block.lesson.id);
  return syncCourseEstimatedDuration(block.lesson.module.courseId);
}
