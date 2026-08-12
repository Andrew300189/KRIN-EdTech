import { expect, test } from "playwright/test";

test("public search opens and handles empty/no-results states", async ({
  page,
}) => {
  await page.goto("/");

  const input = page.getByRole("combobox", { name: "Global search" }).first();
  await expect(input).toBeVisible();

  await page.goto("/search?q=zzzzunlikelyterm");
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No matching published content" }),
  ).toBeVisible();
});

test("landing search preserves the query in the full-results URL", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "Global search" }).first();
  await input.fill("english");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=english/);
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
});

test("public header offers Reading, Listening and landing-section navigation", async ({
  page,
}) => {
  await page.goto("/");
  const header = page.locator("header").first();

  await expect(header.getByRole("link", { name: "Reading" })).toHaveAttribute(
    "href",
    "/courses/categories/reading",
  );
  await expect(header.getByRole("link", { name: "Listening" })).toHaveAttribute(
    "href",
    "/courses/categories/listening",
  );
  await expect(header.getByRole("link", { name: "Courses" })).toHaveAttribute(
    "href",
    "/#courses",
  );
  await expect(header.getByRole("link", { name: "Pricing" })).toHaveAttribute(
    "href",
    "/#pricing",
  );
  await expect(header.getByRole("link", { name: "Levels" })).toHaveAttribute(
    "href",
    "/#levels",
  );
  await expect(header.getByRole("button", { name: "Search" })).toHaveCount(0);
  await expect(page.locator("#courses")).toHaveCount(1);
  await expect(page.locator("#pricing")).toHaveCount(1);
  await expect(page.locator("#levels")).toHaveCount(1);
  expect(
    await page
      .locator('[aria-label="Highlighted access options"] > article')
      .count(),
  ).toBeLessThanOrEqual(4);
});

test("mobile navigation keeps the same public destinations without a search control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/");
  const header = page.locator("header").first();
  await header.getByRole("button", { name: "Open navigation menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Site navigation" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Courses", exact: true }),
  ).toHaveAttribute("href", "/#courses");
  await expect(
    dialog.getByRole("link", { name: "Levels", exact: true }),
  ).toHaveAttribute("href", "/#levels");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
