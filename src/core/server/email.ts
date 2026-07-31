import { notificationService } from "@/modules/communications/services/notification.service";

export type WelcomeEmailPayload = {
  userId: string;
  name: string;
  email: string;
  verificationUrl: string;
  targetLanguage?: string | null;
  learningGoal?: string | null;
};

export async function sendWelcomeVerificationEmail(
  payload: WelcomeEmailPayload,
) {
  // The verification URL contains a short-lived credential, so it is sent through
  // the central provider abstraction but is never saved in Notification.payload.
  const safeName = payload.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  await notificationService.sendEphemeralEmail({
    userId: payload.userId,
    type: "EMAIL_VERIFICATION",
    idempotencyKey: `email-verification:${payload.userId}:registration`,
    title: "Verify your email",
    message: "Check your inbox to verify your email address.",
    entityType: "User",
    entityId: payload.userId,
    payload: { userName: payload.name },
    email: {
      to: payload.email,
      subject: `Verify your KRIN email, ${payload.name}`,
      text: `Welcome to KRIN, ${payload.name}. Verify your email address: ${payload.verificationUrl}`,
      html: `<p>Welcome to KRIN, ${safeName}.</p><p><a href="${payload.verificationUrl}">Verify your email address</a></p>`,
      category: "security",
    },
  });
}
