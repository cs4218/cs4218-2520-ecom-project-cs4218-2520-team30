// Alek Kwek, A0273471A
import { test, expect } from "@playwright/test";

import {
  cleanupPlaywrightArtifacts,
  cleanupPlaywrightData,
  ensurePlaywrightAdmin,
  getProductFixturePath,
  loginAsPlaywrightAdmin,
  makePlaywrightName,
} from "./uiTestUtils.js";

const openSelectOption = async (page, selectIndex, optionText) => {
  await page.locator(".ant-select").nth(selectIndex).click();
  await page.locator(".ant-select-item-option-content", { hasText: optionText }).click();
};

test.describe.serial("Admin UI flows", () => {
  test.beforeAll(async () => {
    await cleanupPlaywrightData("beforeAll");
    await ensurePlaywrightAdmin();
  });

  test.afterEach(async () => {
    await cleanupPlaywrightArtifacts("afterEach");
  });

  test.afterAll(async () => {
    await cleanupPlaywrightData("afterAll");
  });

  // Alek Kwek, A0273471A
  test("admin can log in and create, edit, and delete a category through the real UI", async ({
    page,
  }) => {
    const categoryName = makePlaywrightName("category");
    const updatedCategoryName = makePlaywrightName("category updated");

    await loginAsPlaywrightAdmin(page);
    await page.goto("/dashboard/admin/create-category");

    await expect(
      page.getByRole("heading", { name: /manage category/i })
    ).toBeVisible();

    await page.getByPlaceholder("Enter new category").fill(categoryName);
    await page.getByRole("button", { name: "Submit" }).click();

    const categoryCell = page.locator("tbody td", { hasText: categoryName });
    await expect(categoryCell).toBeVisible();

    const categoryRow = page.locator("tbody tr").filter({ hasText: categoryName });
    await categoryRow.getByRole("button", { name: "Edit" }).click();

    const modal = page.locator(".ant-modal");
    await expect(modal).toBeVisible();
    await modal.getByPlaceholder("Enter new category").fill(updatedCategoryName);
    await modal.getByRole("button", { name: "Submit" }).click();

    const updatedCategoryCell = page.locator("tbody td", {
      hasText: updatedCategoryName,
    });
    await expect(updatedCategoryCell).toBeVisible();
    await expect(categoryCell).toHaveCount(0);

    const updatedRow = page
      .locator("tbody tr")
      .filter({ hasText: updatedCategoryName });
    await updatedRow.getByRole("button", { name: "Delete" }).click();

    await expect(updatedCategoryCell).toHaveCount(0);
  });

  // Alek Kwek, A0273471A
  test("admin can create, update, and delete a product across category, product list, and update pages", async ({
    page,
  }) => {
    const categoryName = makePlaywrightName("category");
    const productName = makePlaywrightName("product");
    const updatedProductName = makePlaywrightName("product updated");
    const updatedDescription = `${updatedProductName} description`;
    const productFixturePath = getProductFixturePath();

    await loginAsPlaywrightAdmin(page);

    await page.goto("/dashboard/admin/create-category");
    await page.getByPlaceholder("Enter new category").fill(categoryName);
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(
      page.locator("tbody td", {
        hasText: categoryName,
      })
    ).toBeVisible();

    await page.getByRole("link", { name: "Create Product" }).click();
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    await openSelectOption(page, 0, categoryName);
    await page.locator('input[name="photo"]').setInputFiles(productFixturePath);
    await page.getByPlaceholder("write a name").fill(productName);
    await page
      .getByPlaceholder("write a description")
      .fill(`${productName} description`);
    await page.getByPlaceholder("write a Price").fill("19");
    await page.getByPlaceholder("write a quantity").fill("4");
    await openSelectOption(page, 1, "Yes");
    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();

    await page.waitForURL("**/dashboard/admin/products");
    await expect(page.getByRole("heading", { name: /all products list/i })).toBeVisible();
    await expect(page.locator(".card-title", { hasText: productName })).toBeVisible();

    await page.getByRole("link", { name: new RegExp(productName) }).click();
    await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();
    await expect(page.getByPlaceholder("write a name")).toHaveValue(productName);
    await expect(page.getByPlaceholder("write a description")).toHaveValue(
      `${productName} description`
    );

    await page.getByPlaceholder("write a name").fill(updatedProductName);
    await page.getByPlaceholder("write a description").fill(updatedDescription);
    await page.getByPlaceholder("write a Price").fill("27");
    await page.getByPlaceholder("write a quantity").fill("9");
    await openSelectOption(page, 1, "No");
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

    await page.waitForURL("**/dashboard/admin/products");
    await expect(
      page.locator(".card-title", { hasText: updatedProductName })
    ).toBeVisible();
    await expect(page.getByText(updatedDescription)).toBeVisible();

    await page.getByRole("link", { name: new RegExp(updatedProductName) }).click();
    page.once("dialog", (dialog) => dialog.accept("delete"));
    await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

    await page.waitForURL("**/dashboard/admin/products");
    await expect(
      page.locator(".card-title", { hasText: updatedProductName })
    ).toHaveCount(0);
  });
});
