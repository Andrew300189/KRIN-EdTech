import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/core/server/prisma";
import { getDashboardLeaderboard, listPublicLeaderboard } from "@/modules/motivation/services/motivation.service";

jest.mock("@/core/server/prisma", () => ({ prisma: { user: { findMany: jest.fn() } } }));

const learners = [
  { id: "learner-a", name: "Avery", firstName: null, username: "avery", showInLeaderboard: true, showPublicProfile: true, createdAt: new Date("2026-01-01"), userLevelProgress: { level: 5, lifetimeExperience: 20, fractionalExperience: 0, leaderboardExperienceMinor: 500000 } },
  { id: "learner-b", name: "Blair", firstName: null, username: "blair", showInLeaderboard: false, showPublicProfile: false, createdAt: new Date("2026-01-02"), userLevelProgress: { level: 6, lifetimeExperience: 10, fractionalExperience: 0, leaderboardExperienceMinor: 700000 } },
  { id: "learner-c", name: "Casey", firstName: null, username: "casey", showInLeaderboard: true, showPublicProfile: true, createdAt: new Date("2026-01-03"), userLevelProgress: { level: 4, lifetimeExperience: 30, fractionalExperience: 0, leaderboardExperienceMinor: 200000 } },
];

describe("verified learning leaderboard", () => {
  beforeEach(() => (prisma.user.findMany as jest.Mock).mockResolvedValue(learners));

  it("uses the same student-only ranks on the dashboard and public page", async () => {
    const dashboard = await getDashboardLeaderboard("learner-a", 3);
    const publicRows = await listPublicLeaderboard(3);

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ role: "STUDENT", isBlocked: false, deletedAt: null }) }));
    expect(dashboard.current).toMatchObject({ rank: 2, totalMinor: 500000, experienceMinor: 2000 });
    expect(dashboard.entries[0]).toMatchObject({ rank: 1, displayName: null, totalMinor: null });
    expect(publicRows).toMatchObject([{ rank: 2, displayName: "Avery", experience: 5000 }, { rank: 3, displayName: "Casey", experience: 2000 }]);
  });

  it("repairs old scores and ranks matching exercises without counting purchases", () => {
    const sql = readFileSync(join(process.cwd(), "database/prisma/migrations/20261002130000_rebuild_verified_learning_ranking/migration.sql"), "utf8");
    const [rebuild, trigger] = sql.split('CREATE OR REPLACE FUNCTION "incrementLeaderboardExperienceOnReward"()');
    for (const section of [rebuild, trigger]) {
      expect(section).toContain("'DYNAMIC_MATCHING_PAIR'");
      expect(section).toContain("'STREAK_QUEST_BOOK'");
      expect(section).not.toContain("'SHOP_XP_BOOST'");
      expect(section).not.toContain("'LESSON_XP_MULTIPLIER'");
    }
    expect(rebuild).toContain('LEFT JOIN "ExperienceTransaction" AS xp');
    expect(rebuild).not.toContain('level."leaderboardExperienceMinor"::bigint -');
  });
});
