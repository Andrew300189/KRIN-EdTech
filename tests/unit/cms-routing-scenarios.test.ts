import {
  getUserWorkspacePath,
  hasCmsAccess,
  resolvePostAuthDestination,
} from "@/core/utils/workspace-path";

describe("cms routing scenarios", () => {
  it("routes student@test.com to /student", () => {
    expect(getUserWorkspacePath("student@test.com", "student")).toBe(
      "/student",
    );
  });

  it("routes teacher@test.com to /teacher", () => {
    expect(getUserWorkspacePath("teacher@test.com", "teacher")).toBe(
      "/teacher",
    );
  });

  it("denies CMS access for student and teacher", () => {
    expect(hasCmsAccess("student@test.com", "student")).toBe(false);
    expect(hasCmsAccess("teacher@test.com", "teacher")).toBe(false);
  });

  it("google oauth owner goes to /cms", () => {
    expect(resolvePostAuthDestination("andreykosir@gmail.com", "student")).toBe(
      "/cms",
    );
  });

  it("google oauth non-owner goes to their role dashboard", () => {
    expect(
      resolvePostAuthDestination("other-google@example.com", "student"),
    ).toBe("/student");
    expect(
      resolvePostAuthDestination("teacher-google@example.com", "teacher"),
    ).toBe("/teacher");
  });
});
