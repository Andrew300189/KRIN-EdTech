import { z } from "zod";
import type { Prisma } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";

const MIN_TEAM_MEMBERS = 2;
const DEFAULT_TEAM_MEMBERS = 8;
const MAX_TEAM_MEMBERS = 12;

const createPlayerTeamSchema = z.object({
  name: z.string().trim().min(2, "Enter a team name with at least 2 characters.").max(48, "A team name can contain up to 48 characters."),
  description: z.string().trim().max(240, "A team description can contain up to 240 characters.").optional().or(z.literal("")),
  maxMembers: z.number().int().min(MIN_TEAM_MEMBERS).max(MAX_TEAM_MEMBERS).optional(),
});

const invitePlayerSchema = z.object({
  username: z.string().trim().min(2, "Enter the player username.").max(64, "Enter a valid player username."),
});

const responseSchema = z.object({ action: z.enum(["accept", "decline"]) });

const memberUserSelect = {
  id: true,
  username: true,
  name: true,
  avatar: true,
  avatarDisplayMode: true,
  equippedShopAvatar: true,
} as const;

const teamInclude = {
  owner: { select: memberUserSelect },
  members: {
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: { user: { select: memberUserSelect } },
  },
} satisfies Prisma.PlayerTeamInclude;

type TeamWithMembers = Prisma.PlayerTeamGetPayload<{ include: typeof teamInclude }>;

async function activeMemberCount(teamId: string) {
  return prisma.playerTeamMember.count({ where: { teamId, status: "ACTIVE" } });
}

async function ownerTeam(teamId: string, ownerId: string) {
  const team = await prisma.playerTeam.findFirst({
    where: { id: teamId, ownerId },
    select: { id: true, maxMembers: true },
  });
  if (!team) throw new Error("This team is unavailable or you do not manage it.");
  return team;
}

function serializeTeam(team: TeamWithMembers, currentUserId: string) {
  const currentMembership = team.members.find((member) => member.userId === currentUserId) ?? null;
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    maxMembers: team.maxMembers,
    ownerId: team.ownerId,
    owner: team.owner,
    createdAt: team.createdAt.toISOString(),
    currentMembership: currentMembership ? {
      role: currentMembership.role,
      status: currentMembership.status,
    } : null,
    members: team.members.map((member) => ({
      id: member.id,
      role: member.role,
      status: member.status,
      joinedAt: member.joinedAt?.toISOString() ?? null,
      user: member.user,
    })),
  };
}

/** Active teams plus invitations are deliberately fetched from memberships,
 * which prevents a learner from enumerating unrelated players or teams. */
export async function getPlayerTeams(userId: string) {
  const memberships = await prisma.playerTeamMember.findMany({
    where: { userId, status: { in: ["ACTIVE", "PENDING"] } },
    orderBy: { updatedAt: "desc" },
    include: { team: { include: teamInclude } },
  });

  const activeTeams = memberships
    .filter((membership) => membership.status === "ACTIVE")
    .map((membership) => serializeTeam(membership.team, userId));
  const invitations = memberships
    .filter((membership) => membership.status === "PENDING")
    .map((membership) => serializeTeam(membership.team, userId));

  return { teams: activeTeams, invitations };
}

export async function createPlayerTeam(userId: string, input: unknown) {
  const value = createPlayerTeamSchema.parse(input);
  const now = new Date();
  const team = await prisma.playerTeam.create({
    data: {
      name: value.name,
      description: value.description?.trim() || null,
      ownerId: userId,
      maxMembers: value.maxMembers ?? DEFAULT_TEAM_MEMBERS,
      members: {
        create: {
          userId,
          role: "OWNER",
          status: "ACTIVE",
          joinedAt: now,
          respondedAt: now,
        },
      },
    },
    include: teamInclude,
  });
  return serializeTeam(team, userId);
}

export async function invitePlayerToTeam(ownerId: string, teamId: string, input: unknown) {
  const value = invitePlayerSchema.parse(input);
  const team = await ownerTeam(teamId, ownerId);
  const target = await prisma.user.findFirst({
    where: {
      username: { equals: value.username.replace(/^@/, ""), mode: "insensitive" },
      role: "STUDENT",
      isBlocked: false,
      deletedAt: null,
    },
    select: { id: true, username: true, name: true },
  });
  if (!target) throw new Error("No active student was found with that username.");
  if (target.id === ownerId) throw new Error("You are already the team owner.");

  const [existing, memberCount] = await Promise.all([
    prisma.playerTeamMember.findUnique({ where: { teamId_userId: { teamId, userId: target.id } } }),
    activeMemberCount(team.id),
  ]);
  if (existing?.status === "ACTIVE") throw new Error("This player is already in the team.");
  if (existing?.status === "PENDING") throw new Error("This player already has a pending invitation.");
  if (memberCount >= team.maxMembers) throw new Error("This team is already full.");

  const now = new Date();
  await prisma.playerTeamMember.upsert({
    where: { teamId_userId: { teamId, userId: target.id } },
    create: { teamId, userId: target.id, role: "MEMBER", status: "PENDING" },
    update: { role: "MEMBER", status: "PENDING", joinedAt: null, respondedAt: now },
  });
  return { invited: { username: target.username, name: target.name } };
}

export async function respondToPlayerTeamInvitation(userId: string, teamId: string, input: unknown) {
  const value = responseSchema.parse(input);
  const invitation = await prisma.playerTeamMember.findFirst({
    where: { teamId, userId, status: "PENDING" },
    include: { team: { select: { id: true, maxMembers: true } } },
  });
  if (!invitation) throw new Error("This team invitation is no longer available.");

  if (value.action === "decline") {
    await prisma.playerTeamMember.update({
      where: { id: invitation.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    return { status: "DECLINED" as const };
  }

  const team = invitation.team;
  const accepted = await prisma.$transaction(async (tx) => {
    const memberCount = await tx.playerTeamMember.count({ where: { teamId, status: "ACTIVE" } });
    if (memberCount >= team.maxMembers) throw new Error("This team filled up before you accepted the invitation.");
    return tx.playerTeamMember.update({
      where: { id: invitation.id },
      data: { status: "ACTIVE", joinedAt: new Date(), respondedAt: new Date() },
    });
  });
  return { status: accepted.status };
}

export async function removePlayerFromTeam(ownerId: string, teamId: string, memberUserId: string) {
  if (!memberUserId || memberUserId === ownerId) throw new Error("The team owner cannot be removed.");
  await ownerTeam(teamId, ownerId);
  const membership = await prisma.playerTeamMember.findFirst({
    where: { teamId, userId: memberUserId, role: "MEMBER", status: { in: ["ACTIVE", "PENDING"] } },
    select: { id: true },
  });
  if (!membership) throw new Error("This player is no longer in the team.");
  await prisma.playerTeamMember.update({
    where: { id: membership.id },
    data: { status: "REMOVED", respondedAt: new Date() },
  });
  return { removed: true };
}

export async function leavePlayerTeam(userId: string, teamId: string) {
  const membership = await prisma.playerTeamMember.findFirst({
    where: { teamId, userId, role: "MEMBER", status: "ACTIVE" },
    select: { id: true },
  });
  if (!membership) throw new Error("You are not an active member of this team.");
  await prisma.playerTeamMember.update({
    where: { id: membership.id },
    data: { status: "REMOVED", respondedAt: new Date() },
  });
  return { left: true };
}
