-- CreateEnum
CREATE TYPE "TeacherProfileStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LearningGroupStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GroupTeacherRole" AS ENUM ('OWNER', 'TEACHER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "GroupStudentStatus" AS ENUM ('INVITED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REMOVED');

-- CreateEnum
CREATE TYPE "GroupInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CourseAssignmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "StudentCourseSource" AS ENUM ('SELF_ADDED', 'PURCHASED', 'SUBSCRIPTION', 'TEACHER_ASSIGNED', 'GROUP_ASSIGNED', 'ADMIN_GRANTED', 'FREE_ENROLLMENT');

-- CreateEnum
CREATE TYPE "StudentCourseStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('LESSON', 'EXERCISE_SET', 'WRITTEN', 'FILE_UPLOAD', 'VOCABULARY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentSubmissionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'LATE', 'UNDER_REVIEW', 'NEEDS_REVISION', 'GRADED', 'RETURNED');

-- CreateEnum
CREATE TYPE "TeacherNoteVisibility" AS ENUM ('PRIVATE', 'VISIBLE_TO_STUDENT', 'VISIBLE_TO_TEACHERS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'STUDENT_INVITED_TO_GROUP';
ALTER TYPE "NotificationType" ADD VALUE 'STUDENT_JOINED_GROUP';
ALTER TYPE "NotificationType" ADD VALUE 'COURSE_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'ASSIGNMENT_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'ASSIGNMENT_DEADLINE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'ASSIGNMENT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'ASSIGNMENT_GRADED';
ALTER TYPE "NotificationType" ADD VALUE 'ASSIGNMENT_NEEDS_REVISION';
ALTER TYPE "NotificationType" ADD VALUE 'TEACHER_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'GROUP_ANNOUNCEMENT';

-- AlterTable
ALTER TABLE "WarmUpConfiguration" ALTER COLUMN "id" SET DEFAULT 'default';

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "specialization" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceYears" INTEGER,
    "status" "TeacherProfileStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "teacherId" TEXT NOT NULL,
    "status" "LearningGroupStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "maxStudents" INTEGER,
    "inviteCode" TEXT,
    "inviteCodeExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupTeacher" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "role" "GroupTeacherRole" NOT NULL DEFAULT 'TEACHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupStudent" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "GroupStudentStatus" NOT NULL DEFAULT 'INVITED',
    "joinedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupInvitation" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "studentId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "GroupInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupCourseAssignment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "status" "CourseAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupCourseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCourseAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT,
    "courseId" TEXT NOT NULL,
    "status" "CourseAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "reason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCourseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCourse" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sourceType" "StudentCourseSource" NOT NULL,
    "sourceId" TEXT,
    "sourceKey" TEXT NOT NULL,
    "status" "StudentCourseStatus" NOT NULL DEFAULT 'ACTIVE',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT,
    "studentId" TEXT,
    "courseId" TEXT,
    "lessonId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "AssignmentType" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "attemptsAllowed" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AssignmentSubmissionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "content" JSONB,
    "submittedAt" TIMESTAMP(3),
    "score" INTEGER,
    "autoScore" INTEGER,
    "teacherScore" INTEGER,
    "feedback" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherStudentNote" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "groupId" TEXT,
    "content" TEXT NOT NULL,
    "visibility" "TeacherNoteVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherStudentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentReviewMaterial" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT,
    "groupId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT,
    "storageKey" TEXT,
    "codeExample" TEXT,
    "content" TEXT,
    "visibleFrom" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentReviewMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE INDEX "TeacherProfile_status_idx" ON "TeacherProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LearningGroup_inviteCode_key" ON "LearningGroup"("inviteCode");

-- CreateIndex
CREATE INDEX "LearningGroup_teacherId_status_idx" ON "LearningGroup"("teacherId", "status");

-- CreateIndex
CREATE INDEX "LearningGroup_status_updatedAt_idx" ON "LearningGroup"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "GroupTeacher_teacherId_groupId_idx" ON "GroupTeacher"("teacherId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupTeacher_groupId_teacherId_key" ON "GroupTeacher"("groupId", "teacherId");

-- CreateIndex
CREATE INDEX "GroupStudent_groupId_status_idx" ON "GroupStudent"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupStudent_studentId_status_idx" ON "GroupStudent"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GroupStudent_groupId_studentId_key" ON "GroupStudent"("groupId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvitation_tokenHash_key" ON "GroupInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "GroupInvitation_groupId_status_idx" ON "GroupInvitation"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupInvitation_email_status_idx" ON "GroupInvitation"("email", "status");

-- CreateIndex
CREATE INDEX "GroupCourseAssignment_groupId_status_idx" ON "GroupCourseAssignment"("groupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GroupCourseAssignment_groupId_courseId_key" ON "GroupCourseAssignment"("groupId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCourseAssignment_idempotencyKey_key" ON "StudentCourseAssignment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StudentCourseAssignment_studentId_status_idx" ON "StudentCourseAssignment"("studentId", "status");

-- CreateIndex
CREATE INDEX "StudentCourseAssignment_groupId_status_idx" ON "StudentCourseAssignment"("groupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCourse_sourceKey_key" ON "StudentCourse"("sourceKey");

-- CreateIndex
CREATE INDEX "StudentCourse_studentId_status_idx" ON "StudentCourse"("studentId", "status");

-- CreateIndex
CREATE INDEX "StudentCourse_studentId_courseId_idx" ON "StudentCourse"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "Assignment_groupId_dueAt_idx" ON "Assignment"("groupId", "dueAt");

-- CreateIndex
CREATE INDEX "Assignment_studentId_dueAt_idx" ON "Assignment"("studentId", "dueAt");

-- CreateIndex
CREATE INDEX "Assignment_teacherId_status_idx" ON "Assignment"("teacherId", "status");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_assignmentId_status_idx" ON "AssignmentSubmission"("assignmentId", "status");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_studentId_status_idx" ON "AssignmentSubmission"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_studentId_key" ON "AssignmentSubmission"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "TeacherStudentNote_teacherId_studentId_createdAt_idx" ON "TeacherStudentNote"("teacherId", "studentId", "createdAt");

-- CreateIndex
CREATE INDEX "TeacherStudentNote_studentId_visibility_idx" ON "TeacherStudentNote"("studentId", "visibility");

-- CreateIndex
CREATE INDEX "AssignmentReviewMaterial_assignmentId_visibleFrom_idx" ON "AssignmentReviewMaterial"("assignmentId", "visibleFrom");

-- CreateIndex
CREATE INDEX "AssignmentReviewMaterial_groupId_visibleFrom_idx" ON "AssignmentReviewMaterial"("groupId", "visibleFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_sourcePaymentId_key" ON "Subscription"("sourcePaymentId");

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningGroup" ADD CONSTRAINT "LearningGroup_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTeacher" ADD CONSTRAINT "GroupTeacher_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTeacher" ADD CONSTRAINT "GroupTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupStudent" ADD CONSTRAINT "GroupStudent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupStudent" ADD CONSTRAINT "GroupStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCourseAssignment" ADD CONSTRAINT "GroupCourseAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCourseAssignment" ADD CONSTRAINT "GroupCourseAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupCourseAssignment" ADD CONSTRAINT "GroupCourseAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCourseAssignment" ADD CONSTRAINT "StudentCourseAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCourseAssignment" ADD CONSTRAINT "StudentCourseAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCourseAssignment" ADD CONSTRAINT "StudentCourseAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCourseAssignment" ADD CONSTRAINT "StudentCourseAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCourse" ADD CONSTRAINT "StudentCourse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCourse" ADD CONSTRAINT "StudentCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentNote" ADD CONSTRAINT "TeacherStudentNote_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentNote" ADD CONSTRAINT "TeacherStudentNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherStudentNote" ADD CONSTRAINT "TeacherStudentNote_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentReviewMaterial" ADD CONSTRAINT "AssignmentReviewMaterial_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentReviewMaterial" ADD CONSTRAINT "AssignmentReviewMaterial_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LearningGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentReviewMaterial" ADD CONSTRAINT "AssignmentReviewMaterial_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Entitlement_source_unique" RENAME TO "Entitlement_userId_type_sourceType_sourceId_courseId_module_key";
