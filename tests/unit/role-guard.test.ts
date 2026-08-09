import { hasPermission } from "@/core/server/role-guard";
import { getPostLoginPath } from "@/core/utils/workspace-path";

describe("role workspace boundaries", () => {
  it("does not grant administrative permission to a teacher", () => {
    expect(hasPermission("teacher", "teacher:groups")).toBe(true);
    expect(hasPermission("teacher", "admin:manage")).toBe(false);
    expect(hasPermission("student", "teacher:assignments")).toBe(false);
  });

  it("rejects a safe but cross-role callback", () => {
    expect(getPostLoginPath("student@example.com", "STUDENT", "/teacher/analytics")).toBe("/student");
    expect(getPostLoginPath("teacher@example.com", "INSTRUCTOR", "/admin/users")).toBe("/teacher");
  });
});
