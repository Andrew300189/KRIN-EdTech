import { createHash, randomBytes } from "crypto";
import type { GroupStudentStatus } from "@/generated/prisma-client-payments-runtime";
import { normalizeEmail } from "@/core/server/platform-owner";
import { prisma } from "@/core/server/prisma";
import { parseRole } from "@/core/utils/role";
import { hasCourseEntitlement } from "@/modules/payments/services/entitlement.service";
import { notificationService } from "@/modules/communications/services/notification.service";

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

export async function getTeacherProfile(teacherId: string) {
  return prisma.teacherProfile.upsert({ where: { userId: teacherId }, update: {}, create: { userId: teacherId }, select: { displayName: true, bio: true, specialization: true, languages: true, experienceYears: true, status: true } });
}

export async function updateTeacherProfile(teacherId: string, input: { displayName?: string; bio?: string; specialization?: string; languages?: string[]; experienceYears?: number | null }) {
  const clean = (value: string | undefined, max: number) => value === undefined ? undefined : value.trim().slice(0, max) || null;
  if (input.experienceYears != null && (!Number.isInteger(input.experienceYears) || input.experienceYears < 0 || input.experienceYears > 80)) throw new Error("Invalid experience value.");
  const languages = input.languages?.map((language) => language.trim().slice(0, 40)).filter(Boolean).slice(0, 12);
  return prisma.teacherProfile.upsert({ where: { userId: teacherId }, create: { userId: teacherId, displayName: clean(input.displayName, 120) ?? null, bio: clean(input.bio, 4_000) ?? null, specialization: clean(input.specialization, 160) ?? null, languages: languages ?? [], experienceYears: input.experienceYears ?? null }, update: { ...(input.displayName !== undefined ? { displayName: clean(input.displayName, 120) } : {}), ...(input.bio !== undefined ? { bio: clean(input.bio, 4_000) } : {}), ...(input.specialization !== undefined ? { specialization: clean(input.specialization, 160) } : {}), ...(languages !== undefined ? { languages } : {}), ...(input.experienceYears !== undefined ? { experienceYears: input.experienceYears } : {}) }, select: { displayName: true, bio: true, specialization: true, languages: true, experienceYears: true, status: true } });
}

export async function listTeacherStudents(teacherId: string) {
  return prisma.groupStudent.findMany({
    where: { status: { in: ["ACTIVE", "INVITED", "PAUSED"] }, group: { OR: [{ teacherId }, { teachers: { some: { teacherId } } }] } },
    orderBy: { updatedAt: "desc" },
    include: { student: { select: { id: true, name: true, email: true, avatar: true } }, group: { select: { id: true, name: true } } },
  });
}

export async function addStudentToGroup(teacherId: string, groupId: string, email: string) {
  if (!(await teacherHasAccessToGroup(teacherId, groupId))) throw new Error("Group not found.");
  const normalizedEmail = normalizeEmail(email);
  const [group, student] = await Promise.all([
    prisma.learningGroup.findUnique({ where: { id: groupId }, select: { maxStudents: true } }),
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, role: true, isBlocked: true, deletedAt: true } }),
  ]);
  if (!group || !student || student.isBlocked || student.deletedAt) throw new Error("Student account was not found.");
  // Instructors may join a learning group when explicitly added, but that does
  // not grant them the student workspace or any administrative permission.
  if (!["student", "teacher"].includes(parseRole(student.role))) throw new Error("This account cannot join a learning group.");
  const existingMember = await prisma.groupStudent.findUnique({ where: { groupId_studentId: { groupId, studentId: student.id } }, select: { status: true } });
  const activeCount = await prisma.groupStudent.count({ where: { groupId, status: ACTIVE_STUDENT } });
  if ((!existingMember || existingMember.status === "REMOVED") && group.maxStudents && activeCount >= group.maxStudents) throw new Error("This group has reached its student limit.");
  const member = await prisma.$transaction(async (tx) => {
    const member = await tx.groupStudent.upsert({
      where: { groupId_studentId: { groupId, studentId: student.id } },
      create: { groupId, studentId: student.id, status: "ACTIVE", joinedAt: new Date() },
      update: { status: "ACTIVE", joinedAt: new Date(), removedAt: null },
    });
    const activeAssignments = await tx.assignment.findMany({
      where: { groupId, status: "ACTIVE" },
      select: { id: true },
    });
    await Promise.all(activeAssignments.map((assignment) => tx.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
      create: { assignmentId: assignment.id, studentId: student.id },
      update: {},
    })));
    await tx.contentAuditLog.create({ data: { actorId: teacherId, action: "GROUP_STUDENT_ADDED", entityType: "GroupStudent", entityId: member.id, metadata: { groupId, studentId: student.id } } });
    return member;
  });
  await notifySafely({
    userId: student.id,
    type: "STUDENT_JOINED_GROUP",
    idempotencyKey: `group-member-added:${member.id}`,
    entityType: "LearningGroup",
    entityId: groupId,
    title: "You were added to a learning group",
    message: "A teacher added you to a learning group.",
    actionUrl: "/student/homework",
    actionLabel: "Open learning space",
  });
  return member;
}

