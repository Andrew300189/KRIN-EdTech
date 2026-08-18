import { getUserPresence, PRESENCE_ONLINE_WINDOW_MS } from "@/core/server/presence";

describe("user presence", () => {
  const now = new Date("2026-08-18T12:00:00.000Z");

  it("marks an account online when activity is inside the heartbeat window", () => {
    expect(getUserPresence(new Date(now.getTime() - PRESENCE_ONLINE_WINDOW_MS + 1), now)).toBe("ONLINE");
  });

  it("marks an account offline when activity is older than the heartbeat window", () => {
    expect(getUserPresence(new Date(now.getTime() - PRESENCE_ONLINE_WINDOW_MS - 1), now)).toBe("OFFLINE");
  });

  it("marks an account with no recorded activity offline", () => {
    expect(getUserPresence(null, now)).toBe("OFFLINE");
  });
});
