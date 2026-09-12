-- Learner-owned social teams are deliberately independent from teacher-managed
-- LearningGroup records. Membership carries no education-management rights.
CREATE TYPE "PlayerTeamRole" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "PlayerTeamMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'REMOVED');

CREATE TABLE "PlayerTeam" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ownerId" TEXT NOT NULL,
  "maxMembers" INTEGER NOT NULL DEFAULT 8,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerTeamMember" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "PlayerTeamRole" NOT NULL DEFAULT 'MEMBER',
  "status" "PlayerTeamMemberStatus" NOT NULL DEFAULT 'PENDING',
  "joinedAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlayerTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerTeamMember_teamId_userId_key" ON "PlayerTeamMember"("teamId", "userId");
CREATE INDEX "PlayerTeam_ownerId_createdAt_idx" ON "PlayerTeam"("ownerId", "createdAt");
CREATE INDEX "PlayerTeamMember_teamId_status_idx" ON "PlayerTeamMember"("teamId", "status");
CREATE INDEX "PlayerTeamMember_userId_status_idx" ON "PlayerTeamMember"("userId", "status");

ALTER TABLE "PlayerTeam" ADD CONSTRAINT "PlayerTeam_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerTeamMember" ADD CONSTRAINT "PlayerTeamMember_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "PlayerTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerTeamMember" ADD CONSTRAINT "PlayerTeamMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
