require("dotenv").config();

const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");

const PLAYWRIGHT_DB_NAME = "test";
const PLAYWRIGHT_CATEGORY_ID = new ObjectId("65f000000000000000000001");
const PLAYWRIGHT_PRODUCT_IDS = [
  new ObjectId("65f000000000000000000011"),
  new ObjectId("65f000000000000000000012"),
];
const PLAYWRIGHT_ADMIN_ID = new ObjectId("65f000000000000000000021");
const PLAYWRIGHT_BUYER_ID = new ObjectId("65f000000000000000000022");
const PLAYWRIGHT_ORDER_IDS = [
  new ObjectId("65f000000000000000000031"),
  new ObjectId("65f000000000000000000032"),
];

const PLAYWRIGHT_ADMIN_NAME = "__playwright__ Admin";
const PLAYWRIGHT_ADMIN_EMAIL = "playwright-admin@test.com";
const PLAYWRIGHT_ADMIN_PASSWORD = "playwright-admin-password";
const PLAYWRIGHT_BUYER_NAME = "__playwright__ Buyer";
const PLAYWRIGHT_ORDER_PRODUCT_NAMES = [
  "__playwright__ Admin Orders Keyboard",
  "__playwright__ Admin Orders Mouse",
];
const PLAYWRIGHT_ORDER_STATUSES = ["Not Process", "Processing"];

function getAppMongoUrl() {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required for Playwright UI tests");
  }
  return process.env.MONGO_URL;
}

