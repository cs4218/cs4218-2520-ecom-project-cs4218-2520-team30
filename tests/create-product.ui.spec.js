import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "auth",
      JSON.stringify({
        user: {
          _id: "admin-user-id",
          name: "Admin User",
          email: "admin@example.com",
          role: 1,
        },
        token: "mock-admin-token",
      })
    );
  });
});

// Alek Kwek, A0273471A
test.describe("Create Product UI flow", () => {
  // Alek Kwek, A0273471A
  test("admin can create a product and is redirected to all products", async ({
    page,
  }) => {
    const categories = [{ _id: "cat-1", name: "Electronics", slug: "electronics" }];
    const products = [];

    await page.route("**/api/v1/auth/admin-auth", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route("**/api/v1/category/get-category", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          category: categories,
        }),
      });
    });

    await page.route("**/api/v1/product/create-product", async (route) => {
      const requestBody = route.request().postDataBuffer().toString("utf8");

      expect(requestBody).toContain("Camera");
      expect(requestBody).toContain("Mirrorless test camera");
      expect(requestBody).toContain("1299");
      expect(requestBody).toContain("15");
      expect(requestBody).toContain("cat-1");
      expect(requestBody).toContain("1");
      expect(requestBody).toContain("camera.png");

      products.unshift({
        _id: "product-1",
        name: "Camera",
        description: "Mirrorless test camera",
        slug: "camera",
      });

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Product Created Successfully",
          products: products[0],
        }),
      });
    });

    await page.route("**/api/v1/product/get-product", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          products,
        }),
      });
    });

    await page.route("**/api/v1/product/product-photo/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p0N8iAAAAAASUVORK5CYII=",
          "base64"
        ),
      });
    });

    await page.goto("/dashboard/admin/create-product");

    await expect(
      page.getByRole("heading", { name: /create product/i })
    ).toBeVisible();

    await page.locator('input[placeholder="write a name"]').fill("Camera");
    await page
      .locator('textarea[placeholder="write a description"]')
      .fill("Mirrorless test camera");
    await page.locator('input[placeholder="write a Price"]').fill("1299");
    await page.locator('input[placeholder="write a quantity"]').fill("15");

    await page.locator(".ant-select").first().click();
    await page
      .locator(".ant-select-dropdown .ant-select-item-option-content", {
        hasText: /^Electronics$/,
      })
      .click();

    await page.locator(".ant-select").nth(1).click();
    await page
      .locator(".ant-select-dropdown .ant-select-item-option-content", {
        hasText: /^Yes$/,
      })
      .click();

    await page.setInputFiles('input[name="photo"]', {
      name: "camera.png",
      mimeType: "image/png",
      buffer: Buffer.from("mock-image-content"),
    });

    await expect(page.getByText("camera.png")).toBeVisible();

    await page.getByRole("button", { name: /create product/i }).click();

    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(
      page.getByRole("heading", { name: /all products list/i })
    ).toBeVisible();
    await expect(page.getByText("Camera", { exact: true })).toBeVisible();
    await expect(page.getByText("Mirrorless test camera", { exact: true })).toBeVisible();
  });
});
