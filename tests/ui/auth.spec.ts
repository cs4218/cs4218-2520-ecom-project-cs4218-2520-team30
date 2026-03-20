// Tay Kai Jun A0283343E

import { test, expect, type Page } from "@playwright/test";
import {
  PLAYWRIGHT_ADMIN_EMAIL,
  PLAYWRIGHT_ADMIN_PASSWORD,
  ensurePlaywrightCatalog,
  PLAYWRIGHT_USER_EMAIL,
  PLAYWRIGHT_USER_PASSWORD,
  ensurePlaywrightAdmin,
  ensurePlaywrightRegularUser,
} from "../uiTestUtils.js";

interface TestUser {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  answer: string;
}

/**
 * Generate unique test user data per test run to avoid DB collisions.
 */
function generateTestUser(suffix = ""): TestUser {
  const timestamp = Date.now();
  return {
    name: `TestUser_${timestamp}${suffix}`,
    email: `testuser_${timestamp}${suffix}@test.com`,
    password: "password123",
    phone: "1234567890",
    address: "123 Test Street",
    answer: "Football",
  };
}

async function fillRegistrationForm(page: Page, userData: TestUser) {
  await page.getByPlaceholder("Enter Your Name").fill(userData.name);
  await page.getByPlaceholder("Enter Your Email ").fill(userData.email);
  await page.getByPlaceholder("Enter Your Password").fill(userData.password);
  await page.getByPlaceholder("Enter Your Phone").fill(userData.phone);
  await page.getByPlaceholder("Enter Your Address").fill(userData.address);
  await page.getByPlaceholder("What is Your Favorite Sport").fill(userData.answer);
}

async function loginUser(page: Page, email: string, password: string) {
  await page.getByPlaceholder("Enter Your Email ").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
}

