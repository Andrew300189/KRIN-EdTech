import { browserChestTimeZone, dailyChestAvailable, nextDailyChestAt, selectedChestTimeZone } from "@/modules/motivation/utils/daily-chest-date";

describe("daily chest calendar reset", () => {
  it("refreshes at midnight rather than 24 hours after opening", () => {
    const claimed = new Date("2026-09-23T20:59:00.000Z");
    expect(dailyChestAvailable(claimed, "Europe/Kyiv", new Date("2026-09-23T21:01:00.000Z"))).toBe(true);
    expect(nextDailyChestAt("Europe/Kyiv", claimed).toISOString()).toBe("2026-09-23T21:00:00.000Z");
  });

  it("does not allow two claims during the same local day", () => {
    const claimed = new Date("2026-09-23T08:00:00.000Z");
    expect(dailyChestAvailable(claimed, "Europe/Kyiv", new Date("2026-09-23T20:59:59.000Z"))).toBe(false);
  });

  it("respects daylight-saving changes", () => {
    expect(nextDailyChestAt("Europe/Kyiv", new Date("2026-10-25T12:00:00.000Z")).toISOString()).toBe("2026-10-25T22:00:00.000Z");
  });

  it("uses the browser's local zone only for an unset UTC profile and then freezes it", () => {
    expect(selectedChestTimeZone("UTC", null, "Europe/Kyiv")).toBe("Europe/Kyiv");
    expect(selectedChestTimeZone("UTC", "Europe/Kyiv", "Asia/Tokyo")).toBe("Europe/Kyiv");
    expect(selectedChestTimeZone("Europe/Warsaw", null, "Asia/Tokyo")).toBe("Europe/Warsaw");
    expect(browserChestTimeZone("not-a-zone")).toBeNull();
  });
});
