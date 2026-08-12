import type {
  SearchContext,
  SearchGroup,
  SearchResult,
  SearchResultType,
} from "@/modules/search/types";

const GROUP_LABELS: Record<SearchContext, Record<string, string>> = {
  PUBLIC: {
    courses: "Courses",
    lessons: "Lessons",
    academies: "Academies",
    topics: "Topics",
    articles: "Articles",
  },
  STUDENT: {
    my_courses: "My courses",
    courses: "All courses",
    lessons: "Lessons",
    assignments: "Assignments",
    vocabulary: "Vocabulary",
    mistakes: "My mistakes",
    articles: "Articles",
    achievements: "Achievements",
    academies: "Academies",
    topics: "Topics",
  },
  TEACHER: {
    groups: "Groups",
    students: "Students",
    courses: "Courses",
    assignments: "Assignments",
    reviews: "Reviews",
    lessons: "Lessons",
    articles: "Articles",
    academies: "Academies",
    topics: "Topics",
  },
  ADMIN: {
    courses: "Courses",
    lessons: "Lessons",
    users: "Users",
    content: "Content",
  },
};

function keyByType(
  type: SearchResultType,
  result: SearchResult,
  context: SearchContext,
) {
  if (type === "COURSE") {
    return context === "STUDENT" && result.badge === "My course"
      ? "my_courses"
      : "courses";
  }
  if (type === "CATEGORY") return "courses";
  if (type === "ACADEMY") return "academies";
  if (type === "LESSON") return "lessons";
  if (type === "GRAMMAR_TOPIC" || type === "VOCABULARY_TOPIC") return "topics";
  if (type === "HELP_ARTICLE") return "articles";
  if (type === "ASSIGNMENT") return "assignments";
  if (type === "GROUP") return "groups";
  if (type === "STUDENT") return "students";
  if (type === "SUBMISSION") return "reviews";
  if (type === "USER_WORD") return "vocabulary";
  if (type === "USER_MISTAKE") return "mistakes";
  if (type === "ACHIEVEMENT") return "achievements";
  return "other";
}

export function groupResults(
  items: SearchResult[],
  context: SearchContext,
  perGroup = 5,
): SearchGroup[] {
  const grouped = new Map<string, SearchResult[]>();
  for (const item of items) {
    const key = keyByType(item.type, item, context);
    const bucket = grouped.get(key) ?? [];
    if (bucket.length < perGroup) bucket.push(item);
    grouped.set(key, bucket);
  }

  const labels = GROUP_LABELS[context];
  const groups: SearchGroup[] = [];
  for (const [key, values] of grouped) {
    if (values.length === 0) continue;
    groups.push({ key, label: labels[key] ?? key, items: values });
  }

  return groups;
}
