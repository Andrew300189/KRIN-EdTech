import { randomUUID } from "crypto";
import { prisma } from "@/core/server/prisma";
import { notificationService } from "@/modules/communications/services/notification.service";
import type { SupportTicketPriority, SupportTicketStatus } from "@/generated/prisma-client-payments-runtime";

const TRANSITIONS: Record<SupportTicketStatus, SupportTicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["WAITING_FOR_USER", "RESOLVED", "CLOSED"],
  WAITING_FOR_USER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
};

export function canTransitionTicket(from: SupportTicketStatus, to: SupportTicketStatus) {
  return TRANSITIONS[from].includes(to);
}

function ticketNumber() {
  return `KRIN-SUP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 7).toUpperCase()}`;
}

async function supportRecipients(ticket: { assignedToId: string | null; assignedTeamId: string | null }) {
  if (ticket.assignedToId) return [ticket.assignedToId];
  if (ticket.assignedTeamId) {
    const members = await prisma.supportTeamMember.findMany({ where: { teamId: ticket.assignedTeamId, isActive: true }, select: { userId: true } });
    if (members.length) return members.map((member) => member.userId);
  }
  const managers = await prisma.user.findMany({ where: { role: { in: ["CONTENT_MANAGER", "ADMIN", "SUPER_ADMIN"] }, isBlocked: false, deletedAt: null }, select: { id: true } });
  return managers.map((manager) => manager.id);
}

export async function createSupportTicket(input: { userId: string; categoryId?: string; subject: string; description: string; priority?: SupportTicketPriority; relatedOrderId?: string }) {
  const category = input.categoryId ? await prisma.supportCategory.findFirst({ where: { id: input.categoryId, isActive: true } }) : null;
  if (input.categoryId && !category) throw new Error("Support category is unavailable.");
  if (input.relatedOrderId) {
    const ownsOrder = await prisma.order.findFirst({ where: { id: input.relatedOrderId, userId: input.userId }, select: { id: true } });
    if (!ownsOrder) throw new Error("The selected order does not belong to you.");
  }
  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({ data: { number: ticketNumber(), userId: input.userId, categoryId: category?.id, assignedTeamId: category?.defaultTeamId, subject: input.subject.trim().slice(0, 180), description: input.description.trim().slice(0, 8_000), priority: input.priority ?? "NORMAL", relatedOrderId: input.relatedOrderId } });
    await tx.supportMessage.create({ data: { ticketId: created.id, authorId: input.userId, kind: "USER_MESSAGE", body: created.description } });
    await tx.supportTicketStatusHistory.create({ data: { ticketId: created.id, to: "OPEN", actorId: input.userId, note: "Ticket created" } });
    return created;
  });
  await notificationService.createNotification({ userId: input.userId, type: "SUPPORT_TICKET_CREATED", idempotencyKey: `support-ticket-created:${ticket.id}`, entityType: "SupportTicket", entityId: ticket.id, title: "Support ticket created", message: `Your ticket ${ticket.number} has been received.`, actionUrl: `/profile/support/${ticket.id}`, actionLabel: "View ticket", payload: { ticketNumber: ticket.number, supportSubject: ticket.subject } });
  for (const recipientId of await supportRecipients(ticket)) await notificationService.createNotification({ userId: recipientId, type: "SUPPORT_TICKET_CREATED", idempotencyKey: `support-ticket-assigned:${ticket.id}:${recipientId}`, entityType: "SupportTicket", entityId: ticket.id, title: "New support ticket", message: `${ticket.number}: ${ticket.subject}`, actionUrl: `/admin/support/tickets/${ticket.id}`, actionLabel: "Open ticket", channels: ["IN_APP"], payload: { ticketNumber: ticket.number } });
  return ticket;
}