export async function createGroupInvitation(teacherId: string, groupId: string, email: string) {
  if (!(await teacherHasAccessToGroup(teacherId, groupId))) throw new Error("Group not found.");
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const normalizedEmail = normalizeEmail(email);
  const student = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  const invitation = await prisma.groupInvitation.create({ data: { groupId, email: normalizedEmail, studentId: student?.id, tokenHash, invitedById: teacherId, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
  if (student) await notifySafely({
    userId: student.id,
    type: "STUDENT_INVITED_TO_GROUP",
    idempotencyKey: `group-invitation:${invitation.id}`,
    entityType: "GroupInvitation",
    entityId: invitation.id,
    title: "You have a group invitation",
    message: "A teacher invited you to join a learning group.",
    actionUrl: `/student/invitations/${token}`,
    actionLabel: "Review invitation",
  });
  return { invitation, token };
}

export async function acceptGroupInvitation(studentId: string, token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = await prisma.groupInvitation.findUnique({
    where: { tokenHash },
    include: { group: { select: { id: true, name: true, maxStudents: true, teacherId: true } }, student: { select: { id: true } } },
  });
  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
    if (invitation?.status === "PENDING") await prisma.groupInvitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    throw new Error("This invitation is invalid or has expired.");
  }
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { email: true, role: true, isBlocked: true, deletedAt: true } });
  if (!student || student.isBlocked || student.deletedAt || parseRole(student.role) !== "student") throw new Error("Student access is required.");
  if (student.email.toLowerCase() !== invitation.email.toLowerCase()) throw new Error("This invitation belongs to another email address.");
  const member = await prisma.$transaction(async (tx) => {
    const activeCount = await tx.groupStudent.count({ where: { groupId: invitation.groupId, status: ACTIVE_STUDENT } });
    const existing = await tx.groupStudent.findUnique({ where: { groupId_studentId: { groupId: invitation.groupId, studentId } }, select: { status: true } });
    if (!existing && invitation.group.maxStudents && activeCount >= invitation.group.maxStudents) throw new Error("This group has reached its student limit.");
    const result = await tx.groupStudent.upsert({
      where: { groupId_studentId: { groupId: invitation.groupId, studentId } },
      create: { groupId: invitation.groupId, studentId, status: "ACTIVE", joinedAt: new Date() },
      update: { status: "ACTIVE", joinedAt: new Date(), removedAt: null },
    });
    const activeAssignments = await tx.assignment.findMany({ where: { groupId: invitation.groupId, status: "ACTIVE" }, select: { id: true } });
    await Promise.all(activeAssignments.map((assignment) => tx.assignmentSubmission.upsert({ where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } }, create: { assignmentId: assignment.id, studentId }, update: {} })));
    await tx.groupInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: new Date(), studentId } });
    await tx.contentAuditLog.create({ data: { actorId: studentId, action: "GROUP_INVITATION_ACCEPTED", entityType: "GroupInvitation", entityId: invitation.id, metadata: { groupId: invitation.groupId } } });
    return result;
  });
  await notifySafely({ userId: invitation.group.teacherId, type: "STUDENT_JOINED_GROUP", idempotencyKey: `group-invitation-accepted:${invitation.id}`, entityType: "GroupInvitation", entityId: invitation.id, title: "A learner joined your group", message: `A learner accepted the invitation to ${invitation.group.name}.`, actionUrl: `/teacher/groups/${invitation.groupId}`, actionLabel: "Open group" });
  return { member, groupName: invitation.group.name };
}

