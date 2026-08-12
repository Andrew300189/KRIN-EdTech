import {
  PLATFORM_FEATURE_STATUSES,
  platformFeatureRegistry,
} from "@/modules/cms/data/platform-feature-registry";

describe("platform feature registry", () => {
  it("uses stable, unique identifiers and only the documented statuses", () => {
    const ids = platformFeatureRegistry.map((feature) => feature.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(platformFeatureRegistry.every((feature) => PLATFORM_FEATURE_STATUSES.includes(feature.status))).toBe(true);
  });

  it("does not present operational or blocked capabilities as browser actions", () => {
    const parentWorkspace = platformFeatureRegistry.find((feature) => feature.id === "parent-workspace");
    const operationalJobs = platformFeatureRegistry.find((feature) => feature.id === "webhooks-jobs");

    expect(parentWorkspace).toMatchObject({ status: "BLOCKED", route: null, backend: "Unavailable" });
    expect(operationalJobs).toMatchObject({ status: "INTERNAL", route: null, frontend: "Internal" });
  });

  it("documents the canonical, user-scoped student support route", () => {
    expect(platformFeatureRegistry.find((feature) => feature.id === "student-support")).toMatchObject({
      area: "STUDENT",
      route: "/student/support",
      backend: "Ready",
      frontend: "Ready",
      status: "WORKING",
    });
  });
});
