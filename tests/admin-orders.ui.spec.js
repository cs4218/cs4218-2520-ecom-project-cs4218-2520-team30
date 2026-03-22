// Alek Kwek, A0273471A
const { test, expect } = require("@playwright/test");
const {
  PLAYWRIGHT_ADMIN_EMAIL,
  PLAYWRIGHT_ADMIN_NAME,
  PLAYWRIGHT_ADMIN_PASSWORD,
  PLAYWRIGHT_BUYER_NAME,
  PLAYWRIGHT_ORDER_PRODUCT_NAMES,
  PLAYWRIGHT_ORDER_STATUSES,
  cleanupPlaywrightAdminOrdersData,
  seedPlaywrightAdminOrdersData,
} = require("./uiTestUtils");

async function loginAsPlaywrightAdmin(page) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email ").fill(PLAYWRIGHT_ADMIN_EMAIL);
  await page
    .getByPlaceholder("Enter Your Password")
    .fill(PLAYWRIGHT_ADMIN_PASSWORD);
  page.on('response', async response => {
    if (response.url().includes('login')) {
      console.log('LOGIN RES STATUS:', response.status());
      console.log('LOGIN RES BODY:', await response.text());
    }
  });
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
}

async function openAdminOrdersFromDashboard(page) {
  await page.goto("/dashboard/admin");
  await expect(
    page.getByText(`Admin Name : ${PLAYWRIGHT_ADMIN_NAME}`)
  ).toBeVisible();
  await page.getByRole("link", { name: "Orders" }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin\/orders$/);
  await expect(
    page.getByRole("heading", { name: "All Orders" })
  ).toBeVisible();
}

test.describe.configure({ mode: "serial" });

// Alek Kwek, A0273471A
test.describe("Admin Orders UI", () => {
  test.beforeEach(async () => {
    await cleanupPlaywrightAdminOrdersData("beforeEach");
    await seedPlaywrightAdminOrdersData();
  });

  test.afterEach(async () => {
    await cleanupPlaywrightAdminOrdersData("afterEach");
  });

  // Alek Kwek, A0273471A
  test("admin logs in, navigates to orders, and sees real order details from the system", async ({
    page,
  }) => {
    await loginAsPlaywrightAdmin(page);
    await openAdminOrdersFromDashboard(page);

    await expect(page.getByText(PLAYWRIGHT_BUYER_NAME)).toHaveCount(2);
    await expect(
      page.getByText(PLAYWRIGHT_ORDER_PRODUCT_NAMES[0], { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(PLAYWRIGHT_ORDER_PRODUCT_NAMES[1], { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Success").first()).toBeVisible();
    await expect(page.getByText("Failed").first()).toBeVisible();
    const keyboardOrderCard = page
      .locator(".border.shadow")
      .filter({ hasText: PLAYWRIGHT_ORDER_PRODUCT_NAMES[0] });
    const mouseOrderCard = page
      .locator(".border.shadow")
      .filter({ hasText: PLAYWRIGHT_ORDER_PRODUCT_NAMES[1] });

    await expect(keyboardOrderCard).toContainText(/ago/);
    await expect(mouseOrderCard).toContainText(/ago/);
  });

  // Alek Kwek, A0273471A
  test("admin updates an order status and sees the persisted result after leaving and returning", async ({
    page,
  }) => {
    await loginAsPlaywrightAdmin(page);
    await page.goto("/dashboard/admin/orders");

    const updatedOrderCard = page
      .locator(".border.shadow")
      .filter({ hasText: PLAYWRIGHT_ORDER_PRODUCT_NAMES[0] });
    const untouchedOrderCard = page
      .locator(".border.shadow")
      .filter({ hasText: PLAYWRIGHT_ORDER_PRODUCT_NAMES[1] });
    const updatedOrderSelect = updatedOrderCard.locator(".ant-select").first();
    const untouchedOrderSelect = untouchedOrderCard.locator(".ant-select").first();

    await expect(updatedOrderSelect).toContainText(PLAYWRIGHT_ORDER_STATUSES[0]);
    await expect(untouchedOrderSelect).toContainText(PLAYWRIGHT_ORDER_STATUSES[1]);

    await updatedOrderSelect.click();
    await page.getByTitle("Shipped").click();
    await expect(updatedOrderSelect).toContainText("Shipped");

    await page.goto("/dashboard/admin");
    await expect(
      page.getByText(`Admin Email : ${PLAYWRIGHT_ADMIN_EMAIL}`)
    ).toBeVisible();
    await page.getByRole("link", { name: "Orders" }).click();

    await expect(updatedOrderSelect).toContainText("Shipped");
    await expect(untouchedOrderSelect).toContainText(PLAYWRIGHT_ORDER_STATUSES[1]);
  });
});
