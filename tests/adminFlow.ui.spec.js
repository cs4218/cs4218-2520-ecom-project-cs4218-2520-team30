import path from "path";
import { fileURLToPath } from "url";

import { test, expect } from "@playwright/test";

import {
  PLAYWRIGHT_ADMIN_EMAIL,
  PLAYWRIGHT_ADMIN_PASSWORD,
  PLAYWRIGHT_PREFIX,
} from "./playwrightDb.js";
import { cleanupPlaywrightData } from "./uiTestUtils.js";

// Alek Kwek, A0273471A
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productPhotoPath = path.resolve(
  __dirname,
  "../client/public/logo192.png"
);

async function loginAsAdmin(page) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email ").fill(PLAYWRIGHT_ADMIN_EMAIL);
  await page
    .getByPlaceholder("Enter Your Password")
    .fill(PLAYWRIGHT_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL("/");
}

async function openAntSelect(page, placeholderText) {
  await page.locator(".ant-select").filter({ hasText: placeholderText }).click();
}

function antOption(page, optionText) {
  return page
    .locator(".ant-select-dropdown .ant-select-item-option-content")
    .filter({ hasText: optionText })
    .first();
}

async function selectAntOption(page, optionText) {
  await antOption(page, optionText).click();
}

async function createCategory(page, categoryName) {
  await page.goto("/dashboard/admin/create-category");
  await page.getByPlaceholder("Enter new category").fill(categoryName);
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByRole("cell", { name: categoryName })).toBeVisible();
}

async function createProduct(page, { categoryName, productName, description }) {
  await page.goto("/dashboard/admin/create-product");
  await openAntSelect(page, "Select a category");
  await selectAntOption(page, categoryName);
  await page.locator('input[type="file"]').setInputFiles(productPhotoPath);
  await page.getByPlaceholder("write a name").fill(productName);
  await page.getByPlaceholder("write a description").fill(description);
  await page.getByPlaceholder("write a Price").fill("25");
  await page.getByPlaceholder("write a quantity").fill("5");
  await openAntSelect(page, "Select Shipping");
  await selectAntOption(page, "Yes");
  await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
  await expect(page).toHaveURL("/dashboard/admin/products");
}

test.describe("Admin dashboard flows", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupPlaywrightData();
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    await cleanupPlaywrightData();
  });

  test("Unauthenticated user cannot directly access the admin dashboard", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL(/\/login$/);

    await context.close();
  });

  test("Admin creates, edits, and deletes a category across admin pages", async ({
    page,
  }) => {
    const initialCategory = `${PLAYWRIGHT_PREFIX} category alpha`;
    const updatedCategory = `${PLAYWRIGHT_PREFIX} category beta`;

    await page.goto("/dashboard/admin/create-category");
    await page.getByPlaceholder("Enter new category").fill(initialCategory);
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByRole("cell", { name: initialCategory })).toBeVisible();

    await page.goto("/dashboard/admin/create-product");
    await openAntSelect(page, "Select a category");
    await expect(antOption(page, initialCategory)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/dashboard/admin/create-category");
    const row = page.locator("tr", {
      has: page.getByRole("cell", { name: initialCategory }),
    });
    await row.getByRole("button", { name: "Edit" }).click();
    await page
      .locator(".ant-modal-content input[placeholder=\"Enter new category\"]")
      .fill(updatedCategory);
    await page
      .locator(".ant-modal-content button", { hasText: "Submit" })
      .click();
    await expect(page.getByRole("cell", { name: updatedCategory })).toBeVisible();

    await page.goto("/dashboard/admin/create-product");
    await openAntSelect(page, "Select a category");
    await expect(antOption(page, updatedCategory)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/dashboard/admin/create-category");
    const updatedRow = page.locator("tr", {
      has: page.getByRole("cell", { name: updatedCategory }),
    });
    await updatedRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("cell", { name: updatedCategory })).toHaveCount(0);

    await page.goto("/dashboard/admin/create-product");
    await openAntSelect(page, "Select a category");
    await expect(antOption(page, updatedCategory)).toHaveCount(0);
  });

  test("Admin creates, updates, and deletes a product across admin pages", async ({
    page,
  }) => {
    const categoryName = `${PLAYWRIGHT_PREFIX} category product`;
    const productName = `${PLAYWRIGHT_PREFIX} product alpha`;
    const updatedProductName = `${PLAYWRIGHT_PREFIX} product beta`;
    const updatedDescription = "Updated Playwright product description";

    await createCategory(page, categoryName);
    await createProduct(page, {
      categoryName,
      productName,
      description: "Initial Playwright product description",
    });

    await expect(page.getByRole("heading", { name: productName })).toBeVisible();
    await page.getByRole("link", { name: productName }).click();

    await expect(page).toHaveURL(/\/dashboard\/admin\/product\//);
    await expect(page.getByPlaceholder("write a name")).toHaveValue(productName);
    await expect(
      page.getByPlaceholder("write a description")
    ).toHaveValue("Initial Playwright product description");
    await page.getByPlaceholder("write a name").fill(updatedProductName);
    await page.getByPlaceholder("write a description").fill(updatedDescription);
    await page.getByPlaceholder("write a Price").fill("30");
    await page.getByPlaceholder("write a quantity").fill("9");
    await page.locator(".ant-select").nth(1).click();
    await selectAntOption(page, "No");
    await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();

    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(
      page.getByRole("heading", { name: updatedProductName })
    ).toBeVisible();
    await expect(page.getByText(updatedDescription, { exact: true })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept("delete"));
    await page.getByRole("link", { name: updatedProductName }).click();
    await page.getByRole("button", { name: "DELETE PRODUCT" }).click();

    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(
      page.getByRole("heading", { name: updatedProductName })
    ).toHaveCount(0);
  });
});
