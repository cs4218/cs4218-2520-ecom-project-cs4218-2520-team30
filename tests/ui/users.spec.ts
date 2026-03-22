// Leong Soon Mun Stephane, A0273409B
import { test, expect } from "@playwright/test";

test.describe("Admin View User Feature E2E Tests", () => {
    // Leong Soon Mun Stephane, A0273409B

    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => localStorage.removeItem("cart"));
        await page.reload();
    });

    test("should navigate to admin view users page if user is logged in and an admin", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Act
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill("admin@test.sg");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("admin@test.sg");
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.getByRole("button", { name: "admin@test.sg" }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Users" }).click();

        // Assert
        await expect(page).toHaveURL("dashboard/admin/users");
        await expect(
            page.getByRole("heading", { name: "All Users" }),
        ).toBeVisible();
    });

    test("should not be able navigate to admin view users page if user is not logged in", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        //Act
        await page.goto("/dashboard/admin/users");

        // Assert
        await expect(page).toHaveURL("/login");
        await expect(
            page.getByRole("heading", { name: "LOGIN FORM" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("textbox", { name: "Enter Your Email" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("textbox", { name: "Enter Your Password" }),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("should not be able navigate to admin view users page if user is logged in but not an admin", async ({
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
        await page.goto("/dashboard/admin/users");

        // Assert
        await expect(page).toHaveURL("/login");
        await expect(
            page.getByRole("heading", { name: "LOGIN FORM" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("textbox", { name: "Enter Your Email" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("textbox", { name: "Enter Your Password" }),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("should view users table in admin view users page", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Act
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill("admin@test.sg");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("admin@test.sg");
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.getByRole("button", { name: "admin@test.sg" }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Users" }).click();

        // Assert
        await expect(page).toHaveURL("dashboard/admin/users");
        await expect(
            page.getByRole("columnheader", { name: "Name" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("columnheader", { name: "Email" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("columnheader", { name: "Phone" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("columnheader", { name: "Address" }),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("columnheader", { name: "Role" }),
        ).toBeVisible({
            timeout: 5000,
        });
    });

    test("should be able to view user data in admin view users page", async ({
        page,
    }) => {
        // Leong Soon Mun Stephane, A0273409B
        // Act
        await page.goto("/");
        await page.getByRole("link", { name: "Login" }).click();
        await page.getByRole("textbox", { name: "Enter Your Email" }).click();
        await page
            .getByRole("textbox", { name: "Enter Your Email" })
            .fill("admin@test.sg");
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .click();
        await page
            .getByRole("textbox", { name: "Enter Your Password" })
            .fill("admin@test.sg");
        await page.getByRole("button", { name: "LOGIN" }).click();
        await page.getByRole("button", { name: "admin@test.sg" }).click();
        await page.getByRole("link", { name: "Dashboard" }).click();
        await page.getByRole("link", { name: "Users" }).click();

        // Assert
        await expect(page).toHaveURL("dashboard/admin/users");
        await expect(
            page.getByRole("cell", { name: "admin@test.sg" }).first(),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("cell", { name: "admin@test.sg" }).nth(1),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("cell", { name: "admin@test.sg" }).nth(2),
        ).toBeVisible({
            timeout: 5000,
        });
        await expect(
            page.getByRole("cell", { name: "admin@test.sg" }).nth(3),
        ).toBeVisible({
            timeout: 5000,
        });
    });
});
