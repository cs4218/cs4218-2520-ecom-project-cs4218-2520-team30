import {
  cleanupTargetsInDatabase,
  PLAYWRIGHT_PREFIX,
  PLAYWRIGHT_ADMIN_EMAIL,
  PLAYWRIGHT_USER_EMAIL,
} from "./uiTestUtils.js";

const globalCleanupTargets = [
  {
    collection: "products",
    filter: {
      $or: [
        { name: { $regex: `^${PLAYWRIGHT_PREFIX}` } },
        { slug: { $regex: "^playwright-" } },
      ],
    },
    printableFilter: "products matching __playwright__ prefix or playwright- slug",
  },
  {
    collection: "categories",
    filter: {
      $or: [
        { name: { $regex: `^${PLAYWRIGHT_PREFIX}` } },
        { slug: { $regex: "^playwright-" } },
      ],
    },
    printableFilter: "categories matching __playwright__ prefix or playwright- slug",
  },
  {
    collection: "users",
    filter: {
      $or: [
        { email: PLAYWRIGHT_ADMIN_EMAIL },
        { email: PLAYWRIGHT_USER_EMAIL },
        { email: { $regex: "^testuser_" } },
      ],
    },
    printableFilter: "Playwright test users",
  },
];

import fs from "fs";
import path from "path";

async function globalTeardown() {
  console.log("Running Playwright Global Teardown...");
  await cleanupTargetsInDatabase("globalTeardown", globalCleanupTargets);

  // Cleanup the URI file
  const MONGO_URI_FILE = path.join(process.cwd(), ".playwright_mongo_uri");
  try { if (fs.existsSync(MONGO_URI_FILE)) fs.unlinkSync(MONGO_URI_FILE); } catch (e) {}
}

export default globalTeardown;
