import { test, expect } from '@playwright/test';

async function openAdminDashboard(page) {
  await page.getByRole('button', { name: 'PLAYWRIGHT ADMIN' }).click();
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL('/dashboard/admin');
}

async function selectAntdOption(page, index, optionText) {
  await page.getByRole('combobox').nth(index).click();
  await page.locator('.ant-select-dropdown:visible').getByText(optionText, { exact: true }).click();
}

test.describe('Admin Dashboard Flow', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Navigate to login
    await page.goto('/login');

    // 2. Fill login form
    await page.fill('input[placeholder="Enter Your Email "]', 'playwright-admin@test.com');
    await page.fill('input[placeholder="Enter Your Password"]', 'adminpassword123');

    // 3. Click Login
    await page.click('button:has-text("LOGIN")');

    // 4. Wait for redirect to home
    await expect(page).toHaveURL('/');
    
    // Wait for the auth context to settle
    await page.waitForTimeout(1000); 
  });

  test('Admin can log in and view profile information on dashboard', async ({ page }) => {
    // 1. Navigate explicitly to Admin Dashboard
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL('/dashboard/admin');

    // 2. Verify Admin Information is visible on the dashboard
    await expect(page.locator('h3', { hasText: 'Admin Name : Playwright Admin' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Email : playwright-admin@test.com' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Admin Contact : 1234567890' })).toBeVisible();
  });

  test('Admin can create, view, update and delete a category', async ({ page }) => {
    // 1. Go to Category Route
    await page.getByRole('button', { name: 'PLAYWRIGHT ADMIN' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Category' }).click();

    // 2. Create a Category
    const categoryName = `Test Category ${Date.now()}`;
    await page.getByPlaceholder('Enter new category').fill(categoryName);
    await page.getByRole('button', { name: 'Submit' }).click();

    // 3. Verify it was created and is visible
    await expect(page.locator(`td:has-text("${categoryName}")`)).toBeVisible();

    // 4. Edit the Category
    const updatedCategoryName = `${categoryName} Updated`;
    // Find the row containing our category, and click the Edit button inside that row
    const row = page.locator('tr', { hasText: categoryName });
    await row.getByRole('button', { name: 'Edit' }).click();
    
    // Assuming the modal input has a placeholder 'Enter new category' or similar, we update it
    await page.getByRole('dialog').getByPlaceholder('Enter new category').fill(updatedCategoryName);
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();

    // 5. Verify it was updated
    await expect(page.locator(`td:has-text("${updatedCategoryName}")`)).toBeVisible();

    // 6. Delete the Category
    const newRow = page.locator('tr', { hasText: updatedCategoryName });
    await newRow.getByRole('button', { name: 'Delete' }).click();

    // 7. Verify it was deleted
    // Wait a brief moment for the DOM to update after deletion
    await page.waitForTimeout(1000); 
    await expect(page.locator(`td:has-text("${updatedCategoryName}")`)).not.toBeVisible();
  });

  test('Admin can view all orders', async ({ page }) => {
    // 1. Go to Admin Orders Route
    await page.getByRole('button', { name: 'PLAYWRIGHT ADMIN' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Orders' }).click();

    // 2. Verify Page Heading
    await expect(page.locator('h1', { hasText: 'All Orders' })).toBeVisible();

    // 3. Verify Order Table/Container exists
    // Depending on if orders actually exist in the DB, we just verify the table headers or structure is there
    expect(page.url()).toContain('/dashboard/admin/orders');
    
    // Wait for network/state to settle
    await page.waitForTimeout(1000);
    
    const tableExists = await page.locator('table').count();
    if (tableExists > 0) {
        const orderHeaders = page.locator('th');
        // In AdminOrders.js: #, Status, Buyer, date, Payment, Quantity
        expect(await orderHeaders.count()).toBeGreaterThanOrEqual(6);
    }
  });

  test('Admin can create, view, update and delete a product', async ({ page }) => {
    const uniqueId = Date.now();
    const categoryName = `Playwright Category ${uniqueId}`;
    const productName = `Playwright Product ${uniqueId}`;
    const updatedProductName = `${productName} Updated`;
    const productDescription = `Playwright description ${uniqueId}`;
    const updatedDescription = `${productDescription} updated`;

    // 1. Create a category for the product flow.
    await openAdminDashboard(page);
    await page.getByRole('link', { name: 'Create Category' }).click();
    await expect(page.locator('h1', { hasText: 'Manage Category' })).toBeVisible();
    await page.getByPlaceholder('Enter new category').fill(categoryName);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.locator(`td:has-text("${categoryName}")`)).toBeVisible();

    // 2. Navigate to create product and fill the form.
    await openAdminDashboard(page);
    await page.getByRole('link', { name: 'Create Product' }).click();
    await expect(page.locator('h1', { hasText: 'Create Product' })).toBeVisible();

    await selectAntdOption(page, 0, categoryName);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'product-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBApQfKgAAAABJRU5ErkJggg==',
        'base64'
      ),
    });
    await page.getByPlaceholder('write a name').fill(productName);
    await page.getByPlaceholder('write a description').fill(productDescription);
    await page.getByPlaceholder('write a Price').fill('123');
    await page.getByPlaceholder('write a quantity').fill('5');
    await selectAntdOption(page, 1, 'Yes');
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    // 3. Verify created product is listed.
    await expect(page).toHaveURL('/dashboard/admin/products');
    await expect(page.locator('h1', { hasText: 'All Products List' })).toBeVisible();
    await expect(page.getByText(productName, { exact: true })).toBeVisible();

    // 4. Open product, update details, and verify list reflects changes.
    await page.getByRole('link', { name: new RegExp(productName) }).click();
    await expect(page.locator('h1', { hasText: 'Update Product' })).toBeVisible();
    await expect(page.getByPlaceholder('write a name')).toHaveValue(productName);
    await expect(page.getByPlaceholder('write a description')).toHaveValue(productDescription);
    await expect(page.getByPlaceholder('write a Price')).toHaveValue('123');
    await expect(page.getByPlaceholder('write a quantity')).toHaveValue('5');
    await page.getByPlaceholder('write a name').fill(updatedProductName);
    await page.getByPlaceholder('write a description').fill(updatedDescription);
    await page.getByPlaceholder('write a Price').fill('456');
    await page.getByPlaceholder('write a quantity').fill('9');
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page).toHaveURL('/dashboard/admin/products');
    await expect(page.getByText(updatedProductName, { exact: true })).toBeVisible();
    await expect(page.getByText(productName, { exact: true })).toHaveCount(0);

    // 5. Delete the updated product and verify it is gone.
    await page.getByRole('link', { name: new RegExp(updatedProductName) }).click();
    await expect(page.locator('h1', { hasText: 'Update Product' })).toBeVisible();
    const deleteDialogHandled = new Promise((resolve) => {
      page.once('dialog', async (dialog) => {
        await dialog.accept('delete');
        resolve();
      });
    });
    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click({ noWaitAfter: true });
    await deleteDialogHandled;

    await expect(page).toHaveURL('/dashboard/admin/products', { timeout: 10000 });
    await expect(page.getByText(updatedProductName, { exact: true })).toHaveCount(0);
  });
});
