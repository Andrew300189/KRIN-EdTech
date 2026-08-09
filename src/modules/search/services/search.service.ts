import { prisma } from "@/core/server/prisma";
import { parseRole } from "@/core/utils/role";
import { LEARNING_ACADEMIES } from "@/modules/courses/constants/learning-paths";
import type { AppRole } from "@/core/constants/roles";
import {
  DEFAULT_TOTAL_LIMIT,
  MIN_QUERY_LENGTH,
  type SearchContext,
  type SearchFilters,
  type SearchResponse,
  type SearchResult,
  type SearchSort,
  type SearchResultType,
} from "@/modules/search/types";
import { groupResults } from "@/modules/search/utils/group-results";
import { normalizeSearchQuery } from "@/modules/search/utils/normalize-query";
import { calculateSearchRank, sortSearchResults } from "@/modules/search/utils/rank";

type SearchPrincipal = {
  userId: string | null;
  role: AppRole | null;
  locale: string;
};

type SearchAllInput = {
  principal: SearchPrincipal;
  query: string;
  requestedContext: SearchContext;
  filters?: SearchFilters;
  limit?: number;
  cursor?: number;
  sort?: SearchSort;
};

function resolveContext(requestedContext: SearchContext, role: AppRole | null): SearchContext {
  if (requestedContext === "TEACHER" && role !== "teacher") return role === "student" ? "STUDENT" : "PUBLIC";
  if (requestedContext === "STUDENT" && role !== "student") return role === "teacher" ? "TEACHER" : "PUBLIC";
  if (requestedContext === "ADMIN") return role === "admin" || role === "super_admin" || role === "content_manager" ? "ADMIN" : "PUBLIC";
  if (requestedContext === "PUBLIC") return "PUBLIC";
  return requestedContext;
}

function includeType(type: SearchResultType, filters?: SearchFilters) {
  if (!filters?.types || filters.types.length === 0) return true;
  return filters.types.includes(type);
}

function courseUrl(courseSlug: string) {
  return `/courses/catalog/${courseSlug}`;
}

function lessonUrl(courseSlug: string, lessonSlug: string) {
  return `${courseUrl(courseSlug)}#lesson-${encodeURIComponent(lessonSlug)}`;
}

export class SearchService {
  static async searchAll(input: SearchAllInput): Promise<SearchResponse> {
    const query = normalizeSearchQuery(input.query);
    const context = resolveContext(input.requestedContext, input.principal.role);
    const cursor = Math.max(0, input.cursor ?? 0);
    const limit = Math.min(50, Math.max(1, input.limit ?? DEFAULT_TOTAL_LIMIT));
    const sort = input.sort ?? "relevance";

    if (query.length < MIN_QUERY_LENGTH) {
      return {
        query,
        context,
        groups: [],
        items: [],
        total: 0,
        cursor,
        nextCursor: null,
      };
    }

    let results: SearchResult[] = [];
    if (context === "PUBLIC") {
      results = await this.searchPublic(query, input.principal.locale, input.filters);
    } else if (context === "STUDENT") {
      results = await this.searchForStudent(query, input.principal, input.filters);
    } else if (context === "TEACHER") {
      results = await this.searchForTeacher(query, input.principal, input.filters);
    }

    const sorted = sortSearchResults(results, sort);
    const paginated = sorted.slice(cursor, cursor + limit);
    const groups = groupResults(paginated, context);

    return {
      query,
      context,
      groups,
      items: paginated,
      total: sorted.length,
      cursor,
      nextCursor: cursor + limit < sorted.length ? cursor + limit : null,
      suggestion: sorted.length === 0 ? this.suggestQuery(query) : undefined,
    };
  }

