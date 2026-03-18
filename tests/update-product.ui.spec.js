const { test, expect } = require("@playwright/test");

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
test.describe("Update Product UI flow", () => {
  // Alek Kwek, A0273471A
  test("admin can open a product, verify prefilled data, update it, and delete it with confirmation", async ({
    page,
  }) => {
    const categories = [
      { _id: "cat-1", name: "Electronics", slug: "electronics" },
      { _id: "cat-2", name: "Audio", slug: "audio" },
    ];

    let product = {
      _id: "product-1",
      slug: "camera",
      name: "Camera",
      description: "Mirrorless camera",
      price: 1299,
      quantity: 15,
      shipping: true,
      category: categories[0],
    };

    let products = [
      {
        _id: product._id,
        slug: product.slug,
        name: product.name,
        description: product.description,
      },
    ];

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

    await page.route("**/api/v1/product/get-product/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          product,
        }),
      });
    });

    await page.route("**/api/v1/product/update-product/*", async (route) => {
      const requestBody = route.request().postDataBuffer().toString("utf8");

      expect(requestBody).toContain("Updated Camera");
      expect(requestBody).toContain("Updated mirrorless camera");
      expect(requestBody).toContain("1499");
      expect(requestBody).toContain("20");
      expect(requestBody).toContain("cat-2");
      expect(requestBody).toContain("0");

      product = {
        ...product,
        slug: "updated-camera",
        name: "Updated Camera",
        description: "Updated mirrorless camera",
        price: 1499,
        quantity: 20,
        shipping: false,
        category: categories[1],
      };

      products = [
        {
          _id: product._id,
          slug: product.slug,
          name: product.name,
          description: product.description,
        },
      ];

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Product Updated Successfully",
          products: product,
        }),
      });
    });

    await page.route("**/api/v1/product/delete-product/*", async (route) => {
      products = [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Product Deleted successfully",
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

    await page.goto("/dashboard/admin/products");

    await expect(
      page.getByRole("heading", { name: /all products list/i })
    ).toBeVisible();
    await page.getByText("Camera", { exact: true }).click();

    await expect(page).toHaveURL("/dashboard/admin/product/camera");
    await expect(
      page.getByRole("heading", { name: /update product/i })
    ).toBeVisible();

    await expect(page.locator('input[placeholder="write a name"]')).toHaveValue(
      "Camera"
    );
    await expect(
      page.locator('textarea[placeholder="write a description"]')
    ).toHaveValue("Mirrorless camera");
    await expect(page.locator('input[placeholder="write a Price"]')).toHaveValue(
      "1299"
    );
    await expect(
      page.locator('input[placeholder="write a quantity"]')
    ).toHaveValue("15");
    await expect(page.locator(".ant-select").first()).toContainText(
      "Electronics"
    );
    await expect(page.locator(".ant-select").nth(1)).toContainText("Yes");

    await page.locator('input[placeholder="write a name"]').fill("Updated Camera");
    await page
      .locator('textarea[placeholder="write a description"]')
      .fill("Updated mirrorless camera");
    await page.locator('input[placeholder="write a Price"]').fill("1499");
    await page.locator('input[placeholder="write a quantity"]').fill("20");

    await page.locator(".ant-select").first().click();
    await page
      .locator(".ant-select-dropdown .ant-select-item-option-content", {
        hasText: /^Audio$/,
      })
      .click();

    await page.locator(".ant-select").nth(1).click();
    await page
      .locator(".ant-select-dropdown .ant-select-item-option-content", {
        hasText: /^No$/,
      })
      .click();

    await page.getByRole("button", { name: /update product/i }).click();

    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(page.getByText("Updated Camera", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Updated mirrorless camera", { exact: true })
    ).toBeVisible();

    await page.getByText("Updated Camera", { exact: true }).click();
    await expect(page).toHaveURL("/dashboard/admin/product/updated-camera");
    await expect(page.locator(".ant-select").nth(1)).toContainText("No");

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe("Are You Sure want to delete this product ? ");
      await dialog.accept("yes");
    });

    await page.getByRole("button", { name: /delete product/i }).click();

    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(page.getByText("Updated Camera", { exact: true })).toHaveCount(0);
  });
});
