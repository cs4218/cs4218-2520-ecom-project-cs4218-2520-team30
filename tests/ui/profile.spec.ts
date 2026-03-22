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

test.describe("Profile Feature E2E Tests", () => {
    // Leong Soon Mun Stephane, A0273409B

    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => localStorage.removeItem("cart"));
        await page.reload();
    });

    test("should navigate to orders profile if user is logged in", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("profile_1");
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
        await page.getByRole("link", { name: "Profile" }).click();

        // Assert
        await expect(page).toHaveURL("dashboard/user/profile");
        await expect(
            page.getByRole("heading", { name: "USER PROFILE" }),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("should see user data filled except password on update form", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("profile_2");
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
        await page.getByRole("link", { name: "Profile" }).click();

        // Assert
        await expect(
            page.getByRole("textbox", { name: "Enter Your Name" }),
        ).toHaveValue(userData.name);
        await expect(
            page.getByRole("textbox", { name: "Enter Your Email" }),
        ).toHaveValue(userData.email);
        await expect(
            page.getByRole("textbox", { name: "Enter Your Password" }),
        ).toHaveValue("");
        await expect(
            page.getByRole("textbox", { name: "Enter Your Phone" }),
        ).toHaveValue(userData.phone);
        await expect(
            page.getByRole("textbox", { name: "Enter Your Address" }),
        ).toHaveValue(userData.address);
    });

    test("should see successful toast message if update is successful", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("profile_3");
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
        await page.getByRole("link", { name: "Profile" }).click();

        await page
            .getByRole("textbox", { name: "Enter Your Name" })
            .fill("JohnDoe");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("123456");
        await page
            .getByRole("textbox", { name: "Enter Your Phone" })
            .fill("12345678");
        await page
            .getByRole("textbox", { name: "Enter Your Address" })
            .fill("John Doe House");
        await page.getByRole("button", { name: "UPDATE" }).click();

        // Assert
          await expect(
              page.getByText("Profile Updated Successfully"),
          ).toBeVisible({timeout: 5000});
         await expect(
             page.getByRole("button", { name: "JohnDoe" }),
         ).toBeVisible({ timeout: 5000 });
    });

    test("should see error toast message if password is too short", async ({ page }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("profile_4");
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
        await page.getByRole("link", { name: "Profile" }).click();

        await page
            .getByRole("textbox", { name: "Enter Your Name" })
            .fill("JohnDoe");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("12345");
        await page
            .getByRole("textbox", { name: "Enter Your Phone" })
            .fill("12345678");
        await page
            .getByRole("textbox", { name: "Enter Your Address" })
            .fill("John Doe House");
        await page.getByRole("button", { name: "UPDATE" }).click();

        // Assert
        await expect(page.getByText("Password is required and 6")).toBeVisible();
    });

    test("should see dashboard update if update is successful", async ({ page }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Arrange
        const userData = generateTestUser("profile_5");
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
        await page.getByRole("link", { name: "Profile" }).click();

        await page
            .getByRole("textbox", { name: "Enter Your Name" })
            .fill("JohnDoe");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("123456");
        await page
            .getByRole("textbox", { name: "Enter Your Phone" })
            .fill("12345678");
        await page
            .getByRole("textbox", { name: "Enter Your Address" })
            .fill("John Doe House");
        await page.getByRole("button", { name: "UPDATE" }).click();
        await page.getByRole("button", { name: "JohnDoe" }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();

        // Assert
        await expect(
            page.getByRole("heading", { name: "JohnDoe" }).first(),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("heading", { name: userData.email }).first(),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("heading", { name: "John Doe House" }).first(),
        ).toBeVisible({
            timeout: 5000,
        });
    });
});
