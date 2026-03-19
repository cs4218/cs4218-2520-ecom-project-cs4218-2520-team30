// Tay Kai Jun A0283343E

import { test, expect, type Page } from "@playwright/test";

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

test.describe("Registration Page E2E Tests", () => {
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
