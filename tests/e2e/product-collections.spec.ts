import { expect, test } from "playwright/test";

test("professional English collection is a dedicated public catalogue", async ({ page }) => {
  await page.goto("/professional");
  await expect(page.getByRole("heading", { name: "English courses for professional contexts." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Published courses" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse all courses" })).toHaveAttribute("href", "/courses");
});

test("English tests collection is a dedicated public catalogue", async ({ page }) => {
  await page.goto("/tests");
  await expect(page.getByRole("heading", { name: "Practise with published English test courses." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Published courses" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse Professional English" })).toHaveAttribute("href", "/professional");
});
