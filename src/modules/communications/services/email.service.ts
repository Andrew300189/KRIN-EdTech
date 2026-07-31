import { createHash, randomUUID } from "crypto";
import { prisma } from "@/core/server/prisma";

export type SendEmailInput = { to: string; subject: string; text: string; html?: string | null; category?: "default" | "support" | "billing" | "security"; replyTo?: string | null };
export type SendEmailResult = { provider: string; providerMessageId: string };

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}

function sender(category: SendEmailInput["category"]) {
  if (category === "support") return process.env.EMAIL_FROM_SUPPORT || process.env.EMAIL_FROM_DEFAULT;
  if (category === "billing") return process.env.EMAIL_FROM_BILLING || process.env.EMAIL_FROM_DEFAULT;
  if (category === "security") return process.env.EMAIL_FROM_SECURITY || process.env.EMAIL_FROM_DEFAULT;
  return process.env.EMAIL_FROM_DEFAULT;
}

class LogEmailProvider implements EmailProvider {
  async sendEmail(input: SendEmailInput) {
    if (process.env.NODE_ENV === "production") throw new Error("An email provider is not configured.");
    console.info("[communications:email-preview]", { to: input.to, subject: input.subject, textLength: input.text.length });
    return { provider: "log", providerMessageId: `log_${randomUUID()}` };
  }
}

class ResendEmailProvider implements EmailProvider {
  async sendEmail(input: SendEmailInput) {
    const apiKey = process.env.EMAIL_API_KEY;
    const from = sender(input.category);
    if (!apiKey || !from) throw new Error("Resend email credentials are not configured.");
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text, ...(input.html ? { html: input.html } : {}), ...(input.replyTo ? { reply_to: input.replyTo } : {}) }) });
    if (!response.ok) throw new Error(`Email provider rejected delivery (${response.status}).`);
    const result = await response.json() as { id?: string };
    return { provider: "resend", providerMessageId: result.id ?? `resend_${randomUUID()}` };
  }
}

function provider(): EmailProvider {
  return process.env.EMAIL_PROVIDER?.toLowerCase() === "resend" ? new ResendEmailProvider() : new LogEmailProvider();
}

export function emailHash(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function isSuppressed(email: string) {
  return Boolean(await prisma.emailSuppression.findUnique({ where: { emailHash: emailHash(email) }, select: { id: true } }));
}

export class EmailService {
  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    if (!/^\S+@\S+\.\S+$/.test(input.to) || await isSuppressed(input.to)) throw new Error("This email address cannot receive platform mail.");
    return provider().sendEmail({ ...input, replyTo: input.replyTo ?? (input.category === "support" ? process.env.EMAIL_REPLY_TO_SUPPORT : null) });
  }
}

export const emailService = new EmailService();
