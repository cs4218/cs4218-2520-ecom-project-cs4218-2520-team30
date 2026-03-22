// Tay Kai Jun A0283343E

import { test, expect } from "@playwright/test";

test.describe("Search Feature E2E Tests", () => {
  // Tay Kai Jun A0283343E

  test.beforeEach(async ({ page }) => {
    // Clear cart localStorage before each test to start fresh
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("cart"));
    await page.reload();
  });

  test("TC1: should search for a product from homepage, view details, add to cart, and remove from cart", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/");

    // Wait for products to load on homepage
    const firstProduct = page.locator(".card-title").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });

    // Get the product name to search for
    const productName = await firstProduct.textContent();

    // Type product name in search input and click search
    await page.getByPlaceholder("Search").fill(productName!);
    await page.getByRole("button", { name: "Search" }).click();

    // Verify we are on search results page
    await expect(page).toHaveURL(/\/search/);
    await expect(
      page.getByRole("heading", { name: "Search Results" })
    ).toBeVisible();

    // Verify results found (not "No Products Found")
    await expect(page.getByText("No Products Found")).not.toBeVisible();
    await expect(page.getByText(/Found \d+/)).toBeVisible();

    // Click More Details on the first result
    await page.getByRole("button", { name: "More Details" }).first().click();

    // Verify we are on product details page
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible({ timeout: 10000 });

    // Click Add To Cart on product detail page
    await page.getByRole("button", { name: "Add To Cart" }).click();

    // Verify "Item Added to cart" toast
    await expect(page.getByText("Item Added to cart")).toBeVisible({
      timeout: 5000,
    });

    // Navigate to cart page
    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);

    // Verify item is in the cart
    await expect(page.getByText(/You Have 1 items? in your cart/)).toBeVisible();

    // Remove item from cart
    await page.getByRole("button", { name: "Remove" }).first().click();

    // Verify cart is now empty
    await expect(page.getByText("Your Cart Is Empty")).toBeVisible({
      timeout: 5000,
    });
  });

  test("TC2: should search for a product, view details, add to cart, then click login to checkout", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/");

    // Search for a seeded product that is guaranteed to persist during the entire test suite
    const productName = "Playwright Alpha Product";
    await page.getByPlaceholder("Search").fill(productName);
    await page.getByRole("button", { name: "Search" }).click();

    // Verify search results page
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByText(/Found \d+/)).toBeVisible();

    // Click More Details on the first result
    await page.getByRole("button", { name: "More Details" }).first().click();

    // Verify product details page
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible({ timeout: 10000 });

    // Click Add To Cart
    await page.getByRole("button", { name: "Add To Cart" }).click();
    await expect(page.getByText("Item Added to cart")).toBeVisible({
      timeout: 5000,
    });

    // Navigate to cart page
    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);

    // Verify guest user sees login prompt
    await expect(page.getByText("Hello Guest")).toBeVisible();
    await expect(
      page.getByText("please login to checkout")
    ).toBeVisible();

    // Click "Plase Login to checkout" button (as-is text in code)
    await page
      .getByRole("button", { name: /login to checkout/i })
      .click();

    // Verify redirect to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "LOGIN FORM" })
    ).toBeVisible();
  });

  test("TC3: should search for a product, add to cart directly from search results, then click login to checkout", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/");

    // Wait for products to load and get a product name
    const firstProduct = page.locator(".card-title").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    const productName = await firstProduct.textContent();

    // Search for the product
    await page.getByPlaceholder("Search").fill(productName!);
    await page.getByRole("button", { name: "Search" }).click();

    // Verify search results page
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByText(/Found \d+/)).toBeVisible();

    // Click Add To Cart directly from search results (not More Details)
    await page.getByRole("button", { name: "Add To Cart" }).first().click();
    await expect(page.getByText("Item Added to cart")).toBeVisible({
      timeout: 5000,
    });

    // Navigate to cart page
    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);

    // Verify guest sees login to checkout
    await expect(page.getByText("Hello Guest")).toBeVisible();
    await expect(
      page.getByText("please login to checkout")
    ).toBeVisible();

    // Click login to checkout button
    await page
      .getByRole("button", { name: /login to checkout/i })
      .click();

    // Verify redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("TC4: should show 'No Products Found' when searching for a non-existent product", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/");

    // Search for a product that doesn't exist
    await page
      .getByPlaceholder("Search")
      .fill("xyznonexistentproduct12345");
    await page.getByRole("button", { name: "Search" }).click();

    // Verify search results page
    await expect(page).toHaveURL(/\/search/);
    await expect(
      page.getByRole("heading", { name: "Search Results" })
    ).toBeVisible();

    // Verify "No Products Found" message
    await expect(page.getByText("No Products Found")).toBeVisible();
  });

  test("TC5: should display correct search result count", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/");

    // Wait for products to load and get a product name
    const firstProduct = page.locator(".card-title").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    const productName = await firstProduct.textContent();

    // Search for the product
    await page.getByPlaceholder("Search").fill(productName!);
    await page.getByRole("button", { name: "Search" }).click();

    // Verify the count text matches the number of result cards
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByText(/Found \d+/)).toBeVisible();

    const countText = await page.getByText(/Found \d+/).textContent();
    const expectedCount = parseInt(countText!.match(/\d+/)![0]);
    const actualCards = await page.locator(".card").count();
    expect(actualCards).toBe(expectedCount);
  });

  test("TC6: should display product details correctly after clicking More Details from search", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/");

    // Wait for products to load and get a product name
    const firstProduct = page.locator(".card-title").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    const productName = await firstProduct.textContent();

    // Search for the product
    await page.getByPlaceholder("Search").fill(productName!);
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search/);

    // Get the product name from search results
    const searchResultName = await page.locator(".card-title").first().textContent();

    // Click More Details
    await page.getByRole("button", { name: "More Details" }).first().click();

    // Verify product details page shows correct product
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`Name : ${searchResultName}`)).toBeVisible();

    // Verify product details sections exist
    await expect(page.getByText(/Description :/)).toBeVisible();
    await expect(page.getByText(/Price :/)).toBeVisible();
    await expect(page.getByText(/Category :/)).toBeVisible();
  });

  test("TC7: should add multiple items from search results to cart", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/");

    // Wait for products to load and get a broad search term
    const firstProduct = page.locator(".card-title").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });

    // Use a single letter to get multiple results
    await page.getByPlaceholder("Search").fill("a");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search/);

    // Check we have results
    const resultCount = await page.locator(".card").count();

    if (resultCount >= 2) {
      // Add first item to cart
      await page.getByRole("button", { name: "Add To Cart" }).nth(0).click();
      await expect(page.getByText("Item Added to cart")).toBeVisible({
        timeout: 5000,
      });

      // Wait for toast to disappear before adding second
      await page.waitForTimeout(1000);

      // Add second item to cart
      await page.getByRole("button", { name: "Add To Cart" }).nth(1).click();
      await expect(page.getByText("Item Added to cart").first()).toBeVisible({
        timeout: 5000,
      });

      // Navigate to cart and verify 2 items
      await page.getByRole("link", { name: "Cart" }).click();
      await expect(page).toHaveURL(/\/cart/);
      await expect(
        page.getByText(/You Have 2 items in your cart/)
      ).toBeVisible();
    }
  });

  test("TC8: should persist cart after navigating away and back", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/");

    // Wait for products to load
    const firstProduct = page.locator(".card-title").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    const productName = await firstProduct.textContent();

    // Search and add to cart
    await page.getByPlaceholder("Search").fill(productName!);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search/);
    await page.getByRole("button", { name: "Add To Cart" }).first().click();
    await expect(page.getByText("Item Added to cart")).toBeVisible({
      timeout: 5000,
    });

    // Navigate to homepage
    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");

    // Navigate back to cart
    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);

    // Item should still be in cart
    await expect(page.getByText(/You Have 1 items? in your cart/)).toBeVisible();
  });

  test("TC9: should not navigate away when searching with empty input", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/");

    // Click search with empty input — should stay on homepage since API call fails
    await page.getByPlaceholder("Search").fill("");
    await page.getByRole("button", { name: "Search" }).click();

    // Should remain on homepage since empty keyword causes API error
    await expect(page).toHaveURL("/");
  });

  test("TC10: should show search results page heading as 'Search Results' (not misspelled)", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E — verifies the typo fix
    await page.goto("/");

    const firstProduct = page.locator(".card-title").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    const productName = await firstProduct.textContent();

    await page.getByPlaceholder("Search").fill(productName!);
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search/);

    // Verify correct spelling
    await expect(
      page.getByRole("heading", { name: "Search Results" })
    ).toBeVisible();

    // Verify the old misspelling is NOT present
    await expect(page.getByText("Search Resuts")).not.toBeVisible();
  });
});
