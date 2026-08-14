import { canAccessCms } from "@/core/access/cms-access";
import { isPlatformOwner, normalizeEmail } from "@/core/server/platform-owner";
import {
  getPostLoginPath,
  getUserWorkspacePath,
  hasCmsAccess,
  resolveDashboardByRole,
  resolvePostAuthDestination,
} from "@/core/utils/workspace-path";

describe("cms owner access", () => {
  const originalOwnerEmail = process.env.PLATFORM_OWNER_EMAIL;

  afterEach(() => {
    if (originalOwnerEmail === undefined) {
      delete process.env.PLATFORM_OWNER_EMAIL;
    } else {
      process.env.PLATFORM_OWNER_EMAIL = originalOwnerEmail;
    }
  });

  it("grants CMS access to the platform owner email", () => {
    expect(isPlatformOwner("  ANDREYKOSIR@GMAIL.COM  ")).toBe(true);
    expect(normalizeEmail("  Owner@Example.COM ")).toBe("owner@example.com");
    expect(canAccessCms("andreykosir@gmail.com", "student")).toBe(true);
    expect(hasCmsAccess("andreykosir@gmail.com", "teacher")).toBe(true);
  });

  it.each(["STUDENT", "TEACHER"])(
    "routes the owner to /cms before the %s role dashboard",
    (role) => {
      expect(resolvePostAuthDestination("andreykosir@gmail.com", role)).toBe(
        "/cms",
      );
      expect(getUserWorkspacePath("andreykosir@gmail.com", role)).toBe("/cms");
      expect(getPostLoginPath("andreykosir@gmail.com", role, "/teacher")).toBe(
        "/cms",
      );
      expect(
        getPostLoginPath("andreykosir@gmail.com", role, "/student/courses"),
      ).toBe("/cms");
    },
  );

  it("preserves a safe CMS callback for the owner", () => {
    expect(
      getPostLoginPath("andreykosir@gmail.com", "TEACHER", "/cms/users"),
    ).toBe("/cms/users");
  });

  it("resolves teacher and student only after checking the owner email", () => {
    expect(
        resolvePostAuthDestination("teacher@example.com", "TEACHER"),
    ).toBe("/teacher");
    expect(resolvePostAuthDestination("student@example.com", "STUDENT")).toBe(
      "/student",
    );
  });

  it("keeps an owner-only CMS guard from redirecting non-owners back to CMS", () => {
    expect(resolveDashboardByRole("TEACHER")).toBe("/teacher");
    expect(resolveDashboardByRole("STUDENT")).toBe("/student");
    expect(resolveDashboardByRole("ADMIN")).toBe("/student");
  });

  it("keeps non-owner without CMS access in owner_only mode", () => {
    expect(isPlatformOwner("other@example.com")).toBe(false);
    expect(canAccessCms("other@example.com", "admin")).toBe(false);
    expect(hasCmsAccess("other@example.com", "content_manager")).toBe(false);
  });

  it("fails closed when the owner email is missing", () => {
    delete process.env.PLATFORM_OWNER_EMAIL;
    expect(isPlatformOwner("andreykosir@gmail.com")).toBe(false);
  });
});
