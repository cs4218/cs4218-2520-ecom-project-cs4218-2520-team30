import { test, expect } from "@playwright/test";

import { createCategory, loginAsAdmin, resetAdminTestData } from "./uiTestUtils";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test.beforeEach(async () => {
  await resetAdminTestData();
});

// Alek Kwek, A0273471A
test.describe("Create Category UI flow", () => {
  // Alek Kwek, A0273471A
  test("admin can create, edit, reload, and delete a category through the admin UI", async ({
    page,
  }) => {
    const suffix = Date.now();
    const createdCategoryName = `UI Category ${suffix}`;
    const updatedCategoryName = `Renamed UI Category ${suffix}`;

    await loginAsAdmin(page);
    await createCategory(page, createdCategoryName);

    const createdRow = page
      .locator("tbody tr")
      .filter({ has: page.getByRole("cell", { name: createdCategoryName }) });

    await createdRow.getByRole("button", { name: "Edit" }).click();

    const modal = page.locator(".ant-modal");
    await expect(modal).toBeVisible();
    await modal.getByPlaceholder("Enter new category").fill(updatedCategoryName);
    await modal.getByRole("button", { name: "Submit" }).click();

    const createdCell = page.locator("tbody td", {
      hasText: new RegExp(`^${escapeRegex(createdCategoryName)}$`),
    });
    const updatedRow = page
      .locator("tbody tr")
      .filter({ has: page.getByRole("cell", { name: updatedCategoryName }) });
    await expect(updatedRow).toHaveCount(1);
    await expect(createdCell).toHaveCount(0);

    await page.reload();
    await expect(updatedRow).toHaveCount(1);

    await updatedRow.getByRole("button", { name: "Delete" }).click();
    await expect(updatedRow).toHaveCount(0);
  });
});
