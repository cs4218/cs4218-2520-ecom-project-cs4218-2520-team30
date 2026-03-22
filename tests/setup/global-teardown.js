/**
 * Playwright Global Teardown
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function globalTeardown() {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    console.log("[Teardown] MONGO_URL not found in environment, skipping cleanup.");
    return;
  }

  try {
    console.log("[Teardown] Connecting to MongoDB for cleanup...");
    await mongoose.connect(mongoUrl);

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");
    const productsCollection = db.collection("products");
    const categoriesCollection = db.collection("categories");

    // Delete test users matching pattern: testuser_*@test.com
    const result = await usersCollection.deleteMany({
      $or: [
        { email: { $regex: /^testuser_.*@test\.com$/ } },
        { email: "playwright-admin@test.com" },
        { email: "playwright-user@test.com" }
      ]
    });

    const productsResult = await productsCollection.deleteMany({
      slug: { $regex: /^playwright-/ }
    });
    console.log(`[Teardown] Deleted ${productsResult.deletedCount} Playwright seeded product(s).`);

    const categoriesResult = await categoriesCollection.deleteMany({
      slug: { $regex: /^playwright-/ }
    });
    console.log(`[Teardown] Deleted ${categoriesResult.deletedCount} Playwright seeded category(s).`);

    console.log(`[Teardown] Deleted ${result.deletedCount} test user(s) from database.`);

    await mongoose.connection.close();
    console.log("[Teardown] MongoDB connection closed.");
  } catch (error) {
    console.error("[Teardown] Error during cleanup:", error);
    // Don't throw - teardown errors shouldn't fail the test run
  }
}

export default globalTeardown;
