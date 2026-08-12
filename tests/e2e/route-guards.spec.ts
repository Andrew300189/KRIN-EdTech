import { expect, test, type Page } from "playwright/test";

async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
  next = "/",
) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test.describe("route guard direct-open and refresh", () => {
  test("anonymous user is redirected from protected routes on direct URL open and refresh", async ({
    page,
  }) => {
    const protectedRoutes = [
      "/student",
      "/student/search",
      "/teacher",
      "/teacher/search",
      "/cms",
      "/cms/overview",
      "/cms/platform-features",
    ];

    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);

    for (const route of protectedRoutes) {
      await page.goto(route);
      const expectedLogin =
        route === "/cms" || route.startsWith("/cms/")
          ? `/login\\?callbackUrl=${encodeURIComponent(route).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
          : `/login\\?reason=session_required&next=${encodeURIComponent(route).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
      await expect(page).toHaveURL(new RegExp(expectedLogin));

      await page.reload();
      await expect(page).toHaveURL(new RegExp(expectedLogin));
    }
  });

  test("student workspace routes survive direct open and refresh after login", async ({
    page,
  }) => {
    const email = process.env.E2E_STUDENT_EMAIL;
    const password = process.env.E2E_STUDENT_PASSWORD;
    test.skip(
      !email || !password,
      "Set E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD.",
    );

    await loginWithCredentials(page, email!, password!, "/student");
    await expect(page).toHaveURL(/\/student$/);

    const studentRoutes = ["/student", "/student/search?q=grammar"];
    for (const route of studentRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(
        new RegExp(
          route.includes("?")
            ? route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            : `${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        ),
      );

      await page.reload();
      await expect(page).toHaveURL(
        new RegExp(
          route.includes("?")
            ? route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            : `${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        ),
      );
    }

    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/student$/);

    await page.goto("/cms");
    await expect(page).toHaveURL(/\/(dashboard|student)$/);

    await page.goto("/cms/private");
    await expect(page).toHaveURL(/\/(dashboard|student)$/);
  });

  test("teacher workspace routes survive direct open and refresh after login", async ({
    page,
  }) => {
    const email = process.env.E2E_TEACHER_EMAIL;
    const password = process.env.E2E_TEACHER_PASSWORD;
    test.skip(
      !email || !password,
      "Set E2E_TEACHER_EMAIL and E2E_TEACHER_PASSWORD.",
    );

    await loginWithCredentials(page, email!, password!, "/teacher");
    await expect(page).toHaveURL(/\/teacher$/);

    const teacherRoutes = ["/teacher", "/teacher/search?q=group"];
    for (const route of teacherRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(
        new RegExp(
          route.includes("?")
            ? route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            : `${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        ),
      );

      await page.reload();
      await expect(page).toHaveURL(
        new RegExp(
          route.includes("?")
            ? route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            : `${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        ),
      );
    }

    await page.goto("/student");
    await expect(page).toHaveURL(/\/teacher$/);

    await page.goto("/cms");
    await expect(page).toHaveURL(/\/(dashboard|teacher)$/);

    await page.goto("/cms/private");
    await expect(page).toHaveURL(/\/(dashboard|teacher)$/);
  });

  test("owner can open cms routes directly and after refresh", async ({
    page,
  }) => {
    const email = process.env.E2E_OWNER_EMAIL;
    const password = process.env.E2E_OWNER_PASSWORD;
    test.skip(
      !email || !password,
      "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD.",
    );

    await loginWithCredentials(page, email!, password!, "/cms");
    await expect(page).toHaveURL(/\/(cms|admin)$/);

    await page.goto("/cms");
    await expect(page).toHaveURL(/\/(cms|admin)$/);

    await page.reload();
    await expect(page).toHaveURL(/\/(cms|admin)$/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);

    await page.reload();
    await expect(page).toHaveURL(/\/admin$/);
  });
});
