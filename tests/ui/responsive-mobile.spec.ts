import { test, expect } from "@playwright/test";

test.describe("Home page — mobile responsive E2E", () => {
  test("mobile viewport: hamburger opens nav and Cart navigation works", async ({
    page,
  }) => {
    // Lum Yi Ren Johannsen, A0273503L

    // ARRANGE
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // ACT 1
    await page.getByRole("button", { name: "Toggle navigation" }).click();

    // ASSERT 1
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Categories" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart" })).toBeVisible();

    // ACT 2
    await page.getByRole("link", { name: "Cart" }).click();

    // ASSERT 2
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.locator("h1")).toContainText(/Hello Guest/i);
  });
});