export async function listUserTickets(userId: string, cursor?: string) {
  const rows = await prisma.supportTicket.findMany({ where: { userId }, include: { category: { select: { title: true } }, _count: { select: { messages: true } } }, orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }], take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  const hasNext = rows.length > 20;
  const tickets = hasNext ? rows.slice(0, 20) : rows;
  return { tickets, nextCursor: hasNext ? tickets[tickets.length - 1]?.id ?? null : null };
}

export async function getUserTicket(userId: string, ticketId: string) {
  return prisma.supportTicket.findFirst({ where: { id: ticketId, userId }, include: { category: true, messages: { where: { isInternal: false }, include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } }, attachments: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true } }, rating: true, statusHistory: { where: { actorId: userId }, orderBy: { createdAt: "asc" } } } });
}

export async function listAdminTickets(input: { status?: SupportTicketStatus; cursor?: string } = {}) {
  const rows = await prisma.supportTicket.findMany({ where: input.status ? { status: input.status } : {}, include: { user: { select: { name: true, email: true } }, category: { select: { title: true } }, assignedTo: { select: { name: true } }, assignedTeam: { select: { title: true } }, _count: { select: { messages: true } } }, orderBy: [{ priority: "desc" }, { lastMessageAt: "desc" }], take: 51, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}) });
  const hasNext = rows.length > 50;
  const tickets = hasNext ? rows.slice(0, 50) : rows;
  return { tickets, nextCursor: hasNext ? tickets[tickets.length - 1]?.id ?? null : null };
}

export async function getAdminTicket(ticketId: string) {
  return prisma.supportTicket.findUnique({ where: { id: ticketId }, include: { user: { select: { name: true, email: true } }, category: true, assignedTo: { select: { name: true, email: true } }, assignedTeam: true, messages: { include: { author: { select: { name: true, email: true, role: true } }, attachments: true }, orderBy: { createdAt: "asc" } }, statusHistory: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "asc" } }, attachments: true, rating: true } });
}

export async function addSupportMessage(input: { ticketId: string; actorId: string; actorIsAgent: boolean; body: string; internal?: boolean }) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: input.ticketId }, include: { user: { select: { id: true } } } });
  if (!ticket) throw new Error("Support ticket not found.");
  if (!input.actorIsAgent && ticket.userId !== input.actorId) throw new Error("You cannot reply to this ticket.");
  if (input.internal && !input.actorIsAgent) throw new Error("Internal notes are restricted to support staff.");
  const text = input.body.trim();
  if (!text || text.length > 8_000) throw new Error("Message must contain between 1 and 8000 characters.");
  const reopening = !input.actorIsAgent && (ticket.status === "RESOLVED" || ticket.status === "CLOSED");
  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.supportMessage.create({ data: { ticketId: ticket.id, authorId: input.actorId, kind: input.internal ? "INTERNAL_NOTE" : input.actorIsAgent ? "AGENT_REPLY" : "USER_MESSAGE", body: text, isInternal: Boolean(input.internal) } });
    await tx.supportTicket.update({ where: { id: ticket.id }, data: { status: reopening ? "OPEN" : ticket.status, lastMessageAt: new Date(), firstResponseAt: input.actorIsAgent && !ticket.firstResponseAt ? new Date() : ticket.firstResponseAt, resolvedAt: reopening ? null : ticket.resolvedAt, closedAt: reopening ? null : ticket.closedAt } });
    if (reopening) await tx.supportTicketStatusHistory.create({ data: { ticketId: ticket.id, from: ticket.status, to: "OPEN", actorId: input.actorId, note: "Reopened by requester reply" } });
    return message;
  });
  if (input.actorIsAgent && !input.internal) await notificationService.createNotification({ userId: ticket.userId, type: "SUPPORT_TICKET_REPLIED", idempotencyKey: `support-ticket-reply:${result.id}`, entityType: "SupportTicket", entityId: ticket.id, title: "Support replied to your ticket", message: `There is a new reply on ${ticket.number}.`, actionUrl: `/profile/support/${ticket.id}`, actionLabel: "Open ticket", payload: { ticketNumber: ticket.number } });
  if (!input.actorIsAgent) for (const recipientId of await supportRecipients(ticket)) await notificationService.createNotification({ userId: recipientId, type: "SUPPORT_TICKET_REPLIED", idempotencyKey: `support-ticket-user-reply:${result.id}:${recipientId}`, entityType: "SupportTicket", entityId: ticket.id, title: "Requester replied", message: `${ticket.number} has a new requester reply.`, actionUrl: `/admin/support/tickets/${ticket.id}`, actionLabel: "Open ticket", channels: ["IN_APP"], payload: { ticketNumber: ticket.number } });
  return result;
}

