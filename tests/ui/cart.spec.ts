// Basil Boh A0273232M

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

interface TestUser {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  answer: string;
}

function generateTestUser(suffix = ""): TestUser {
  const timestamp = Date.now();
  return {
    name: `CartUser_${timestamp}${suffix}`,
    email: `cartuser_${timestamp}${suffix}@test.com`,
    password: "password123",
    phone: "1234567890",
    address: "456 Cart Lane",
    answer: "Football",
  };
}

async function registerViaApi(request: APIRequestContext, user: TestUser) {
  const res = await request.post("http://localhost:6060/api/v1/auth/register", {
    data: user,
  });
  expect(res.ok()).toBeTruthy();
}

async function loginUser(page: Page, email: string, password: string) {
  await page.getByPlaceholder("Enter Your Email ").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
}

async function clearCart(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("cart"));
  await page.reload();
}

test.describe("Cart shopping flow E2E", () => {
  // Basil Boh A0273232M

  test.beforeEach(async ({ page }) => {
    await clearCart(page);
  });

  test("should show empty cart message when cart has no items", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/cart");
    await expect(page.getByText("Your Cart Is Empty")).toBeVisible();
    await expect(page.getByText("Hello Guest")).toBeVisible();
  });

  test("should add from homepage, show cart summary, then remove item", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/");

    const firstTitle = page.locator(".card-title").first();
    await expect(firstTitle).toBeVisible({ timeout: 10000 });
    const productName = (await firstTitle.textContent())?.trim();
    expect(productName).toBeTruthy();

    await page.getByRole("button", { name: "ADD TO CART" }).first().click();
    await expect(page.getByText("Item Added to cart")).toBeVisible({
      timeout: 5000,
    });

    await expect(page.locator(".ant-badge")).toContainText("1");

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);

    await expect(page.getByText(/You Have 1 items? in your cart/)).toBeVisible();
    await expect(page.getByText("Hello Guest")).toBeVisible();
    await expect(
      page.getByText("please login to checkout")
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Cart Summary" })).toBeVisible();
    await expect(page.getByText("Total | Checkout | Payment")).toBeVisible();
    await expect(page.getByText(/^Total :/)).toBeVisible();

    if (productName) {
      await expect(page.getByText(productName, { exact: true }).first()).toBeVisible();
    }

    await page.getByRole("button", { name: "Remove" }).first().click();
    await expect(page.getByText("Your Cart Is Empty")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should add from product details and see item on cart page", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/");

    const firstTitle = page.locator(".home-page .card-title").first();
    await expect(firstTitle).toBeVisible({ timeout: 10000 });
    const productName = (await firstTitle.textContent())?.trim();

    await page.getByRole("button", { name: "More Details" }).first().click();
    await expect(
      page.getByRole("heading", { name: "Product Details" })
    ).toBeVisible({ timeout: 10000 });

    if (productName) {
      await expect(page.getByText(`Name : ${productName}`)).toBeVisible();
    }

    await page.getByRole("button", { name: "Add To Cart" }).click();
    await expect(page.getByText("Item Added to cart")).toBeVisible({
      timeout: 5000,
    });

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByText(/You Have 1 items? in your cart/)).toBeVisible();

    if (productName) {
      await expect(page.getByText(productName, { exact: true }).first()).toBeVisible();
    }
  });

  test("should return to cart after logging in from checkout prompt", async ({
    page,
    request,
  }) => {
    // Basil Boh A0273232M
    const user = generateTestUser("_redirect");
    await registerViaApi(request, user);

    await page.goto("/");
    const firstProduct = page.locator(".card-title").first();
    await expect(firstProduct).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "ADD TO CART" }).first().click();
    await expect(page.getByText("Item Added to cart")).toBeVisible({
      timeout: 5000,
    });

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);

    await page.getByRole("button", { name: /login to checkout/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await loginUser(page, user.email, user.password);
    await expect(
      page.locator("div[role='status']").getByText("Logged in successfully")
    ).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByText(/You Have 1 items? in your cart/)).toBeVisible();
    await expect(
      page.getByText("please login to checkout")
    ).not.toBeVisible();
  });

  test("should show address and no guest checkout prompt when logged in", async ({
    page,
    request,
  }) => {
    // Basil Boh A0273232M
    const user = generateTestUser("_loggedin");
    await registerViaApi(request, user);

    await page.goto("/login");
    await loginUser(page, user.email, user.password);
    await expect(
      page.locator("div[role='status']").getByText("Logged in successfully")
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: "ADD TO CART" }).first().click();
    await expect(page.getByText("Item Added to cart")).toBeVisible({
      timeout: 5000,
    });

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);

    await expect(page.getByText(`Hello ${user.name}`)).toBeVisible();
    await expect(
      page.getByText("please login to checkout")
    ).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Current Address" })).toBeVisible();
    await expect(page.getByText(user.address)).toBeVisible();
  });

  test("should update cart badge when adding multiple items from homepage", async ({
    page,
  }) => {
    // Basil Boh A0273232M
    await page.goto("/");
    await expect(page.locator(".card-title").first()).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "ADD TO CART" }).first().click();
    await expect(page.getByText("Item Added to cart")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator(".ant-badge")).toContainText("1");

    await expect(page.getByText("Item Added to cart")).toBeHidden({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "ADD TO CART" }).first().click();
    await expect(page.getByText("Item Added to cart").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator(".ant-badge")).toContainText("2");

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(
      page.getByText(/You Have 2 items in your cart/)
    ).toBeVisible();
  });
});