async function addStudentCourse(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], input: { studentId: string; courseId: string; sourceType: "FREE_ENROLLMENT" | "TEACHER_ASSIGNED" | "GROUP_ASSIGNED"; sourceId: string }) {
  const sourceKey = `${input.studentId}:${input.courseId}:${input.sourceType}:${input.sourceId}`;
  return tx.studentCourse.upsert({ where: { sourceKey }, create: { ...input, sourceKey }, update: { status: "ACTIVE", archivedAt: null } });
}

export async function addCourseToStudentLibrary(studentId: string, courseId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { role: true } });
  if (!student || parseRole(student.role) !== "student") throw new Error("Student role required.");
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      isPublished: true,
      isTemplate: false,
      accessMode: { in: ["FREE", "SUBSCRIPTION", "ONE_TIME_PURCHASE"] },
      level: { isPublished: true },
      category: { isPublished: true },
    },
    select: { id: true, accessPlan: true },
  });
  if (!course) throw new Error("Course not found.");
  const hasAccess = course.accessPlan === "FREE" || await hasCourseEntitlement(studentId, course.id);
  if (!hasAccess) throw new Error("Course access is required before adding it to your library.");
  return prisma.$transaction((tx) => addStudentCourse(tx, { studentId, courseId, sourceType: "FREE_ENROLLMENT", sourceId: "self" }));
}

/** Archives only the learner's library record; purchases, entitlement and learning progress remain intact. */
export async function removeCourseFromStudentLibrary(studentId: string, courseId: string) {
  const entries = await prisma.studentCourse.findMany({
    where: { studentId, courseId, status: "ACTIVE" },
    select: { id: true, sourceType: true, sourceId: true },
  });
  if (entries.length === 0) throw new Error("This course is not in your active library.");
  const assignedIds = entries.filter((entry) => entry.sourceType === "GROUP_ASSIGNED").map((entry) => entry.sourceId).filter((id): id is string => Boolean(id));
  const requiredAssignment = assignedIds.length ? await prisma.groupCourseAssignment.findFirst({
    where: { id: { in: assignedIds }, status: "ACTIVE", required: true, group: { students: { some: { studentId, status: "ACTIVE" } } } },
    select: { id: true },
  }) : null;
  if (requiredAssignment) {
    throw new Error("This course was assigned as required work and cannot be removed.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.studentCourse.updateMany({ where: { id: { in: entries.map((entry) => entry.id) } }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    await tx.contentAuditLog.create({ data: { actorId: studentId, action: "STUDENT_COURSE_ARCHIVED", entityType: "StudentCourse", entityId: courseId } });
  });
  return { courseId, archived: true };
}

export async function assignCourseToGroup(teacherId: string, groupId: string, courseId: string, input: { deadlineAt?: Date | null; required?: boolean } = {}) {
  if (!(await teacherHasAccessToGroup(teacherId, groupId))) throw new Error("Group not found.");
  const course = await prisma.course.findFirst({ where: { id: courseId, isPublished: true, isTemplate: false }, select: { id: true, accessPlan: true } });
  if (!course) throw new Error("Published course not found.");
  if (course.accessPlan !== "FREE") throw new Error("This paid course requires a license or subscription for each student.");
  const result = await prisma.$transaction(async (tx) => {
    const assignment = await tx.groupCourseAssignment.upsert({ where: { groupId_courseId: { groupId, courseId } }, create: { groupId, courseId, assignedById: teacherId, status: "ACTIVE", deadlineAt: input.deadlineAt ?? null, required: input.required ?? true }, update: { status: "ACTIVE", deadlineAt: input.deadlineAt ?? null, required: input.required ?? true } });
    const members = await tx.groupStudent.findMany({ where: { groupId, status: "ACTIVE" }, select: { studentId: true } });
    await Promise.all(members.map((member) => addStudentCourse(tx, { studentId: member.studentId, courseId, sourceType: "GROUP_ASSIGNED", sourceId: assignment.id })));
    await tx.contentAuditLog.create({ data: { actorId: teacherId, action: "GROUP_COURSE_ASSIGNED", entityType: "GroupCourseAssignment", entityId: assignment.id } });
    return { assignment, studentIds: members.map((member) => member.studentId) };
  });
  await Promise.all(result.studentIds.map((userId) => notifySafely({ userId, type: "COURSE_ASSIGNED", idempotencyKey: `group-course:${result.assignment.id}:${userId}`, entityType: "GroupCourseAssignment", entityId: result.assignment.id, title: "A course was assigned to you", message: "A teacher added a course to your learning library.", actionUrl: "/student/courses", actionLabel: "Open my courses" })));
  return result.assignment;
}

