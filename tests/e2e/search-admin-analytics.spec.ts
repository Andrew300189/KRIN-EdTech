import { expect, test } from "playwright/test";

test("admin analytics route is protected", async ({ page }) => {
  await page.goto("/admin/analytics");
  await expect(page).toHaveURL(/\/login/);
});

test("admin can use search analytics tools", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.");

  await page.goto("/login?next=/admin/analytics");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/admin\/analytics$/);
  await expect(page.getByRole("heading", { name: "Platform analytics" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Search analytics (30 days)" })).toBeVisible();
  await expect(page.getByText("Search analytics tools")).toBeVisible();

  const exportDaysInput = page.getByLabel("Export period in days");
  await exportDaysInput.fill("14");
  const exportContext = page.getByLabel("Export context");
  await exportContext.selectOption("PUBLIC");

  const exportLink = page.getByRole("link", { name: "Download CSV" });
  await expect(exportLink).toHaveAttribute("href", /\/api\/admin\/analytics\/search\/export\?days=14&context=PUBLIC/);

  const dryRunToggle = page.getByLabel("Dry run only");
  await expect(dryRunToggle).toBeChecked();

  await page.getByLabel("Retention in days").fill("120");
  await page.getByRole("button", { name: "Run dry cleanup" }).click();

  await expect(page.getByText(/Dry run finished:/)).toBeVisible();
});
