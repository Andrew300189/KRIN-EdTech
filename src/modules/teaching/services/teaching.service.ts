import { createHash, randomBytes } from "crypto";
import type { GroupStudentStatus } from "@/generated/prisma-client-payments-runtime";
import { prisma } from "@/core/server/prisma";
import { parseRole } from "@/core/utils/role";
import { hasCourseEntitlement } from "@/modules/payments/services/entitlement.service";

const ACTIVE_STUDENT = { in: ["ACTIVE", "INVITED", "PAUSED"] as GroupStudentStatus[] };

export async function teacherHasAccessToGroup(teacherId: string, groupId: string) {
  return Boolean(await prisma.learningGroup.findFirst({
    where: { id: groupId, OR: [{ teacherId }, { teachers: { some: { teacherId } } }] },
    select: { id: true },
  }));
}

export async function teacherHasAccessToStudent(teacherId: string, studentId: string) {
  return Boolean(await prisma.groupStudent.findFirst({
    where: {
      studentId,
      status: "ACTIVE",
      group: { OR: [{ teacherId }, { teachers: { some: { teacherId } } }] },
    },
    select: { id: true },
  }));
}

export async function teacherCanReviewSubmission(teacherId: string, submissionId: string) {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    select: { assignment: { select: { teacherId: true, groupId: true, studentId: true } }, studentId: true },
  });
  if (!submission) return false;
  if (submission.assignment.teacherId === teacherId) return true;
  if (submission.assignment.groupId) return teacherHasAccessToGroup(teacherId, submission.assignment.groupId);
  return teacherHasAccessToStudent(teacherId, submission.assignment.studentId ?? submission.studentId);
}

export async function createLearningGroup(teacherId: string, input: {
  name: string; description?: string; startDate?: Date | null; endDate?: Date | null;
  timeZone?: string; maxStudents?: number | null; activate?: boolean;
}) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) throw new Error("Group name must be between 2 and 120 characters.");
  if (input.maxStudents != null && (!Number.isInteger(input.maxStudents) || input.maxStudents < 1 || input.maxStudents > 10_000)) throw new Error("Invalid student limit.");
  if (input.startDate && input.endDate && input.endDate < input.startDate) throw new Error("End date must be after start date.");
  return prisma.$transaction(async (tx) => {
    const group = await tx.learningGroup.create({
      data: { name, description: input.description?.trim() || null, teacherId, status: input.activate ? "ACTIVE" : "DRAFT", startDate: input.startDate ?? null, endDate: input.endDate ?? null, timeZone: input.timeZone?.trim() || "UTC", maxStudents: input.maxStudents ?? null },
    });
    await tx.groupTeacher.create({ data: { groupId: group.id, teacherId, role: "OWNER" } });
    await tx.contentAuditLog.create({ data: { actorId: teacherId, action: "LEARNING_GROUP_CREATED", entityType: "LearningGroup", entityId: group.id } });
    return group;
  });
}

export async function listTeacherGroups(teacherId: string) {
  return prisma.learningGroup.findMany({
    where: { OR: [{ teacherId }, { teachers: { some: { teacherId } } }] },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, status: true, updatedAt: true, maxStudents: true, _count: { select: { students: { where: { status: ACTIVE_STUDENT } }, courseAssignments: { where: { status: "ACTIVE" } }, assignments: { where: { status: "ACTIVE" } } } } },
  });
}

export async function addStudentToGroup(teacherId: string, groupId: string, email: string) {
  if (!(await teacherHasAccessToGroup(teacherId, groupId))) throw new Error("Group not found.");
  const normalizedEmail = email.trim().toLowerCase();
  const [group, student] = await Promise.all([
    prisma.learningGroup.findUnique({ where: { id: groupId }, select: { maxStudents: true } }),
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, role: true, isBlocked: true, deletedAt: true } }),
  ]);
  if (!group || !student || student.isBlocked || student.deletedAt) throw new Error("Student account was not found.");
  // Instructors may join a learning group when explicitly added, but that does
  // not grant them the student workspace or any administrative permission.
  if (!["student", "teacher"].includes(parseRole(student.role))) throw new Error("This account cannot join a learning group.");
  const activeCount = await prisma.groupStudent.count({ where: { groupId, status: ACTIVE_STUDENT } });
  if (group.maxStudents && activeCount >= group.maxStudents) throw new Error("This group has reached its student limit.");
  return prisma.$transaction(async (tx) => {
    const member = await tx.groupStudent.upsert({
      where: { groupId_studentId: { groupId, studentId: student.id } },
      create: { groupId, studentId: student.id, status: "ACTIVE", joinedAt: new Date() },
      update: { status: "ACTIVE", joinedAt: new Date(), removedAt: null },
    });
    await tx.contentAuditLog.create({ data: { actorId: teacherId, action: "GROUP_STUDENT_ADDED", entityType: "GroupStudent", entityId: member.id, metadata: { groupId, studentId: student.id } } });
    return member;
  });
}