  static async searchPublic(query: string, locale: string, filters?: SearchFilters) {
    const [courses, categories, lessons, grammarTopics, helpArticles] = await Promise.all([
      includeType("COURSE", filters)
        ? prisma.course.findMany({
            where: {
              isPublished: true,
              isTemplate: false,
              accessMode: { not: "HIDDEN" },
              isVisibleInSearch: true,
              level: { isPublished: true, ...(filters?.level ? { code: filters.level.toUpperCase() as never } : {}) },
              category: { isPublished: true, ...(filters?.category ? { slug: filters.category } : {}) },
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { shortDescription: { contains: query, mode: "insensitive" } },
                { fullDescription: { contains: query, mode: "insensitive" } },
                { slug: { contains: query, mode: "insensitive" } },
                { category: { title: { contains: query, mode: "insensitive" } } },
                { curriculumLinks: { some: { node: { contentStatus: "PUBLISHED", showInSearch: true, OR: [{ title: { contains: query, mode: "insensitive" } }, { slug: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] } } } },
              ],
            },
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              coverImage: true,
              accessPlan: true,
              lessonCount: true,
              updatedAt: true,
              level: { select: { code: true } },
              category: { select: { title: true } },
            },
            take: 40,
          })
        : [],
      includeType("CATEGORY", filters)
        ? prisma.courseCategory.findMany({
            where: {
              isPublished: true,
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            },
            select: { id: true, slug: true, title: true, description: true },
            take: 20,
          })
        : [],
      includeType("LESSON", filters)
        ? prisma.lesson.findMany({
            where: {
              isPublished: true,
              module: {
                isPublished: true,
                course: {
                  isPublished: true,
                  isTemplate: false,
                  accessMode: { not: "HIDDEN" },
                  isVisibleInSearch: true,
                  level: { isPublished: true, ...(filters?.level ? { code: filters.level.toUpperCase() as never } : {}) },
                  category: { isPublished: true, ...(filters?.category ? { slug: filters.category } : {}) },
                },
              },
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { module: { course: { title: { contains: query, mode: "insensitive" } } } },
              ],
            },
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              updatedAt: true,
              module: { select: { title: true, course: { select: { slug: true, title: true } } } },
            },
            take: 40,
          })
        : [],
      includeType("GRAMMAR_TOPIC", filters)
        ? prisma.grammarTopic.findMany({
            where: {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
              ...(filters?.level ? { cefrLevel: filters.level.toUpperCase() as never } : {}),
            },
            select: { id: true, title: true, description: true, cefrLevel: true, slug: true, updatedAt: true },
            take: 30,
          })
        : [],
      includeType("HELP_ARTICLE", filters)
        ? prisma.helpArticle.findMany({
            where: {
              status: "PUBLISHED",
              locale: { in: [locale, "en"] },
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { summary: { contains: query, mode: "insensitive" } },
                { content: { contains: query, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              slug: true,
              title: true,
              summary: true,
              locale: true,
              updatedAt: true,
              category: { select: { title: true } },
            },
            take: 30,
          })
        : [],
    ]);

    const academyResults: SearchResult[] = includeType("ACADEMY", filters)
      ? LEARNING_ACADEMIES.filter((academy) => {
          const haystack = `${academy.title} ${academy.slug} ${academy.paths.map((path) => path.title).join(" ")}`.toLocaleLowerCase("en");
          return haystack.includes(query.toLocaleLowerCase("en"));
        }).map((academy) => ({
          id: academy.slug,
          type: "ACADEMY",
          title: academy.title,
          subtitle: `${academy.paths.length} paths`,
          description: academy.paths.map((path) => path.title).slice(0, 2).join("; "),
          url: `/student/academies`,
          badge: "Academy",
          icon: "academy",
          score: calculateSearchRank({ query, title: academy.title, keywords: academy.paths.map((path) => path.title) }),
        }))
      : [];

    const courseResults: SearchResult[] = courses.map((course) => ({
      id: course.id,
      type: "COURSE",
      title: course.title,
      subtitle: `${course.level.code} - ${course.category.title}`,
      description: course.shortDescription,
      imageUrl: course.coverImage ?? undefined,
      badge: course.accessPlan === "FREE" ? "Free" : course.accessPlan,
      url: courseUrl(course.slug),
      score: calculateSearchRank({
        query,
        title: course.title,
        subtitle: course.category.title,
        description: course.shortDescription,
        boosts: { popular: course.lessonCount > 8 },
      }),
      metadata: { updatedAt: course.updatedAt.getTime(), level: course.level.code, category: course.category.title },
    }));

    const categoryResults: SearchResult[] = categories.map((category) => ({
      id: category.id,
      type: "CATEGORY",
      title: category.title,
      description: category.description ?? undefined,
      url: `/courses/categories/${category.slug}`,
      score: calculateSearchRank({ query, title: category.title, description: category.description }),
      metadata: {},
    }));

    const lessonResults: SearchResult[] = lessons.map((lesson) => ({
      id: lesson.id,
      type: "LESSON",
      title: lesson.title,
      subtitle: `${lesson.module.course.title} / ${lesson.module.title}`,
      description: lesson.description ?? undefined,
      url: lessonUrl(lesson.module.course.slug, lesson.slug),
      score: calculateSearchRank({ query, title: lesson.title, subtitle: lesson.module.course.title, description: lesson.description }),
      metadata: { updatedAt: lesson.updatedAt.getTime() },
    }));

