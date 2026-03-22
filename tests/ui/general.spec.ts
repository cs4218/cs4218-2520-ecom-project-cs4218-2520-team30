// Leong Soon Mun Stephane, A0273409B
import { test, expect } from "@playwright/test";

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
        // Act
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill("user@test.com");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("user@test.com");
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.getByRole("button", { name: "user@test.com" }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();

        // Assert
        await expect(
            page.getByRole("heading", { name: "user@test.com" }).first(),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("heading", { name: "user@test.com" }).nth(1),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("heading", { name: "user@test.com" }).nth(2),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("UserMenu should be visible in user dashboard if user is logged in", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Act
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill("user@test.com");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("user@test.com");
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.getByRole("button", { name: "user@test.com" }).click();
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

    test("should navigate to profile page from UserMenu if user is logged in", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B

        // Act
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill("user@test.com");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("user@test.com");
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.getByRole("button", { name: "user@test.com" }).click();
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

    test("should navigate to orders page from UserMenu if user is logged in", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B

        // Act
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill("user@test.com");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("user@test.com");
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.getByRole("button", { name: "user@test.com" }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();

        // Assert
        await page.getByRole("link", { name: "Orders" }).click();
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
