import { NextRequest } from "next/server";

jest.mock("@/modules/courses/server/content-access", () => ({ requireLearningUser: jest.fn() }));
jest.mock("@/modules/courses/services/learner-course.service", () => ({ listLearnerCourses: jest.fn() }));

import { GET } from "@/app/continue-learning/route";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";

const guard = jest.mocked(requireLearningUser);
const list = jest.mocked(listLearnerCourses);
const request = new NextRequest("https://krin-ed-tech.vercel.app/continue-learning");

describe("continue learning link", () => {
  beforeEach(() => jest.resetAllMocks());

  it("redirects a learner to the latest studied course's next lesson", async () => {
    guard.mockResolvedValue({ ok: true, user: { id: "student-1" } } as never);
    list.mockResolvedValue([
      { slug: "untouched", nextLesson: { slug: "one" }, lastActivityAt: null },
      { slug: "verb-to-be-masterclass", nextLesson: { slug: "to-be-characteristics" }, lastActivityAt: "2026-09-26T09:00:00.000Z" },
    ] as never);

    const response = await GET(request);
    expect(list).toHaveBeenCalledWith("student-1");
    expect(response.headers.get("location")).toBe("https://krin-ed-tech.vercel.app/courses/verb-to-be-masterclass/lessons/to-be-characteristics");
  });

  it("sends a learner without a course to the catalogue", async () => {
    guard.mockResolvedValue({ ok: true, user: { id: "student-1" } } as never);
    list.mockResolvedValue([]);
    expect((await GET(request)).headers.get("location")).toBe("https://krin-ed-tech.vercel.app/student/catalog");
  });
});
