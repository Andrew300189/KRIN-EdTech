import { randomUUID } from "crypto";
import { prisma } from "@/core/server/prisma";
import {
  SearchService,
  toSearchPrincipal,
} from "@/modules/search/services/search.service";

const RUN_DB_INTEGRATION =
  process.env.RUN_DB_INTEGRATION_TESTS === "1" &&
  Boolean(process.env.DATABASE_URL);
const describeDb = RUN_DB_INTEGRATION ? describe : describe.skip;

describeDb("search visibility integration", () => {
  const suffix = randomUUID().slice(0, 8);

  const users = {
    teacherA: `it-teacher-a-${suffix}`,
    teacherB: `it-teacher-b-${suffix}`,
    studentA: `it-student-a-${suffix}`,
    studentB: `it-student-b-${suffix}`,
  };

  const ids = {
    category: `it-category-${suffix}`,
    pubCourse: `it-course-pub-${suffix}`,
    draftCourse: `it-course-draft-${suffix}`,
    modulePub: `it-module-pub-${suffix}`,
    lessonPub: `it-lesson-pub-${suffix}`,
    helpCategory: `it-help-cat-${suffix}`,
    articleEn: `it-help-en-${suffix}`,
    articleUk: `it-help-uk-${suffix}`,
    articleRu: `it-help-ru-${suffix}`,
    groupA: `it-group-a-${suffix}`,
    groupB: `it-group-b-${suffix}`,
    groupStudentA: `it-group-student-a-${suffix}`,
    groupStudentB: `it-group-student-b-${suffix}`,
    assignmentA: `it-assignment-a-${suffix}`,
    assignmentB: `it-assignment-b-${suffix}`,
    submissionA: `it-submission-a-${suffix}`,
    submissionB: `it-submission-b-${suffix}`,
    studentCourseA: `it-student-course-a-${suffix}`,
    studentCourseB: `it-student-course-b-${suffix}`,
    userWordA: `it-user-word-a-${suffix}`,
    userWordB: `it-user-word-b-${suffix}`,
  };

  let levelId = "";

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        {
          id: users.teacherA,
          email: `teacher-a-${suffix}@example.com`,
          username: `teacher-a-${suffix}`,
          name: `Teacher A ${suffix}`,
          passwordHash: "x",
          role: "INSTRUCTOR",
          emailVerified: true,
        },
        {
          id: users.teacherB,
          email: `teacher-b-${suffix}@example.com`,
          username: `teacher-b-${suffix}`,
          name: `Teacher B ${suffix}`,
          passwordHash: "x",
          role: "INSTRUCTOR",
          emailVerified: true,
        },
        {
          id: users.studentA,
          email: `student-a-${suffix}@example.com`,
          username: `student-a-${suffix}`,
          name: `Student Alpha ${suffix}`,
          passwordHash: "x",
          role: "STUDENT",
          emailVerified: true,
          interfaceLanguage: "uk",
        },
        {
          id: users.studentB,
          email: `student-b-${suffix}@example.com`,
          username: `student-b-${suffix}`,
          name: `Student Beta ${suffix}`,
          passwordHash: "x",
          role: "STUDENT",
          emailVerified: true,
          interfaceLanguage: "ru",
        },
      ],
    });

    const baseLevel = await prisma.languageLevel.findFirst({
      where: { code: "A1" },
      select: { id: true },
    });
    if (!baseLevel) {
      throw new Error(
        "Expected seeded A1 language level for integration tests",
      );
    }
    levelId = baseLevel.id;

    await prisma.courseCategory.create({
      data: {
        id: ids.category,
        slug: `integration-${suffix}`,
        title: `Integration Category ${suffix}`,
        description: "Integration category",
        order: 9100,
        isPublished: true,
      },
    });

    await prisma.course.createMany({
      data: [
        {
          id: ids.pubCourse,
          levelId,
          categoryId: ids.category,
          slug: `published-${suffix}`,
          title: `viskey published ${suffix}`,
          shortDescription: "Published searchable course",
          isPublished: true,
          accessPlan: "FREE",
          instructorId: users.teacherA,
        },
        {
          id: ids.draftCourse,
          levelId,
          categoryId: ids.category,
          slug: `draft-${suffix}`,
          title: `viskey draft ${suffix}`,
          shortDescription: "Draft hidden course",
          isPublished: false,
          accessPlan: "FREE",
          instructorId: users.teacherA,
        },
      ],
    });

    await prisma.courseModule.create({
      data: {
        id: ids.modulePub,
        courseId: ids.pubCourse,
        title: `Module ${suffix}`,
        order: 1,
        isPublished: true,
      },
    });

    await prisma.lesson.create({
      data: {
        id: ids.lessonPub,
        moduleId: ids.modulePub,
        slug: `lesson-${suffix}`,
        title: `viskey lesson ${suffix}`,
        description: "Published lesson",
        type: "GRAMMAR",
        order: 1,
        isPublished: true,
      },
    });

    await prisma.helpCategory.create({
      data: {
        id: ids.helpCategory,
        slug: `integration-help-${suffix}`,
        title: `Help ${suffix}`,
        order: 9100,
        isActive: true,
      },
    });

    await prisma.helpArticle.createMany({
      data: [
        {
          id: ids.articleEn,
          categoryId: ids.helpCategory,
          authorId: users.teacherA,
          slug: `locakey-en-${suffix}`,
          title: `locakey article en ${suffix}`,
          summary: "English locale article",
          content: "content en",
          locale: "en",
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
        {
          id: ids.articleUk,
          categoryId: ids.helpCategory,
          authorId: users.teacherA,
          slug: `locakey-uk-${suffix}`,
          title: `locakey article uk ${suffix}`,
          summary: "Ukrainian locale article",
          content: "content uk",
          locale: "uk",
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
        {
          id: ids.articleRu,
          categoryId: ids.helpCategory,
          authorId: users.teacherA,
          slug: `locakey-ru-${suffix}`,
          title: `locakey article ru ${suffix}`,
          summary: "Russian locale article",
          content: "content ru",
          locale: "ru",
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      ],
    });

    await prisma.studentCourse.createMany({
      data: [
        {
          id: ids.studentCourseA,
          studentId: users.studentA,
          courseId: ids.pubCourse,
          sourceType: "SELF_ADDED",
          sourceKey: `student-course-a-${suffix}`,
          status: "ACTIVE",
        },
        {
          id: ids.studentCourseB,
          studentId: users.studentB,
          courseId: ids.pubCourse,
          sourceType: "SELF_ADDED",
          sourceKey: `student-course-b-${suffix}`,
          status: "ACTIVE",
        },
      ],
    });

    await prisma.userWord.createMany({
      data: [
        {
          id: ids.userWordA,
          userId: users.studentA,
          customWord: `homekey-alpha-${suffix}`,
          customTranslation: "alpha",
        },
        {
          id: ids.userWordB,
          userId: users.studentB,
          customWord: `homekey-beta-${suffix}`,
          customTranslation: "beta",
        },
      ],
    });

    await prisma.learningGroup.createMany({
      data: [
        {
          id: ids.groupA,
          teacherId: users.teacherA,
          name: `teachkey-group-a-${suffix}`,
          status: "ACTIVE",
        },
        {
          id: ids.groupB,
          teacherId: users.teacherB,
          name: `teachkey-group-b-${suffix}`,
          status: "ACTIVE",
        },
      ],
    });

    await prisma.groupStudent.createMany({
      data: [
        {
          id: ids.groupStudentA,
          groupId: ids.groupA,
          studentId: users.studentA,
          status: "ACTIVE",
        },
        {
          id: ids.groupStudentB,
          groupId: ids.groupB,
          studentId: users.studentB,
          status: "ACTIVE",
        },
      ],
    });

    await prisma.assignment.createMany({
      data: [
        {
          id: ids.assignmentA,
          teacherId: users.teacherA,
          groupId: ids.groupA,
          title: `teachkey assignment a ${suffix}`,
          type: "LESSON",
          status: "ACTIVE",
        },
        {
          id: ids.assignmentB,
          teacherId: users.teacherB,
          groupId: ids.groupB,
          title: `teachkey assignment b ${suffix}`,
          type: "LESSON",
          status: "ACTIVE",
        },
      ],
    });

    await prisma.assignmentSubmission.createMany({
      data: [
        {
          id: ids.submissionA,
          assignmentId: ids.assignmentA,
          studentId: users.studentA,
          status: "SUBMITTED",
        },
        {
          id: ids.submissionB,
          assignmentId: ids.assignmentB,
          studentId: users.studentB,
          status: "SUBMITTED",
        },
      ],
    });
  }, 60_000);

  afterAll(async () => {
    await prisma.assignmentSubmission.deleteMany({
      where: { id: { in: [ids.submissionA, ids.submissionB] } },
    });
    await prisma.assignment.deleteMany({
      where: { id: { in: [ids.assignmentA, ids.assignmentB] } },
    });
    await prisma.groupStudent.deleteMany({
      where: { id: { in: [ids.groupStudentA, ids.groupStudentB] } },
    });
    await prisma.learningGroup.deleteMany({
      where: { id: { in: [ids.groupA, ids.groupB] } },
    });
    await prisma.userWord.deleteMany({
      where: { id: { in: [ids.userWordA, ids.userWordB] } },
    });
    await prisma.studentCourse.deleteMany({
      where: { id: { in: [ids.studentCourseA, ids.studentCourseB] } },
    });
    await prisma.helpArticle.deleteMany({
      where: { id: { in: [ids.articleEn, ids.articleUk, ids.articleRu] } },
    });
    await prisma.helpCategory.deleteMany({ where: { id: ids.helpCategory } });
    await prisma.lesson.deleteMany({ where: { id: ids.lessonPub } });
    await prisma.courseModule.deleteMany({ where: { id: ids.modulePub } });
    await prisma.course.deleteMany({
      where: { id: { in: [ids.pubCourse, ids.draftCourse] } },
    });
    await prisma.courseCategory.deleteMany({ where: { id: ids.category } });
    await prisma.user.deleteMany({
      where: { id: { in: Object.values(users) } },
    });
  }, 60_000);

  it("PUBLIC search returns published content only", async () => {
    const response = await SearchService.searchAll({
      principal: toSearchPrincipal({ userId: null, role: null, locale: "en" }),
      query: "viskey published",
      requestedContext: "PUBLIC",
      filters: { types: ["COURSE", "LESSON"] },
    });

    const titles = response.items.map((item) => item.title.toLowerCase());
    expect(titles.some((title) => title.includes("published"))).toBe(true);
    expect(titles.some((title) => title.includes("draft"))).toBe(false);
  });

  it("PUBLIC search honors locale fallback (requested + en)", async () => {
    const response = await SearchService.searchAll({
      principal: toSearchPrincipal({ userId: null, role: null, locale: "uk" }),
      query: "locakey article",
      requestedContext: "PUBLIC",
      filters: { types: ["HELP_ARTICLE"] },
    });

    const titles = response.items.map((item) => item.title.toLowerCase());
    expect(titles.some((title) => title.includes("article uk"))).toBe(true);
    expect(titles.some((title) => title.includes("article en"))).toBe(true);
    expect(titles.some((title) => title.includes("article ru"))).toBe(false);
  });

  it("STUDENT search returns only own private entities", async () => {
    const response = await SearchService.searchAll({
      principal: toSearchPrincipal({
        userId: users.studentA,
        role: "student",
        locale: "uk",
      }),
      query: suffix,
      requestedContext: "STUDENT",
      filters: { types: ["USER_WORD"] },
    });

    const titles = response.items.map((item) => item.title.toLowerCase());
    expect(titles.some((title) => title.includes("alpha"))).toBe(true);
    expect(titles.some((title) => title.includes("beta"))).toBe(false);
  });

  it("TEACHER search returns only linked students and assignments", async () => {
    const response = await SearchService.searchAll({
      principal: toSearchPrincipal({
        userId: users.teacherA,
        role: "teacher",
        locale: "en",
      }),
      query: suffix,
      requestedContext: "TEACHER",
      filters: { types: ["STUDENT", "ASSIGNMENT"] },
    });

    const titles = response.items.map((item) => item.title.toLowerCase());
    expect(titles.some((title) => title.includes("student alpha"))).toBe(true);
    expect(titles.some((title) => title.includes("student beta"))).toBe(false);
    expect(titles.some((title) => title.includes("assignment a"))).toBe(true);
    expect(titles.some((title) => title.includes("assignment b"))).toBe(false);
  });
});
