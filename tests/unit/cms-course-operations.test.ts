import { cmsCourseBulkUpdateSchema, cmsCourseMoveSchema } from "@/modules/cms/schemas/content-management.schemas";
import { canPhysicallyDeleteCmsCourse } from "@/modules/cms/services/course-operations.service";
import { diffRevisionSnapshots } from "@/modules/cms/utils/revision-diff";

const courseId = "clx9q1y5j0000q2v4gl4p4x2a";

describe("CMS course operations", () => {
  it("accepts a safe relocation and allows an intentional level-only placement", () => {
    expect(cmsCourseMoveSchema.safeParse({ levelCode: "B2", primaryNodeId: courseId }).success).toBe(true);
    expect(cmsCourseMoveSchema.safeParse({ levelCode: "C1", primaryNodeId: null }).success).toBe(true);
    expect(cmsCourseMoveSchema.safeParse({}).success).toBe(false);
    expect(cmsCourseMoveSchema.safeParse({ levelCode: "Z9" }).success).toBe(false);
  });

  it("limits bulk edits to safe editorial fields", () => {
    expect(cmsCourseBulkUpdateSchema.safeParse({ courseIds: [courseId], accessMode: "SUBSCRIPTION", isVisibleInCatalog: false }).success).toBe(true);
    expect(cmsCourseBulkUpdateSchema.safeParse({ courseIds: [courseId], title: "Unsafe bulk rename" }).success).toBe(false);
    expect(cmsCourseBulkUpdateSchema.safeParse({ courseIds: [] as string[], accessMode: "FREE" }).success).toBe(false);
  });

  it("compares revision snapshots by changed field path", () => {
    expect(diffRevisionSnapshots(
      { title: "A1 basics", access: { mode: "FREE" }, modules: ["m1"] },
      { title: "A1 essentials", access: { mode: "SUBSCRIPTION" }, modules: ["m1", "m2"] },
    )).toEqual([
      { path: "access.mode", before: "FREE", after: "SUBSCRIPTION" },
      { path: "modules", before: ["m1"], after: ["m1", "m2"] },
      { path: "title", before: "A1 basics", after: "A1 essentials" },
    ]);
  });

  it("allows physical deletion only for a never-published course with no historical impact", () => {
    const emptyImpact = {
      courseId,
      title: "Private draft",
      wasEverPublished: false,
      studentsAdded: 0,
      legacyEnrolments: 0,
      progressRecords: 0,
      activeProgressions: 0,
      teacherAssignments: 0,
      purchases: 0,
      entitlements: 0,
      analyticsRecords: 0,
      learnerVocabularyRecords: 0,
      commerceProducts: 0,
      certificates: 0,
    };
    expect(canPhysicallyDeleteCmsCourse(emptyImpact)).toBe(true);
    expect(canPhysicallyDeleteCmsCourse({ ...emptyImpact, wasEverPublished: true })).toBe(false);
    expect(canPhysicallyDeleteCmsCourse({ ...emptyImpact, progressRecords: 1 })).toBe(false);
    expect(canPhysicallyDeleteCmsCourse({ ...emptyImpact, purchases: 1 })).toBe(false);
  });
});
