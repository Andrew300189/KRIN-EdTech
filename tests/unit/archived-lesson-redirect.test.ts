jest.mock("@/core/server/prisma", () => ({
  prisma: {
    lesson: { findFirst: jest.fn() },
    courseModule: { findFirst: jest.fn() },
  },
}));

import { prisma } from "@/core/server/prisma";
import { replacementForArchivedBagLesson } from "@/modules/courses/services/archived-lesson-redirect.service";

const findArchived = prisma.lesson.findFirst as jest.Mock;
const findFirstModule = prisma.courseModule.findFirst as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("archived A bag of lesson links", () => {
  it("routes an archived lesson to the first published lesson", async () => {
    findArchived.mockResolvedValue({ id: "old-lesson" });
    findFirstModule.mockResolvedValue({ lessons: [{ slug: "a-bag-of-journey-01-01" }] });

    await expect(replacementForArchivedBagLesson("a-bag-of-food-vocabulary", "a-bag-of-story-01"))
      .resolves.toBe("a-bag-of-journey-01-01");
    expect(findArchived).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ slug: "a-bag-of-story-01", isPublished: false }),
    }));
  });

  it("leaves other courses and unknown lessons alone", async () => {
    await expect(replacementForArchivedBagLesson("a-can-of-vocabulary", "old"))
      .resolves.toBeNull();
    expect(findArchived).not.toHaveBeenCalled();

    findArchived.mockResolvedValue(null);
    await expect(replacementForArchivedBagLesson("a-bag-of-food-vocabulary", "wrong-slug"))
      .resolves.toBeNull();
    expect(findFirstModule).not.toHaveBeenCalled();
  });
});