export async function changeSupportTicketStatus(input: { ticketId: string; actorId: string; status: SupportTicketStatus; note?: string }) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: input.ticketId } });
  if (!ticket) throw new Error("Support ticket not found.");
  if (!canTransitionTicket(ticket.status, input.status)) throw new Error("This ticket status transition is not allowed.");
  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.supportTicket.update({ where: { id: ticket.id }, data: { status: input.status, resolvedAt: input.status === "RESOLVED" ? now : ticket.resolvedAt, closedAt: input.status === "CLOSED" ? now : null } });
    await tx.supportTicketStatusHistory.create({ data: { ticketId: ticket.id, from: ticket.status, to: input.status, actorId: input.actorId, note: input.note?.slice(0, 500) } });
    await tx.contentAuditLog.create({ data: { actorId: input.actorId, action: "SUPPORT_TICKET_STATUS_CHANGED", entityType: "SupportTicket", entityId: ticket.id, metadata: { from: ticket.status, to: input.status } } });
    return next;
  });
  const type = input.status === "RESOLVED" ? "SUPPORT_TICKET_RESOLVED" : "SUPPORT_TICKET_STATUS_CHANGED";
  await notificationService.createNotification({ userId: ticket.userId, type, idempotencyKey: `support-ticket-status:${ticket.id}:${input.status}:${updated.updatedAt.toISOString()}`, entityType: "SupportTicket", entityId: ticket.id, title: input.status === "RESOLVED" ? "Support ticket resolved" : "Support ticket updated", message: `${ticket.number} is now ${input.status.toLowerCase().replace(/_/g, " ")}.`, actionUrl: `/profile/support/${ticket.id}`, actionLabel: "View ticket", payload: { ticketNumber: ticket.number } });
  return updated;
}

export async function rateSupportTicket(input: { ticketId: string; userId: string; rating: number; comment?: string }) {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new Error("Rating must be between 1 and 5.");
  const ticket = await prisma.supportTicket.findFirst({ where: { id: input.ticketId, userId: input.userId, status: { in: ["RESOLVED", "CLOSED"] } } });
  if (!ticket) throw new Error("Only your resolved tickets can be rated.");
  return prisma.supportRating.create({ data: { ticketId: ticket.id, userId: input.userId, rating: input.rating, comment: input.comment?.trim().slice(0, 1000) || null } });
}

export async function supportSla(ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, include: { category: true } });
  if (!ticket) return null;
  const policy = await prisma.supportSlaPolicy.findFirst({ where: { isActive: true, priority: ticket.priority, OR: [{ categoryId: ticket.categoryId }, { categoryId: null }] }, orderBy: { categoryId: "desc" } });
  if (!policy) return null;
  const firstResponseDueAt = new Date(ticket.createdAt.getTime() + policy.firstResponseMinutes * 60_000);
  const resolutionDueAt = new Date(ticket.createdAt.getTime() + policy.resolutionMinutes * 60_000);
  return { policy, firstResponseDueAt, resolutionDueAt, firstResponseBreached: !ticket.firstResponseAt && firstResponseDueAt < new Date(), resolutionBreached: !ticket.resolvedAt && ticket.status !== "CLOSED" && resolutionDueAt < new Date() };
}
