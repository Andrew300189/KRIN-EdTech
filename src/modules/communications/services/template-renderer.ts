import { prisma } from "@/core/server/prisma";
import type { NotificationChannel } from "@/generated/prisma-client-payments-runtime";
import type { TemplateVariables } from "@/modules/communications/types/notification.types";

const TOKEN = /{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g;
const ALLOWED = new Set(["userName", "courseTitle", "lessonTitle", "amount", "currency", "subscriptionEndDate", "ticketNumber", "actionUrl", "supportSubject", "platformName"]);

export type RenderedTemplate = { subject: string | null; title: string; body: string; htmlBody: string | null; actionLabel: string | null; actionUrl: string | null; locale: string };

function stringify(value: TemplateVariables[string]) {
  if (value instanceof Date) return value.toISOString();
  return value == null ? "" : String(value);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function render(source: string | null, variables: TemplateVariables, html = false) {
  if (!source) return null;
  return source.replace(TOKEN, (_whole, token: string) => {
    if (!ALLOWED.has(token)) return "";
    const value = stringify(variables[token]);
    return html ? escapeHtml(value) : value;
  });
}

export async function renderNotificationTemplate(input: { code: string; channel: NotificationChannel; locale: string; variables: TemplateVariables; fallback: { title: string; body: string; actionLabel?: string | null; actionUrl?: string | null } }): Promise<RenderedTemplate> {
  const requestedLocale = input.locale.toLowerCase();
  const template = await prisma.notificationTemplate.findFirst({ where: { code: input.code, channel: input.channel, locale: { in: [requestedLocale, "en"] }, isActive: true }, orderBy: { locale: "desc" } });
  if (!template && requestedLocale !== "en") console.warn("[communications] template fallback", { code: input.code, channel: input.channel, locale: requestedLocale });
  const source = template ?? { subject: null, title: input.fallback.title, body: input.fallback.body, htmlBody: null, actionLabel: input.fallback.actionLabel ?? null, defaultActionUrl: input.fallback.actionUrl ?? null, locale: "en" };
  const variables = { ...input.variables, platformName: "KRIN", actionUrl: input.fallback.actionUrl ?? input.variables.actionUrl };
  return { subject: render(source.subject, variables), title: render(source.title, variables) ?? input.fallback.title, body: render(source.body, variables) ?? input.fallback.body, htmlBody: render(source.htmlBody, variables, true), actionLabel: render(source.actionLabel, variables), actionUrl: render(source.defaultActionUrl, variables), locale: source.locale };
}

export { escapeHtml };
