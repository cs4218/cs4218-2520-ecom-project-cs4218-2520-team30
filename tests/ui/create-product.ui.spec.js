import { test, expect } from "@playwright/test";

import {
  clearAdminTestData,
  createCategory,
  createProduct,
  loginAsAdmin,
  PLAYWRIGHT_PREFIX,
  resetAdminTestData,
} from "../uiTestUtils.js";

test.beforeEach(async () => {
  await resetAdminTestData();
});

test.afterEach(async () => {
  await clearAdminTestData();
});

// Alek Kwek, A0273471A
test.describe("Create Product UI flow", () => {
  // Alek Kwek, A0273471A
  test("admin can create a product after creating its category and see it on the products page", async ({
    page,
  }) => {
    const categoryName = `${PLAYWRIGHT_PREFIX} product category ${Date.now()}`;
    const productName = `${PLAYWRIGHT_PREFIX} mirrorless camera ${Date.now()}`;
    const description = "Mirrorless test camera with kit lens";

    await loginAsAdmin(page);
    await createCategory(page, categoryName);
    await createProduct(page, {
      categoryName,
      name: productName,
      description,
      price: 1299,
      quantity: 15,
      imageName: "mirrorless-camera.png",
    });

    const productCard = page.locator(".card").filter({ hasText: productName });
    await expect(productCard).toHaveCount(1);
    await expect(productCard.getByText(description)).toBeVisible();

    await page.reload();
    await expect(productCard).toHaveCount(1);
  });

  // Alek Kwek, A0273471A
  test("admin can open an existing product from the list, update it, and see the new details persisted", async ({
    page,
  }) => {
    const suffix = Date.now();
    const categoryName = `${PLAYWRIGHT_PREFIX} update category ${suffix}`;
    const productName = `${PLAYWRIGHT_PREFIX} camera ${suffix}`;
    const updatedProductName = `${productName} pro`;
    const description = "Starter camera listing for update flow";
    const updatedDescription = "Updated camera listing with refreshed details";

    await loginAsAdmin(page);
    await createCategory(page, categoryName);
    await createProduct(page, {
      categoryName,
      name: productName,
      description,
      price: 999,
      quantity: 8,
      imageName: "camera-update.png",
    });

    await page.getByRole("link", { name: new RegExp(productName, "i") }).click();
    await expect(page).toHaveURL(/\/dashboard\/admin\/product\/.+/);
    await expect(page.getByRole("heading", { name: /update product/i })).toBeVisible();
    await expect(page.locator('input[placeholder="write a name"]')).toHaveValue(productName);

    await page.locator('input[placeholder="write a name"]').fill(updatedProductName);
    await page
      .locator('textarea[placeholder="write a description"]')
      .fill(updatedDescription);
    await page.locator('input[placeholder="write a Price"]').fill("1199");
    await page.locator('input[placeholder="write a quantity"]').fill("11");

    await page.getByRole("button", { name: /update product/i }).click();

    await expect(page).toHaveURL("/dashboard/admin/products");

    const updatedCard = page.locator(".card").filter({
      hasText: updatedProductName,
    });
    await expect(updatedCard).toHaveCount(1);
    await expect(updatedCard.getByText(updatedDescription)).toBeVisible();

    await page.getByRole("link", { name: new RegExp(updatedProductName, "i") }).click();
    await expect(page.locator('input[placeholder="write a name"]')).toHaveValue(
      updatedProductName
    );
    await expect(
      page.locator('textarea[placeholder="write a description"]')
    ).toHaveValue(updatedDescription);

    page.once("dialog", (dialog) => dialog.accept("delete"));
    await page.getByRole("button", { name: /delete product/i }).click();
    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(updatedCard).toHaveCount(0);
  });
});