export async function createGroupInvitation(teacherId: string, groupId: string, email: string) {
  if (!(await teacherHasAccessToGroup(teacherId, groupId))) throw new Error("Group not found.");
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const student = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
  const invitation = await prisma.groupInvitation.create({ data: { groupId, email: email.trim().toLowerCase(), studentId: student?.id, tokenHash, invitedById: teacherId, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
  return { invitation, token };
}

async function addStudentCourse(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], input: { studentId: string; courseId: string; sourceType: "FREE_ENROLLMENT" | "TEACHER_ASSIGNED" | "GROUP_ASSIGNED"; sourceId: string }) {
  const sourceKey = `${input.studentId}:${input.courseId}:${input.sourceType}:${input.sourceId}`;
  return tx.studentCourse.upsert({ where: { sourceKey }, create: { ...input, sourceKey }, update: { status: "ACTIVE", archivedAt: null } });
}

export async function addCourseToStudentLibrary(studentId: string, courseId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { role: true } });
  if (!student || parseRole(student.role) !== "student") throw new Error("Student role required.");
  const course = await prisma.course.findFirst({ where: { id: courseId, isPublished: true, level: { isPublished: true }, category: { isPublished: true } }, select: { id: true, accessPlan: true } });
  if (!course) throw new Error("Course not found.");
  const hasAccess = course.accessPlan === "FREE" || await hasCourseEntitlement(studentId, course.id);
  if (!hasAccess) throw new Error("Course access is required before adding it to your library.");
  return prisma.$transaction((tx) => addStudentCourse(tx, { studentId, courseId, sourceType: "FREE_ENROLLMENT", sourceId: "self" }));
}

export async function assignCourseToGroup(teacherId: string, groupId: string, courseId: string, input: { deadlineAt?: Date | null; required?: boolean } = {}) {
  if (!(await teacherHasAccessToGroup(teacherId, groupId))) throw new Error("Group not found.");
  const course = await prisma.course.findFirst({ where: { id: courseId, isPublished: true }, select: { id: true, accessPlan: true } });
  if (!course) throw new Error("Published course not found.");
  if (course.accessPlan !== "FREE") throw new Error("This paid course requires a license or subscription for each student.");
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.groupCourseAssignment.upsert({ where: { groupId_courseId: { groupId, courseId } }, create: { groupId, courseId, assignedById: teacherId, status: "ACTIVE", deadlineAt: input.deadlineAt ?? null, required: input.required ?? true }, update: { status: "ACTIVE", deadlineAt: input.deadlineAt ?? null, required: input.required ?? true } });
    const members = await tx.groupStudent.findMany({ where: { groupId, status: "ACTIVE" }, select: { studentId: true } });
    await Promise.all(members.map((member) => addStudentCourse(tx, { studentId: member.studentId, courseId, sourceType: "GROUP_ASSIGNED", sourceId: assignment.id })));
    await tx.contentAuditLog.create({ data: { actorId: teacherId, action: "GROUP_COURSE_ASSIGNED", entityType: "GroupCourseAssignment", entityId: assignment.id } });
    return assignment;
  });
}

export async function createAssignment(teacherId: string, input: { title: string; description?: string; type: "LESSON" | "EXERCISE_SET" | "WRITTEN" | "FILE_UPLOAD" | "VOCABULARY" | "CUSTOM"; groupId?: string; studentId?: string; courseId?: string; lessonId?: string; dueAt?: Date | null; maxScore?: number; attemptsAllowed?: number; publish?: boolean }) {
  if (!input.groupId && !input.studentId) throw new Error("Choose a group or a student.");
  if (input.groupId && !(await teacherHasAccessToGroup(teacherId, input.groupId))) throw new Error("Group not found.");
  if (input.studentId && !(await teacherHasAccessToStudent(teacherId, input.studentId))) throw new Error("Student not found.");
  const maxScore = input.maxScore ?? 100;
  if (!Number.isInteger(maxScore) || maxScore < 0 || maxScore > 100_000) throw new Error("Invalid maximum score.");
  const attemptsAllowed = input.attemptsAllowed ?? 1;
  if (!Number.isInteger(attemptsAllowed) || attemptsAllowed < 1 || attemptsAllowed > 100) throw new Error("Invalid attempts limit.");
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.assignment.create({ data: { teacherId, groupId: input.groupId, studentId: input.studentId, courseId: input.courseId, lessonId: input.lessonId, title: input.title.trim(), description: input.description?.trim() || null, type: input.type, status: input.publish ? "ACTIVE" : "DRAFT", dueAt: input.dueAt ?? null, maxScore, attemptsAllowed } });
    const recipients = input.studentId ? [input.studentId] : (await tx.groupStudent.findMany({ where: { groupId: input.groupId!, status: "ACTIVE" }, select: { studentId: true } })).map((member) => member.studentId);
    if (input.publish) await Promise.all(recipients.map((studentId) => tx.assignmentSubmission.upsert({ where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } }, create: { assignmentId: assignment.id, studentId }, update: {} })));
    await tx.contentAuditLog.create({ data: { actorId: teacherId, action: "ASSIGNMENT_CREATED", entityType: "Assignment", entityId: assignment.id } });
    return assignment;
  });
}

export async function reviewSubmission(teacherId: string, submissionId: string, input: { score?: number; feedback?: string; needsRevision?: boolean }) {
  if (!(await teacherCanReviewSubmission(teacherId, submissionId))) throw new Error("Submission not found.");
  const submission = await prisma.assignmentSubmission.findUnique({ where: { id: submissionId }, include: { assignment: { select: { maxScore: true } } } });
  if (!submission) throw new Error("Submission not found.");
  if (!input.needsRevision && (input.score == null || !Number.isInteger(input.score) || input.score < 0 || input.score > submission.assignment.maxScore)) throw new Error("Score must be within the assignment range.");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.assignmentSubmission.update({ where: { id: submissionId }, data: { status: input.needsRevision ? "NEEDS_REVISION" : "GRADED", score: input.needsRevision ? null : input.score, teacherScore: input.needsRevision ? null : input.score, feedback: input.feedback?.trim() || null, reviewedById: teacherId, reviewedAt: new Date() } });
    await tx.contentAuditLog.create({ data: { actorId: teacherId, action: input.needsRevision ? "ASSIGNMENT_RETURNED" : "ASSIGNMENT_GRADED", entityType: "AssignmentSubmission", entityId: updated.id } });
    return updated;
  });
}
