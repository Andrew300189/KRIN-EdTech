import { expect, test } from "playwright/test";

test("protects a dashboard route and preserves its internal return path", async ({ page }) => {
  await page.goto("/dashboard/courses");
  await expect(page).toHaveURL(/\/login\?reason=session_required&next=%2Fdashboard%2Fcourses/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("renders the maintained Google entry point on the login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("signs in with credentials and returns to the requested dashboard path", async ({ page }) => {
  const email = process.env.E2E_LOGIN_EMAIL;
  const password = process.env.E2E_LOGIN_PASSWORD;
  test.skip(!email || !password, "Set E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD for the database-backed credentials scenario.");

  await page.goto("/login?next=/dashboard/courses");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/courses$/);
  await expect(page.getByRole("heading", { name: "My Courses" })).toBeVisible();
});
