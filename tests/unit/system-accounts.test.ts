import { isSystemAccountEmail, SYSTEM_ACCOUNT_EMAILS } from "@/core/server/system-accounts";

describe("system account visibility", () => {
  it("recognises the seeded content manager regardless of email casing", () => {
    expect(isSystemAccountEmail("content@seed.krin.local")).toBe(true);
    expect(isSystemAccountEmail("CONTENT@SEED.KRIN.LOCAL")).toBe(true);
    expect(isSystemAccountEmail("learner@example.com")).toBe(false);
    expect(SYSTEM_ACCOUNT_EMAILS).toContain("content@seed.krin.local");
  });
});
