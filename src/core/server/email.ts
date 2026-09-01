import { createHash } from "crypto";
import { notificationService } from "@/modules/communications/services/notification.service";

export type WelcomeEmailPayload = {
  userId: string;
  name: string;
  email: string;
  verificationUrl: string;
  verificationTokenHash: string;
  targetLanguage?: string | null;
  learningGoal?: string | null;
};

export type PasswordResetEmailPayload = {
  userId: string;
  name: string;
  email: string;
  resetUrl: string;
};

export async function sendWelcomeVerificationEmail(
  payload: WelcomeEmailPayload,
) {
  // The verification URL contains a short-lived credential, so it is sent through
  // the central provider abstraction but is never saved in Notification.payload.
  const safeName = payload.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  return notificationService.sendEphemeralEmail({
    userId: payload.userId,
    type: "EMAIL_VERIFICATION",
    // A resend creates a replacement credential, so its delivery event must
    // be distinct. The persisted event contains only the hash, never the
    // bearer token from the email link.
    idempotencyKey: `email-verification:${payload.userId}:${payload.verificationTokenHash}`,
    title: "Verify your email",
    message: "Check your inbox to verify your email address.",
    entityType: "User",
    entityId: payload.userId,
    payload: { userName: payload.name },
    email: {
      to: payload.email,
      subject: `Verify your KRIN email, ${payload.name}`,
      text: `Welcome to KRIN, ${payload.name}. Verify your email address: ${payload.verificationUrl}\n\nThis secure link expires in 24 hours. If you did not create a KRIN account, you can ignore this email.`,
      html: `<p>Welcome to KRIN, ${safeName}.</p><p><a href="${payload.verificationUrl}">Verify your email address</a></p><p>This secure link expires in 24 hours. If you did not create a KRIN account, you can ignore this email.</p>`,
      category: "security",
    },
  });
}

export async function sendPasswordResetEmail(payload: PasswordResetEmailPayload) {
  const safeName = payload.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const resetRequestKey = createHash("sha256").update(payload.resetUrl).digest("hex");
  await notificationService.sendEphemeralEmail({
    userId: payload.userId,
    type: "PASSWORD_RESET",
    // The raw reset credential is deliberately never persisted in a
    // notification or idempotency record.
    idempotencyKey: `password-reset:${payload.userId}:${resetRequestKey}`,
    title: "Reset your password",
    message: "Use the secure link sent to your email to reset your password.",
    entityType: "User",
    entityId: payload.userId,
    actionUrl: "/forgot-password",
    payload: { userName: payload.name },
    email: {
      to: payload.email,
      subject: "Reset your KRIN password",
      text: `Hello ${payload.name}. Reset your KRIN password: ${payload.resetUrl}\n\nThis link expires in one hour. If you did not request it, you can ignore this email.`,
      html: `<p>Hello ${safeName}.</p><p><a href="${payload.resetUrl}">Reset your KRIN password</a></p><p>This link expires in one hour. If you did not request it, you can ignore this email.</p>`,
      category: "security",
    },
  });
}
