// Basil Boh A0273232M

import { test, expect } from "@playwright/test";

test.describe("Privacy Policy Page E2E Tests", () => {
  // Basil Boh A0273232M
  test("TC1: should display the policy page with title and policy content", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/policy");

    await expect(page).toHaveTitle(/Privacy Policy/i);
    await expect(page.getByText("add privacy policy").first()).toBeVisible();
    await expect(
      page.getByRole("img", { name: "contactus" })
    ).toBeVisible();
  });

  // Basil Boh A0273232M
  test("TC2: should open the privacy policy page from the footer link on About", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/about");

    await page.getByRole("link", { name: "Privacy Policy" }).click();

    await expect(page).toHaveURL(/\/policy/);
    await expect(page).toHaveTitle(/Privacy Policy/i);
    await expect(page.getByText("add privacy policy").first()).toBeVisible();
  });
});
