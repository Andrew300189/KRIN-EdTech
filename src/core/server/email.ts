export type WelcomeEmailPayload = {
  name: string;
  email: string;
  verificationUrl: string;
  targetLanguage?: string | null;
  learningGoal?: string | null;
};

export async function sendWelcomeVerificationEmail(payload: WelcomeEmailPayload) {
  const provider = process.env.EMAIL_PROVIDER || "log";

  if (provider === "log") {
    console.log("[email:welcome]", {
      to: payload.email,
      subject: `Welcome to KRIN, ${payload.name}`,
      verificationUrl: payload.verificationUrl,
      targetLanguage: payload.targetLanguage,
      learningGoal: payload.learningGoal,
    });
    return;
  }

  // Placeholder for real provider implementation (Resend/SendGrid/etc.)
  console.log("[email:provider-not-configured]", {
    provider,
    to: payload.email,
    verificationUrl: payload.verificationUrl,
  });
}
