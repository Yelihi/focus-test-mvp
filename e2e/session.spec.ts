import { test, expect } from "@playwright/test";

test.describe("Session page", () => {
  test("loads and shows start button", async ({ page }) => {
    await page.goto("/session");
    await expect(page.locator("h1")).toHaveText("Focus Session");
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  });

  test("home page links to session", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Start Session" })).toBeVisible();
    await page.getByRole("link", { name: "Start Session" }).click();
    await expect(page).toHaveURL("/session");
  });
});
