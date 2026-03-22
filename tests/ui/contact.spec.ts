// Basil Boh A0273232M

import { test, expect } from "@playwright/test";

test.describe("Contact Page E2E Tests", () => {
  // Basil Boh A0273232M
  test("TC1: should display the contact page with heading, contact details, and hero image", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/contact");

    await expect(page).toHaveTitle(/Contact us/i);
    await expect(
      page.getByRole("heading", { name: "CONTACT US" })
    ).toBeVisible();
    await expect(page.getByText("www.help@ecommerceapp.com")).toBeVisible();
    await expect(page.getByText("012-3456789")).toBeVisible();
    await expect(page.getByText("1800-0000-0000")).toBeVisible();
    await expect(
      page.getByRole("img", { name: "contactus" })
    ).toBeVisible();
  });

  // Basil Boh A0273232M
  test("TC2: should open the contact page from the footer link on About", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/about");

    await page.getByRole("link", { name: "Contact" }).click();

    await expect(page).toHaveURL(/\/contact/);
    await expect(
      page.getByRole("heading", { name: "CONTACT US" })
    ).toBeVisible();
  });
});