function getDatabaseNameFromUrl(mongoUrl) {
  const parsedUrl = new URL(mongoUrl);
  const databaseName = parsedUrl.pathname.replace(/^\//, "");
  return databaseName || "test";
}

function withDatabaseName(mongoUrl, databaseName) {
  const parsedUrl = new URL(mongoUrl);
  parsedUrl.pathname = `/${databaseName}`;
  return parsedUrl.toString();
}

function getPlaywrightMongoUrl() {
  return withDatabaseName(getAppMongoUrl(), PLAYWRIGHT_DB_NAME);
}

function getMongoTargets() {
  const appMongoUrl = getAppMongoUrl();
  const playwrightMongoUrl = getPlaywrightMongoUrl();

  return {
    appMongoUrl,
    appDatabaseName: getDatabaseNameFromUrl(appMongoUrl),
    playwrightMongoUrl,
    playwrightDatabaseName: getDatabaseNameFromUrl(playwrightMongoUrl),
  };
}

function getCleanupPlan() {
  return [
    {
      collection: "orders",
      filter: {
        _id: {
          $in: PLAYWRIGHT_ORDER_IDS.map((id) => id.toHexString()),
        },
      },
    },
    {
      collection: "products",
      filter: {
        _id: {
          $in: PLAYWRIGHT_PRODUCT_IDS.map((id) => id.toHexString()),
        },
      },
    },
    {
      collection: "categories",
      filter: {
        _id: PLAYWRIGHT_CATEGORY_ID.toHexString(),
      },
    },
    {
      collection: "users",
      filter: {
        email: {
          $in: [PLAYWRIGHT_ADMIN_EMAIL, "playwright-buyer@test.com"],
        },
      },
    },
  ];
}

async function withPlaywrightDb(callback) {
  const client = new MongoClient(getPlaywrightMongoUrl());
  await client.connect();

  try {
    return await callback(client.db(PLAYWRIGHT_DB_NAME));
  } finally {
    await client.close();
  }
}

async function cleanupPlaywrightAdminOrdersData(reason) {
  const targets = getMongoTargets();
  const cleanupPlan = getCleanupPlan();

  console.log(
    `[playwright-ui] Cleanup requested (${reason})\n` +
      `raw app Mongo URI from MONGO_URL: ${targets.appMongoUrl}\n` +
      `raw app database name from MONGO_URL: ${targets.appDatabaseName}\n` +
      `app Mongo URI target used by Playwright: ${targets.playwrightMongoUrl}\n` +
      `app database name used by Playwright: ${targets.playwrightDatabaseName}\n` +
      `Playwright helper database name: ${targets.playwrightDatabaseName}\n` +
      `collections and filters touched: ${JSON.stringify(cleanupPlan)}`
  );

  await withPlaywrightDb(async (db) => {
    await db.collection("orders").deleteMany({
      _id: { $in: PLAYWRIGHT_ORDER_IDS },
    });
    await db.collection("products").deleteMany({
      _id: { $in: PLAYWRIGHT_PRODUCT_IDS },
    });
    await db.collection("categories").deleteMany({
      _id: PLAYWRIGHT_CATEGORY_ID,
    });
    await db.collection("users").deleteMany({
      email: { $in: [PLAYWRIGHT_ADMIN_EMAIL, "playwright-buyer@test.com"] },
    });
  });
}

async function seedPlaywrightAdminOrdersData() {
  const passwordHash = await bcrypt.hash(PLAYWRIGHT_ADMIN_PASSWORD, 10);

  await withPlaywrightDb(async (db) => {
    await db.collection("categories").insertOne({
      _id: PLAYWRIGHT_CATEGORY_ID,
      name: "__playwright__ Admin Orders Category",
      slug: "__playwright__-admin-orders-category",
    });

    await db.collection("products").insertMany([
      {
        _id: PLAYWRIGHT_PRODUCT_IDS[0],
        name: PLAYWRIGHT_ORDER_PRODUCT_NAMES[0],
        slug: "__playwright__-admin-orders-keyboard",
        description: "Playwright-owned seeded keyboard for admin order tests.",
        price: 149,
        category: PLAYWRIGHT_CATEGORY_ID,
        quantity: 5,
        shipping: true,
        createdAt: new Date("2026-03-18T10:00:00.000Z"),
        updatedAt: new Date("2026-03-18T10:00:00.000Z"),
      },
      {
        _id: PLAYWRIGHT_PRODUCT_IDS[1],
        name: PLAYWRIGHT_ORDER_PRODUCT_NAMES[1],
        slug: "__playwright__-admin-orders-mouse",
        description: "Playwright-owned seeded mouse for admin order tests.",
        price: 59,
        category: PLAYWRIGHT_CATEGORY_ID,
        quantity: 8,
        shipping: false,
        createdAt: new Date("2026-03-17T10:00:00.000Z"),
        updatedAt: new Date("2026-03-17T10:00:00.000Z"),
      },
    ]);

    // Users are now registered via API in the tests, but let's just insert here via API if possible.
    // Wait, since we are inside uiTestUtils (Node environment), we can use fetch to register.
    const resAdmin = await fetch("http://localhost:6060/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: PLAYWRIGHT_ADMIN_NAME,
        email: PLAYWRIGHT_ADMIN_EMAIL,
        password: PLAYWRIGHT_ADMIN_PASSWORD,
        phone: "12345678",
        address: "Playwright Admin Address",
        answer: "__playwright__ admin answer"
      }),
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    const resAdminText = await resAdmin.text();
    console.log("Admin Register Res:", resAdminText);

    const resBuyer = await fetch("http://localhost:6060/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: PLAYWRIGHT_BUYER_NAME,
        email: "playwright-buyer@test.com",
        password: PLAYWRIGHT_ADMIN_PASSWORD,
        phone: "87654321",
        address: "Playwright Buyer Address",
        answer: "__playwright__ buyer answer"
      }),
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    const resBuyerText = await resBuyer.text();
    console.log("Buyer Register Res:", resBuyerText);

    // We must update admin role to 1 manually because API defaults to 0
    await db.collection("users").updateOne(
      { email: PLAYWRIGHT_ADMIN_EMAIL },
      { $set: { role: 1 } }
    );

    // Also get their ObjectIds to use for Orders array
    const adminUserDoc = await db.collection("users").findOne({ email: PLAYWRIGHT_ADMIN_EMAIL });
    console.log("AdminUserDoc after update:", adminUserDoc);
    const buyerUserDoc = await db.collection("users").findOne({ email: "playwright-buyer@test.com" });
    const actualAdminId = adminUserDoc ? adminUserDoc._id : PLAYWRIGHT_ADMIN_ID;
    const actualBuyerId = buyerUserDoc ? buyerUserDoc._id : PLAYWRIGHT_BUYER_ID;

    await db.collection("orders").insertMany([
      {
        _id: PLAYWRIGHT_ORDER_IDS[0],
        products: [PLAYWRIGHT_PRODUCT_IDS[0]],
        payment: { success: true },
        buyer: actualBuyerId,
        status: PLAYWRIGHT_ORDER_STATUSES[0],
        createdAt: new Date("2026-03-19T10:00:00.000Z"),
        updatedAt: new Date("2026-03-19T10:00:00.000Z"),
      },
      {
        _id: PLAYWRIGHT_ORDER_IDS[1],
        products: [PLAYWRIGHT_PRODUCT_IDS[1]],
        payment: { success: false },
        buyer: actualBuyerId,
        status: PLAYWRIGHT_ORDER_STATUSES[1],
        createdAt: new Date("2026-03-18T10:00:00.000Z"),
        updatedAt: new Date("2026-03-18T10:00:00.000Z"),
      },
    ]);
  });
}

module.exports = {
  PLAYWRIGHT_ADMIN_EMAIL,
  PLAYWRIGHT_ADMIN_NAME,
  PLAYWRIGHT_ADMIN_PASSWORD,
  PLAYWRIGHT_BUYER_NAME,
  PLAYWRIGHT_ORDER_PRODUCT_NAMES,
  PLAYWRIGHT_ORDER_STATUSES,
  cleanupPlaywrightAdminOrdersData,
  getMongoTargets,
  seedPlaywrightAdminOrdersData,
  withPlaywrightDb,
};
