import { NextRequest } from "next/server";

jest.mock("@/modules/courses/server/content-access", () => ({ requireLearningUser: jest.fn() }));
jest.mock("@/core/server/rate-limit", () => ({ consumeRateLimit: jest.fn() }));
jest.mock("@/modules/motivation/services/lesson-answer-streak.service", () => ({ carryLessonAnswerStreakToNextLesson: jest.fn() }));

import { POST } from "@/app/api/learning/lessons/[lessonId]/answer-streak/advance/route";
import { requireLearningUser } from "@/modules/courses/server/content-access";
import { consumeRateLimit } from "@/core/server/rate-limit";
import { carryLessonAnswerStreakToNextLesson } from "@/modules/motivation/services/lesson-answer-streak.service";

const guard = jest.mocked(requireLearningUser);
const rate = jest.mocked(consumeRateLimit);
const carry = jest.mocked(carryLessonAnswerStreakToNextLesson);

function request(nextLessonId: string) {
  return new NextRequest("https://krin-ed-tech.vercel.app/api/learning/lessons/lesson-1/answer-streak/advance", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nextLessonId }),
  });
}

describe("lesson answer streak advance API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    guard.mockResolvedValue({ ok: true, user: { id: "student-1" } } as never);
    rate.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it("hands an authenticated learner's requested next lesson to server validation", async () => {
    carry.mockResolvedValue({ current: 105, best: 105, recoverable: 0, transferred: true });
    const response = await POST(request("lesson-2"), { params: Promise.resolve({ lessonId: "lesson-1" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { current: 105, best: 105, recoverable: 0, transferred: true } });
    expect(carry).toHaveBeenCalledWith("student-1", "lesson-1", "lesson-2");
  });

  it("rejects unauthenticated requests before touching the streak", async () => {
    guard.mockResolvedValue({ ok: false, error: "Sign in", status: 401 } as never);
    const response = await POST(request("lesson-2"), { params: Promise.resolve({ lessonId: "lesson-1" }) });
    expect(response.status).toBe(401);
    expect(carry).not.toHaveBeenCalled();
  });
});
