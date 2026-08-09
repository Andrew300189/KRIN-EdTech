import { groupResults } from "@/modules/search/utils/group-results";

describe("search grouping", () => {
  test("groups and truncates per group", () => {
    const items = Array.from({ length: 7 }, (_, index) => ({
      id: String(index),
      type: "COURSE" as const,
      title: `Course ${index}`,
      url: "/",
      score: 100 - index,
      badge: index < 3 ? "My course" : undefined,
    }));

    const grouped = groupResults(items, "STUDENT", 5);
    const myCourses = grouped.find((group) => group.key === "my_courses");
    const courses = grouped.find((group) => group.key === "courses");

    expect(myCourses?.items.length).toBe(3);
    expect(courses?.items.length).toBe(4);
  });
});
