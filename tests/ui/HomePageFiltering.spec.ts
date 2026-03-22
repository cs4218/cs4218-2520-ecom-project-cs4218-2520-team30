/**
 * Black-box E2E: Home page category + price filtering and reset.
 * Requires the React app (port 3000) and the API (Playwright webServer starts server + client when configured).
 * Run: npm run test:ui
 */

import { test, expect } from "@playwright/test";

test("Home page: category filter, price filter, then reset restores default list", async ({
  page,
}) => {
  // Lum Yi Ren Johannsen, A0273503L

  // ARRANGE
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible({
    timeout: 30_000,
  });

  const filters = page.locator(".home-page .filters");
  await expect(filters.getByText("Filter By Category")).toBeVisible();

  const productGrid = page.locator(".home-page .col-md-9");
  await expect(productGrid.locator(".card").first()).toBeVisible({ timeout: 30_000 });

  const initialCardCount = await productGrid.locator(".card").count();
  expect(
    initialCardCount,
    "Need at least one product on the home page for this E2E"
  ).toBeGreaterThan(0);

  const initialFirstTitle = (
    await productGrid.locator(".card .card-title").first().innerText()
  ).trim();

  // ACT 1 — Category filter
  const categoryCheckbox = filters.getByRole("checkbox").first();
  await expect(categoryCheckbox).toBeVisible();

  const filtersPost1 = page.waitForResponse(
    (res) =>
      res.url().includes("/api/v1/product/product-filters") &&
      res.request().method() === "POST"
  );
  await categoryCheckbox.check();
  const response1 = await filtersPost1;
  expect(response1.ok()).toBeTruthy();

  // ASSERT 1 — Product grid updates after category filter (API + visible change)
  const json1 = await response1.json();
  expect(Array.isArray(json1.products)).toBe(true);

  await expect(async () => {
    const count = await productGrid.locator(".card").count();
    const title = (await productGrid.locator(".card .card-title").first().innerText()).trim();
    expect(count !== initialCardCount || title !== initialFirstTitle).toBe(true);
  }).toPass({ timeout: 15_000 });

  const afterCategoryCount = await productGrid.locator(".card").count();
  const afterCategoryFirstTitle = (
    await productGrid.locator(".card .card-title").first().innerText()
  ).trim();

  // ACT 2 — Price filter (labels from client/src/components/Prices.js)
  const priceRadio = filters.getByRole("radio", { name: /\$0 to 19/i });
  await expect(priceRadio).toBeVisible();

  const filtersPost2 = page.waitForResponse(
    (res) =>
      res.url().includes("/api/v1/product/product-filters") &&
      res.request().method() === "POST"
  );
  await priceRadio.click();
  const response2 = await filtersPost2;
  expect(response2.ok()).toBeTruthy();

  // ASSERT 2 — Grid reflects combined category + price filters
  const json2 = await response2.json();
  expect(Array.isArray(json2.products)).toBe(true);

  await expect(async () => {
    const count = await productGrid.locator(".card").count();
    const title = (await productGrid.locator(".card .card-title").first().innerText()).trim();
    expect(count !== afterCategoryCount || title !== afterCategoryFirstTitle).toBe(true);
  }).toPass({ timeout: 15_000 });

  // ACT 3 — Reset filters (full page reload in HomePage)
  await page.getByRole("button", { name: "RESET FILTERS" }).click();
  await page.waitForLoadState("load");

  // ASSERT 3 — Default product list restored; category filter cleared
  await expect(productGrid.locator(".card").first()).toBeVisible({ timeout: 30_000 });
  const afterResetCount = await productGrid.locator(".card").count();
  expect(afterResetCount).toBe(initialCardCount);

  const afterResetFirstTitle = (
    await productGrid.locator(".card .card-title").first().innerText()
  ).trim();
  expect(afterResetFirstTitle).toBe(initialFirstTitle);

  const categoryCheckboxAfterReset = filters.getByRole("checkbox").first();
  await expect(categoryCheckboxAfterReset).not.toBeChecked();
});