test.describe("Registration Page E2E Tests", () => {
  test.beforeAll(async () => {
    await ensurePlaywrightAdmin();
    await ensurePlaywrightRegularUser();
  });

  // Tay Kai Jun A0283343E
  test("TC1: should display the registration page with all form fields", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: "REGISTER FORM" })
    ).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Name")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Email ")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Password")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Phone")).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Address")).toBeVisible();
    await expect(
      page.getByPlaceholder("What is Your Favorite Sport")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "REGISTER" })
    ).toBeVisible();
  });

  // Tay Kai Jun A0283343E
  test("TC2: should navigate from login page to register page via nav link", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "LOGIN FORM" })
    ).toBeVisible();

    await page.getByRole("link", { name: "Register" }).click();

    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: "REGISTER FORM" })
    ).toBeVisible();
  });

  // Tay Kai Jun A0283343E
  test("TC3: should register successfully with success toast and redirect to login", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    const userData = generateTestUser("_tc3");

    await page.goto("/register");
    await fillRegistrationForm(page, userData);
    await page.getByRole("button", { name: "REGISTER" }).click();

    // Verify the success toast message is visible
    const successToast = page.getByText(
      "Registered successfully, please login"
    );
    await expect(successToast).toBeVisible({ timeout: 10000 });

    // Verify the toast eventually disappears (dismissed automatically)
    await expect(successToast).toBeHidden({ timeout: 10000 });

    // Verify redirect to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "LOGIN FORM" })
    ).toBeVisible();
  });

  // Tay Kai Jun A0283343E
  test("TC4: should show error toast when password is less than 6 characters", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    const userData = generateTestUser("_tc4");
    userData.password = "12345"; // Only 5 characters

    await page.goto("/register");
    await fillRegistrationForm(page, userData);
    await page.getByRole("button", { name: "REGISTER" }).click();

    // Verify error toast from frontend validation
    await expect(
      page.getByText("Password must be at least 6 characters long")
    ).toBeVisible({ timeout: 5000 });

    // Should stay on register page
    await expect(page).toHaveURL(/\/register/);
  });

  // Tay Kai Jun A0283343E
  test("TC5: should show error toast when phone number contains dashes", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    const userData = generateTestUser("_tc5");
    userData.phone = "123-456-7890";

    await page.goto("/register");
    await fillRegistrationForm(page, userData);
    await page.getByRole("button", { name: "REGISTER" }).click();

    // Verify error toast from frontend validation
    await expect(
      page.getByText("Phone number must contain only numbers")
    ).toBeVisible({ timeout: 5000 });

    // Should stay on register page
    await expect(page).toHaveURL(/\/register/);
  });

  // Tay Kai Jun A0283343E
  test("TC6: should show error toast when phone number contains letters", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    const userData = generateTestUser("_tc6");
    userData.phone = "123abc7890";

    await page.goto("/register");
    await fillRegistrationForm(page, userData);
    await page.getByRole("button", { name: "REGISTER" }).click();

    await expect(
      page.getByText("Phone number must contain only numbers")
    ).toBeVisible({ timeout: 5000 });
  });

  // Tay Kai Jun A0283343E
  test("TC7: should show error toast when registering with a duplicate email", async ({
    page,
    request,
  }) => {
    // Tay Kai Jun A0283343E
    const userData = generateTestUser("_tc7");

    // Pre-register the user via API to guarantee duplicate
    await request.post("http://localhost:6060/api/v1/auth/register", {
      data: userData,
    });

    // Attempt to register again with the same email via UI
    await page.goto("/register");
    await fillRegistrationForm(page, userData);
    await page.getByRole("button", { name: "REGISTER" }).click();

    // Verify duplicate email error toast
    await expect(
      page.getByText("Already registered please login")
    ).toBeVisible({ timeout: 10000 });

    // Should stay on register page
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe("Login Page E2E Tests", () => {
  test.beforeAll(async () => {
    await ensurePlaywrightCatalog();
    await ensurePlaywrightAdmin();
    await ensurePlaywrightRegularUser();
  });

  // Tay Kai Jun A0283343E
  test("TC1: should login as admin and navigate to admin dashboard", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/login");
    await loginUser(page, PLAYWRIGHT_ADMIN_EMAIL, PLAYWRIGHT_ADMIN_PASSWORD);

    // Verify success toast
    await expect(
      page.locator("div[role='status']").getByText("Logged in successfully")
    ).toBeVisible({ timeout: 10000 });

    // Verify header shows admin name dropdown instead of Login/Register links
    await expect(page.getByRole("link", { name: "Login" })).not.toBeVisible();
    await expect(
      page.getByRole("link", { name: "Register" })
    ).not.toBeVisible();

    // Navigate to admin dashboard via header name dropdown
    await page.locator(".nav-link.dropdown-toggle").last().click();
    await page.getByRole("link", { name: "Dashboard" }).click();

    await expect(page).toHaveURL(/\/dashboard\/admin/);
    await expect(
      page.locator(".card").getByText("Playwright Admin").first()
    ).toBeVisible();
  });

  // Tay Kai Jun A0283343E
  test("TC2: should login as normal user and navigate to user dashboard", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/login");
    await loginUser(page, PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD);

    // Verify success toast
    await expect(
      page.locator("div[role='status']").getByText("Logged in successfully")
    ).toBeVisible({ timeout: 10000 });

    // Verify redirected to home page
    await expect(page).toHaveURL("/");

    // Navigate to user dashboard via header name dropdown
    await page.locator(".nav-link.dropdown-toggle").last().click();
    await page.getByRole("link", { name: "Dashboard" }).click();

    await expect(page).toHaveURL(/\/dashboard\/user/);
    await expect(
      page.locator(".card").getByText(PLAYWRIGHT_USER_EMAIL).first()
    ).toBeVisible();
  });

  // Tay Kai Jun A0283343E
  test("TC3: should show error toast on login with wrong password", async ({
    page,
  }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/login");
    await loginUser(page, PLAYWRIGHT_USER_EMAIL, "wrongpassword");

    // Verify error toast
    await expect(
      page.locator("div[role='status']").getByText("Invalid email or password")
    ).toBeVisible({ timeout: 10000 });

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  // Tay Kai Jun A0283343E
  test("TC4: should login and then logout successfully", async ({ page }) => {
    // Tay Kai Jun A0283343E
    await page.goto("/login");
    await loginUser(page, PLAYWRIGHT_USER_EMAIL, PLAYWRIGHT_USER_PASSWORD);

    // Wait for login to complete
    await expect(
      page.locator("div[role='status']").getByText("Logged in successfully")
    ).toBeVisible({ timeout: 10000 });

    // Logout via header name dropdown
    await page.locator(".nav-link.dropdown-toggle").last().click();
    await page.getByRole("link", { name: "Logout" }).click();

    // Verify logout toast
    await expect(
      page.locator("div[role='status']").getByText("Logout Successfully")
    ).toBeVisible({ timeout: 10000 });

    // Verify header reverts to showing Login and Register links
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
  });

  // Tay Kai Jun A0283343E
  test("TC5: should register a new user, login, add item to cart, and view cart", async ({
    page,
    request,
  }) => {
    // Tay Kai Jun A0283343E
    const userData = generateTestUser("_login_tc5");

    // Register via API to avoid creating extra UI-registered users
    await request.post("http://localhost:6060/api/v1/auth/register", {
      data: userData,
    });

    // Login with the newly registered user
    await page.goto("/login");
    await loginUser(page, userData.email, userData.password);

    await expect(
      page.locator("div[role='status']").getByText("Logged in successfully")
    ).toBeVisible({ timeout: 10000 });

    // Should be on homepage with products visible
    await expect(page).toHaveURL("/");

    // Add the first available product to cart
    const addToCartButton = page.getByText("ADD TO CART").first();
    await expect(addToCartButton).toBeVisible({ timeout: 10000 });
    await addToCartButton.click();

    // Verify "Item Added to cart" toast
    await expect(page.getByText("Item Added to cart")).toBeVisible({
      timeout: 5000,
    });

    // Verify cart badge in header shows 1
    await expect(page.locator(".ant-badge")).toContainText("1");

    // Navigate to cart page
    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);

    // Verify cart page greets the user by name
    await expect(
      page.getByText(`Hello ${userData.name}`)
    ).toBeVisible();

    // Verify there is 1 item in the cart
    await expect(page.getByText(/You Have 1 items? in your cart/)).toBeVisible();
  });
});
