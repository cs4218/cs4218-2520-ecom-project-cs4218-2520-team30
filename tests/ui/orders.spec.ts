// Leong Soon Mun Stephane, A0273409B
import { test, expect } from "@playwright/test";
import { seedOrderForUser } from "../uiTestUtils.js";

function generateTestUser(suffix = "") {
    const timestamp = Date.now();
    return {
        name: `TestUser_${timestamp}${suffix}`,
        email: `testuser_${timestamp}${suffix}@test.com`,
        password: "password123",
        phone: "1234567890",
        address: "123 Test Street",
        answer: "Football",
        role: 0,
    };
}

async function fillRegistrationForm(page, userData) {
    await page.goto("/register");
    await page.getByPlaceholder("Enter Your Name").fill(userData.name);
    await page.getByPlaceholder("Enter Your Email ").fill(userData.email);
    await page.getByPlaceholder("Enter Your Password").fill(userData.password);
    await page.getByPlaceholder("Enter Your Phone").fill(userData.phone);
    await page.getByPlaceholder("Enter Your Address").fill(userData.address);
    await page
        .getByPlaceholder("What is Your Favorite Sport")
        .fill(userData.answer);
    await page.getByRole("button", { name: "REGISTER" }).click();
}

test.describe("Orders Feature E2E Tests", () => {
    // Leong Soon Mun Stephane, A0273409B

    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => localStorage.removeItem("cart"));
        await page.reload();
    });

    test("should navigate to orders page if user is logged in", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("orders_1");
        await fillRegistrationForm(page, userData);

        // Act
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill(userData.email);
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill(userData.password);

        await page
            .getByRole("button", { name: "LOGIN" })
            .click({ delay: 2000 });

        await page.getByRole("button", { name: userData.name }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Orders" }).click();

        // Assert
        await expect(page).toHaveURL(/\/dashboard\/user\/orders/);
        await expect(
            page.getByRole("heading", { name: "All Orders" }),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("should not see any orders if user has not made any orders", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("orders_2");
        await fillRegistrationForm(page, userData);

        // Act
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill(userData.email);
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill(userData.password);

        await page
            .getByRole("button", { name: "LOGIN" })
            .click({ delay: 2000 });

        await page.getByRole("button", { name: userData.name }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Orders" }).click();

        // Assert
        await expect(
            page.getByRole("columnheader", { name: "Status" }),
        ).not.toBeVisible();
        await expect(
            page.getByRole("columnheader", { name: "Buyer" }),
        ).not.toBeVisible();
        await expect(
            page.getByRole("columnheader", { name: "Date" }),
        ).not.toBeVisible();
        await expect(
            page.getByRole("columnheader", { name: "Payment" }),
        ).not.toBeVisible();
        await expect(
            page.getByRole("columnheader", { name: "Quantity" }),
        ).not.toBeVisible();
    });

    test("should see order if user has made a purchase", async ({ page }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange: create a fresh user
        const userData = generateTestUser("orders_3");
        await fillRegistrationForm(page, userData);

        // Act: log in
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill(userData.email);
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill(userData.password);

        await page
            .getByRole("button", { name: "LOGIN" })
            .click({ delay: 2000 });

        await expect(
            page.locator("div[role='status']").getByText("Logged in successfully")
        ).toBeVisible({ timeout: 10000 });

        // Seed an order for this user directly in the DB.
        // getOrdersController uses .populate("products") so we pass the product
        // slug; seedOrderForUser resolves it to an ObjectId reference.
        await seedOrderForUser(userData.email, "nus-t-shirt", "Not Process");

        // Navigate directly to the orders page and assert
        await page.goto("/dashboard/user/orders");
        await expect(page).toHaveURL(/\/dashboard\/user\/orders/);
        await expect(
            page.getByRole("heading", { name: "All Orders" })
        ).toBeVisible({ timeout: 10000 });

        // Table headers
        await expect(page.getByRole("columnheader", { name: "#" })).toBeVisible({
            timeout: 10000,
        });
        await expect(
            page.getByRole("columnheader", { name: "Status" }),
        ).toBeVisible({ timeout: 5000 });
        await expect(
            page.getByRole("columnheader", { name: "Buyer" }),
        ).toBeVisible({ timeout: 5000 });
        await expect(
            page.getByRole("columnheader", { name: "Date" }),
        ).toBeVisible({ timeout: 5000 });
        await expect(
            page.getByRole("columnheader", { name: "Payment" }),
        ).toBeVisible({ timeout: 5000 });
        await expect(
            page.getByRole("columnheader", { name: "Quantity" }),
        ).toBeVisible({ timeout: 5000 });

        // Order row data (seeded: status "Not Process", payment.success true, qty 1)
        await expect(
            page.getByRole("cell", { name: "Not Process" }),
        ).toBeVisible({ timeout: 10000 });
        await expect(
            page.getByRole("cell", { name: userData.name }),
        ).toBeVisible({ timeout: 5000 });
        await expect(
            page.getByRole("cell", { name: /Success|Failed/ }),
        ).toBeVisible({ timeout: 5000 });
        await expect(
            page.getByRole("cell", { name: "1" }).nth(1),
        ).toBeVisible({ timeout: 5000 });

        // Product detail rendered inside the order row
        await expect(
            page.getByText("NUS T-shirt", { exact: true }),
        ).toBeVisible({ timeout: 5000 });
        await expect(
            page.getByText("Plain NUS T-shirt for sale"),
        ).toBeVisible({ timeout: 5000 });
        await expect(
            page.getByRole("img", { name: "NUS T-shirt" }),
        ).toBeVisible({ timeout: 5000 });
        await expect(page.getByText("Price :")).toBeVisible({ timeout: 5000 });
    });
});