export async function createAssignment(teacherId: string, input: { title: string; description?: string; type: "LESSON" | "EXERCISE_SET" | "WRITTEN" | "FILE_UPLOAD" | "VOCABULARY" | "CUSTOM"; groupId?: string; studentId?: string; courseId?: string; lessonId?: string; dueAt?: Date | null; maxScore?: number; attemptsAllowed?: number; publish?: boolean }) {
  if (!input.groupId && !input.studentId) throw new Error("Choose a group or a student.");
  if (input.groupId && !(await teacherHasAccessToGroup(teacherId, input.groupId))) throw new Error("Group not found.");
  if (input.studentId && !(await teacherHasAccessToStudent(teacherId, input.studentId))) throw new Error("Student not found.");
  const maxScore = input.maxScore ?? 100;
  if (!Number.isInteger(maxScore) || maxScore < 0 || maxScore > 100_000) throw new Error("Invalid maximum score.");
  const attemptsAllowed = input.attemptsAllowed ?? 1;
  if (!Number.isInteger(attemptsAllowed) || attemptsAllowed < 1 || attemptsAllowed > 100) throw new Error("Invalid attempts limit.");
  const result = await prisma.$transaction(async (tx) => {
    const assignment = await tx.assignment.create({ data: { teacherId, groupId: input.groupId, studentId: input.studentId, courseId: input.courseId, lessonId: input.lessonId, title: input.title.trim(), description: input.description?.trim() || null, type: input.type, status: input.publish ? "ACTIVE" : "DRAFT", dueAt: input.dueAt ?? null, maxScore, attemptsAllowed } });
    const recipients = input.studentId ? [input.studentId] : (await tx.groupStudent.findMany({ where: { groupId: input.groupId!, status: "ACTIVE" }, select: { studentId: true } })).map((member) => member.studentId);
    if (input.publish) await Promise.all(recipients.map((studentId) => tx.assignmentSubmission.upsert({ where: { assignmentId_studentId: { assignmentId: assignment.id, studentId } }, create: { assignmentId: assignment.id, studentId }, update: {} })));
    await tx.contentAuditLog.create({ data: { actorId: teacherId, action: "ASSIGNMENT_CREATED", entityType: "Assignment", entityId: assignment.id } });
    return { assignment, studentIds: recipients };
  });
  if (result.assignment.status === "ACTIVE") await Promise.all(result.studentIds.map((userId) => notifySafely({ userId, type: "ASSIGNMENT_ASSIGNED", idempotencyKey: `assignment:${result.assignment.id}:${userId}`, entityType: "Assignment", entityId: result.assignment.id, title: "New assignment", message: result.assignment.title, actionUrl: "/student/homework", actionLabel: "Open assignment" })));
  return result.assignment;
}

