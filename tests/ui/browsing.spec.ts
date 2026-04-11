// Basil Boh A0273232M

import { test, expect } from "@playwright/test";

test.describe("Product browsing and details E2E", () => {
  // Basil Boh A0273232M

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("cart"));
    await page.reload();
  });

  test("TC1: should load homepage with catalog, filters, and product cards", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "All Products" })
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole("heading", { name: "Filter By Category" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Filter By Price" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "RESET FILTERS" })
    ).toBeVisible();

    await expect(page.locator(".banner-img")).toBeVisible();

    const productCards = page.locator(".home-page .col-md-9 .card.m-2");
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
    expect(await productCards.count()).toBeGreaterThan(0);

    const firstName = page.locator(".home-page .col-md-9 .card-title").first();
    await expect(firstName).toBeVisible();
    await expect(firstName).not.toBeEmpty();
  });

  test("TC2: should open product details from homepage via More Details", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/");

    const nameLocator = page.locator(".home-page .col-md-9 .card-title").first();
    await expect(nameLocator).toBeVisible({ timeout: 10000 });
    const productName = (await nameLocator.textContent())?.trim();
    expect(productName).toBeTruthy();

    await page.getByRole("button", { name: "More Details" }).first().click();

    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(`Name : ${productName}`)).toBeVisible();
    await expect(page.getByText(/Description :/)).toBeVisible();
    await expect(page.getByText(/Price :/)).toBeVisible();
    await expect(page.getByText(/Category :/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add To Cart" })
    ).toBeVisible();
  });

  test("TC3: should show similar products section with either results or empty state", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/");

    await expect(page.locator(".home-page .col-md-9 .card-title").first()).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "More Details" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole("heading", { name: /Similar Products/ })).toBeVisible();
    
    // Basil Boh A0273232M - robustness: use or() for retriable assertion on multiple possibilities
    const noSimilar = page.getByText("No Similar Products found");
    const similarMoreDetails = page
      .locator(".similar-products")
      .getByRole("button", { name: "More Details" });

    await expect(noSimilar.or(similarMoreDetails.first())).toBeVisible({ timeout: 15000 });
  });

  test("TC4: should navigate from similar product to another product details page", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/");

    await expect(page.locator(".home-page .col-md-9 .card-title").first()).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "More Details" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible({ timeout: 10000 });

    const similarMoreDetails = page
      .locator(".similar-products")
      .getByRole("button", { name: "More Details" })
      .first();

    if (!(await similarMoreDetails.isVisible())) {
      test.skip();
      return;
    }

    const similarCardTitle = page.locator(".similar-products .card-title").first();
    const relatedName = (await similarCardTitle.textContent())?.trim();
    expect(relatedName).toBeTruthy();

    await similarMoreDetails.click();

    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`Name : ${relatedName}`)).toBeVisible();
  });

  test("TC5: should filter by category and reset filters via homepage controls", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/");

    const productCards = page.locator(".home-page .col-md-9 .card.m-2");
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
    const countUnfiltered = await productCards.count();

    const categoryCheckbox = page
      .locator(".home-page .filters")
      .getByRole("checkbox")
      .first();
    const filterResponse = page.waitForResponse(
      (res) =>
        res.url().includes("product-filters") &&
        res.request().method() === "POST" &&
        res.ok()
    );
    await categoryCheckbox.check();
    await expect(categoryCheckbox).toBeChecked();
    await filterResponse;

    const countFiltered = await productCards.count();
    expect(countFiltered).toBeLessThanOrEqual(countUnfiltered);

    await page.getByRole("button", { name: "RESET FILTERS" }).click();
    await expect(
      page.getByRole("heading", { name: "All Products" })
    ).toBeVisible({ timeout: 10000 });
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });

    await expect(categoryCheckbox).not.toBeChecked();
  });

  test("TC6: should filter products by price range on homepage", async ({ page }) => {
    // Basil Boh A0273232M
    await page.goto("/");

    const productCards = page.locator(".home-page .col-md-9 .card.m-2");
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
    const countBefore = await productCards.count();

    const filterResponse = page.waitForResponse(
      (res) =>
        res.url().includes("product-filters") &&
        res.request().method() === "POST" &&
        res.ok()
    );
    await page
      .locator(".home-page .filters")
      .getByRole("radio", { name: "$0 to 19" })
      .check();
    await filterResponse;

    const countFiltered = await productCards.count();
    expect(countFiltered).toBeLessThanOrEqual(countBefore);

    await page.getByRole("button", { name: "RESET FILTERS" }).click();
    await expect(
      page.getByRole("heading", { name: "All Products" })
    ).toBeVisible({ timeout: 10000 });
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
  });

  test("TC7: should load more products when Loadmore is available", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/");

    const productCards = page.locator(".home-page .col-md-9 .card.m-2");
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });

    const loadMore = page.getByRole("button", { name: /Loadmore/i });
    await expect(loadMore).toBeVisible({ timeout: 10000 });

    const countBefore = await productCards.count();
    await loadMore.click();
    await expect
      .poll(async () => productCards.count(), {
        timeout: 15000,
      })
      .toBeGreaterThan(countBefore);
  });
});
