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

async function globalTeardown() {
  console.log("Running Playwright Global Teardown...");
  await cleanupTargetsInDatabase("globalTeardown", globalCleanupTargets);
}

export default globalTeardown;
