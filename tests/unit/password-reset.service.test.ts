import {
  createPasswordResetToken,
  hashPasswordResetToken,
  parsePasswordResetRequest,
  parsePasswordResetSubmission,
  validateNewPassword,
} from "@/modules/auth/services/password-reset.service";

describe("password reset input and token handling", () => {
  it("normalizes a valid reset email", () => {
    expect(parsePasswordResetRequest({ email: " Owner@Example.com " })).toEqual({
      ok: true,
      email: "owner@example.com",
    });
    expect(parsePasswordResetRequest({ email: "not-an-email" })).toMatchObject({ ok: false });
  });

  it("does not accept an incomplete or mismatched replacement password", () => {
    expect(parsePasswordResetSubmission({ token: "token", password: "short" })).toMatchObject({ ok: false });
    expect(
      parsePasswordResetSubmission({ token: "token", password: "strong-password", passwordConfirmation: "different-password" }),
    ).toMatchObject({ ok: false });
    expect(
      parsePasswordResetSubmission({ token: "token", password: "strong-password", passwordConfirmation: "strong-password" }),
    ).toEqual({ ok: true, token: "token", password: "strong-password" });
    expect(validateNewPassword({ password: "strong-password", passwordConfirmation: "strong-password" })).toEqual({
      ok: true,
      password: "strong-password",
    });
  });

  it("keeps only a hash of generated reset credentials", () => {
    const first = createPasswordResetToken();
    const second = createPasswordResetToken();
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashPasswordResetToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });
});
