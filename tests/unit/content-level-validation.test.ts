import { normalizeCefrLevelCode } from "@/modules/courses/services/content.service";

describe("published content CEFR validation", () => {
  it("normalizes only the finite CEFR values accepted by Prisma", () => {
    expect(normalizeCefrLevelCode(" a1 ")).toBe("A1");
    expect(normalizeCefrLevelCode("c2")).toBe("C2");
    expect(normalizeCefrLevelCode("demo-premium-course")).toBeNull();
    expect(normalizeCefrLevelCode(undefined)).toBeNull();
  });
});
