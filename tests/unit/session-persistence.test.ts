import { SESSION_CONFIG } from "@/core/constants/session";
import { getSessionCookieMaxAge } from "@/core/utils/session-persistence";

describe("credential session persistence", () => {
  it("keeps legacy callers and an explicit checked preference persistent", () => {
    expect(getSessionCookieMaxAge()).toBe(SESSION_CONFIG.ABSOLUTE_TTL_SECONDS);
    expect(getSessionCookieMaxAge(true)).toBe(
      SESSION_CONFIG.ABSOLUTE_TTL_SECONDS,
    );
  });

  it("uses a browser-session cookie when Remember me is unchecked", () => {
    expect(getSessionCookieMaxAge(false)).toBeUndefined();
  });
});
