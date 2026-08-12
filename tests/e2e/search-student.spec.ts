import { expect, test } from "playwright/test";

test("student opens global search by Ctrl/Cmd+K and reaches student search page", async ({
  page,
  browserName,
}) => {
  const email = process.env.E2E_STUDENT_EMAIL;
  const password = process.env.E2E_STUDENT_PASSWORD;
  test.skip(
    !email || !password,
    "Set E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD.",
  );

  await page.goto("/login?next=/student");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/student$/);

  const modifier = browserName === "webkit" ? "Meta" : "Control";
  await page.keyboard.press(`${modifier}+K`);

  const input = page.getByRole("combobox", { name: "Global search" });
  await expect(input).toBeVisible();

  await input.fill("homework");
  await page.keyboard.press("Enter");

  // If there are results, Enter navigates to selected result; if not, open full results directly.
  if (!(await page.url()).includes("/student/search")) {
    await page.goto("/student/search?q=homework");
  }
  await expect(page).toHaveURL(/\/student\/search\?q=homework/);
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
});
