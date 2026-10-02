import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/core/server/prisma";
import { getDashboardLeaderboard, listPublicLeaderboard } from "@/modules/motivation/services/motivation.service";

jest.mock("@/core/server/prisma", () => ({ prisma: { user: { findMany: jest.fn() } } }));

const learners = [
  { id: "learner-a", name: "Avery", firstName: null, username: "avery", showInLeaderboard: true, showPublicProfile: true, createdAt: new Date("2026-01-01"), userLevelProgress: { level: 5, lifetimeExperience: 1733, fractionalExperience: 0, leaderboardExperienceMinor: 524700 } },
  { id: "learner-b", name: "Blair", firstName: null, username: "blair", showInLeaderboard: false, showPublicProfile: false, createdAt: new Date("2026-01-02"), userLevelProgress: { level: 6, lifetimeExperience: 10, fractionalExperience: 0, leaderboardExperienceMinor: 700000 } },
  { id: "learner-c", name: "Casey", firstName: null, username: "casey", showInLeaderboard: true, showPublicProfile: true, createdAt: new Date("2026-01-03"), userLevelProgress: { level: 4, lifetimeExperience: 9349, fractionalExperience: 0, leaderboardExperienceMinor: 934900 } },
];

describe("all awarded XP leaderboard", () => {
  beforeEach(() => (prisma.user.findMany as jest.Mock).mockResolvedValue(learners));

  it("uses the same student-only ranks on the dashboard and public page", async () => {
    const dashboard = await getDashboardLeaderboard("learner-a", 3);
    const publicRows = await listPublicLeaderboard(3);

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ role: "STUDENT", isBlocked: false, deletedAt: null }) }));
    expect(dashboard.current).toMatchObject({ rank: 3, totalMinor: 524700, experienceMinor: 173300 });
    expect(dashboard.entries[1]).toMatchObject({ rank: 2, displayName: null, totalMinor: null });
    expect(publicRows).toMatchObject([{ rank: 1, displayName: "Casey", experience: 9349 }, { rank: 3, displayName: "Avery", experience: 5247 }]);
  });

  it("restores every positive XP source, including chests, wheels and boosts, without counting coins or XP spent", () => {
    const sql = readFileSync(join(process.cwd(), "database/prisma/migrations/20261002180000_rank_all_awarded_xp/migration.sql"), "utf8");
    const [rebuild, trigger] = sql.split('CREATE OR REPLACE FUNCTION "incrementLeaderboardExperienceOnReward"()');
    expect(rebuild).toContain('SUM(GREATEST(0::bigint, COALESCE(xp."amountMinor"::bigint, xp."amount"::bigint * 100)))');
    expect(rebuild).toContain('LEFT JOIN "ExperienceTransaction" AS xp');
    expect(rebuild).not.toContain('xp."sourceType"');
    expect(trigger).toContain('IF earned_minor > 0 THEN');
    expect(trigger).not.toContain('NEW."sourceType"');
    expect(sql).not.toContain('FROM "CoinTransaction"');
  });
});
