import { expect, test } from "playwright/test";

test("public search opens and handles empty/no-results states", async ({ page }) => {
  await page.goto("/");

  const input = page.getByRole("combobox", { name: "Global search" });
  await expect(input).toBeVisible();

  await page.goto("/search?q=zzzzunlikelyterm");
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
  await expect(page.getByText(/Nothing found for/i)).toBeVisible();
});

test("public search can navigate to full results page", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "Global search" });
  await input.fill("english");

  // Full results link appears only when at least one result exists.
  const hasSeed = process.env.E2E_EXPECT_SEEDED_CONTENT === "1";
  test.skip(!hasSeed, "Set E2E_EXPECT_SEEDED_CONTENT=1 when seeded content is available.");

  await page.getByRole("link", { name: "Show all results" }).click();
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
});
