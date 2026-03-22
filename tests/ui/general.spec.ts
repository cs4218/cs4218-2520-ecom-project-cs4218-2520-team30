// Leong Soon Mun Stephane, A0273409B
import { test, expect } from "@playwright/test";

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

test.describe("General Feature E2E Tests", () => {
    // Leong Soon Mun Stephane, A0273409B

    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => localStorage.removeItem("cart"));
        await page.reload();
    });

    test("should navigate to user dashboard if user is logged in", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("general_1");
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
        
        await page.getByRole("button", { name: "LOGIN" }).click({delay: 1000});

        await page.getByRole("button", { name: userData.name }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();

        // Assert
        await expect(
            page.getByRole("heading", { name: userData.name }).first(),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("heading", { name: userData.email }).first(),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("heading", { name: userData.address }).first(),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("UserMenu should be visible in user dashboard if user is logged in", async ({ page }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("general_2");
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
            .click({ delay: 1000 });
        await page.getByRole("button", { name: userData.name }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();

        // Assert
        await expect(
            page.getByRole("heading", { name: "Dashboard" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(page.getByRole("link", { name: "Profile" })).toBeVisible({
            timeout: 5000,
        });
        await expect(page.getByRole("link", { name: "Orders" })).toBeVisible({
            timeout: 5000,
        });
    });

    test("should navigate to profile page from UserMenu if user is logged in", async ({ page }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("general_3");
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
        await page.getByRole("button", { name: /login/i }).click();
        await expect(page).toHaveURL("/");
        await page.getByRole("button", { name: userData.name }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Profile" }).click();

        // Assert
        await expect(page).toHaveURL("dashboard/user/profile");
        await expect(
            page.getByRole("heading", { name: "USER PROFILE" }),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("should navigate to orders page from UserMenu if user is logged in", async ({ page }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("general_3");
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
            .click({ delay: 1000 });
        await expect(page.getByRole("button", { name: userData.name })).toBeVisible();
        await page.getByRole("button", { name: userData.name }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Orders" }).click();


        // Assert
        await expect(page).toHaveURL("dashboard/user/orders");
        await expect(
            page.getByRole("heading", { name: "All Orders" }),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("should not be able to navigate to user dashboard if user is not logged in", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        //Act
        await page.goto("/dashboard/user");

        // Assert
        await expect(page).toHaveURL("/");
        await expect(
            page.getByRole("heading", { name: "All Products" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("img", { name: "bannerimage" }),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("should not be able to navigate to user profile page if user is not logged in", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        //Act
        await page.goto("/dashboard/user/profile");

        // Assert
        await expect(page).toHaveURL("/");
        await expect(
            page.getByRole("heading", { name: "All Products" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("img", { name: "bannerimage" }),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("should not be able to navigate to user orders page if user is not logged in", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        //Act
        await page.goto("/dashboard/user/orders");

        // Assert
        await expect(page).toHaveURL("/");
        await expect(
            page.getByRole("heading", { name: "All Products" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("img", { name: "bannerimage" }),
        ).toBeVisible({
            timeout: 5000,
        });
    });
});
