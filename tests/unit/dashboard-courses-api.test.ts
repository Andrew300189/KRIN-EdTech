jest.mock("@/modules/courses/server/content-access", () => ({
  requireLearningUser: jest.fn(),
}));
jest.mock("@/modules/courses/services/learner-course.service", () => ({
  listLearnerCourses: jest.fn(),
}));

import { GET } from "@/app/api/dashboard/courses/route";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { listLearnerCourses } from "@/modules/courses/services/learner-course.service";

const mockedGuard = jest.mocked(requireLearningUser);
const mockedList = jest.mocked(listLearnerCourses);

describe("dashboard courses API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("queries courses only for the authenticated user", async () => {
    mockedGuard.mockResolvedValue({ ok: true, user: { id: "current-user" } } as never);
    mockedList.mockResolvedValue([]);

    const response = await GET();

    expect(mockedList).toHaveBeenCalledWith("current-user");
    expect(await response.json()).toEqual({ data: [] });
  });

  it("does not query courses without an authenticated user", async () => {
    mockedGuard.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" } as never);

    const response = await GET();

    expect(mockedList).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });
});
