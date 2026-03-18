const { test, expect } = require("@playwright/test");

const adminAuth = {
  token: "playwright-admin-token",
  user: {
    name: "Admin Tester",
    email: "admin@example.com",
    role: 1,
  },
};

const baseOrders = [
  {
    _id: "order-1",
    status: "Not Process",
    buyer: { name: "Buyer One" },
    createdAt: "2026-03-16T10:00:00.000Z",
    payment: { success: true },
    products: [
      {
        _id: "product-1",
        name: "Keyboard",
        description: "Mechanical keyboard for fast typing and testing",
        price: 149,
      },
    ],
  },
  {
    _id: "order-2",
    status: "Processing",
    buyer: { name: "Buyer Two" },
    createdAt: "2026-03-15T08:30:00.000Z",
    payment: { success: false },
    products: [
      {
        _id: "product-2",
        name: "Mouse",
        description: "Wireless mouse with ergonomic shell for office work",
        price: 59,
      },
    ],
  },
];

async function mockAdminOrdersPage(page) {
  let orders = structuredClone(baseOrders);
  let allOrdersRequestCount = 0;
  let lastStatusUpdate = null;

  await page.addInitScript((auth) => {
    window.localStorage.setItem("auth", JSON.stringify(auth));
  }, adminAuth);

  await page.route("**/api/v1/category/get-category", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, category: [] }),
    });
  });

  await page.route("**/api/v1/auth/admin-auth", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api/v1/auth/all-orders", async (route) => {
    allOrdersRequestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(orders),
    });
  });

  await page.route("**/api/v1/auth/order-status/*", async (route) => {
    const request = route.request();
    const orderId = request.url().split("/").pop();
    const payload = request.postDataJSON();

    orders = orders.map((order) =>
      order._id === orderId ? { ...order, status: payload.status } : order
    );
    lastStatusUpdate = { orderId, status: payload.status };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        _id: orderId,
        status: payload.status,
      }),
    });
  });

  return {
    getAllOrdersRequestCount: () => allOrdersRequestCount,
    getLastStatusUpdate: () => lastStatusUpdate,
  };
}

// Alek Kwek, A0273471A
test.describe("Admin Orders UI", () => {
  // Alek Kwek, A0273471A
  test("shows all orders with buyer, payment, product, and relative date details", async ({
    page,
  }) => {
    await mockAdminOrdersPage(page);

    await page.goto("/dashboard/admin/orders");

    await expect(
      page.getByRole("heading", { name: "All Orders" })
    ).toBeVisible();
    await expect(page.getByText("Buyer One")).toBeVisible();
    await expect(page.getByText("Buyer Two")).toBeVisible();
    await expect(page.getByText("Success")).toBeVisible();
    await expect(page.getByText("Failed")).toBeVisible();
    await expect(page.getByText("Keyboard", { exact: true })).toBeVisible();
    await expect(page.getByText("Mouse", { exact: true })).toBeVisible();
    await expect(page.getByText("2 days ago")).toBeVisible();
    await expect(page.getByText("3 days ago")).toBeVisible();
  });

  // Alek Kwek, A0273471A
  test("updates an order status and refreshes the list with the new value", async ({
    page,
  }) => {
    const adminOrdersApi = await mockAdminOrdersPage(page);

    await page.goto("/dashboard/admin/orders");

    const firstStatusSelect = page.locator(".ant-select").first();
    await expect(firstStatusSelect).toContainText("Not Process");

    await firstStatusSelect.click();
    await page.getByTitle("Shipped").click();

    await expect(firstStatusSelect).toContainText("Shipped");
    await expect.poll(adminOrdersApi.getAllOrdersRequestCount).toBe(2);
    await expect
      .poll(adminOrdersApi.getLastStatusUpdate)
      .toEqual({ orderId: "order-1", status: "Shipped" });
  });
});
