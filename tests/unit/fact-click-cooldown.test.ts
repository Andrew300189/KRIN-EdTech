import { factClickRetryAfterSeconds } from "@/modules/motivation/utils/fact-click-cooldown";

describe("fact click interval", () => {
  const now = new Date("2026-09-24T12:00:07.000Z");

  it("waits seven seconds after the previous fact", () => {
    expect(factClickRetryAfterSeconds(new Date("2026-09-24T12:00:00.000Z"), now)).toBe(0);
    expect(factClickRetryAfterSeconds(new Date("2026-09-24T12:00:00.001Z"), now)).toBe(1);
    expect(factClickRetryAfterSeconds(new Date("2026-09-24T12:00:05.000Z"), now)).toBe(5);
    expect(factClickRetryAfterSeconds(null, now)).toBe(0);
  });
});
