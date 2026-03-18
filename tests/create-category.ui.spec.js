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
test.describe("Create Category UI flow", () => {
  // Alek Kwek, A0273471A
  test("admin can create, edit, and delete a category with table updates", async ({
    page,
  }) => {
    let categories = [];
    let nextId = 1;

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

    await page.route("**/api/v1/category/create-category", async (route) => {
      const payload = route.request().postDataJSON();
      const createdCategory = {
        _id: String(nextId++),
        name: payload.name,
        slug: payload.name.toLowerCase().replace(/\s+/g, "-"),
      };
      categories = [...categories, createdCategory];

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "New Category Created",
          category: createdCategory,
        }),
      });
    });

    await page.route("**/api/v1/category/update-category/*", async (route) => {
      const categoryId = route.request().url().split("/").pop();
      const payload = route.request().postDataJSON();

      categories = categories.map((category) =>
        category._id === categoryId
          ? {
              ...category,
              name: payload.name,
              slug: payload.name.toLowerCase().replace(/\s+/g, "-"),
            }
          : category
      );

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Category Updated Successfully",
        }),
      });
    });

    await page.route("**/api/v1/category/delete-category/*", async (route) => {
      const categoryId = route.request().url().split("/").pop();
      categories = categories.filter((category) => category._id !== categoryId);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Category Deleted Successfully",
        }),
      });
    });

    await page.goto("/dashboard/admin/create-category");

    await expect(
      page.getByRole("heading", { name: /manage category/i })
    ).toBeVisible();

    await page.locator('input[placeholder="Enter new category"]').first().fill(
      "Electronics"
    );
    await page.getByRole("button", { name: "Submit" }).first().click();

    const originalCategoryCell = page.locator("tbody td", {
      hasText: /^Electronics$/,
    });
    await expect(originalCategoryCell).toBeVisible();

    const row = page.locator("tbody tr").first();
    await row.getByRole("button", { name: "Edit" }).click();

    const modal = page.locator(".ant-modal");
    await expect(modal).toBeVisible();
    await modal
      .locator('input[placeholder="Enter new category"]')
      .fill("Consumer Electronics");
    await modal.getByRole("button", { name: "Submit" }).click();

    const updatedCategoryCell = page.locator("tbody td", {
      hasText: /^Consumer Electronics$/,
    });
    await expect(updatedCategoryCell).toBeVisible();
    await expect(originalCategoryCell).toHaveCount(0);

    const updatedRow = page.locator("tbody tr").first();
    await updatedRow.getByRole("button", { name: "Delete" }).click();

    await expect(updatedCategoryCell).toHaveCount(0);
  });
});
