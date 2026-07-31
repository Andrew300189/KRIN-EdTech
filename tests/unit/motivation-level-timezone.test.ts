import { calculateUserLevel } from "@/modules/motivation/services/motivation.service";
import { dateDistanceInDays, userLocalDate } from "@/modules/motivation/utils/local-date";

describe("motivation levels and local dates", () => {
  it("uses a progressive, non-linear level curve", () => {
    expect(calculateUserLevel(0)).toMatchObject({ level: 1, currentExperience: 0, experienceToNextLevel: 100 });
    expect(calculateUserLevel(100)).toMatchObject({ level: 2, currentExperience: 0, experienceToNextLevel: 150 });
    expect(calculateUserLevel(250)).toMatchObject({ level: 3, currentExperience: 0, experienceToNextLevel: 200 });
  });
  it("derives calendar dates in the user's timezone rather than raw UTC", () => {
    const moment = new Date("2026-07-30T22:30:00.000Z");
    expect(userLocalDate("Europe/Kyiv", moment)).toBe("2026-07-31");
    expect(userLocalDate("UTC", moment)).toBe("2026-07-30");
    expect(dateDistanceInDays("2026-07-30", "2026-07-31")).toBe(1);
  });
});