export async function reviewSubmission(teacherId: string, submissionId: string, input: { score?: number; feedback?: string; needsRevision?: boolean }) {
  if (!(await teacherCanReviewSubmission(teacherId, submissionId))) throw new Error("Submission not found.");
  const submission = await prisma.assignmentSubmission.findUnique({ where: { id: submissionId }, include: { assignment: { select: { maxScore: true } } } });
  if (!submission) throw new Error("Submission not found.");
  if (!input.needsRevision && (input.score == null || !Number.isInteger(input.score) || input.score < 0 || input.score > submission.assignment.maxScore)) throw new Error("Score must be within the assignment range.");
  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.assignmentSubmission.update({ where: { id: submissionId }, data: { status: input.needsRevision ? "NEEDS_REVISION" : "GRADED", score: input.needsRevision ? null : input.score, teacherScore: input.needsRevision ? null : input.score, feedback: input.feedback?.trim() || null, reviewedById: teacherId, reviewedAt: new Date() } });
    await tx.contentAuditLog.create({ data: { actorId: teacherId, action: input.needsRevision ? "ASSIGNMENT_RETURNED" : "ASSIGNMENT_GRADED", entityType: "AssignmentSubmission", entityId: updated.id } });
    return updated;
  });
  await notifySafely({ userId: updated.studentId, type: input.needsRevision ? "ASSIGNMENT_NEEDS_REVISION" : "ASSIGNMENT_GRADED", idempotencyKey: `assignment-review:${updated.id}:${updated.updatedAt.toISOString()}`, entityType: "AssignmentSubmission", entityId: updated.id, title: input.needsRevision ? "Your assignment needs revision" : "Your assignment was graded", message: input.feedback?.trim() || "Your teacher reviewed the submitted work.", actionUrl: "/student/homework", actionLabel: "View homework" });
  return updated;
}

export async function submitAssignment(studentId: string, submissionId: string, content: unknown) {
  const submission = await prisma.assignmentSubmission.findFirst({
    where: { id: submissionId, studentId, assignment: { status: "ACTIVE", OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] } },
    include: { assignment: { select: { id: true, title: true, dueAt: true, teacherId: true } } },
  });
  if (!submission) throw new Error("Assignment not found.");
  if (submission.status === "GRADED") throw new Error("This assignment has already been graded.");
  const isLate = Boolean(submission.assignment.dueAt && submission.assignment.dueAt < new Date());
  const updated = await prisma.$transaction(async (tx) => {
    const value = await tx.assignmentSubmission.update({ where: { id: submission.id }, data: { content: JSON.parse(JSON.stringify(content ?? {})), status: isLate ? "LATE" : "SUBMITTED", submittedAt: new Date() } });
    await tx.contentAuditLog.create({ data: { actorId: studentId, action: "ASSIGNMENT_SUBMITTED", entityType: "AssignmentSubmission", entityId: value.id } });
    return value;
  });
  await notifySafely({ userId: submission.assignment.teacherId, type: "ASSIGNMENT_SUBMITTED", idempotencyKey: `assignment-submitted:${updated.id}:${updated.updatedAt.toISOString()}`, entityType: "AssignmentSubmission", entityId: updated.id, title: "New assignment submission", message: submission.assignment.title, actionUrl: "/teacher/reviews", actionLabel: "Review submission" });
  return updated;
}

export async function listStudentAssignments(studentId: string) {
  return prisma.assignmentSubmission.findMany({
    where: { studentId, assignment: { status: "ACTIVE", OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] } },
    orderBy: [{ assignment: { dueAt: "asc" } }, { updatedAt: "desc" }],
    include: { assignment: { select: { id: true, title: true, description: true, type: true, dueAt: true, maxScore: true, group: { select: { name: true } }, teacher: { select: { name: true } } } } },
  });
}

export async function listTeacherAssignments(teacherId: string) {
  return prisma.assignment.findMany({
    where: { teacherId },
    orderBy: { updatedAt: "desc" },
    include: { group: { select: { id: true, name: true } }, student: { select: { id: true, name: true, email: true } }, _count: { select: { submissions: true } } },
  });
}

export async function listTeacherReviewQueue(teacherId: string) {
  return prisma.assignmentSubmission.findMany({
    where: { assignment: { OR: [{ teacherId }, { group: { OR: [{ teacherId }, { teachers: { some: { teacherId } } }] } }] }, status: { in: ["SUBMITTED", "LATE", "UNDER_REVIEW", "NEEDS_REVISION"] } },
    orderBy: { submittedAt: "asc" },
    include: { student: { select: { name: true, email: true } }, assignment: { select: { id: true, title: true, maxScore: true, group: { select: { name: true } } } } },
  });
}

async function notifySafely(input: Parameters<typeof notificationService.createNotification>[0]) {
  try { await notificationService.createNotification(input); } catch { /* notifications must not roll back a learning action */ }
}