    const grammarResults: SearchResult[] = grammarTopics.map((topic) => ({
      id: topic.id,
      type: "GRAMMAR_TOPIC",
      title: topic.title,
      subtitle: topic.cefrLevel,
      description: topic.description ?? undefined,
      url: `/courses/${topic.cefrLevel.toLowerCase()}/grammar/${topic.slug}`,
      badge: "Grammar topic",
      score: calculateSearchRank({ query, title: topic.title, subtitle: topic.cefrLevel, description: topic.description }),
      metadata: { updatedAt: topic.updatedAt.getTime(), level: topic.cefrLevel, category: "grammar", slug: topic.slug },
    }));

    const articleResults: SearchResult[] = helpArticles.map((article) => ({
      id: article.id,
      type: "HELP_ARTICLE",
      title: article.title,
      subtitle: article.category?.title ?? "Help",
      description: article.summary ?? undefined,
      url: `/help/${article.slug}`,
      score: calculateSearchRank({ query, title: article.title, subtitle: article.category?.title, description: article.summary }),
      metadata: { updatedAt: article.updatedAt.getTime(), locale: article.locale },
    }));

    return [
      ...courseResults,
      ...categoryResults,
      ...academyResults,
      ...lessonResults,
      ...grammarResults,
      ...articleResults,
    ];
  }

  static async searchForStudent(query: string, principal: SearchPrincipal, filters?: SearchFilters) {
    const publicResults = (await this.searchPublic(query, principal.locale, filters)).map((result) => result.type === "GRAMMAR_TOPIC"
      ? { ...result, url: `/student/topics/${String(result.metadata?.slug ?? result.id)}?level=${encodeURIComponent(String(result.metadata?.level ?? ""))}&category=grammar` }
      : result);
    if (!principal.userId) return publicResults;

    const [studentCourses, assignments, userWords, mistakes, achievements] = await Promise.all([
      prisma.studentCourse.findMany({
        where: {
          studentId: principal.userId,
          status: { in: ["ACTIVE", "COMPLETED"] },
          course: {
            isPublished: true,
            isTemplate: false,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { shortDescription: { contains: query, mode: "insensitive" } },
            ],
          },
        },
        select: {
          id: true,
          sourceType: true,
          status: true,
          updatedAt: true,
          course: { select: { id: true, slug: true, title: true, shortDescription: true, level: { select: { code: true } }, category: { select: { title: true } } } },
        },
        take: 30,
      }),
      prisma.assignmentSubmission.findMany({
        where: {
          studentId: principal.userId,
          assignment: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { lesson: { title: { contains: query, mode: "insensitive" } } },
              { course: { title: { contains: query, mode: "insensitive" } } },
            ],
          },
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
          assignment: { select: { id: true, title: true, dueAt: true, course: { select: { title: true } }, group: { select: { name: true } } } },
        },
        take: 30,
      }),
      prisma.userWord.findMany({
        where: {
          userId: principal.userId,
          OR: [
            { customWord: { contains: query, mode: "insensitive" } },
            { customTranslation: { contains: query, mode: "insensitive" } },
            {
              word: {
                OR: [
                  { lemma: { contains: query, mode: "insensitive" } },
                  { normalizedLemma: { contains: query.toLocaleLowerCase("en") } },
                  { meanings: { some: { translation: { contains: query, mode: "insensitive" } } } },
                ],
              },
            },
          ],
        },
        select: {
          id: true,
          status: true,
          masteryLevel: true,
          updatedAt: true,
          customWord: true,
          customTranslation: true,
          word: { select: { lemma: true, meanings: { orderBy: { order: "asc" }, take: 1, select: { translation: true, definition: true } } } },
        },
        take: 30,
      }),
      prisma.userMistake.findMany({
        where: {
          userId: principal.userId,
          OR: [
            { explanation: { contains: query, mode: "insensitive" } },
            { exercise: { question: { contains: query, mode: "insensitive" } } },
            { lesson: { title: { contains: query, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          occurrenceCount: true,
          resolvedAt: true,
          updatedAt: true,
          explanation: true,
          exercise: { select: { question: true } },
          lesson: { select: { title: true } },
        },
        take: 30,
      }),
      prisma.userAchievement.findMany({
        where: {
          userId: principal.userId,
          achievement: {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
        },
        select: {
          id: true,
          completed: true,
          progress: true,
          target: true,
          updatedAt: true,
          achievement: { select: { title: true, description: true, rarity: true } },
        },
        take: 20,
      }),
    ]);

    const mineCourseResults: SearchResult[] = includeType("COURSE", filters)
      ? studentCourses.map((item) => ({
          id: item.course.id,
          type: "COURSE",
          title: item.course.title,
          subtitle: `${item.course.level.code} - ${item.course.category.title}`,
          description: item.course.shortDescription,
          url: `/student/courses`,
          badge: item.sourceType === "TEACHER_ASSIGNED" || item.sourceType === "GROUP_ASSIGNED" ? "Assigned" : "My course",
          score: calculateSearchRank({
            query,
            title: item.course.title,
            subtitle: item.course.category.title,
            description: item.course.shortDescription,
            boosts: { mine: true, inProgress: item.status === "ACTIVE" },
          }),
          metadata: { updatedAt: item.updatedAt.getTime() },
        }))
      : [];

    const assignmentResults: SearchResult[] = includeType("ASSIGNMENT", filters)
      ? assignments.map((item) => ({
          id: item.id,
          type: "ASSIGNMENT",
          title: item.assignment.title,
          subtitle: `${item.assignment.group?.name ?? "Personal"} - ${item.status}`,
          description: item.assignment.course?.title,
          url: `/student/homework`,
          badge: item.status,
          score: calculateSearchRank({ query, title: item.assignment.title, subtitle: item.assignment.group?.name, boosts: { active: item.status !== "GRADED" } }),
          metadata: { updatedAt: item.updatedAt.getTime(), dueAt: item.assignment.dueAt?.getTime() },
        }))
      : [];

    const wordResults: SearchResult[] = includeType("USER_WORD", filters)
      ? userWords.map((item) => {
          const title = item.word?.lemma ?? item.customWord ?? "Word";
          const translation = item.word?.meanings[0]?.translation ?? item.customTranslation ?? item.word?.meanings[0]?.definition ?? "";
          return {
            id: item.id,
            type: "USER_WORD" as const,
            title,
            subtitle: translation,
            description: `Status: ${item.status}`,
            url: "/student/vocabulary",
            badge: item.status,
            score: calculateSearchRank({ query, title, subtitle: translation }),
            metadata: { updatedAt: item.updatedAt.getTime(), masteryLevel: item.masteryLevel },
          };
        })
      : [];

    const mistakeResults: SearchResult[] = includeType("USER_MISTAKE", filters)
      ? mistakes.map((item) => ({
          id: item.id,
          type: "USER_MISTAKE",
          title: item.exercise?.question?.slice(0, 80) || "Mistake",
          subtitle: item.lesson?.title,
          description: item.explanation ?? undefined,
          url: "/profile/mistakes",
          badge: item.resolvedAt ? "Resolved" : "Open",
          score: calculateSearchRank({ query, title: item.exercise?.question ?? "Mistake", subtitle: item.lesson?.title, description: item.explanation }),
          metadata: { updatedAt: item.updatedAt.getTime(), occurrenceCount: item.occurrenceCount },
        }))
      : [];

    const achievementResults: SearchResult[] = includeType("ACHIEVEMENT", filters)
      ? achievements.map((item) => ({
          id: item.id,
          type: "ACHIEVEMENT",
          title: item.achievement.title,
          subtitle: item.achievement.rarity,
          description: item.achievement.description,
          url: "/profile/achievements",
          badge: item.completed ? "Completed" : `${item.progress}/${item.target}`,
          score: calculateSearchRank({ query, title: item.achievement.title, description: item.achievement.description }),
          metadata: { updatedAt: item.updatedAt.getTime() },
        }))
      : [];

    return [...mineCourseResults, ...assignmentResults, ...wordResults, ...mistakeResults, ...achievementResults, ...publicResults];
  }

  static async searchForTeacher(query: string, principal: SearchPrincipal, filters?: SearchFilters) {
    const publicResults = await this.searchPublic(query, principal.locale, filters);
    if (!principal.userId) return publicResults;

    const [groups, students, assignments, submissions] = await Promise.all([
      prisma.learningGroup.findMany({
        where: {
          AND: [
            { OR: [{ teacherId: principal.userId }, { teachers: { some: { teacherId: principal.userId } } }] },
            {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            },
          ],
        },
        select: { id: true, name: true, description: true, status: true, updatedAt: true, _count: { select: { students: true } } },
        take: 30,
      }),
      prisma.groupStudent.findMany({
        where: {
          status: { in: ["ACTIVE", "INVITED"] },
          group: {
            OR: [{ teacherId: principal.userId }, { teachers: { some: { teacherId: principal.userId } } }],
          },
          student: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
        },
        select: { id: true, updatedAt: true, group: { select: { name: true } }, student: { select: { id: true, name: true, email: true } } },
        take: 30,
      }),
      prisma.assignment.findMany({
        where: {
          teacherId: principal.userId,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { group: { name: { contains: query, mode: "insensitive" } } },
            { student: { name: { contains: query, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          dueAt: true,
          updatedAt: true,
          group: { select: { name: true } },
          student: { select: { name: true } },
          _count: { select: { submissions: true } },
        },
        take: 30,
      }),
      prisma.assignmentSubmission.findMany({
        where: {
          assignment: {
            OR: [
              { teacherId: principal.userId },
              {
                group: {
                  OR: [{ teacherId: principal.userId }, { teachers: { some: { teacherId: principal.userId } } }],
                },
              },
            ],
          },
          OR: [
            { assignment: { title: { contains: query, mode: "insensitive" } } },
            { student: { name: { contains: query, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
          assignment: { select: { title: true, group: { select: { name: true } } } },
          student: { select: { name: true } },
        },
        take: 30,
      }),
    ]);

    const groupResults: SearchResult[] = includeType("GROUP", filters)
      ? groups.map((group) => ({
          id: group.id,
          type: "GROUP",
          title: group.name,
          subtitle: `${group._count.students} students`,
          description: group.description ?? undefined,
          url: `/teacher/groups/${group.id}`,
          badge: group.status,
          score: calculateSearchRank({ query, title: group.name, description: group.description, boosts: { active: group.status === "ACTIVE" } }),
          metadata: { updatedAt: group.updatedAt.getTime() },
        }))
      : [];

    const studentResults: SearchResult[] = includeType("STUDENT", filters)
      ? students.map((item) => ({
          id: item.student.id,
          type: "STUDENT",
          title: item.student.name,
          subtitle: item.group.name,
          description: item.student.email,
          url: "/teacher/students",
          badge: "Linked",
          score: calculateSearchRank({ query, title: item.student.name, subtitle: item.group.name, description: item.student.email }),
          metadata: { updatedAt: item.updatedAt.getTime() },
        }))
      : [];

    const assignmentResults: SearchResult[] = includeType("ASSIGNMENT", filters)
      ? assignments.map((item) => ({
          id: item.id,
          type: "ASSIGNMENT",
          title: item.title,
          subtitle: item.group?.name ?? item.student?.name ?? "Assignment",
          description: item.description ?? undefined,
          url: "/teacher/assignments",
          badge: item.status,
          score: calculateSearchRank({ query, title: item.title, subtitle: item.group?.name ?? item.student?.name, description: item.description, boosts: { active: item.status === "ACTIVE" } }),
          metadata: { updatedAt: item.updatedAt.getTime(), dueAt: item.dueAt?.getTime(), submissions: item._count.submissions },
        }))
      : [];

    const submissionResults: SearchResult[] = includeType("SUBMISSION", filters)
      ? submissions.map((item) => ({
          id: item.id,
          type: "SUBMISSION",
          title: item.assignment.title,
          subtitle: `${item.student.name} - ${item.assignment.group?.name ?? "Direct"}`,
          description: item.status,
          url: "/teacher/reviews",
          badge: item.status,
          score: calculateSearchRank({ query, title: item.assignment.title, subtitle: item.student.name, description: item.status, boosts: { active: item.status === "SUBMITTED" } }),
          metadata: { updatedAt: item.updatedAt.getTime(), submittedAt: item.submittedAt?.getTime() },
        }))
      : [];

    return [...groupResults, ...studentResults, ...assignmentResults, ...submissionResults, ...publicResults];
  }

  static suggestQuery(query: string) {
    if (query.length < 4) return undefined;
    return query.slice(0, -1);
  }
}

export function toSearchPrincipal(input: { userId?: string | null; role?: string | null; locale?: string | null }): SearchPrincipal {
  return {
    userId: input.userId ?? null,
    role: input.role ? parseRole(input.role) : null,
    locale: input.locale?.toLowerCase() || "en",
  };
}
