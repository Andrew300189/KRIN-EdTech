import { hasPermission } from "@/core/server/role-guard";
import { parseRole } from "@/core/utils/role";
import { getPostLoginPath } from "@/core/utils/workspace-path";

describe("role workspace boundaries", () => {
  it("does not grant administrative permission to a teacher", () => {
    expect(hasPermission("teacher", "teacher:groups")).toBe(true);
    expect(hasPermission("teacher", "admin:manage")).toBe(false);
    expect(hasPermission("student", "teacher:assignments")).toBe(false);
  });

  it("rejects a safe but cross-role callback", () => {
    expect(getPostLoginPath("student@example.com", "STUDENT", "/teacher/analytics")).toBe("/student");
    expect(getPostLoginPath("teacher@example.com", "TEACHER", "/admin/users")).toBe("/teacher");
  });

  it("uses TEACHER as the canonical role while accepting an existing legacy session", () => {
    expect(parseRole("TEACHER")).toBe("teacher");
    expect(parseRole("instructor")).toBe("teacher");
  });
});
