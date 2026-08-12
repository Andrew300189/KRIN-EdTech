import { expect, test } from "playwright/test";

test.describe("public CEFR curriculum", () => {
  test("keeps the A1 path navigable from level to section to topic", async ({ page }) => {
    await page.goto("/courses/a1");
    await expect(page.getByRole("heading", { name: "A1 — Beginner" })).toBeVisible();

    await page.getByRole("link", { name: "Open Adjectives and adverbs for A1" }).click();
    await expect(page).toHaveURL(/\/courses\/a1\/adjectives-and-adverbs$/);
    await expect(page.getByRole("heading", { name: "Adjectives and adverbs" })).toBeVisible();

    await page.getByRole("link", { name: "Open Adjectives vs adverbs, word formation, word order for A1" }).click();
    await expect(page).toHaveURL(/\/courses\/a1\/adjectives-and-adverbs\/adjectives-vs-adverbs-word-formation-word-order$/);
    await expect(page.getByRole("heading", { name: "Adjectives vs adverbs, word formation, word order" })).toBeVisible();
  });

  test("does not broaden an invalid level filter into an all-level catalogue", async ({ page }) => {
    await page.goto("/courses?level=not-a-level");

    await expect(page.getByRole("heading", { name: "No published courses match these filters." })).toBeVisible();
    await expect(page.getByText("Results are not filled with unrelated course content.")).toBeVisible();
  });
});
