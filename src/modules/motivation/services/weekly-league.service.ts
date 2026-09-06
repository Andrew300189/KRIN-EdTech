import { prisma } from "@/core/server/prisma";

export type LeagueTier = "BRONZE" | "SILVER" | "DIAMOND";

type LeaguePlayer = {
  userId: string;
  displayName: string;
  weeklyExperienceMinor: number;
  globalRank: number;
  isCurrentUser: boolean;
};

export type WeeklyLeague = {
  tier: LeagueTier;
  groupNumber: number;
  weekStart: string;
  members: LeaguePlayer[];
  current: LeaguePlayer;
  movement: "PROMOTION" | "SAFE" | "RISK" | "PODIUM";
};

const LEAGUE_GROUP_SIZE = 30;

function weekStartUtc(date = new Date()) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
  return value;
}

function displayName(user: { name: string; firstName: string | null }) {
  return user.firstName?.trim() || user.name.trim().split(/\s+/)[0] || "Learner";
}

function tierForRank(rank: number, participantCount: number): LeagueTier {
  const diamondSize = Math.max(3, Math.ceil(participantCount * .10));
  const silverSize = Math.max(6, Math.ceil(participantCount * .25));
  if (rank <= diamondSize) return "DIAMOND";
  if (rank <= diamondSize + silverSize) return "SILVER";
  return "BRONZE";
}

/**
 * Produces a live weekly XP league without trusting browser counters. Every
 * current participant is placed in a 30-person room; league tiers are
 * recalculated from the server's weekly reward ledger, so no mutable client
 * state can push a learner into a higher league.
 */
export async function getWeeklyLeague(userId: string, now = new Date()): Promise<WeeklyLeague> {
  const start = weekStartUtc(now);
  const [users, rewards] = await Promise.all([
    prisma.user.findMany({
      where: { isBlocked: false, deletedAt: null, OR: [{ showInLeaderboard: true }, { id: userId }] },
      select: { id: true, name: true, firstName: true },
    }),
    prisma.experienceTransaction.findMany({
      where: { createdAt: { gte: start }, amount: { gt: 0 } },
      select: { userId: true, amount: true, amountMinor: true },
    }),
  ]);
  const scores = new Map<string, number>();
  for (const reward of rewards) {
    scores.set(reward.userId, (scores.get(reward.userId) ?? 0) + (reward.amountMinor ?? reward.amount * 100));
  }
  const participants = users
    .filter((user) => (scores.get(user.id) ?? 0) > 0 || user.id === userId)
    .map((user) => ({ userId: user.id, displayName: displayName(user), weeklyExperienceMinor: scores.get(user.id) ?? 0 }))
    .sort((left, right) => right.weeklyExperienceMinor - left.weeklyExperienceMinor || left.userId.localeCompare(right.userId))
    .map((player, index) => ({ ...player, globalRank: index + 1, isCurrentUser: player.userId === userId }));

  const current = participants.find((player) => player.userId === userId);
  if (!current) throw new Error("League participant not found");
  const tier = tierForRank(current.globalRank, participants.length);
  const tierPlayers = participants.filter((player) => tierForRank(player.globalRank, participants.length) === tier);
  const tierRank = tierPlayers.findIndex((player) => player.userId === userId);
  const groupIndex = Math.max(0, Math.floor(tierRank / LEAGUE_GROUP_SIZE));
  const members = tierPlayers.slice(groupIndex * LEAGUE_GROUP_SIZE, groupIndex * LEAGUE_GROUP_SIZE + LEAGUE_GROUP_SIZE);
  const groupRank = members.findIndex((player) => player.userId === userId) + 1;
  const movement = groupRank <= 3
    ? tier === "DIAMOND" ? "PODIUM" : "PROMOTION"
    : groupRank > Math.max(3, members.length - 3) && tier !== "BRONZE" ? "RISK"
      : "SAFE";

  return { tier, groupNumber: groupIndex + 1, weekStart: start.toISOString().slice(0, 10), members, current, movement };
}
