import { lessonRecoveryShopHref, parseLessonRecoveryShopQuery } from "@/modules/motivation/utils/recovery-shop-navigation";

describe("lesson recovery shop navigation", () => {
  it("preserves a lesson return path and the interrupted streak", () => {
    const href = lessonRecoveryShopHref("/uk/courses/bag/lessons/first", 12);
    expect(href).toContain("#shop-recovery");
    expect(parseLessonRecoveryShopQuery(href.split("?")[1].split("#")[0])).toEqual({ returnTo: "/uk/courses/bag/lessons/first", streak: 12 });
  });

  it("rejects external and unrelated destinations", () => {
    expect(parseLessonRecoveryShopQuery("?returnTo=https%3A%2F%2Fevil.example&streak=12")).toBeNull();
    expect(parseLessonRecoveryShopQuery("?returnTo=%2Fstudent%2Fdashboard&streak=12")).toBeNull();
    expect(parseLessonRecoveryShopQuery("?returnTo=%2Fuk%2Fcourses%2Fbag%2Flessons%2Ffirst&streak=0")).toBeNull();
  });
});
