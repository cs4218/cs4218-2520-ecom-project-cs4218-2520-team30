const { test, expect } = require("@playwright/test");

const ADMIN_EMAIL = "playwright-admin@test.com";
const ADMIN_PASSWORD = "adminpassword123";
const RUN_ID = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

function uniqueName(prefix) {
  return `PW-MS2-${prefix}-${RUN_ID}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function loginAsAdmin(page) {
  await page.goto("/login");

  await page.getByPlaceholder(/enter your email/i).fill(ADMIN_EMAIL);
  await page.getByPlaceholder(/enter your password/i).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /^login$/i }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Playwright Admin")).toBeVisible();
}

async function openAdminPage(page, linkName, expectedUrl) {
  await page.goto("/dashboard/admin");
  await expect(page).toHaveURL("/dashboard/admin");
  await expect(page.getByText(/admin name\s*:\s*playwright admin/i)).toBeVisible();

  await page.getByRole("link", { name: linkName }).click();
  await expect(page).toHaveURL(expectedUrl);
}

async function openCreateProductPage(page) {
  await page.getByRole("link", { name: "Create Product" }).click();
  await expect(page).toHaveURL("/dashboard/admin/create-product");
  await page.reload();
  await expect(page).toHaveURL("/dashboard/admin/create-product");
  await expect(
    page.getByRole("heading", { name: /create product/i })
  ).toBeVisible();
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

async function openSelect(page, index) {
  const select = page.locator(".ant-select").nth(index);
  await select.click();
  const combobox = select.getByRole("combobox");
  return combobox;
}

async function selectOption(page, index, optionName) {
  const combobox = await openSelect(page, index);
  await combobox.fill(optionName);

  const option = page.locator(".ant-select-item-option-content", {
    hasText: new RegExp(`^${escapeRegExp(optionName)}$`),
  });

  await expect(option.last()).toBeVisible();
  await option.last().click();
}

async function selectShippingOption(page, optionName) {
  await openSelect(page, 1);

  const option = page.locator(".ant-select-dropdown").last().getByText(optionName, {
    exact: true,
  });

  if ((await option.count()) > 0) {
    await option.last().click();
    return;
  }

  await page.keyboard.press("ArrowDown");
  if (optionName === "Yes") {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
}

async function selectCategoryWithFallback(page, preferredName, excludeName) {
  const combobox = await openSelect(page, 0);
  await combobox.fill(preferredName);

  const preferredOption = page.locator(".ant-select-item-option-content", {
    hasText: new RegExp(`^${escapeRegExp(preferredName)}$`),
  });

  if (
    (await preferredOption.count()) > 0 &&
    (await preferredOption.last().isVisible())
  ) {
    await preferredOption.last().click();
    return preferredName;
  }

  await combobox.fill("");

  const options = page.locator(".ant-select-item-option-content");
  const optionCount = await options.count();

  for (let i = 0; i < optionCount; i += 1) {
    const option = options.nth(i);
    if (!(await option.isVisible())) {
      continue;
    }

    const optionName = normalizeText((await option.textContent()) || "");
    if (optionName && optionName !== excludeName) {
      await option.click();
      return optionName;
    }
  }

  throw new Error(`Could not select any category option. Preferred: ${preferredName}`);
}

async function createCategory(page, categoryName) {
  await page.getByPlaceholder(/enter new category/i).fill(categoryName);
  await page.getByRole("button", { name: "Submit" }).click();

  const row = page.locator("tbody tr", {
    has: page.getByText(categoryName, { exact: true }),
  });
  await expect(row).toBeVisible();
  return row;
}

async function deleteCategory(page, categoryName) {
  const row = page.locator("tbody tr", {
    has: page.getByText(categoryName, { exact: true }),
  });

  if ((await row.count()) === 0) {
    return;
  }

  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);
}

async function fillProductForm(page, product) {
  await page.locator('input[placeholder="write a name"]').fill(product.name);
  await page
    .locator('textarea[placeholder="write a description"]')
    .fill(product.description);
  await page.locator('input[placeholder="write a Price"]').fill(product.price);
  await page
    .locator('input[placeholder="write a quantity"]')
    .fill(product.quantity);

  if (product.photoName) {
    await page.setInputFiles('input[name="photo"]', {
      name: product.photoName,
      mimeType: "image/png",
      buffer: Buffer.from(`image-${product.photoName}`),
    });
    await expect(page.getByText(product.photoName)).toBeVisible();
  }
}

async function openProduct(page, productName) {
  await page
    .locator(".product-link", {
      has: page.getByText(productName, { exact: true }),
    })
    .click();
}

// Alek Kwek, A0273471A
test.describe("Admin management UI end-to-end flows", () => {
  // Alek Kwek, A0273471A
  test("admin can create, edit, and delete a category across admin pages", async ({
    page,
  }) => {
    const categoryName = uniqueName("Category");
    const updatedCategoryName = `${categoryName} Updated`;

    await loginAsAdmin(page);
    await openAdminPage(page, "Create Category", "/dashboard/admin/create-category");

    const categoryRow = await createCategory(page, categoryName);
    await expect(categoryRow).toBeVisible();

    await page.getByRole("link", { name: "Create Product" }).click();
    await expect(page).toHaveURL("/dashboard/admin/create-product");

    await page.getByRole("link", { name: "Create Category" }).click();
    await expect(page).toHaveURL("/dashboard/admin/create-category");

    const rowToEdit = page.locator("tbody tr", {
      has: page.getByText(categoryName, { exact: true }),
    });
    await rowToEdit.getByRole("button", { name: "Edit" }).click();

    const modal = page.locator(".ant-modal");
    await expect(modal).toBeVisible();
    await modal.getByPlaceholder(/enter new category/i).fill(updatedCategoryName);
    await modal.getByRole("button", { name: "Submit" }).click();

    const updatedRow = page.locator("tbody tr", {
      has: page.getByText(updatedCategoryName, { exact: true }),
    });
    await expect(updatedRow).toBeVisible();
    await expect(
      page.locator("tbody tr", {
        has: page.getByText(categoryName, { exact: true }),
      })
    ).toHaveCount(0);

    await deleteCategory(page, updatedCategoryName);
  });

  // Alek Kwek, A0273471A
  test("admin can create a product and verify the saved details on the update page", async ({
    page,
  }) => {
    const categoryName = uniqueName("ProductCategory");
    const productName = uniqueName("Product");
    const product = {
      name: productName,
      description: `${productName} description for UI test coverage`,
      price: "1299",
      quantity: "15",
      categoryName: "",
      shippingLabel: "Yes",
      photoName: "create-product.png",
    };

    await loginAsAdmin(page);
    await openAdminPage(page, "Create Category", "/dashboard/admin/create-category");
    await createCategory(page, categoryName);

    await openCreateProductPage(page);
    product.categoryName = await selectCategoryWithFallback(page, categoryName);
    await fillProductForm(page, product);
    await selectShippingOption(page, product.shippingLabel);
    await page.getByRole("button", { name: /create product/i }).click();

    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(page.getByText(product.name, { exact: true })).toBeVisible();
    await expect(page.getByText(product.description, { exact: true })).toBeVisible();

    await openProduct(page, product.name);
    await expect(page).toHaveURL(/\/dashboard\/admin\/product\//);
    await expect(page.locator('input[placeholder="write a name"]')).toHaveValue(
      product.name
    );
    await expect(
      page.locator('textarea[placeholder="write a description"]')
    ).toHaveValue(product.description);
    await expect(page.locator('input[placeholder="write a Price"]')).toHaveValue(
      product.price
    );
    await expect(
      page.locator('input[placeholder="write a quantity"]')
    ).toHaveValue(product.quantity);
    await expect(page.locator(".ant-select").first()).toContainText(
      product.categoryName
    );
    await expect(page.locator(".ant-select").nth(1)).toContainText("Yes");

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("prompt");
      await dialog.accept("yes");
    });

    await page.getByRole("button", { name: /delete product/i }).click();
    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(page.getByText(product.name, { exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: "Create Category" }).click();
    await expect(page).toHaveURL("/dashboard/admin/create-category");
    await deleteCategory(page, categoryName);
  });

  // Alek Kwek, A0273471A
  test("admin can update a product, switch categories, and delete it from the products list", async ({
    page,
  }) => {
    const originalCategoryName = uniqueName("OriginalCategory");
    const updatedCategoryName = uniqueName("UpdatedCategory");
    const originalProductName = uniqueName("OriginalProduct");
    const updatedProductName = uniqueName("UpdatedProduct");
    const originalProduct = {
      name: originalProductName,
      description: `${originalProductName} initial details for update flow`,
      price: "999",
      quantity: "8",
      categoryName: "",
      shippingLabel: "Yes",
      photoName: "original-product.png",
    };
    const updatedProduct = {
      name: updatedProductName,
      description: `${updatedProductName} details after admin edit`,
      price: "1499",
      quantity: "21",
      categoryName: "",
      shippingLabel: "No",
      photoName: "updated-product.png",
    };

    await loginAsAdmin(page);
    await openAdminPage(page, "Create Category", "/dashboard/admin/create-category");
    await createCategory(page, originalCategoryName);
    await createCategory(page, updatedCategoryName);

    await openCreateProductPage(page);
    originalProduct.categoryName = await selectCategoryWithFallback(
      page,
      originalCategoryName
    );
    await fillProductForm(page, originalProduct);
    await selectShippingOption(page, originalProduct.shippingLabel);
    await page.getByRole("button", { name: /create product/i }).click();

    await expect(page).toHaveURL("/dashboard/admin/products");
    await openProduct(page, originalProduct.name);
    await expect(page).toHaveURL(/\/dashboard\/admin\/product\//);
    await expect(page.locator('input[placeholder="write a name"]')).toHaveValue(
      originalProduct.name
    );
    await expect(
      page.locator('textarea[placeholder="write a description"]')
    ).toHaveValue(originalProduct.description);
    await expect(page.locator(".ant-select").first()).toContainText(
      originalProduct.categoryName
    );
    await expect(page.locator(".ant-select").nth(1)).toContainText("Yes");

    updatedProduct.categoryName = await selectCategoryWithFallback(
      page,
      updatedCategoryName,
      originalProduct.categoryName
    );
    await fillProductForm(page, updatedProduct);
    await selectShippingOption(page, updatedProduct.shippingLabel);
    await expect(page.locator('input[placeholder="write a name"]')).toHaveValue(
      updatedProduct.name
    );
    await expect(
      page.locator('textarea[placeholder="write a description"]')
    ).toHaveValue(updatedProduct.description);
    await expect(page.locator(".ant-select").first()).toContainText(
      updatedProduct.categoryName
    );
    await expect(page.locator(".ant-select").nth(1)).toContainText("No");
    await page.getByRole("button", { name: /update product/i }).click();

    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(page.getByText(updatedProduct.name, { exact: true })).toBeVisible();
    await expect(
      page.getByText(updatedProduct.description, { exact: true })
    ).toBeVisible();

    await openProduct(page, updatedProduct.name);
    await expect(page.locator(".ant-select").first()).toContainText(
      updatedProduct.categoryName
    );
    await expect(page.locator(".ant-select").nth(1)).toContainText("No");

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("prompt");
      expect(dialog.message()).toContain("Are You Sure want to delete this product ?");
      await dialog.accept("yes");
    });

    await page.getByRole("button", { name: /delete product/i }).click();

    await expect(page).toHaveURL("/dashboard/admin/products");
    await expect(page.getByText(updatedProduct.name, { exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: "Create Category" }).click();
    await expect(page).toHaveURL("/dashboard/admin/create-category");
    await deleteCategory(page, originalCategoryName);
    await deleteCategory(page, updatedCategoryName);
  });
});
