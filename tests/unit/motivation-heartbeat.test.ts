import { determineHeartbeatCredit } from "@/modules/motivation/utils/heartbeat-policy";

describe("server heartbeat policy", () => {
  const base = { elapsedSeconds: 30, activeSessionSeconds: 0, dailyActiveSeconds: 0, interactionAdvanced: true, clientTimestampFutureSeconds: 0, replayed: false };
  it("credits a bounded active interval only after new interaction", () => {
    expect(determineHeartbeatCredit(base)).toMatchObject({ creditedSeconds: 30, status: "ACTIVE", reason: "credited" });
    expect(determineHeartbeatCredit({ ...base, interactionAdvanced: false })).toMatchObject({ creditedSeconds: 0, reason: "no_interaction" });
  });
  it("rejects future and replayed heartbeats", () => {
    expect(determineHeartbeatCredit({ ...base, clientTimestampFutureSeconds: 31 })).toMatchObject({ creditedSeconds: 0, reason: "future_timestamp" });
    expect(determineHeartbeatCredit({ ...base, replayed: true })).toMatchObject({ creditedSeconds: 0, reason: "replayed_heartbeat" });
  });
  it("does not count a long unattended gap and pauses the session", () => {
    expect(determineHeartbeatCredit({ ...base, elapsedSeconds: 121 })).toMatchObject({ creditedSeconds: 0, status: "PAUSED", reason: "excessive_gap" });
  });
  it("caps credited time by daily and session ceilings", () => {
    expect(determineHeartbeatCredit({ ...base, elapsedSeconds: 100, activeSessionSeconds: 14390, dailyActiveSeconds: 14395 })).toMatchObject({ creditedSeconds: 5 });
  });
});
