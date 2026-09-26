import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/core/server/prisma";
import { getFlowerCollection } from "@/modules/motivation/services/flower-collection.service";
import { FLOWER_CHESTS } from "@/modules/motivation/utils/flower-chests";
import { flowerPhotoById } from "@/modules/motivation/utils/flower-photo";

jest.mock("@/core/server/prisma", () => ({ prisma: { experienceTransaction: { findMany: jest.fn() } } }));

describe("flower collection", () => {
  it("has a local, credited botanical image for every chest species", () => {
    for (const flower of FLOWER_CHESTS) {
      const photo = flowerPhotoById(flower.id);
      expect(photo).not.toBeNull();
      expect(photo?.source).toMatch(/^https:\/\/commons\.wikimedia\.org\//u);
      expect(photo?.license).toBeTruthy();
      expect(existsSync(path.join(process.cwd(), "public", photo!.src))).toBe(true);
    }
  });

  it("counts only a learner's immutable flower reward receipts", async () => {
    const findMany = prisma.experienceTransaction.findMany as jest.Mock;
    findMany.mockResolvedValue([
      { description: "Streak flower chest:x | flower:chamomile", createdAt: new Date("2026-09-20T12:00:00.000Z") },
      { description: "Streak flower chest:y | flower:chamomile", createdAt: new Date("2026-09-18T12:00:00.000Z") },
      { description: "Streak flower chest:z | flower:white-lily", createdAt: new Date("2026-09-17T12:00:00.000Z") },
    ]);

    const collection = await getFlowerCollection("student-1");
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "student-1", sourceType: { in: ["STREAK_CHEST", "MISTAKE_REVIEW_CHEST", "MISTAKE_ACHIEVEMENT"] }, amount: { gt: 0 }, description: { contains: "flower:" } },
    }));
    expect(collection.discovered).toBe(2);
    expect(collection.opened).toBe(3);
    expect(collection.flowers.find((flower) => flower.id === "chamomile")).toMatchObject({ count: 2, firstFoundAt: "2026-09-18T12:00:00.000Z" });
    expect(collection.flowers.find((flower) => flower.id === "white-lily")?.count).toBe(1);
  });
});
