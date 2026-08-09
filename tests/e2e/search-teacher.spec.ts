import { expect, test } from "playwright/test";

test("teacher uses workspace search and reaches teacher search page", async ({ page, browserName }) => {
  const email = process.env.E2E_TEACHER_EMAIL;
  const password = process.env.E2E_TEACHER_PASSWORD;
  test.skip(!email || !password, "Set E2E_TEACHER_EMAIL and E2E_TEACHER_PASSWORD.");

  await page.goto("/login?next=/teacher");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/teacher$/);

  const modifier = browserName === "webkit" ? "Meta" : "Control";
  await page.keyboard.press(`${modifier}+K`);

  const input = page.getByRole("combobox", { name: "Global search" });
  await expect(input).toBeVisible();

  await input.fill("group");
  await page.goto("/teacher/search?q=group");

  await expect(page).toHaveURL(/\/teacher\/search\?q=group/);
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
});
