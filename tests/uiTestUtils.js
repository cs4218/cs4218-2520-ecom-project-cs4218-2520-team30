// Alek Kwek, A0273471A
import bcrypt from "bcrypt";
import { expect } from "@playwright/test";
import { MongoClient } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";

export const PLAYWRIGHT_ADMIN_EMAIL = "playwright-admin@test.com";
export const PLAYWRIGHT_ADMIN_PASSWORD = "adminpassword123";

const PLAYWRIGHT_PREFIX = "__playwright__";
const DEFAULT_PLAYWRIGHT_MONGO_URL =
  "mongodb://127.0.0.1:27017/ecom-playwright";
const PLAYWRIGHT_DB_NAME = "ecom-playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanupTargets = [
  {
    collection: "products",
    filter: { name: { $regex: `^${PLAYWRIGHT_PREFIX}` } },
    printableFilter: '{ "name": { "$regex": "^__playwright__" } }',
  },
  {
    collection: "categories",
    filter: { name: { $regex: `^${PLAYWRIGHT_PREFIX}` } },
    printableFilter: '{ "name": { "$regex": "^__playwright__" } }',
  },
  {
    collection: "users",
    filter: { email: PLAYWRIGHT_ADMIN_EMAIL },
    printableFilter: '{ "email": "playwright-admin@test.com" }',
  },
];

const artifactCleanupTargets = cleanupTargets.filter(
  (target) => target.collection !== "users"
);

const addDatabaseNameToMongoUrl = (mongoUrl, databaseName) => {
  const [baseUrl, queryString] = mongoUrl.split("?");
  const schemeIndex = baseUrl.indexOf("://");

  if (schemeIndex === -1) {
    return mongoUrl;
  }

  const pathStartIndex = baseUrl.indexOf("/", schemeIndex + 3);

  if (pathStartIndex === -1) {
    return `${baseUrl}/${databaseName}${queryString ? `?${queryString}` : ""}`;
  }

  const authority = baseUrl.slice(0, pathStartIndex);
  const pathName = baseUrl.slice(pathStartIndex + 1);

  if (!pathName) {
    return `${authority}/${databaseName}${queryString ? `?${queryString}` : ""}`;
  }

  return mongoUrl;
};

export const getPlaywrightMongoUrl = () => {
  if (process.env.PLAYWRIGHT_MONGO_URL) {
    return process.env.PLAYWRIGHT_MONGO_URL;
  }

  if (process.env.MONGO_URL) {
    return addDatabaseNameToMongoUrl(process.env.MONGO_URL, PLAYWRIGHT_DB_NAME);
  }

  return DEFAULT_PLAYWRIGHT_MONGO_URL;
};

export const getMongoDatabaseName = (mongoUrl) => {
  const withoutQuery = mongoUrl.split("?")[0];
  const slashIndex = withoutQuery.lastIndexOf("/");
  const pathName = slashIndex >= 0 ? withoutQuery.slice(slashIndex + 1) : "";

  return pathName && !pathName.includes("@")
    ? decodeURIComponent(pathName)
    : "test";
};

const withDatabase = async (callback) => {
  const mongoUrl = getPlaywrightMongoUrl();
  const client = new MongoClient(mongoUrl, {
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  });
  try {
    await client.connect();
    return await callback(client.db());
  } catch (error) {
    throw new Error(
      `Playwright could not connect to ${mongoUrl}. Start Mongo locally or set PLAYWRIGHT_MONGO_URL explicitly.`
    );
  } finally {
    await client.close().catch(() => {});
  }
};

const cleanupTargetsInDatabase = async (label, targets) => {
  const appMongoUrl = process.env.PLAYWRIGHT_APP_MONGO_URL || getPlaywrightMongoUrl();

  console.log(`[Playwright cleanup:${label}] app Mongo URI target: ${appMongoUrl}`);
  console.log(
    `[Playwright cleanup:${label}] app database name: ${getMongoDatabaseName(
      appMongoUrl
    )}`
  );

  await withDatabase(async (db) => {
    console.log(
      `[Playwright cleanup:${label}] Playwright helper database name: ${db.databaseName}`
    );

    targets.forEach((target) => {
      console.log(
        `[Playwright cleanup:${label}] ${target.collection} ${target.printableFilter}`
      );
    });

    for (const target of targets) {
      const result = await db.collection(target.collection).deleteMany(target.filter);
      console.log(
        `[Playwright cleanup:${label}] deleted ${result.deletedCount} document(s) from ${target.collection}`
      );
    }
  });
};

export const cleanupPlaywrightData = async (label) =>
  cleanupTargetsInDatabase(label, cleanupTargets);

export const cleanupPlaywrightArtifacts = async (label) =>
  cleanupTargetsInDatabase(label, artifactCleanupTargets);

export const ensurePlaywrightAdmin = async () => {
  await withDatabase(async (db) => {
    const hashedPassword = await bcrypt.hash(PLAYWRIGHT_ADMIN_PASSWORD, 10);

    await db.collection("users").updateOne(
      { email: PLAYWRIGHT_ADMIN_EMAIL },
      {
        $set: {
          name: "Playwright Admin",
          email: PLAYWRIGHT_ADMIN_EMAIL,
          password: hashedPassword,
          phone: "1234567890",
          address: "Playwright Address",
          answer: "Playwright Answer",
          role: 1,
        },
      },
      { upsert: true }
    );
  });
};

export const makePlaywrightName = (label) =>
  `${PLAYWRIGHT_PREFIX} ${label} ${Date.now()} ${Math.floor(Math.random() * 1000)}`;

export const getProductFixturePath = () =>
  path.join(__dirname, "fixtures", "playwright-product.svg");

export const loginAsPlaywrightAdmin = async (page) => {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email ").fill(PLAYWRIGHT_ADMIN_EMAIL);
  await page.getByPlaceholder("Enter Your Password").fill(
    PLAYWRIGHT_ADMIN_PASSWORD
  );
  await page.getByRole("button", { name: "LOGIN" }).click();
  await page.waitForURL("**/");
  const authData = await page.evaluate(() => localStorage.getItem("auth"));
  expect(authData).not.toBeNull();
};
