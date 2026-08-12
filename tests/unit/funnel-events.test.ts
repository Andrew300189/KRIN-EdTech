import { funnelDeviceTypes, funnelEventLabels, funnelEventResults, funnelEventTypes, funnelLevelCodes } from "@/modules/analytics/funnel-events";
import { cmsContentAreaSchema } from "@/modules/cms/schemas/content-management.schemas";

describe("first-party funnel event contract", () => {
  it("defines every product-funnel event as a finite allow-list", () => {
    expect(funnelEventTypes).toEqual([
      "HOME_VIEW",
      "PLACEMENT_TEST_START",
      "PLACEMENT_TEST_COMPLETE",
      "COURSE_CATALOG_VIEW",
      "COURSE_FILTER_USED",
      "COURSE_VIEW",
      "PREVIEW_LESSON_START",
      "PREVIEW_LESSON_COMPLETE",
      "SIGNUP_START",
      "SIGNUP_COMPLETE",
      "PRICING_VIEW",
      "CHECKOUT_START",
      "CHECKOUT_ERROR",
      "PURCHASE_COMPLETE",
      "FIRST_LESSON_START",
      "FIRST_LESSON_COMPLETE",
    ]);
    expect(Object.keys(funnelEventLabels)).toEqual(funnelEventTypes);
  });

  it("allows the dedicated legal CMS area without accepting arbitrary areas", () => {
    expect(cmsContentAreaSchema.safeParse("LEGAL").success).toBe(true);
    expect(cmsContentAreaSchema.safeParse("PAYMENTS").success).toBe(false);
  });

  it("keeps event attribution finite and non-free-form", () => {
    expect(funnelLevelCodes).toEqual(["A1", "A2", "B1", "B2", "C1", "C2"]);
    expect(funnelDeviceTypes).toEqual(["MOBILE", "TABLET", "DESKTOP"]);
    expect(funnelEventResults).toEqual(["STARTED", "SUCCEEDED", "FAILED", "CANCELED", "PENDING"]);
  });
});
