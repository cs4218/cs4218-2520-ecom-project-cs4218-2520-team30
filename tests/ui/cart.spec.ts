// Basil Boh A0273232M

import {
  test,
  expect,
  type Page,
  type APIRequestContext,
  type BrowserContext,
} from "@playwright/test";

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

/**
 * Fill Braintree Drop-in sandbox card fields (hosted iframes).
 * Uses standard Braintree sandbox Visa; requires working client token + Drop-in UI.
 */
async function fillBraintreeDropInSandboxCard(page: Page) {
  // Drop-in shows "Choose a way to pay" first; open the Card sheet so hosted fields mount.
  const cardOption = page.locator(".braintree-option__card").first();
  await expect(cardOption).toBeVisible({ timeout: 20000 });
  await cardOption.click();

  // Hosted fields live in cross-origin iframes; focus via evaluate then type from the page.
  const numberFrame = page.frameLocator('iframe[name="braintree-hosted-field-number"]');
  const numberInput = numberFrame.locator("#credit-card-number");
  await numberInput.waitFor({ state: "attached", timeout: 20000 });
  await numberInput.evaluate((el: HTMLInputElement) => el.focus());
  // Slow enough that Drop-in receives every digit (fast runs can truncate the number).
  await page.keyboard.type("4005519200000004", { delay: 60 });

  const expFrame = page.frameLocator(
    'iframe[name="braintree-hosted-field-expirationDate"]'
  );
  const expInput = expFrame.locator("input").first();
  await expInput.waitFor({ state: "attached", timeout: 15000 });
  await expInput.evaluate((el: HTMLInputElement) => el.focus());
  await page.keyboard.type("1228", { delay: 50 });

  await page.keyboard.press("Tab");
  await page.keyboard.type("123", { delay: 50 });
}

async function setupLoggedInUserWithItemInCart(
  page: Page,
  request: APIRequestContext,
  suffix: string
): Promise<TestUser> {
  const user = generateTestUser(suffix);
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
  await expect(page.getByText(/You Have 1 items? in your cart/)).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Current Address" })
  ).toBeVisible();

  await expect(
    page.locator(".braintree-dropin-container, [class*='braintree-dropin']").first()
  ).toBeVisible({ timeout: 30000 });

  return user;
}

/**
 * Complete PayPal sandbox login + approval in a PayPal-hosted window (popup or full page).
 * UI copy varies; uses several fallbacks.
 */
async function completePayPalSandboxLogin(
  paypalPage: Page,
  email: string,
  password: string
) {
  await paypalPage.waitForLoadState("domcontentloaded");

  await paypalPage
    .getByRole("button", { name: /accept|agree all|ok|got it/i })
    .first()
    .click({ timeout: 8000 })
    .catch(() => {});

  const emailInput = paypalPage
    .locator("#email, input[name='login_email'], input[type='email']")
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 45000 });
  await emailInput.fill(email);

  const nextBtn = paypalPage.getByRole("button", { name: /^next$/i }).first();
  if (await nextBtn.isVisible().catch(() => false)) {
    await nextBtn.click();
  }

  const pwdInput = paypalPage
    .locator("#password, input[name='login_password'], input[type='password']")
    .first();
  await pwdInput.waitFor({ state: "visible", timeout: 45000 });
  await pwdInput.fill(password);

  await paypalPage
    .getByRole("button", { name: /log in|sign in/i })
    .first()
    .click();

  // Final authorization (wording changes between sandbox builds)
  const payButton = paypalPage.getByRole("button", {
    name: /pay|continue|agree|complete|authorize/i,
  });
  await expect(payButton.first()).toBeVisible({ timeout: 60000 });
  await payButton.first().click();

  await paypalPage
    .getByRole("button", { name: /pay|continue|ok|done/i })
    .first()
    .click({ timeout: 15000 })
    .catch(() => {});
}

async function selectPayPalInDropInAndAuthorize(
  page: Page,
  context: BrowserContext,
  email: string,
  password: string
) {
  const paypalOption = page.locator(".braintree-option__paypal").first();
  await expect(paypalOption).toBeVisible({ timeout: 20000 });
  await paypalOption.click();

  const paypalButtonRoot = page.locator('[data-braintree-id="paypal-button"]').first();
  await expect(paypalButtonRoot).toBeVisible({ timeout: 45000 });

  const pageCountBefore = context.pages().length;

  const popupPromise = page.waitForEvent("popup", { timeout: 45000 }).catch(() => null);
  await paypalButtonRoot.click();
  let paypalWindow = await popupPromise;

  if (!paypalWindow) {
    await page.waitForURL(/paypal\.com/i, { timeout: 30000 }).catch(() => {});
    if (/paypal\.com/i.test(page.url())) {
      paypalWindow = page;
    }
  }

  if (!paypalWindow) {
    await expect
      .poll(async () => context.pages().length, { timeout: 10000 })
      .toBeGreaterThan(pageCountBefore);
    paypalWindow = context.pages()[context.pages().length - 1]!;
  }

  await completePayPalSandboxLogin(paypalWindow, email, password);

  if (paypalWindow !== page) {
    await paypalWindow.waitForEvent("close", { timeout: 120000 }).catch(() => {});
  } else {
    await page.waitForURL(/\/cart/, { timeout: 120000 });
  }
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

  test("should complete checkout and navigate to All Orders after successful payment", async ({
    page,
    request,
  }) => {
    // Basil Boh A0273232M
    test.setTimeout(120000);

    await setupLoggedInUserWithItemInCart(page, request, "_checkout");

    await fillBraintreeDropInSandboxCard(page);

    const payButton = page.getByRole("button", { name: "Make Payment" });
    await expect(payButton).toBeEnabled({ timeout: 30000 });

    await payButton.click();

    await expect(page).toHaveURL(/\/dashboard\/user\/orders/, {
      timeout: 60000,
    });
    await expect(
      page.getByRole("heading", { name: "All Orders" })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Payment Completed Successfully")
    ).toBeVisible({ timeout: 5000 });

    await expect(page.locator(".ant-badge")).toContainText("0");
  });

  test("should complete checkout with PayPal sandbox and navigate to All Orders", async ({
    page,
    context,
    request,
  }) => {
    // Basil Boh A0273232M
    test.skip(
      !process.env.PAYPAL_SANDBOX_EMAIL?.trim() ||
        !process.env.PAYPAL_SANDBOX_PASSWORD?.trim(),
      "Set PAYPAL_SANDBOX_EMAIL and PAYPAL_SANDBOX_PASSWORD in .env"
    );

    test.setTimeout(180000);

    await setupLoggedInUserWithItemInCart(page, request, "_paypal");

    await selectPayPalInDropInAndAuthorize(
      page,
      context,
      process.env.PAYPAL_SANDBOX_EMAIL!.trim(),
      process.env.PAYPAL_SANDBOX_PASSWORD!.trim()
    );

    const payButton = page.getByRole("button", { name: "Make Payment" });
    await expect(payButton).toBeEnabled({ timeout: 60000 });

    await payButton.click();

    await expect(page).toHaveURL(/\/dashboard\/user\/orders/, {
      timeout: 90000,
    });
    await expect(
      page.getByRole("heading", { name: "All Orders" })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Payment Completed Successfully")
    ).toBeVisible({ timeout: 5000 });

    await expect(page.locator(".ant-badge")).toContainText("0");
  });
});
