import {
  createEmailVerificationToken,
  hashEmailVerificationToken,
  parseEmailVerificationRequest,
  parseEmailVerificationSubmission,
} from "@/modules/auth/services/email-verification.service";

describe("email verification credentials", () => {
  it("issues unique high-entropy tokens while persisting only a hash", () => {
    const first = createEmailVerificationToken();
    const second = createEmailVerificationToken();

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(first.tokenHash).toHaveLength(64);
    expect(first.tokenHash).toBe(hashEmailVerificationToken(first.token));
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("normalizes resend addresses and rejects malformed values", () => {
    expect(parseEmailVerificationRequest({ email: " Learner@Example.COM " }))
      .toEqual({ ok: true, email: "learner@example.com" });
    expect(parseEmailVerificationRequest({ email: "not-an-email" }).ok).toBe(false);
  });

  it("accepts only bounded base64url credentials from confirmation links", () => {
    const { token } = createEmailVerificationToken();
    expect(parseEmailVerificationSubmission({ token })).toEqual({ ok: true, token });
    expect(parseEmailVerificationSubmission({ token: "short" }).ok).toBe(false);
    expect(parseEmailVerificationSubmission({ token: "a".repeat(129) }).ok).toBe(false);
    expect(parseEmailVerificationSubmission({ token: `${token}.invalid` }).ok).toBe(false);
  });
});
